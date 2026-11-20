import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import api, { getToken, setToken } from './api'

export type User = {
  id: string
  email: string
  name: string
  role?: string
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  demoSession: boolean
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string, name: string) => Promise<User>
  logout: () => Promise<void>
  enterDemo: () => void
  refresh: () => Promise<void>
}

const DEMO_KEY = 'tracelens:demo-session'
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [demoSession, setDemoSession] = useState(() => {
    try { return sessionStorage.getItem(DEMO_KEY) === '1' } catch { return false }
  })

  async function refresh() {
    if (!getToken()) { setUser(null); setLoading(false); return }
    try {
      const data = await api.me()
      setUser(data?.user || data || null)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    demoSession,
    async login(email, password) {
      const data = await api.login({ email, password })
      setUser(data?.user || null)
      setDemoSession(false)
      return data?.user
    },
    async register(email, password, name) {
      const data = await api.register({ email, password, name })
      setUser(data?.user || null)
      setDemoSession(false)
      return data?.user
    },
    async logout() {
      await api.logout()
      setUser(null)
      setDemoSession(false)
      try { sessionStorage.removeItem(DEMO_KEY) } catch { /* ignore */ }
    },
    enterDemo() {
      setDemoSession(true)
      try { sessionStorage.setItem(DEMO_KEY, '1') } catch { /* ignore */ }
    },
    refresh,
  }), [user, loading, demoSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** Analyst routes need a signed-in user or an explicitly entered demo session. */
export function RequireAnalyst({ children }: { children: ReactNode }) {
  const { user, loading, demoSession } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10" role="status" aria-live="polite">
        <div className="skeleton h-8 w-56 mb-6" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" />
        </div>
        <span className="sr-only">Checking your session…</span>
      </div>
    )
  }

  if (!user && !demoSession) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
