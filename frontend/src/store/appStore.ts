// ============================================================
// frontend/src/store/appStore.ts
//
// operationMode → configuración del restaurante (viene del servidor).
//   'autoservicio' = solo kiosco QR
//   'mesero'       = solo servicio con mesero
//   'ambos'        = los dos modos disponibles
//
// mode → selección de sesión del usuario (autoservicio | mesero).
//   Si operationMode !== 'ambos', se auto-establece al iniciar.
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OperationMode = 'autoservicio' | 'mesero' | 'ambos';
export type Mode = 'autoservicio' | 'mesero' | null;

export type Role =
  | 'cliente' | 'mesero' | 'cocina' | 'caja' | 'admin' | 'superusuario' | null;

export interface AuthUser {
  id: string; name: string; email: string; role: string; token: string;
}

export interface BrandConfig {
  restaurantName: string;
  logoUrl:        string | null;
  primaryColor:   string;
  secondaryColor: string;
  accentColor:    string;
  taxRate:        number;
  tipSuggestion:  number;
  currency:       string;
  timezone:       string;
}

const DEFAULT_BRAND: BrandConfig = {
  restaurantName: 'Mi Restaurante', logoUrl: null,
  primaryColor: '#f97316', secondaryColor: '#1e1e2e', accentColor: '#ffffff',
  taxRate: 0, tipSuggestion: 0, currency: 'COP', timezone: 'America/Bogota',
};

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

function applyCssVars(brand: BrandConfig) {
  const root = document.documentElement;
  root.style.setProperty('--clr-primary',   brand.primaryColor);
  root.style.setProperty('--clr-bg',        brand.secondaryColor);
  root.style.setProperty('--clr-text',      brand.accentColor);
}

interface AppState {
  operationMode: OperationMode;
  mode: Mode;
  role: Role;
  user: AuthUser | null;
  isAuthenticated: boolean;
  configLoaded: boolean;
  brand: BrandConfig;
  setOperationMode: (m: OperationMode) => void;
  setMode: (mode: Mode) => void;
  setRole: (role: Role) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  loadConfig: () => Promise<void>;
  reloadConfig: () => Promise<void>;
  setBrand: (brand: Partial<BrandConfig>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      operationMode: 'ambos', mode: null, role: null, user: null,
      isAuthenticated: false, configLoaded: false, brand: DEFAULT_BRAND,

      setOperationMode: (operationMode) => {
        const update: Partial<AppState> = { operationMode };
        if (operationMode !== 'ambos') update.mode = operationMode as Mode;
        set(update);
      },
      setMode: (mode) => set({ mode, role: null }),
      setRole: (role) => set({ role }),
      setUser: (user) => set({ user, isAuthenticated: true }),
      logout: () => set((s) => ({
        user: null, isAuthenticated: false, role: null,
        mode: s.operationMode === 'ambos' ? null : s.mode,
      })),
      setBrand: (partial) => {
        const next = { ...get().brand, ...partial };
        set({ brand: next });
        applyCssVars(next);
      },
      loadConfig: async () => {
        try {
          const res = await fetch(`${API_BASE}/config`);
          if (!res.ok) throw new Error('config fetch failed');
          const data = await res.json();
          const brand: BrandConfig = {
            restaurantName: data.restaurantName ?? DEFAULT_BRAND.restaurantName,
            logoUrl:        data.logoUrl        ?? null,
            primaryColor:   data.primaryColor   ?? DEFAULT_BRAND.primaryColor,
            secondaryColor: data.secondaryColor ?? DEFAULT_BRAND.secondaryColor,
            accentColor:    data.accentColor    ?? DEFAULT_BRAND.accentColor,
            taxRate:        data.taxRate        ?? 0,
            tipSuggestion:  data.tipSuggestion  ?? 0,
            currency:       data.currency       ?? DEFAULT_BRAND.currency,
            timezone:       data.timezone       ?? DEFAULT_BRAND.timezone,
          };
          get().setOperationMode(data.operationMode ?? 'ambos');
          set({ brand, configLoaded: true });
          applyCssVars(brand);
        } catch {
          set({ operationMode: 'ambos', configLoaded: true });
        }
      },
      reloadConfig: async () => {
        set({ configLoaded: false });
        await get().loadConfig();
      },
    }),
    {
      name: 'rpwa-app-store',
      partialize: (s) => ({
        mode: s.mode, role: s.role, user: s.user,
        isAuthenticated: s.isAuthenticated, brand: s.brand,
      }),
    }
  )
);