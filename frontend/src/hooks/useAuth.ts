// frontend/src/hooks/useAuth.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { loginRequest, saveToken, removeToken, getToken } from '../services/auth';

const ROLE_ROUTES: Record<string, Record<string, string>> = {
  autoservicio: {
    cliente:      '/autoservicio/menu',
    caja:         '/autoservicio/caja',
    cocina:       '/cocina/kds',
    admin:        '/admin/dashboard',
    superusuario: '/superuser/brand',
  },
  mesero: {
    cliente:      '/mesero/menu-cliente',
    mesero:       '/mesero/dashboard',
    cocina:       '/cocina/kds',
    caja:         '/caja/dashboard',
    admin:        '/admin/dashboard',
    superusuario: '/superuser/brand',
  },
};

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export function useAuth() {
  const navigate = useNavigate();
  const { setUser, logout: storeLogout, mode } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await loginRequest({ email, password });
      saveToken(data.token);
      setUser({ ...data.user, token: data.token });

      // Siempre usar el rol que devuelve el backend para navegar.
      // NO usar el rol del store (RoleSelectPage), ya que puede ser distinto
      // al rol real del usuario (ej: superusuario no aparece en RoleSelectPage).
      const backendRole = data.user.role;
      const modeKey     = mode ?? 'autoservicio';
      const dest        = ROLE_ROUTES[modeKey]?.[backendRole]
                       ?? ROLE_ROUTES['autoservicio']?.[backendRole]
                       ?? '/';
      navigate(dest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    const token = getToken();

    // Notificar al backend para agregar el token a la blacklist de Redis
    if (token) {
      try {
        await fetch(`${API}/auth/logout`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Si falla la petición, igual limpiamos localmente
        console.warn('[Auth] No se pudo notificar logout al servidor');
      }
    }

    removeToken();
    storeLogout();
    navigate('/');
  }

  return { login, logout, loading, error };
}