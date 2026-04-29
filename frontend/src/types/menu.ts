// ============================================================
// frontend/src/types/menu.ts
// Tipos del menú: categorías e items
// ============================================================

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  preparation_time: number | null; // minutos estimados
  is_available: boolean;
  is_out_of_stock: boolean;
}