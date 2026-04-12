import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppProvider } from './context/AppContext'
import AppShell from './components/AppShell'
import Login from './pages/Login'

function Inner() {
  const { session, authReady } = useAuth()
  if (!authReady) return null
  if (!session) return <Login />
  return <AppProvider><AppShell /></AppProvider>
}

export default function App() {
  return <AuthProvider><Inner /></AuthProvider>
}
