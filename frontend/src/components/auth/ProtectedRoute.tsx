import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

/**
 * Envuelve rutas que requieren autenticación.
 * Si no está autenticado → redirige a /login
 * Si el rol no está permitido → redirige a /unauthorized
 */
export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, user } = useAppStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}