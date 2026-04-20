// ============================================================
// frontend/src/App.tsx  —  Fase 5 (actualizado)
//
// CAMBIO: /cocina/kds ahora carga KDS.tsx real en lugar de <Soon>
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home              from './pages/Home';
import RoleSelectPage    from './pages/RoleSelectPage';
import LoginPage         from './pages/LoginPage';
import ProtectedRoute    from './components/auth/ProtectedRoute';

// Fase 3
import ClientMenu        from './pages/ClientMenu';
import Checkout          from './pages/Checkout';
import OrderTracker      from './pages/OrderTracker';

// Fase 4
import CajaAutoservicio  from './pages/caja/CajaAutoservicio';

// Fase 5 — KDS
import KDS               from './pages/cocina/KDS';

const Soon = ({ label }: { label: string }) => (
  <div style={{
    minHeight: '100svh', background: '#080810', color: '#f0ece6',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '14px', fontFamily: 'sans-serif',
  }}>
    <span style={{ fontSize: 52 }}>🚧</span>
    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{label}</h2>
    <p style={{ color: '#55556a', fontSize: 14 }}>Próxima fase</p>
    <a href="/" style={{ color: '#f97316', fontSize: 13, textDecoration: 'none' }}>← Inicio</a>
  </div>
);

const Unauthorized = () => (
  <div style={{
    minHeight: '100svh', background: '#080810', color: '#f0ece6',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '14px', fontFamily: 'sans-serif',
  }}>
    <span style={{ fontSize: 52 }}>🔒</span>
    <h2 style={{ margin: 0 }}>Acceso denegado</h2>
    <a href="/" style={{ color: '#f97316', fontSize: 13, textDecoration: 'none' }}>← Inicio</a>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Fase 2 */}
        <Route path="/"            element={<Home />} />
        <Route path="/select-role" element={<RoleSelectPage />} />
        <Route path="/login"       element={<LoginPage />} />

        {/* Fase 3: Cliente autoservicio (sin login) */}
        <Route path="/autoservicio/menu"        element={<ClientMenu />} />
        <Route path="/autoservicio/checkout"    element={<Checkout />} />
        <Route path="/autoservicio/tracker/:id" element={<OrderTracker />} />

        {/* Fase 4: Caja autoservicio */}
        <Route
          path="/autoservicio/caja"
          element={
            <ProtectedRoute allowedRoles={['caja', 'admin']}>
              <CajaAutoservicio />
            </ProtectedRoute>
          }
        />

        {/* Fase 5: Kitchen Display System */}
        <Route
          path="/cocina/kds"
          element={
            <ProtectedRoute allowedRoles={['cocina', 'admin']}>
              <KDS />
            </ProtectedRoute>
          }
        />

        {/* Fases futuras */}
        <Route
          path="/mesero/dashboard"
          element={
            <ProtectedRoute allowedRoles={['mesero', 'admin']}>
              <Soon label="Dashboard Mesero" />
            </ProtectedRoute>
          }
        />
        <Route path="/mesero/menu-cliente" element={<Soon label="Menú Cliente (Mesero)" />} />
        <Route
          path="/caja/dashboard"
          element={
            <ProtectedRoute allowedRoles={['caja', 'admin']}>
              <Soon label="Caja — Modo Mesero" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Soon label="Dashboard Admin" />
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
