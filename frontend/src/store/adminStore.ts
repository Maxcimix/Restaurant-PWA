// ============================================================
// frontend/src/store/adminStore.ts  —  Fase 8
//
// Propósito: Estado global del Admin Dashboard.
//   SIN persistencia — siempre fresco desde backend.
//   Mantiene: stats, listas de categorías/items/usuarios, filtros.
// ============================================================

import { create } from 'zustand';
import type {
  AdminStats, AdminCategory, AdminMenuItem,
  AdminUser, ReportData,
} from '../types/admin';

interface AdminState {
  // KPIs
  stats:        AdminStats | null;
  statsLoading: boolean;

  // Menú
  categories:    AdminCategory[];
  items:         AdminMenuItem[];
  menuLoading:   boolean;
  activeCategory: string | null;

  // Usuarios
  users:        AdminUser[];
  usersLoading: boolean;

  // Reportes
  report:        ReportData | null;
  reportLoading: boolean;

  // Error global
  error: string | null;

  // Acciones
  setStats:          (s: AdminStats) => void;
  setStatsLoading:   (v: boolean) => void;
  setCategories:     (c: AdminCategory[]) => void;
  setItems:          (i: AdminMenuItem[]) => void;
  setMenuLoading:    (v: boolean) => void;
  setActiveCategory: (id: string | null) => void;
  updateCategoryInList: (c: AdminCategory) => void;
  removeCategoryFromList: (id: string) => void;
  updateItemInList:  (i: AdminMenuItem) => void;
  removeItemFromList:(id: string) => void;
  setUsers:          (u: AdminUser[]) => void;
  setUsersLoading:   (v: boolean) => void;
  updateUserInList:  (u: AdminUser) => void;
  setReport:         (r: ReportData) => void;
  setReportLoading:  (v: boolean) => void;
  setError:          (msg: string | null) => void;
}

export const useAdminStore = create<AdminState>()((set) => ({
  stats:          null,
  statsLoading:   false,
  categories:     [],
  items:          [],
  menuLoading:    false,
  activeCategory: null,
  users:          [],
  usersLoading:   false,
  report:         null,
  reportLoading:  false,
  error:          null,

  setStats:          (stats)   => set({ stats, statsLoading: false }),
  setStatsLoading:   (v)       => set({ statsLoading: v }),
  setCategories:     (categories) => set({ categories, menuLoading: false }),
  setItems:          (items)   => set({ items }),
  setMenuLoading:    (v)       => set({ menuLoading: v }),
  setActiveCategory: (id)      => set({ activeCategory: id }),

  updateCategoryInList: (cat) =>
    set((s) => ({
      categories: s.categories.map((c) => c.id === cat.id ? cat : c),
    })),

  removeCategoryFromList: (id) =>
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

  updateItemInList: (item) =>
    set((s) => ({
      items: s.items.map((i) => i.id === item.id ? item : i),
    })),

  removeItemFromList: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  setUsers:         (users)  => set({ users, usersLoading: false }),
  setUsersLoading:  (v)      => set({ usersLoading: v }),

  updateUserInList: (user) =>
    set((s) => ({
      users: s.users.map((u) => u.id === user.id ? user : u),
    })),

  setReport:        (report) => set({ report, reportLoading: false }),
  setReportLoading: (v)      => set({ reportLoading: v }),
  setError:         (error)  => set({ error }),
}));