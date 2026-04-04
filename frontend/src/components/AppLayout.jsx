// src/components/AppLayout.jsx
// Layout principal: sidebar en desktop, barra inferior en móvil

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore.js'

const NAV_ITEMS = [
  { to: '/dashboard',  icon: '📊', label: 'Dashboard'  },
  { to: '/recetario',  icon: '📖', label: 'Recetario'  },
  { to: '/inventario', icon: '📦', label: 'Inventario' },
  { to: '/pedidos',    icon: '🛒', label: 'Pedidos'    },
  { to: '/ia',         icon: '✦',  label: 'Dulce IA'   },
  { to: '/config',     icon: '⚙️',  label: 'Config'     }
]

export function AppLayout() {
  const { user, activeWorkspace, logout } = useAppStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={s.shell}>
      {/* Sidebar — desktop */}
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <span style={{ fontSize: 24 }}>🍰</span>
          <div>
            <p style={s.brandName}>DulceApp</p>
            {activeWorkspace && <p style={s.brandWs}>{activeWorkspace.nombre}</p>}
          </div>
        </div>

        <nav style={s.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navLinkActive : {}) })}
            >
              <span style={s.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          {user && <p style={s.userName}>{user.nombre}</p>}
          <button style={s.logoutBtn} onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main style={s.main}>
        <div style={s.content}>
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — móvil */}
      <nav style={s.bottomNav}>
        {NAV_ITEMS.slice(0, 5).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({ ...s.bottomItem, ...(isActive ? s.bottomItemActive : {}) })}
          >
            <span style={s.bottomIcon}>{item.icon}</span>
            <span style={s.bottomLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

const s = {
  shell: {
    display: 'flex',
    minHeight: '100dvh'
  },
  sidebar: {
    width: 220,
    background: '#fff',
    borderRight: '1px solid rgba(0,0,0,0.07)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.25rem 0',
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    zIndex: 100,
    '@media (maxWidth: 768px)': { display: 'none' }
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 1.25rem 1.25rem',
    borderBottom: '1px solid rgba(0,0,0,0.06)'
  },
  brandName: { fontSize: 15, fontWeight: 700, color: '#3D2B7A' },
  brandWs:   { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  nav: { flex: 1, padding: '0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 2 },
  navLink: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8,
    fontSize: 14, color: '#6b7280', textDecoration: 'none',
    transition: 'background 0.1s'
  },
  navLinkActive: { background: '#ede9ff', color: '#7B61C4', fontWeight: 600 },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  sidebarFooter: {
    padding: '1rem 1.25rem 0',
    borderTop: '1px solid rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column', gap: 8
  },
  userName:  { fontSize: 12, color: '#9ca3af' },
  logoutBtn: {
    padding: '7px 12px', borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.1)',
    background: 'none', cursor: 'pointer',
    fontSize: 13, color: '#6b7280', textAlign: 'left'
  },
  main: {
    flex: 1,
    marginLeft: 220,
    paddingBottom: 72  // espacio para bottom nav en móvil
  },
  content: {
    padding: '1.5rem',
    maxWidth: 1100,
    margin: '0 auto'
  },
  // Bottom navigation (móvil)
  bottomNav: {
    display: 'none',
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    background: '#fff',
    borderTop: '1px solid rgba(0,0,0,0.08)',
    zIndex: 200,
    padding: '6px 0 calc(6px + env(safe-area-inset-bottom))'
  },
  bottomItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 2, flex: 1, padding: '4px 0',
    textDecoration: 'none', color: '#9ca3af'
  },
  bottomItemActive: { color: '#7B61C4' },
  bottomIcon:  { fontSize: 20 },
  bottomLabel: { fontSize: 10 }
}

// Inyectar media queries para mostrar/ocultar sidebar y bottom nav
const mq = document.createElement('style')
mq.textContent = `
  @media (max-width: 768px) {
    aside { display: none !important; }
    main  { margin-left: 0 !important; }
    nav[style*="position: fixed"] { display: flex !important; }
  }
  @media (min-width: 769px) {
    nav[style*="position: fixed"][style*="bottom: 0"] { display: none !important; }
  }
`
document.head.appendChild(mq)
