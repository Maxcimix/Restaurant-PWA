// ============================================================
// frontend/src/App.tsx  —  Fase 8 (actualizado)
// NUEVAS RUTAS: /admin/dashboard, /admin/menu, /admin/users,
//               /admin/reports, /admin/settings
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home             from './pages/Home';
import RoleSelectPage   from './pages/RoleSelectPage';
import LoginPage        from './pages/LoginPage';
import ProtectedRoute   from './components/auth/ProtectedRoute';

// Fase 3
import ClientMenu       from './pages/ClientMenu';
import Checkout         from './pages/Checkout';
import OrderTracker     from './pages/OrderTracker';

// Fase 4
import CajaAutoservicio from './pages/caja/CajaAutoservicio';

// Fase 5
import KDS              from './pages/cocina/KDS';

// Fase 6
import TableDashboard   from './pages/mesero/TableDashboard';
import TakeOrder        from './pages/mesero/TakeOrder';

// Fase 7
import CajaMesero       from './pages/cashier/CajaMesero';

// Fase 8 — Admin
import Dashboard        from './pages/admin/Dashboard';
import MenuMgmt         from './pages/admin/MenuMgmt';
import UsersMgmt        from './pages/admin/UsersMgmt';
import Reports          from './pages/admin/Reports';
import Settings         from './pages/admin/Settings';

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

        {/* Fase 3 */}
        <Route path="/autoservicio/menu"        element={<ClientMenu />} />
        <Route path="/autoservicio/checkout"    element={<Checkout />} />
        <Route path="/autoservicio/tracker/:id" element={<OrderTracker />} />

        {/* Fase 4 */}
        <Route path="/autoservicio/caja"
          element={<ProtectedRoute allowedRoles={['caja','admin']}><CajaAutoservicio /></ProtectedRoute>} />

        {/* Fase 5 */}
        <Route path="/cocina/kds"
          element={<ProtectedRoute allowedRoles={['cocina','admin']}><KDS /></ProtectedRoute>} />

        {/* Fase 6 */}
        <Route path="/mesero/dashboard"
          element={<ProtectedRoute allowedRoles={['mesero','admin']}><TableDashboard /></ProtectedRoute>} />
        <Route path="/mesero/orden/:tableId"
          element={<ProtectedRoute allowedRoles={['mesero','admin']}><TakeOrder /></ProtectedRoute>} />

        {/* Fase 7 */}
        <Route path="/caja/dashboard"
          element={<ProtectedRoute allowedRoles={['caja','admin']}><CajaMesero /></ProtectedRoute>} />

        {/* Fase 8 — Admin Dashboard */}
        <Route path="/admin/dashboard"
          element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/menu"
          element={<ProtectedRoute allowedRoles={['admin']}><MenuMgmt /></ProtectedRoute>} />
        <Route path="/admin/users"
          element={<ProtectedRoute allowedRoles={['admin']}><UsersMgmt /></ProtectedRoute>} />
        <Route path="/admin/reports"
          element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
        <Route path="/admin/settings"
          element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}