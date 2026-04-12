import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home            from './pages/Home';
import RoleSelectPage  from './pages/RoleSelectPage';
import LoginPage       from './pages/LoginPage';
import ProtectedRoute  from './components/auth/ProtectedRoute';

// ─── Placeholders para fases futuras ────────────────────────────────────────
const Soon = ({ label }: { label: string }) => (
  <div style={{
    minHeight:'100svh', background:'#080810', color:'#f0ece6',
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', gap:'14px',
    fontFamily:'Satoshi, sans-serif',
  }}>
    <span style={{ fontSize:52, lineHeight:1 }}>🚧</span>
    <h2 style={{ margin:0, fontSize:26, fontWeight:800, letterSpacing:'-0.5px' }}>{label}</h2>
    <p style={{ color:'#55556a', fontSize:14 }}>En desarrollo — próxima fase</p>
    <a href="/" style={{ color:'#f97316', fontSize:13, marginTop:8, textDecoration:'none' }}>← Volver al inicio</a>
  </div>
);

// ─── Unauthorized ────────────────────────────────────────────────────────────
const Unauthorized = () => (
  <div style={{
    minHeight:'100svh', background:'#080810', color:'#f0ece6',
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', gap:'14px', fontFamily:'Satoshi, sans-serif',
  }}>
    <span style={{ fontSize:52 }}>🔒</span>
    <h2 style={{ margin:0, fontSize:26, fontWeight:800 }}>Acceso denegado</h2>
    <p style={{ color:'#55556a', fontSize:14 }}>Tu rol no tiene permiso para ver esta sección.</p>
    <a href="/" style={{ color:'#f97316', fontSize:13, marginTop:8, textDecoration:'none' }}>← Inicio</a>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── FASE 2: Flujo de acceso ── */}
        <Route path="/"            element={<Home />} />
        <Route path="/select-role" element={<RoleSelectPage />} />
        <Route path="/login"       element={<LoginPage />} />

        {/* ── FASE 3: Cliente autoservicio (sin login) ── */}
        <Route path="/autoservicio/menu"
          element={<Soon label="Menú Autoservicio" />}
        />

        {/* ── FASE 4: Caja autoservicio ── */}
        <Route path="/autoservicio/caja"
          element={
            <ProtectedRoute allowedRoles={['caja', 'admin']}>
              <Soon label="Caja Autoservicio" />
            </ProtectedRoute>
          }
        />

        {/* ── FASE 5: KDS Cocina ── */}
        <Route path="/cocina/kds"
          element={
            <ProtectedRoute allowedRoles={['cocina', 'admin']}>
              <Soon label="Kitchen Display System" />
            </ProtectedRoute>
          }
        />

        {/* ── FASE 6: Mesero ── */}
        <Route path="/mesero/dashboard"
          element={
            <ProtectedRoute allowedRoles={['mesero', 'admin']}>
              <Soon label="Dashboard Mesero" />
            </ProtectedRoute>
          }
        />
        <Route path="/mesero/menu-cliente"
          element={<Soon label="Menú Cliente (Con Mesero)" />}
        />

        {/* ── FASE 7: Caja mesero ── */}
        <Route path="/caja/dashboard"
          element={
            <ProtectedRoute allowedRoles={['caja', 'admin']}>
              <Soon label="Caja — Modo Mesero" />
            </ProtectedRoute>
          }
        />

        {/* ── FASE 8: Admin ── */}
        <Route path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Soon label="Dashboard Admin" />
            </ProtectedRoute>
          }
        />

        {/* ── Fallbacks ── */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*"             element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}