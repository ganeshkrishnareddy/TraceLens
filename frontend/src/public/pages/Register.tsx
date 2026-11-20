import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useAuth } from '../../auth'
import { PublicLayout } from '../components/PublicLayout'
import { Callout, Container, ErrorNote, Eyebrow, Pill } from '../components/ui'

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({})

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errors: typeof fieldErrors = {}
    if (name.trim().length < 2) errors.name = 'Enter a name of at least two characters.'
    if (!validEmail(email)) errors.email = 'Enter a valid email address.'
    if (password.length < 8) errors.password = 'Use at least eight characters.'
    if (confirm !== password) errors.confirm = 'Passwords do not match.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    setBusy(true)
    setError('')
    try {
      await register(email, password, name.trim())
      navigate('/app/overview', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Try a different email address.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <section className="bg-paper py-10 md:py-14">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
          <div className="surface mx-auto w-full max-w-md p-6 md:p-8">
            <Eyebrow>Get started</Eyebrow>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Create a local account</h1>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Accounts are stored in this prototype's local database. No email service is involved.
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
              <div>
                <label className="field-label" htmlFor="reg-name">Name</label>
                <div className="relative">
                  <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input id="reg-name" className="w-full pl-9" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={Boolean(fieldErrors.name)} placeholder="Your name" />
                </div>
                {fieldErrors.name && <p className="mt-1.5 text-xs text-critical">{fieldErrors.name}</p>}
              </div>

              <div>
                <label className="field-label" htmlFor="reg-email">Email address</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input id="reg-email" type="email" className="w-full pl-9" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} placeholder="you@example.com" />
                </div>
                {fieldErrors.email && <p className="mt-1.5 text-xs text-critical">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="field-label" htmlFor="reg-password">Password</label>
                <div className="relative">
                  <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input id="reg-password" type={show ? 'text' : 'password'} className="w-full pl-9 pr-12" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" aria-invalid={Boolean(fieldErrors.password)} placeholder="At least eight characters" />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)}>
                    {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1.5 text-xs text-critical">{fieldErrors.password}</p>}
              </div>

              <div>
                <label className="field-label" htmlFor="reg-confirm">Confirm password</label>
                <input id="reg-confirm" type={show ? 'text' : 'password'} className="w-full" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-invalid={Boolean(fieldErrors.confirm)} placeholder="Repeat your password" />
                {fieldErrors.confirm && <p className="mt-1.5 text-xs text-critical">{fieldErrors.confirm}</p>}
              </div>

              {error && <ErrorNote>{error}</ErrorNote>}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? 'Creating account…' : 'Create account and continue'}
              </button>
            </form>

            <p className="mt-6 border-t border-line pt-4 text-center text-sm text-muted">
              Already registered? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
            </p>
          </div>

          <div className="mx-auto w-full max-w-md self-center space-y-5">
            <Pill tone="teal">Local prototype</Pill>
            <h2 className="text-xl font-semibold tracking-tight text-ink">Your account, your runs</h2>
            <p className="text-sm leading-relaxed text-body">
              Creating an account gives you access to the same workspace flows as the demo account: data lab,
              detection, explanation, incidents, experiments and reports.
            </p>
            <Callout title="No email verification" tone="synthetic">
              This prototype does not send email. Passwords are hashed and stored locally, and sessions use an
              opaque token in this browser. Do not reuse a production password here.
            </Callout>
            <Link to="/judge" className="btn-secondary">Preview with judge mode first</Link>
          </div>
        </Container>
      </section>
    </PublicLayout>
  )
}

export default Register
