import { useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { ToastContainer } from './ui'
import { LOGO_URL } from '../utils/helpers'
import Dashboard from '../pages/Dashboard'
import Commercial from '../pages/Commercial'
import Accounts from '../pages/Accounts'
import Operations from '../pages/Operations'
import Marketing from '../pages/Marketing'
import Stations from '../pages/Stations'
import EaziGas from '../pages/EaziGas'
import ESG from '../pages/ESG'
import Settings from '../pages/Settings'
import Users from '../pages/Users'
import CRM from '../pages/CRM'
import HR from '../pages/HR'
import Updates from '../pages/Updates'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', badge: 'DB', path: '/' },
  { id: 'commercial', label: 'Commercial', badge: 'CM', path: '/commercial' },
  { id: 'crm', label: 'CRM', badge: 'CR', path: '/crm' },
  { id: 'accounts', label: 'Accounts', badge: 'AC', path: '/accounts' },
  { id: 'operations', label: 'Operations', badge: 'OP', path: '/operations' },
  { id: 'marketing', label: 'Branding', badge: 'MK', path: '/marketing' },
  { id: 'hr', label: 'HR', badge: 'HR', path: '/hr' },
  { id: 'updates', label: 'Updates', badge: 'UP', path: '/updates' },
  { id: 'stations', label: 'LPG Stations', badge: 'ST', path: '/stations' },
  { id: 'eazigas', label: 'EaziGas', badge: 'EG', path: '/eazigas' },
  { id: 'esg', label: 'ESG Compliance', badge: 'ES', path: '/esg' },
  { id: 'users', label: 'Users', badge: 'US', path: '/users' },
  { id: 'settings', label: 'Settings', badge: 'SE', path: '/settings' },
]

function Protected({ moduleId, children }) {
  const { canAccess } = useAuth()
  if (!canAccess(moduleId)) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--r)', marginBottom: 8 }}>Access Restricted</div>
        <div style={{ fontSize: 13, color: 'var(--m)' }}>You do not have permission to access this module. Contact your administrator.</div>
      </div>
    )
  }
  return children
}

export default function AppShell() {
  const { state } = useApp()
  const { session, logout, canAccess } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)

  const pendingOrders = state.db.orders.filter(order => order.status === 'Awaiting Ops Review').length
  const unreadCommercial = state.db.cnotifs.filter(item => !item.read).length
  const unreadAccounts = state.db.anotifs.filter(item => !item.read).length
  const unreadUpdates = state.db.broadcasts.filter(item => !item.read).length
  const totalAlerts = pendingOrders + unreadCommercial + unreadAccounts + unreadUpdates

  function alertCount(id) {
    if (id === 'operations') return pendingOrders
    if (id === 'commercial') return unreadCommercial
    if (id === 'accounts') return unreadAccounts
    if (id === 'updates') return unreadUpdates
    return 0
  }

  function toggleDark() {
    document.body.classList.toggle('dark')
  }

  function toggleSb() {
    document.getElementById('sb')?.classList.toggle('on')
    document.getElementById('sbov')?.classList.toggle('on')
  }

  function closeSb() {
    document.getElementById('sb')?.classList.remove('on')
    document.getElementById('sbov')?.classList.remove('on')
  }

  const visibleNav = NAV.filter(item => canAccess(item.id))
  const roleLabel = {
    admin: 'Administrator',
    manager: 'Manager',
    sales_rep: 'Sales Rep',
    accountant: 'Accounts',
    operations: 'Operations',
    viewer: 'Viewer',
  }

  return (
    <>
      <div id="shell">
        <div id="sbov" onClick={closeSb} />
        <div id="sb">
          <div className="sbl">
            <button id="sbcl" onClick={closeSb}>x</button>
            <img src={LOGO_URL} alt="Henos Energy" onError={event => { event.target.style.display = 'none' }} />
            <div className="sberp">ERP System</div>
          </div>

          <div style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,.05)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {session?.avatar || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.name || 'User'}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{roleLabel[session?.role] || session?.role}</div>
              </div>
            </div>
          </div>

          <nav id="sbnav">
            {visibleNav.map(item => {
              const count = alertCount(item.id)
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={closeSb}
                  className={({ isActive }) => `nb${isActive ? ' on' : count > 0 ? ' al' : ''}`}
                >
                  <span style={{ minWidth: 28, height: 22, borderRadius: 6, background: 'rgba(255,255,255,.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'inherit' }}>
                    {item.badge}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {count > 0 && <span style={{ background: 'var(--am)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 6px' }}>{count}</span>}
                </NavLink>
              )
            })}
          </nav>

          <div className="sbft">
            <div>v8.0 - 2026</div>
            <div style={{ marginTop: 2, color: '#333' }}>Henos Energy Ltd.</div>
            <button
              onClick={() => setLogoutOpen(true)}
              style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 11px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#888', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <span style={{ width: 18, height: 18, borderRadius: 6, background: 'rgba(255,255,255,.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>LO</span>
              <span>Log Out</span>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div id="topbar">
            <button className="hbg" onClick={toggleSb}>=</button>
            <img className="tlo" src={LOGO_URL} alt="Henos" onError={event => { event.target.style.display = 'none' }} />
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: '4px 8px' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                {session?.avatar || '?'}
              </div>
              <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>{session?.name?.split(' ')[0]}</span>
            </div>
            {totalAlerts > 0 && <span className="tac">{totalAlerts}</span>}
          </div>

          <div id="main">
            <Routes>
              <Route path="/" element={<Protected moduleId="dashboard"><Dashboard /></Protected>} />
              <Route path="/commercial" element={<Protected moduleId="commercial"><Commercial /></Protected>} />
              <Route path="/crm" element={<Protected moduleId="crm"><CRM /></Protected>} />
              <Route path="/accounts" element={<Protected moduleId="accounts"><Accounts /></Protected>} />
              <Route path="/operations" element={<Protected moduleId="operations"><Operations /></Protected>} />
              <Route path="/marketing" element={<Protected moduleId="marketing"><Marketing /></Protected>} />
              <Route path="/hr" element={<Protected moduleId="hr"><HR /></Protected>} />
              <Route path="/updates" element={<Protected moduleId="updates"><Updates /></Protected>} />
              <Route path="/stations" element={<Protected moduleId="stations"><Stations /></Protected>} />
              <Route path="/eazigas" element={<Protected moduleId="eazigas"><EaziGas /></Protected>} />
              <Route path="/esg" element={<Protected moduleId="esg"><ESG /></Protected>} />
              <Route path="/users" element={<Protected moduleId="users"><Users /></Protected>} />
              <Route path="/settings" element={<Protected moduleId="settings"><Settings /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>

      <button id="dm-toggle" onClick={toggleDark}>DM</button>

      {logoutOpen && (
        <div className="mov on" onClick={event => { if (event.target === event.currentTarget) setLogoutOpen(false) }}>
          <div className="mdl" style={{ borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {session?.avatar || '?'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{session?.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{session?.id}</div>
              </div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ fontSize: 13, color: 'var(--m)', marginBottom: 20 }}>Are you sure you want to log out? Your session will end.</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btng btnmd" onClick={() => setLogoutOpen(false)}>Stay Logged In</button>
                <button className="btn btnd btnmd" onClick={logout}>Log Out</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </>
  )
}
