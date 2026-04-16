// ============================================================
// backend/src/controllers/orderController.ts
//
// POST /api/orders  → crear orden con validación y cálculo en backend
// GET  /api/orders/:id → consultar estado de una orden
//
// IMPORTANTE: el backend SIEMPRE recalcula el total.
// Nunca se confía en el total enviado por el cliente.
// ============================================================

import { Request, Response } from 'express';
import pool from '../utils/db';
import { broadcast } from '../websocket/handlers';

interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  special_instructions?: string;
}

// ── POST /api/orders ─────────────────────────────────────────
export async function createOrder(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      table_id,
      items,
      payment_method,
      notes,
      source = 'app',
    }: {
      table_id: string | null;
      items: OrderItemInput[];
      payment_method: string;
      notes?: string;
      source?: string;
    } = req.body;

    // ── 1. Validar que vengan items ──────────────────────────
    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'La orden debe tener al menos un item' });
    }

    // ── 2. Verificar disponibilidad y obtener precios reales ─
    const itemIds = items.map((i) => i.menu_item_id);
    const menuResult = await client.query(
      `SELECT id, name, price, is_available, is_out_of_stock
       FROM menu_items
       WHERE id = ANY($1::uuid[])`,
      [itemIds]
    );

    const menuMap = new Map(menuResult.rows.map((r) => [r.id, r]));

    for (const item of items) {
      const menuItem = menuMap.get(item.menu_item_id);
      if (!menuItem) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `Item "${item.menu_item_id}" no existe`,
        });
      }
      if (!menuItem.is_available || menuItem.is_out_of_stock) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `"${menuItem.name}" no está disponible`,
        });
      }
      if (item.quantity < 1 || !Number.isInteger(item.quantity)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `Cantidad inválida para "${menuItem.name}"`,
        });
      }
    }

    // ── 3. Calcular subtotal en backend (precio real de BD) ──
    let subtotal = 0;
    for (const item of items) {
      const menuItem = menuMap.get(item.menu_item_id)!;
      subtotal += parseFloat(menuItem.price) * item.quantity;
    }
    const tax   = parseFloat((subtotal * 0.08).toFixed(2)); // 8%
    const total = parseFloat((subtotal + tax).toFixed(2));

    // ── 4. Generar order_number único (ORD-XXXX) ─────────────
    const countResult = await client.query('SELECT COUNT(*) FROM orders');
    const count       = parseInt(countResult.rows[0].count) + 1;
    const orderNumber = `ORD-${String(count).padStart(4, '0')}`;

    // ── 5. Insertar la orden ─────────────────────────────────
    const orderResult = await client.query(
      `INSERT INTO orders
         (order_number, table_id, subtotal, tax, total, status,
          payment_method, payment_status, source, notes)
       VALUES ($1, $2, $3, $4, $5, 'pending_payment', $6, 'pending', $7, $8)
       RETURNING *`,
      [
        orderNumber,
        table_id ?? null,
        subtotal.toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
        payment_method,
        source,
        notes ?? null,
      ]
    );
    const order = orderResult.rows[0];

    // ── 6. Insertar los order_items ──────────────────────────
    for (const item of items) {
      const menuItem = menuMap.get(item.menu_item_id)!;
      await client.query(
        `INSERT INTO order_items
           (order_id, menu_item_id, quantity, price, special_instructions, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [
          order.id,
          item.menu_item_id,
          item.quantity,
          menuItem.price,
          item.special_instructions ?? null,
        ]
      );
    }

    // ── 7. Registrar en audit_log ────────────────────────────
    await client.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id)
       VALUES ('order_created', 'order', $1)`,
      [order.id]
    );

    await client.query('COMMIT');

    // ── 8. Notificar por WebSocket a caja ────────────────────
    broadcast({
      type: 'order:new',
      payload: {
        orderId:     order.id,
        orderNumber: order.order_number,
        tableId:     order.table_id,
        total:       order.total,
        status:      order.status,
      },
    });

    // ── 9. Responder con la orden creada + items ─────────────
    const itemsResult = await pool.query(
      `SELECT oi.id, oi.menu_item_id, oi.quantity, oi.price,
              oi.special_instructions, oi.status,
              mi.name
       FROM order_items oi
       JOIN menu_items mi ON oi.menu_item_id = mi.id
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
       FROM orders
       WHERE id = $1`,
      [id]
    );

    if (!orderResult.rows[0]) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    // Incluir items con nombre del plato
    const itemsResult = await pool.query(
      `SELECT oi.id, oi.menu_item_id, oi.quantity, oi.price,
              oi.special_instructions, oi.status, mi.name
       FROM order_items oi
       JOIN menu_items mi ON oi.menu_item_id = mi.id
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
      'pending_payment', 'payment_confirmed', 'pending_validation',
      'sent_to_kitchen', 'in_preparation', 'ready_for_pickup',
      'delivered', 'completed', 'cancelled',
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Estado inválido: ${status}` });
    }

    // Timestamp dinámico según el estado
    const timestamps: Record<string, string> = {
      sent_to_kitchen:   'sent_to_kitchen_at = NOW(),',
      ready_for_pickup:  'ready_at = NOW(),',
      delivered:         'delivered_at = NOW(),',
      completed:         'completed_at = NOW(),',
    };
    const extraTimestamp = timestamps[status] ?? '';

    const result = await pool.query(
      `UPDATE orders
       SET status = $1, ${extraTimestamp} updated_at = NOW()
       WHERE id = $2
       RETURNING id, order_number, status, table_id`,
      [status, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    const updated = result.rows[0];

    // Notificar cambio de estado por WebSocket al cliente
    broadcast({
      type: 'order:status',
      payload: { orderId: updated.id, status: updated.status },
      targetOrderId: updated.id,
    });

    // Si está lista, emitir también order:ready
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
export async function getActiveOrders(_req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT o.id, o.order_number, o.table_id, o.total, o.status,
             o.payment_method, o.created_at, o.source,
             t.number AS table_number
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.status NOT IN ('completed', 'cancelled')
      ORDER BY o.created_at ASC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('[orders/active]', err);
    return res.status(500).json({ message: 'Error al obtener órdenes activas' });
  }
}