// ============================================================
// backend/src/controllers/orderController.ts
//
// FIX #5: validated_at ahora se actualiza en los estados correctos
// FIX #6: order_number generado con SEQUENCE atómica (sin race condition)
// ============================================================

import { Request, Response } from 'express';
import pool from '../utils/db';
import { broadcast } from '../websocket/handlers';

type OrderSource = 'autoservicio' | 'waiter' | 'kiosk';

interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  special_instructions?: string;
}

const VALID_SOURCES: OrderSource[] = ['autoservicio', 'waiter', 'kiosk'];

// ── POST /api/orders ─────────────────────────────────────────
export async function createOrder(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { table_id, items, payment_method, notes, source = 'autoservicio' } = req.body as {
      table_id: string | null;
      items: OrderItemInput[];
      payment_method: string;
      notes?: string;
      source?: string;
    };

    if (!VALID_SOURCES.includes(source as OrderSource)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `source inválido. Permitidos: ${VALID_SOURCES.join(', ')}` });
    }

    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'La orden debe tener al menos un item' });
    }

    if (source === 'waiter' && !table_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'table_id es requerido para source=waiter' });
    }

    if (table_id) {
      const tableCheck = await client.query('SELECT id FROM tables WHERE id = $1', [table_id]);
      if (!tableCheck.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Mesa no encontrada' });
      }
    }

    // Verificar items y obtener precios reales de BD
    const itemIds    = items.map((i) => i.menu_item_id);
    const menuResult = await client.query(
      `SELECT id, name, price, is_available, is_out_of_stock
       FROM menu_items WHERE id = ANY($1::uuid[])`,
      [itemIds]
    );
    const menuMap = new Map(menuResult.rows.map((r) => [r.id, r]));

    for (const item of items) {
      const mi = menuMap.get(item.menu_item_id);
      if (!mi) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Item "${item.menu_item_id}" no existe` });
      }
      if (!mi.is_available || mi.is_out_of_stock) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `"${mi.name}" no está disponible` });
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Cantidad inválida para "${mi.name}"` });
      }
    }

    // Calcular totales en backend
    let subtotal = 0;
    for (const item of items) {
      subtotal += parseFloat(menuMap.get(item.menu_item_id)!.price) * item.quantity;
    }
    const tax   = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    // FIX #6: Usar SEQUENCE atómica para order_number — evita race condition
    // nextval() es atómico en PostgreSQL, garantiza unicidad bajo carga concurrente
    const seqResult   = await client.query(`SELECT nextval('order_number_seq') AS seq`);
    const orderNumber = `ORD-${String(seqResult.rows[0].seq).padStart(4, '0')}`;

    const orderResult = await client.query(
      `INSERT INTO orders
         (order_number, table_id, subtotal, tax, total, status,
          payment_method, payment_status, source, notes)
       VALUES ($1,$2,$3,$4,$5,'pending_payment',$6,'pending',$7,$8)
       RETURNING *`,
      [orderNumber, table_id ?? null, subtotal.toFixed(2), tax.toFixed(2),
       total.toFixed(2), payment_method, source, notes ?? null]
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      const mi = menuMap.get(item.menu_item_id)!;
      await client.query(
        `INSERT INTO order_items
           (order_id, menu_item_id, quantity, price, special_instructions, status)
         VALUES ($1,$2,$3,$4,$5,'pending')`,
        [order.id, item.menu_item_id, item.quantity, mi.price, item.special_instructions ?? null]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id) VALUES ('order_created','order',$1)`,
      [order.id]
    );

    await client.query('COMMIT');

    broadcast({
      type: 'order:new',
      payload: { orderId: order.id, orderNumber: order.order_number,
                 tableId: order.table_id, total: order.total,
                 status: order.status, source: order.source },
    });

    const itemsResult = await pool.query(
      `SELECT oi.id, oi.menu_item_id, oi.quantity, oi.price,
              oi.special_instructions, oi.status, mi.name
       FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    return res.status(201).json({ ...order, items: itemsResult.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[orders/create]', err);
    return res.status(500).json({ message: 'Error al crear la orden' });
  } finally {
    client.release();
  }
}

// ── GET /api/orders/:id ──────────────────────────────────────
export async function getOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orderResult = await pool.query(
      `SELECT id, order_number, table_id, subtotal, tax, discount, tip,
              total, status, payment_method, payment_status, source, notes,
              created_at, validated_at, sent_to_kitchen_at, ready_at,
              delivered_at, completed_at
       FROM orders WHERE id = $1`,
      [id]
    );
    if (!orderResult.rows[0]) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }
    const itemsResult = await pool.query(
      `SELECT oi.id, oi.menu_item_id, oi.quantity, oi.price,
              oi.special_instructions, oi.status, mi.name
       FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1`,
      [id]
    );
    return res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error('[orders/getById]', err);
    return res.status(500).json({ message: 'Error al obtener la orden' });
  }
}

// ── PATCH /api/orders/:id/status ─────────────────────────────
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    const allowed = [
      'pending_payment','payment_confirmed','pending_validation',
      'sent_to_kitchen','in_preparation','ready_for_pickup',
      'delivered','completed','cancelled',
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Estado inválido: ${status}` });
    }

    // FIX #5: validated_at ahora se actualiza en los estados de validación.
    // Mapa completo de timestamps por estado.
    const timestamps: Record<string, string> = {
      payment_confirmed:  'validated_at = NOW(),',        // caja confirma pago
      pending_validation: 'validated_at = NOW(),',        // caja empieza a validar
      sent_to_kitchen:    'sent_to_kitchen_at = NOW(),',  // caja envía a cocina
      ready_for_pickup:   'ready_at = NOW(),',            // cocina marca listo
      delivered:          'delivered_at = NOW(),',
      completed:          'completed_at = NOW(),',
    };
    const extraTs = timestamps[status] ?? '';

    const result = await pool.query(
      `UPDATE orders
       SET status = $1, ${extraTs} updated_at = NOW()
       WHERE id = $2
       RETURNING id, order_number, status, table_id`,
      [status, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    const updated = result.rows[0];

    broadcast({
      type: 'order:status',
      payload: { orderId: updated.id, status: updated.status },
      targetOrderId: updated.id,
    });

    if (status === 'ready_for_pickup') {
      broadcast({
        type: 'order:ready',
        payload: { orderId: updated.id, orderNumber: updated.order_number },
        targetOrderId: updated.id,
      });
    }

    return res.json(updated);
  } catch (err) {
    console.error('[orders/updateStatus]', err);
    return res.status(500).json({ message: 'Error al actualizar estado' });
  }
}

// ── GET /api/orders/active ───────────────────────────────────
export async function getActiveOrders(req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT
        o.id, o.order_number, o.status, o.payment_method,
        o.subtotal, o.tax, o.total, o.notes, o.source,
        o.created_at, o.updated_at,
        t.number AS table_number,
        COALESCE(
          json_agg(
            json_build_object(
              'id',         oi.id,
              'name',       mi.name,
              'quantity',   oi.quantity,
              'unit_price', oi.price,
              'notes',      oi.special_instructions
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN tables t       ON o.table_id = t.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN menu_items mi  ON oi.menu_item_id = mi.id
      WHERE o.status NOT IN ('completed', 'cancelled')
      GROUP BY o.id, t.number
      ORDER BY o.created_at ASC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('[orders/active]', err);
    return res.status(500).json({ message: 'Error al obtener órdenes activas' });
  }
}