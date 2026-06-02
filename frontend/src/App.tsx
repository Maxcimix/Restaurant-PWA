// ============================================================
// frontend/src/App.tsx  —  Fase 9 (actualizado)
//
// CAMBIOS vs Fase 8:
//   + Rutas admin: /inventario, /proveedores, /recetas, /inventario/movimientos
//   + Ruta cocina: /cocina/bodega
//   - Eliminado import de TableValidator.tsx (no estaba en ninguna ruta)
// ============================================================
import TablesMgmt from './pages/admin/TablesMgmt';
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';

import Home             from './pages/Home';
import RoleSelectPage   from './pages/RoleSelectPage';
import LoginPage        from './pages/LoginPage';
import ProtectedRoute   from './components/auth/ProtectedRoute';


import ClientMenu       from './pages/ClientMenu';
import Checkout         from './pages/Checkout';
import OrderTracker     from './pages/OrderTracker';


import CajaAutoservicio from './pages/caja/CajaAutoservicio';


import KDS              from './pages/cocina/KDS';


import TableDashboard   from './pages/mesero/TableDashboard';
import TakeOrder        from './pages/mesero/TakeOrder';


import CajaMesero       from './pages/cashier/CajaMesero';


import Dashboard        from './pages/admin/Dashboard';
import MenuMgmt         from './pages/admin/MenuMgmt';
import UsersMgmt        from './pages/admin/UsersMgmt';
import Reports          from './pages/admin/Reports';
import Settings         from './pages/admin/Settings';


import InventoryDashboard from './pages/admin/InventoryDashboard';
import SupplierManager    from './pages/admin/SupplierManager';
import RecipeEditor       from './pages/admin/RecipeEditor';
import MovementsLog       from './pages/admin/MovementsLog';
import BodegaView         from './pages/cocina/BodegaView';

import MenuCliente from './pages/MenuCliente';

import SuperuserLayout  from './components/admin/SuperuserLayout';
import BrandSettings    from './pages/superuser/BrandSettings';
import OperationMode    from './pages/superuser/OperationMode';
import GeneralSettings  from './pages/superuser/GeneralSettings';
const Unauthorized = () => (
  <div style={{
    minHeight: '100svh', background: '#f0ece6', color: '#080810',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '14px', fontFamily: 'sans-serif',
  }}>
    <h2 style={{ margin: 0 }}>Acceso denegado</h2>
    <a href="/" style={{ color: '#f97316', fontSize: 13, textDecoration: 'none' }}>← Inicio</a>
  </div>
);

export default function App() {
  const { loadConfig, operationMode } = useAppStore();

  useEffect(() => { loadConfig(); }, [loadConfig]);

useEffect(() => {
  const handler = () => { useAppStore.getState().reloadConfig(); };
  window.addEventListener('rpwa:config-update', handler);
  return () => window.removeEventListener('rpwa:config-update', handler);
}, []);

  const hasAutoservicio = operationMode === 'autoservicio' || operationMode === 'ambos';
  const hasMesero       = operationMode === 'mesero'       || operationMode === 'ambos';

  return (
    <BrowserRouter>
      <Routes>
        {/* Siempre disponibles */}
        <Route path="/"            element={<Home />} />
        <Route path="/select-role" element={<RoleSelectPage />} />
        <Route path="/login"       element={<LoginPage />} />

        {/* ── Módulo Autoservicio ── */}
        {hasAutoservicio && (
          <>
            <Route path="/autoservicio/menu"        element={<ClientMenu />} />
            <Route path="/autoservicio/checkout"    element={<Checkout />} />
            <Route path="/autoservicio/tracker/:id" element={<OrderTracker />} />
            <Route path="/autoservicio/caja"
              element={<ProtectedRoute allowedRoles={['caja','admin']}><CajaAutoservicio /></ProtectedRoute>} />
          </>
        )}

        {/* ── Módulo Mesero ── */}
        {hasMesero && (
          <>
            <Route path="/mesero/dashboard"
              element={<ProtectedRoute allowedRoles={['mesero','admin']}><TableDashboard /></ProtectedRoute>} />
            <Route path="/mesero/orden/:tableId"
              element={<ProtectedRoute allowedRoles={['mesero','admin']}><TakeOrder /></ProtectedRoute>} />
            <Route path="/caja/dashboard"
              element={<ProtectedRoute allowedRoles={['caja','admin']}><CajaMesero /></ProtectedRoute>} />
          </>
        )}

        {/* ── Cocina ── */}
        <Route path="/cocina/kds"
          element={<ProtectedRoute allowedRoles={['cocina','admin']}><KDS /></ProtectedRoute>} />
        <Route path="/cocina/bodega"
          element={<ProtectedRoute allowedRoles={['cocina','admin']}><BodegaView /></ProtectedRoute>} />

        {/* ── Admin — Fases 8 ── */}
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
          <Route path="/admin/mesas"
  element={<ProtectedRoute allowedRoles={['admin']}><TablesMgmt /></ProtectedRoute>} />

        {/* ── Admin — Fase 9: Inventario ── */}
        <Route path="/admin/inventario"
          element={<ProtectedRoute allowedRoles={['admin']}><InventoryDashboard /></ProtectedRoute>} />
        <Route path="/admin/inventario/movimientos"
          element={<ProtectedRoute allowedRoles={['admin']}><MovementsLog /></ProtectedRoute>} />
        <Route path="/admin/proveedores"
          element={<ProtectedRoute allowedRoles={['admin']}><SupplierManager /></ProtectedRoute>} />
        <Route path="/admin/recetas"
          element={<ProtectedRoute allowedRoles={['admin']}><RecipeEditor /></ProtectedRoute>} />

<Route path="/mesero/menu-cliente" element={<MenuCliente />} />
<Route path="/superuser"
  element={<ProtectedRoute allowedRoles={['superusuario']}><SuperuserLayout /></ProtectedRoute>}>
  <Route index          element={<Navigate to="/superuser/brand" replace />} />
  <Route path="brand"     element={<BrandSettings />} />
  <Route path="operation" element={<OperationMode />} />
  <Route path="general"   element={<GeneralSettings />} />
</Route>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
