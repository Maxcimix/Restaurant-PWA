// ============================================================
// backend/src/services/InventoryValidationService.ts
//
// Valida disponibilidad de stock ANTES de crear un pedido.
//
// Lógica:
//  - Plato preparado (skip_kitchen=false + tiene receta):
//      verifica stock en BODEGA COCINA (shift_withdrawal_items.quantity_remaining
//      sumado por todos los turnos abiertos)
//  - Producto directo (skip_kitchen=true o sin receta):
//      verifica stock en BODEGA PRINCIPAL (ingredients.stock_quantity)
//  - Sin receta y skip_kitchen=false: siempre disponible
// ============================================================

import { PoolClient } from 'pg';

export interface OrderItemInput {
  menu_item_id: string;
  quantity:     number;
}

export interface ValidationResult {
  valid:            boolean;
  unavailableItems: UnavailableItem[];
}

export interface UnavailableItem {
  menu_item_id:   string;
  menu_item_name: string;
  reason:         string;
}

export class InventoryValidationService {

  // ── Valida una lista de ítems contra el stock actual ─────
  static async validateOrderAvailability(
    items:  OrderItemInput[],
    client: PoolClient
  ): Promise<ValidationResult> {
    const unavailableItems: UnavailableItem[] = [];

    for (const item of items) {
      const result = await this.validateSingleItem(item, client);
      if (!result.valid) {
        unavailableItems.push({
          menu_item_id:   item.menu_item_id,
          menu_item_name: result.itemName,
          reason:         result.reason,
        });
      }
    }

    return {
      valid:            unavailableItems.length === 0,
      unavailableItems,
    };
  }

  // ── Valida un ítem individual ────────────────────────────
  private static async validateSingleItem(
    item:   OrderItemInput,
    client: PoolClient
  ): Promise<{ valid: boolean; itemName: string; reason: string }> {

    // 1. Obtener info del ítem y su categoría (skip_kitchen)
    const itemR = await client.query(
      `SELECT mi.id, mi.name, mi.is_available, mi.is_out_of_stock,
              COALESCE(mc.skip_kitchen, false) AS skip_kitchen
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mc.id = mi.category_id
       WHERE mi.id = $1`,
      [item.menu_item_id]
    );

    if (!itemR.rows[0]) {
      return { valid: false, itemName: 'Ítem desconocido', reason: 'Ítem no encontrado' };
    }

    const mi = itemR.rows[0];

    if (!mi.is_available) {
      return { valid: false, itemName: mi.name, reason: 'Ítem no disponible' };
    }

    // 2. Obtener receta del ítem
    const recipeR = await client.query(
      `SELECT mii.ingredient_id, mii.quantity_required, i.name AS ingredient_name, i.unit
       FROM menu_item_ingredients mii
       JOIN ingredients i ON i.id = mii.ingredient_id
       WHERE mii.menu_item_id = $1`,
      [item.menu_item_id]
    );

    const hasRecipe = recipeR.rows.length > 0;

    // 3. Sin receta → disponible siempre (no hay stock que verificar)
    if (!hasRecipe) {
      return { valid: true, itemName: mi.name, reason: '' };
    }

    // 4. Producto directo (skip_kitchen=true) → verificar BODEGA PRINCIPAL
    if (mi.skip_kitchen) {
      return await this.validateAgainstMainStock(mi.name, recipeR.rows, item.quantity, client);
    }

    // 5. Plato preparado (skip_kitchen=false) → verificar BODEGA COCINA
    return await this.validateAgainstKitchenStock(mi.name, recipeR.rows, item.quantity, client);
  }

  // ── Verifica contra bodega principal (ingredients.stock_quantity) ──
  private static async validateAgainstMainStock(
    itemName:   string,
    recipe:     Array<{ ingredient_id: string; quantity_required: string; ingredient_name: string; unit: string }>,
    quantity:   number,
    client:     PoolClient
  ): Promise<{ valid: boolean; itemName: string; reason: string }> {

    for (const ri of recipe) {
      const needed = parseFloat(ri.quantity_required) * quantity;

      const stockR = await client.query(
        `SELECT stock_quantity FROM ingredients WHERE id = $1`,
        [ri.ingredient_id]
      );

      const available = parseFloat(stockR.rows[0]?.stock_quantity ?? '0');

      if (available < needed) {
        return {
          valid:    false,
          itemName,
          reason:   `Stock insuficiente de "${ri.ingredient_name}" en bodega principal. Disponible: ${available} ${ri.unit}, requerido: ${needed.toFixed(3)} ${ri.unit}`,
        };
      }
    }

    return { valid: true, itemName, reason: '' };
  }

  // ── Verifica contra bodega cocina (shift_withdrawal_items.quantity_remaining) ──
  private static async validateAgainstKitchenStock(
    itemName:   string,
    recipe:     Array<{ ingredient_id: string; quantity_required: string; ingredient_name: string; unit: string }>,
    quantity:   number,
    client:     PoolClient
  ): Promise<{ valid: boolean; itemName: string; reason: string }> {

    for (const ri of recipe) {
      const needed = parseFloat(ri.quantity_required) * quantity;

      // Sumar quantity_remaining de TODOS los turnos abiertos para este ingrediente
      const stockR = await client.query(
        `SELECT COALESCE(SUM(swi.quantity_remaining), 0) AS kitchen_stock
         FROM shift_withdrawal_items swi
         JOIN shift_withdrawals sw ON sw.id = swi.shift_withdrawal_id
         WHERE sw.status = 'abierto'
           AND swi.ingredient_id = $1`,
        [ri.ingredient_id]
      );

      const available = parseFloat(stockR.rows[0]?.kitchen_stock ?? '0');

      if (available < needed) {
        return {
          valid:    false,
          itemName,
          reason:   `Stock insuficiente de "${ri.ingredient_name}" en bodega cocina. Disponible: ${available} ${ri.unit}, requerido: ${needed.toFixed(3)} ${ri.unit}`,
        };
      }
    }

    return { valid: true, itemName, reason: '' };
  }

  // ── Consulta disponibilidad de TODOS los items (para el menú) ──
  // Retorna un mapa: { [menu_item_id]: { available: boolean; reason?: string } }
  static async getMenuAvailability(
    client: PoolClient
  ): Promise<Record<string, { available: boolean; reason?: string }>> {

    // Obtener todos los items activos con su receta y skip_kitchen
    const itemsR = await client.query(
      `SELECT mi.id, mi.name, mi.is_available, mi.is_out_of_stock,
              COALESCE(mc.skip_kitchen, false) AS skip_kitchen
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mc.id = mi.category_id
       WHERE mi.is_available = true`
    );

    // Stock de cocina agrupado por ingrediente (todos los turnos abiertos)
    const kitchenStockR = await client.query(
      `SELECT swi.ingredient_id, COALESCE(SUM(swi.quantity_remaining), 0) AS total
       FROM shift_withdrawal_items swi
       JOIN shift_withdrawals sw ON sw.id = swi.shift_withdrawal_id
       WHERE sw.status = 'abierto'
       GROUP BY swi.ingredient_id`
    );
    const kitchenStock = new Map<string, number>(
      kitchenStockR.rows.map((r) => [r.ingredient_id, parseFloat(r.total)])
    );

    // Stock principal por ingrediente
    const mainStockR = await client.query(
      `SELECT id, stock_quantity FROM ingredients WHERE is_active = true`
    );
    const mainStock = new Map<string, number>(
      mainStockR.rows.map((r) => [r.id, parseFloat(r.stock_quantity)])
    );

    // Recetas de todos los items
    const recipesR = await client.query(
      `SELECT mii.menu_item_id, mii.ingredient_id, mii.quantity_required,
              i.name AS ingredient_name, i.unit
       FROM menu_item_ingredients mii
       JOIN ingredients i ON i.id = mii.ingredient_id`
    );

    // Agrupar recetas por menu_item_id
    const recipeMap = new Map<string, typeof recipesR.rows>();
    for (const r of recipesR.rows) {
      if (!recipeMap.has(r.menu_item_id)) recipeMap.set(r.menu_item_id, []);
      recipeMap.get(r.menu_item_id)!.push(r);
    }

    const result: Record<string, { available: boolean; reason?: string }> = {};

    for (const mi of itemsR.rows) {
      // Ya marcado como agotado
      if (mi.is_out_of_stock) {
        result[mi.id] = { available: false, reason: 'Agotado' };
        continue;
      }

      const recipe = recipeMap.get(mi.id) ?? [];

      // Sin receta → disponible
      if (recipe.length === 0) {
        result[mi.id] = { available: true };
        continue;
      }

      // Verificar cada ingrediente
      let available = true;
      let reason    = '';
      const stockMap = mi.skip_kitchen ? mainStock : kitchenStock;

      for (const ri of recipe) {
        const needed    = parseFloat(ri.quantity_required);
        const inStock   = stockMap.get(ri.ingredient_id) ?? 0;

        if (inStock < needed) {
          available = false;
          reason    = `Sin "${ri.ingredient_name}" en ${mi.skip_kitchen ? 'bodega' : 'cocina'}`;
          break;
        }
      }

      result[mi.id] = available ? { available: true } : { available: false, reason };
    }

    return result;
  }
}
