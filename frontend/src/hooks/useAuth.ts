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

// Usar ruta relativa /api para que funcione tanto en localhost como en ngrok/producción.
// VITE_API_URL solo se usa si está explícitamente definido en .env del frontend.
const API = import.meta.env.VITE_API_URL ?? '/api';

// Roles que pueden acceder desde cualquier modalidad sin restricción de selección.
// Para el resto, el rol del backend debe coincidir con el rol seleccionado en RoleSelectPage.
const GLOBAL_ROLES = new Set(['cocina', 'admin', 'superusuario']);

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

      // Validar que el usuario tenga el rol seleccionado en RoleSelectPage.
      // Los roles globales (cocina, admin, superusuario) siempre pueden ingresar.
      const backendRole  = data.user.role;
      const selectedRole = useAppStore.getState().role;

      if (
        selectedRole &&
        !GLOBAL_ROLES.has(backendRole) &&
        backendRole !== selectedRole
      ) {
        const label = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
        setError(`Acceso denegado. Esta sección es solo para el rol "${label}".`);
        return;
      }

      saveToken(data.token);
      setUser({ ...data.user, token: data.token });

      // Siempre usar el rol que devuelve el backend para navegar.
      const modeKey = mode ?? 'autoservicio';
      const dest    = ROLE_ROUTES[modeKey]?.[backendRole]
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