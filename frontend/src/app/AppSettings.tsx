import { useCallback, useEffect, useState } from 'react'
import {
  KeyRound, LogIn, LogOut, RefreshCw, ShieldCheck, UserPlus,
} from 'lucide-react'
import api, { isDemoMode } from '../api'
import {
  EmptyState, ErrorState, PageHeader, Section, SkeletonBlock,
  SourceBadge, ToastViewport, useToasts,
} from './components/ui'

type Mode = 'signin' | 'register'

export function AppSettings() {
  const { toasts, push, dismiss } = useToasts()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [mode, setMode] = useState<Mode>('signin')

  const [email, setEmail] = useState('demo@tracelens.local')
  const [password, setPassword] = useState('TraceLens2026!')
  const [name, setName] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const data: any = await api.me()
      setUser(data?.user || data || null)
    } catch (e: any) {
      setUser(null)
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const submit = async () => {
    if (!email.trim() || !password) { push('Email and password are required.', 'error'); return }
    if (mode === 'register' && !name.trim()) { push('A name is required to register.', 'error'); return }
    setBusy(true)
    setErr('')
    try {
      const data: any = mode === 'signin'
        ? await api.login({ email: email.trim(), password })
        : await api.register({ email: email.trim(), password, name: name.trim() })
      setUser(data?.user || null)
      push(mode === 'signin' ? 'Signed in successfully.' : 'Account created and signed in.', 'success')
      await refresh()
    } catch (e: any) {
      setErr(String(e?.message || e))
      push(`Authentication failed: ${e?.message || e}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    setBusy(true)
    try {
      await api.logout()
      setUser(null)
      push('Signed out.', 'success')
    } catch (e: any) {
      push(`Sign out failed: ${e?.message || e}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const demoMode = isDemoMode()

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        eyebrow="Analyst platform"
        title="Settings & Session"
        description="Manage your local analyst session and review how data provenance is shown throughout the app."
        icon={ShieldCheck}
        actions={
          <button type="button" onClick={() => { void refresh(); push('Session checked.', 'info') }} className="btn btn-secondary">
            <RefreshCw size={14} aria-hidden="true" /> Check session
          </button>
        }
      />

      {err && <ErrorState message={err} onRetry={() => void refresh()} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Session" icon={ShieldCheck}>
          {loading ? (
            <SkeletonBlock className="h-28" />
          ) : user ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-success">Signed in</div>
                <div className="mt-1 text-lg font-semibold text-ink">{user.name || user.email || 'Analyst'}</div>
                {user.email && <div className="text-sm text-muted">{user.email}</div>}
              </div>
              <dl className="space-y-2 text-sm">
                {[
                  ['User ID', user.id],
                  ['Role', user.role || 'analyst'],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between gap-3">
                    <dt className="text-muted">{k}</dt>
                    <dd className="break-all text-right font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <button type="button" onClick={() => void logout()} disabled={busy} className="btn btn-secondary disabled:opacity-50">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          ) : (
            <EmptyState
              title="No active session"
              description="Sign in with the demo account or register a local analyst account to use the platform."
              icon={KeyRound}
            />
          )}
        </Section>

        <Section title={mode === 'signin' ? 'Sign in' : 'Create an account'} icon={mode === 'signin' ? LogIn : UserPlus}>
          <div className="space-y-4">
            <div className="inline-flex overflow-hidden rounded-lg border border-line">
              {(['signin', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setErr('') }}
                  className={`px-4 py-1.5 text-sm font-medium ${mode === m ? 'bg-primary text-white' : 'bg-white text-body hover:bg-soft'}`}
                  aria-pressed={mode === m}
                >
                  {m === 'signin' ? 'Sign in' : 'Register'}
                </button>
              ))}
            </div>
            {mode === 'register' && (
              <div>
                <label className="field-label" htmlFor="set-name">Name</label>
                <input id="set-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full" />
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="set-email">Email</label>
              <input id="set-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="field-label" htmlFor="set-password">Password</label>
              <input id="set-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" />
            </div>
            <button type="button" onClick={() => void submit()} disabled={busy} className="btn btn-primary disabled:opacity-50">
              {busy ? <RefreshCw size={15} className="animate-spin" /> : mode === 'signin' ? <LogIn size={15} /> : <UserPlus size={15} />}
              {mode === 'signin' ? 'Sign in' : 'Register & sign in'}
            </button>
            <div className="rounded-lg border border-line bg-soft p-3 text-xs text-muted">
              <div className="font-semibold text-ink">Demo credentials (local prototype)</div>
              <div>Email: <code>demo@tracelens.local</code></div>
              <div>Password: <code>TraceLens2026!</code></div>
              <p className="mt-2">These values are pre-filled for convenience. Authentication is local to this prototype.</p>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Data provenance" icon={ShieldCheck}>
        <div className="space-y-3 text-sm text-body">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={demoMode ? 'demo fixture' : 'live backend'} />
            <span className="text-muted">
              {demoMode ? 'The API is unavailable; representative demo fixtures are shown.' : 'The API is responding; recorded data is shown.'}
            </span>
          </div>
          <p className="leading-relaxed">
            Synthetic demo scenarios are always labelled “Synthetic · demo fixture”. Metrics shown in the app
            come from the database or a real computation — no figures are invented. The demo actions never
            overwrite real datasets.
          </p>
        </div>
      </Section>
    </div>
  )
}

export default AppSettings
