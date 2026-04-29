// ============================================================
// frontend/src/services/adminService.ts  —  Fase 8
//
// Propósito: Todos los llamados HTTP del módulo Admin.
//   Requieren JWT con rol 'admin'.
//   Reutiliza apiFetch para adjuntar el token automáticamente.
//
// Dependencias: services/api.ts (apiFetch)
// ============================================================

import { apiFetch } from './api';
import type {
  AdminStats, ReportData, ReportFilter,
  AdminCategory, AdminMenuItem, CategoryForm, MenuItemForm,
  AdminUser, UserForm, RestaurantSettings,
} from '../types/admin';

// ── Dashboard KPIs ───────────────────────────────────────────
export const getAdminStats = (): Promise<AdminStats> =>
  apiFetch<AdminStats>('/admin/stats');

// ── Reportes ─────────────────────────────────────────────────
export const getReport = (filter: ReportFilter): Promise<ReportData> => {
  const params = new URLSearchParams({
    from:   filter.from,
    to:     filter.to,
    source: filter.source ?? 'all',
  });
  return apiFetch<ReportData>(`/admin/reports?${params}`);
};

// ── CRUD Categorías ──────────────────────────────────────────
export const getAdminCategories = (): Promise<AdminCategory[]> =>
  apiFetch<AdminCategory[]>('/admin/menu/categories');

export const createCategory = (data: CategoryForm): Promise<AdminCategory> =>
  apiFetch<AdminCategory>('/admin/menu/categories', {
    method: 'POST',
    body:   JSON.stringify(data),
  });

export const updateCategory = (id: string, data: Partial<CategoryForm>): Promise<AdminCategory> =>
  apiFetch<AdminCategory>(`/admin/menu/categories/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(data),
  });

export const deleteCategory = (id: string): Promise<void> =>
  apiFetch<void>(`/admin/menu/categories/${id}`, { method: 'DELETE' });

// ── CRUD Items ───────────────────────────────────────────────
export const getAdminItems = (categoryId?: string): Promise<AdminMenuItem[]> => {
  const query = categoryId ? `?category=${categoryId}` : '';
  return apiFetch<AdminMenuItem[]>(`/admin/menu/items${query}`);
};

export const createMenuItem = (data: MenuItemForm): Promise<AdminMenuItem> =>
  apiFetch<AdminMenuItem>('/admin/menu/items', {
    method: 'POST',
    body:   JSON.stringify(data),
  });

export const updateMenuItem = (id: string, data: Partial<MenuItemForm>): Promise<AdminMenuItem> =>
  apiFetch<AdminMenuItem>(`/admin/menu/items/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(data),
  });

export const deleteMenuItem = (id: string): Promise<void> =>
  apiFetch<void>(`/admin/menu/items/${id}`, { method: 'DELETE' });

export const toggleItemAvailability = (id: string, is_available: boolean): Promise<AdminMenuItem> =>
  apiFetch<AdminMenuItem>(`/admin/menu/items/${id}/availability`, {
    method: 'PATCH',
    body:   JSON.stringify({ is_available }),
  });

// ── CRUD Usuarios ────────────────────────────────────────────
export const getAdminUsers = (): Promise<AdminUser[]> =>
  apiFetch<AdminUser[]>('/admin/users');

export const createUser = (data: UserForm): Promise<AdminUser> =>
  apiFetch<AdminUser>('/admin/users', {
    method: 'POST',
    body:   JSON.stringify(data),
  });

export const updateUser = (id: string, data: Partial<UserForm>): Promise<AdminUser> =>
  apiFetch<AdminUser>(`/admin/users/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(data),
  });

export const toggleUserActive = (id: string, is_active: boolean): Promise<AdminUser> =>
  apiFetch<AdminUser>(`/admin/users/${id}/toggle`, {
    method: 'PATCH',
    body:   JSON.stringify({ is_active }),
  });

export const resetPassword = (id: string, newPassword: string): Promise<{ message: string }> =>
  apiFetch<{ message: string }>(`/admin/users/${id}/reset-password`, {
    method: 'POST',
    body:   JSON.stringify({ new_password: newPassword }),
  });

// ── Configuración ────────────────────────────────────────────
export const getSettings = (): Promise<RestaurantSettings> =>
  apiFetch<RestaurantSettings>('/admin/settings');

export const saveSettings = (data: RestaurantSettings): Promise<RestaurantSettings> =>
  apiFetch<RestaurantSettings>('/admin/settings', {
    method: 'PUT',
    body:   JSON.stringify(data),
  });