// ============================================================
// backend/src/services/StockDeductionService.ts
//
// Descuenta stock ATÓMICAMENTE al crear un pedido.
//
// Lógica:
//  - Plato preparado → descuenta de BODEGA COCINA (quantity_remaining
//    en shift_withdrawal_items) distribuyendo entre turnos abiertos
//  - Producto directo → descuenta de BODEGA PRINCIPAL (stock_quantity)
//  - Registra cada movimiento en inventory_movements
//  - Marca menu_item como is_out_of_stock si stock queda < 1 porción
//  - Retorna lista de items agotados para broadcast WebSocket
// ============================================================

import { PoolClient } from 'pg';
import { broadcast } from '../websocket/handlers';

export interface DeductionInput {
  menu_item_id:   string;
  menu_item_name: string;
  quantity:       number;
  order_item_id:  string;
}

export interface DeductionResult {
  newlyOutOfStock: string[];   // menu_item_ids que quedaron agotados
}

export class StockDeductionService {

  // ── Descuento principal ────────────────────────────────────
  static async deductStockForOrder(
    items:   DeductionInput[],
    userId:  string | null,
    client:  PoolClient
  ): Promise<DeductionResult> {

    const newlyOutOfStock: string[] = [];

    for (const item of items) {
      // Obtener skip_kitchen de la categoría del ítem
      const miR = await client.query(
        `SELECT COALESCE(mc.skip_kitchen, false) AS skip_kitchen
         FROM menu_items mi
         LEFT JOIN menu_categories mc ON mc.id = mi.category_id
         WHERE mi.id = $1`,
        [item.menu_item_id]
      );
      const skipKitchen: boolean = miR.rows[0]?.skip_kitchen ?? false;

      // Obtener receta
      const recipeR = await client.query(
        `SELECT mii.ingredient_id, mii.quantity_required,
                i.name AS ingredient_name, i.unit,
                COALESCE(i.is_direct_product, false) AS is_direct_product
         FROM menu_item_ingredients mii
         JOIN ingredients i ON i.id = mii.ingredient_id
         WHERE mii.menu_item_id = $1`,
        [item.menu_item_id]
      );

      if (recipeR.rows.length === 0) continue; // sin receta, nada que descontar

      // Separar ingredientes: directos → bodega principal; resto según skip_kitchen
      const directIngrs  = recipeR.rows.filter((r: { is_direct_product: boolean }) => r.is_direct_product);
      const kitchenIngrs = recipeR.rows.filter((r: { is_direct_product: boolean }) => !r.is_direct_product);

      // Ingredientes directos siempre se descuentan de bodega principal
      if (directIngrs.length > 0) {
        await this.deductFromMainStock(directIngrs, item, userId, client, newlyOutOfStock);
      }

      // Ingredientes de cocina según skip_kitchen del ítem
      if (kitchenIngrs.length > 0) {
        if (skipKitchen) {
          await this.deductFromMainStock(kitchenIngrs, item, userId, client, newlyOutOfStock);
        } else {
          await this.deductFromKitchenStock(kitchenIngrs, item, userId, client, newlyOutOfStock);
        }
      }
    }

    return { newlyOutOfStock };
  }

  // ── Descuenta de bodega principal ─────────────────────────
  private static async deductFromMainStock(
    recipe:           Array<{ ingredient_id: string; quantity_required: string; ingredient_name: string; unit: string }>,
    item:             DeductionInput,
    userId:           string | null,
    client:           PoolClient,
    newlyOutOfStock:  string[]
  ) {
    for (const ri of recipe) {
      const needed = parseFloat(ri.quantity_required) * item.quantity;

      // Lock y descuento con SELECT FOR UPDATE
      const updR = await client.query(
        `UPDATE ingredients
         SET stock_quantity = stock_quantity - $1,
             updated_at     = NOW()
         WHERE id = $2
         RETURNING stock_quantity, name`,
        [needed, ri.ingredient_id]
      );

      if (!updR.rows[0]) continue;
      const newStock = parseFloat(updR.rows[0].stock_quantity);

      // Registrar movimiento
      await client.query(
        `INSERT INTO inventory_movements
           (ingredient_id, type, quantity, stock_after, user_id, order_item_id, notes)
         VALUES ($1, 'salida', $2, $3, $4, $5, $6)`,
        [
          ri.ingredient_id,
          -needed,
          newStock,
          userId,
          item.order_item_id,
          `Pedido: ${item.menu_item_name} ×${item.quantity} (bodega principal)`,
        ]
      );

      // Si el stock quedó < 1 porción → marcar items agotados
      if (newStock < parseFloat(ri.quantity_required)) {
        const affected = await client.query(
          `UPDATE menu_items
           SET is_out_of_stock = true, updated_at = NOW()
           WHERE id IN (
             SELECT menu_item_id FROM menu_item_ingredients
             WHERE ingredient_id = $1
           )
           RETURNING id`,
          [ri.ingredient_id]
        );
        affected.rows.forEach((r: { id: string }) => {
          if (!newlyOutOfStock.includes(r.id)) newlyOutOfStock.push(r.id);
        });
      }
    }
  }

  // ── Descuenta de bodega cocina ─────────────────────────────
  // Distribuye el descuento entre los turnos abiertos (FIFO por fecha de apertura)
  private static async deductFromKitchenStock(
    recipe:           Array<{ ingredient_id: string; quantity_required: string; ingredient_name: string; unit: string }>,
    item:             DeductionInput,
    userId:           string | null,
    client:           PoolClient,
    newlyOutOfStock:  string[]
  ) {
    for (const ri of recipe) {
      let remaining = parseFloat(ri.quantity_required) * item.quantity;

      // Obtener turnos abiertos con stock de este ingrediente, FIFO por fecha
      const shiftsR = await client.query(
        `SELECT swi.id AS swi_id, swi.shift_withdrawal_id, swi.quantity_remaining
         FROM shift_withdrawal_items swi
         JOIN shift_withdrawals sw ON sw.id = swi.shift_withdrawal_id
         WHERE sw.status = 'abierto'
           AND swi.ingredient_id = $1
           AND swi.quantity_remaining > 0
         ORDER BY sw.started_at ASC
         FOR UPDATE`,
        [ri.ingredient_id]
      );

      for (const shift of shiftsR.rows) {
        if (remaining <= 0) break;

        const curRemaining = parseFloat(shift.quantity_remaining);
        const toDeduct     = Math.min(remaining, curRemaining);
        const newRemaining = parseFloat((curRemaining - toDeduct).toFixed(3));

        // Actualizar mini-inventario del turno
        await client.query(
          `UPDATE shift_withdrawal_items
           SET quantity_remaining = $1
           WHERE id = $2`,
          [newRemaining, shift.swi_id]
        );

        // Registrar movimiento
        await client.query(
          `INSERT INTO inventory_movements
             (ingredient_id, type, quantity, stock_after, user_id,
              shift_withdrawal_id, order_item_id, notes)
           VALUES ($1, 'consumo_turno', $2, $3, $4, $5, $6, $7)`,
          [
            ri.ingredient_id,
            -toDeduct,
            newRemaining,
            userId,
            shift.shift_withdrawal_id,
            item.order_item_id,
            `Pedido: ${item.menu_item_name} ×${item.quantity} (bodega cocina)`,
          ]
        );

        remaining -= toDeduct;
      }

      // Verificar si queda stock suficiente para 1 porción más
      const leftoverR = await client.query(
        `SELECT COALESCE(SUM(swi.quantity_remaining), 0) AS total
         FROM shift_withdrawal_items swi
         JOIN shift_withdrawals sw ON sw.id = swi.shift_withdrawal_id
         WHERE sw.status = 'abierto' AND swi.ingredient_id = $1`,
        [ri.ingredient_id]
      );
      const totalLeft = parseFloat(leftoverR.rows[0]?.total ?? '0');

      if (totalLeft < parseFloat(ri.quantity_required)) {
        // Marcar todos los items que usan este ingrediente como agotados
        const affected = await client.query(
          `UPDATE menu_items
           SET is_out_of_stock = true, updated_at = NOW()
           WHERE id IN (
             SELECT menu_item_id FROM menu_item_ingredients
             WHERE ingredient_id = $1
           )
           RETURNING id`,
          [ri.ingredient_id]
        );
        affected.rows.forEach((r: { id: string }) => {
          if (!newlyOutOfStock.includes(r.id)) newlyOutOfStock.push(r.id);
        });
      }
    }
  }

  // ── Broadcast de items agotados vía WebSocket ──────────────
  static broadcastOutOfStock(menuItemIds: string[]) {
    for (const menuItemId of menuItemIds) {
      broadcast({
        type:    'menu:item_unavailable',
        payload: { menuItemId },
      });
    }
  }

  // ── Re-activar items cuando se repone stock (llamar desde withdrawalController) ──
  static async reactivateItemsIfStockSufficient(
    ingredientId: string,
    client:       PoolClient
  ): Promise<string[]> {
    // Items marcados agotados que usan este ingrediente
    const candidatesR = await client.query(
      `SELECT mi.id, mii.quantity_required
       FROM menu_items mi
       JOIN menu_item_ingredients mii ON mii.menu_item_id = mi.id
       WHERE mii.ingredient_id = $1 AND mi.is_out_of_stock = true`,
      [ingredientId]
    );

    const reactivated: string[] = [];

    for (const row of candidatesR.rows) {
      // Verificar si ahora hay stock suficiente (kitchen o main según skip_kitchen)
      const miR = await client.query(
        `SELECT COALESCE(mc.skip_kitchen, false) AS skip_kitchen
         FROM menu_items mi
         LEFT JOIN menu_categories mc ON mc.id = mi.category_id
         WHERE mi.id = $1`,
        [row.id]
      );
      const skipKitchen: boolean = miR.rows[0]?.skip_kitchen ?? false;

      let available = 0;
      if (skipKitchen) {
        const r = await client.query(
          `SELECT stock_quantity AS total FROM ingredients WHERE id = $1`,
          [ingredientId]
        );
        available = parseFloat(r.rows[0]?.total ?? '0');
      } else {
        const r = await client.query(
          `SELECT COALESCE(SUM(swi.quantity_remaining), 0) AS total
           FROM shift_withdrawal_items swi
           JOIN shift_withdrawals sw ON sw.id = swi.shift_withdrawal_id
           WHERE sw.status = 'abierto' AND swi.ingredient_id = $1`,
          [ingredientId]
        );
        available = parseFloat(r.rows[0]?.total ?? '0');
      }

      if (available >= parseFloat(row.quantity_required)) {
        await client.query(
          `UPDATE menu_items SET is_out_of_stock = false, updated_at = NOW() WHERE id = $1`,
          [row.id]
        );
        reactivated.push(row.id);
        broadcast({
          type:    'menu:item_available',
          payload: { menuItemId: row.id },
        });
      }
    }

    return reactivated;
  }
}
