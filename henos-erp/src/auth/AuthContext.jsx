import { createContext, useContext, useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'

export const ALL_MODULES = [
  { id:'dashboard',  label:'Dashboard',       icon:'⬡' },
  { id:'commercial', label:'Commercial',      icon:'◈' },
  { id:'accounts',   label:'Accounts',        icon:'◎' },
  { id:'operations', label:'Operations',      icon:'⬢' },
  { id:'marketing',  label:'Branding & Mktg', icon:'◆' },
  { id:'stations',   label:'LPG Stations',    icon:'⛽' },
  { id:'eazigas',    label:'EaziGas',         icon:'🔄' },
  { id:'esg',        label:'ESG Compliance',  icon:'🌿' },
  { id:'settings',   label:'Settings',        icon:'⚙️' },
  { id:'users',      label:'User Management', icon:'👥' },
]

export const ROLES = [
  { id:'admin',      label:'Administrator',         color:'#dc2626', desc:'Full access to all modules and user management' },
  { id:'manager',    label:'Manager',               color:'#7c3aed', desc:'All modules except user management' },
  { id:'sales_rep',  label:'Sales Representative',  color:'#1a56db', desc:'Commercial + Dashboard' },
  { id:'accountant', label:'Accounts Officer',      color:'#16a34a', desc:'Accounts + Dashboard' },
  { id:'operations', label:'Operations Officer',    color:'#d97706', desc:'Operations + EaziGas + Stations' },
  { id:'viewer',     label:'Viewer / Read-only',    color:'#6b7280', desc:'Dashboard view only' },
]

export const ROLE_DEFAULTS = {
  admin:      ['dashboard','commercial','accounts','operations','marketing','stations','eazigas','esg','settings','users'],
  manager:    ['dashboard','commercial','accounts','operations','marketing','stations','eazigas','esg'],
  sales_rep:  ['dashboard','commercial'],
  accountant: ['dashboard','accounts'],
  operations: ['dashboard','operations','eazigas','stations'],
  viewer:     ['dashboard'],
}

const SESSION_KEY = 'henos_erp_session_v4'

function loadStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveStoredSession(payload) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
  } catch {}
}

function clearStoredSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {}
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [token, setToken] = useState(null)
  const [users, setUsers] = useState([])
  const [loginError, setLoginError] = useState('')
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function restore() {
      const stored = loadStoredSession()
      if (!stored?.token) {
        if (!cancelled) setAuthReady(true)
        return
      }

      if (stored.user && !cancelled) {
        setToken(stored.token)
        setSession({ ...stored.user, token: stored.token })
        setAuthReady(true)
      }

      try {
        const user = await apiGet('/api/auth/me', stored.token)
        if (cancelled) return
        setToken(stored.token)
        setSession({ ...user, token: stored.token })
        saveStoredSession({ token: stored.token, user })
        if (user.role === 'admin') {
          const list = await apiGet('/api/users', stored.token)
          if (!cancelled) setUsers(list)
        }
      } catch {
        clearStoredSession()
        if (!cancelled) {
          setToken(null)
          setSession(null)
          setUsers([])
          setAuthReady(true)
        }
      }
    }

    restore()
    return () => { cancelled = true }
  }, [])

  async function refreshUsers(currentToken = token, currentSession = session) {
    if (!currentToken || currentSession?.role !== 'admin') {
      setUsers([])
      return []
    }
    const list = await apiGet('/api/users', currentToken)
    setUsers(list)
    return list
  }

  async function login(employeeId, password) {
    const id = (employeeId || '').trim().toUpperCase()
    try {
      const result = await apiPost('/api/auth/login', { employeeId: id, password })
      const nextSession = { ...result.user, token: result.token }
      setLoginError('')
      setToken(result.token)
      setSession(nextSession)
      saveStoredSession({ token: result.token, user: result.user })
      if (result.user.role === 'admin') {
        await refreshUsers(result.token, result.user)
      } else {
        setUsers([])
      }
      return true
    } catch (error) {
      setLoginError(error.message || 'Invalid Employee ID or Password.')
      return false
    }
  }

  function logout() {
    setToken(null)
    setSession(null)
    setUsers([])
    setLoginError('')
    clearStoredSession()
  }

  async function createUser(data) {
    const id = genId(data.name)
    const password = data.password || genPass()
    const payload = {
      id,
      password,
      name: data.name,
      role: data.role || 'viewer',
      email: data.email || '',
      phone: data.phone || '',
      department: data.department || '',
      modules: data.modules || ROLE_DEFAULTS[data.role] || ['dashboard'],
      avatar: initials(data.name),
    }
    const created = await apiPost('/api/users', payload, token)
    const safeUser = {
      ...created,
      createdAt: created.createdAt || new Date().toISOString().slice(0, 10),
      lastLogin: created.lastLogin || null,
    }
    setUsers(prev => [safeUser, ...prev])
    return { id, password, user: safeUser }
  }

  async function updateUser(id, patch) {
    const updated = await apiPatch(`/api/users/${id}`, patch, token)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u))
    if (session?.id === id) {
      const nextSession = { ...session, ...updated, token }
      setSession(nextSession)
      saveStoredSession({ token, user: { ...session, ...updated } })
    }
    return updated
  }

  async function deleteUser(id) {
    await apiDelete(`/api/users/${id}`, token)
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  function canAccess(mod) {
    return !session ? false : session.role === 'admin' || (session.modules || []).includes(mod)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        token,
        users,
        loginError,
        authReady,
        login,
        logout,
        createUser,
        updateUser,
        deleteUser,
        refreshUsers,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

function genId(name) {
  const ini = (name || '').trim().split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 3) || 'USR'
  return `HN-${ini}-${String(Math.floor(Math.random() * 9000) + 1000)}`
}

function genPass() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function initials(name) {
  return (name || '').trim().split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '??'
}
