import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { loginRequest, saveToken, removeToken } from '../services/auth';

// Rutas de destino por rol y modalidad
const ROLE_ROUTES: Record<string, Record<string, string>> = {
  autoservicio: {
    cliente: '/autoservicio/menu',
    caja:    '/autoservicio/caja',
    cocina:  '/cocina/kds',
    admin:   '/admin/dashboard',
  },
  mesero: {
    cliente: '/mesero/menu-cliente',
    mesero:  '/mesero/dashboard',
    cocina:  '/cocina/kds',
    caja:    '/caja/dashboard',
    admin:   '/admin/dashboard',
  },
};

export function useAuth() {
  const navigate         = useNavigate();
  const { setUser, logout: storeLogout, mode, role } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await loginRequest({ email, password });
      saveToken(data.token);
      setUser(data.user);

      // Redirige según modo + rol
      const modeKey = mode ?? 'autoservicio';
      const roleKey = role ?? data.user.role;
      const dest    = ROLE_ROUTES[modeKey]?.[roleKey] ?? '/';
      navigate(dest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    removeToken();
    storeLogout();
    navigate('/');
  }

  return { login, logout, loading, error };
}