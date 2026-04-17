import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Mode = 'autoservicio' | 'mesero' | null;

export type Role =
  | 'cliente'
  | 'mesero'
  | 'cocina'
  | 'caja'
  | 'admin'
  | null;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  token: string;
}

interface AppState {
  mode: Mode;
  role: Role;
  user: AuthUser | null;
  isAuthenticated: boolean;
  // actions
  setMode: (mode: Mode) => void;
  setRole: (role: Role) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: null,
      role: null,
      user: null,
      isAuthenticated: false,

      setMode: (mode) => set({ mode, role: null }),
      setRole: (role) => set({ role }),
      setUser: (user) => set({ user, isAuthenticated: true }),
      logout: () =>
        set({ user: null, isAuthenticated: false, role: null, mode: null }),
    }),
    { name: 'rpwa-app-store' }
  )
);