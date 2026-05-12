import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Palette, Settings, Store, LogOut } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import '../../styles/admin.css';

const NAV_ITEMS = [
  { to: '/superuser/brand',     label: 'Marca',          desc: 'Nombre y logo',          icon: <Palette size={18}/> },
  { to: '/superuser/operation', label: 'Modo Operación', desc: 'Autoservicio / Mesero',  icon: <Settings size={18}/> },
  { to: '/superuser/general',   label: 'General',        desc: 'IVA, propina, moneda',   icon: <Store size={18}/> },
];

export default function SuperuserLayout() {
  const { logout, user } = useAppStore();
  const navigate = useNavigate();

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <div className="admin-logo-icon">
            <Settings size={20}/>
          </div>
          <div>
            <p className="admin-logo-name">Sistema</p>
            <p className="admin-logo-role">Superusuario</p>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
              }>
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">
              {user?.name?.charAt(0).toUpperCase() ?? 'S'}
            </div>
            <div>
              <p className="admin-user-name">{user?.name ?? 'Super Admin'}</p>
              <p className="admin-user-email">{user?.email ?? ''}</p>
            </div>
          </div>
          <button type="button" className="admin-logout-btn"
            onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={16}/>
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}