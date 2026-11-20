import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail } from 'lucide-react'
import { useAuth } from '../../auth'
import { PublicLayout } from '../components/PublicLayout'
import { Container, ErrorNote, Eyebrow, Pill } from '../components/ui'

const DEMO_EMAIL = 'demo@tracelens.local'
const DEMO_PASSWORD = 'TraceLens2026!'

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const from = (location.state as { from?: string } | null)?.from || '/app/overview'

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errors: typeof fieldErrors = {}
    if (!validEmail(email)) errors.email = 'Enter a valid email address.'
    if (!password) errors.password = 'Enter your password.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    setBusy(true)
    setError('')
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Check your credentials and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <section className="bg-paper py-10 md:py-14">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
          <div className="surface mx-auto w-full max-w-md p-6 md:p-8">
            <Eyebrow>Analyst workspace</Eyebrow>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in to TraceLens</h1>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Use a local account or the documented demo account to reach the analyst workspace.
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
              <div>
                <label className="field-label" htmlFor="login-email">Email address</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    className="w-full pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                    placeholder="you@example.com"
                  />
                </div>
                {fieldErrors.email && <p id="login-email-error" className="mt-1.5 text-xs text-critical">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="field-label" htmlFor="login-password">Password</label>
                <div className="relative">
                  <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={show ? 'text' : 'password'}
                    className="w-full pl-9 pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow((v) => !v)}
                  >
                    {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                {fieldErrors.password && <p id="login-password-error" className="mt-1.5 text-xs text-critical">{fieldErrors.password}</p>}
              </div>

              {error && <ErrorNote>{error}</ErrorNote>}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <button
              type="button"
              className="btn-secondary mt-4 w-full"
              onClick={() => { setEmail(DEMO_EMAIL); setPassword(DEMO_PASSWORD); setFieldErrors({}); setError('') }}
            >
              <KeyRound size={15} aria-hidden="true" /> Fill demo credentials
            </button>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm">
              <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
              <span className="text-muted">No account? <Link to="/register" className="font-semibold text-primary hover:underline">Register</Link></span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md self-center">
            <Pill tone="teal">Local prototype</Pill>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">A workspace built for investigation</h2>
            <p className="mt-3 text-sm leading-relaxed text-body">
              The analyst workspace connects detection to explanation, incident handling and reporting. The
              same workflows power the short guided walkthrough in judge mode.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-body">
              <li>• Run real detectors on labelled synthetic data.</li>
              <li>• Read evidence and unknowns alongside every flag.</li>
              <li>• Record notes, escalation, resolution and audit history.</li>
            </ul>
            <div className="mt-6">
              <Link to="/judge" className="btn-secondary">Try judge mode without signing in</Link>
            </div>
          </div>
        </Container>
      </section>
    </PublicLayout>
  )
}

export default Login
