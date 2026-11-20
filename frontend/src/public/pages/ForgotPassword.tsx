import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, KeyRound, Mail, ShieldAlert } from 'lucide-react'
import { PublicLayout } from '../components/PublicLayout'
import { Callout, Container, ErrorNote, Eyebrow } from '../components/ui'

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!validEmail(email)) {
      setError('Enter a valid email address to review the available options.')
      setChecked(false)
      return
    }
    setError('')
    setChecked(true)
  }

  return (
    <PublicLayout>
      <section className="bg-paper py-10 md:py-14">
        <Container className="mx-auto max-w-2xl">
          <div className="surface p-6 md:p-8">
            <Eyebrow>Account access</Eyebrow>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Forgot your password?</h1>
            <p className="mt-3 text-sm leading-relaxed text-body">
              This local prototype has no email service and no password-reset endpoint. Nothing will be sent
              to the address below. You can still review the options that do work here.
            </p>

            <form className="mt-6" onSubmit={submit} noValidate>
              <label className="field-label" htmlFor="reset-email">Email address associated with your account</label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input id="reset-email" type="email" className="w-full pl-9" value={email} onChange={(e) => { setEmail(e.target.value); setChecked(false) }} placeholder="you@example.com" aria-invalid={Boolean(error)} />
              </div>
              {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
              <button type="submit" className="btn-primary mt-4">Review access options</button>
            </form>

            {checked && (
              <div className="mt-6" role="status" aria-live="polite">
                <Callout title="No reset email was sent" tone="warning">
                  Password reset is not implemented in this prototype. Use the documented demo account,
                  or create a new local account. Existing account credentials cannot be recovered through this page.
                </Callout>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to="/login" className="btn-primary">Go to sign in <ArrowRight size={15} aria-hidden="true" /></Link>
                  <Link to="/register" className="btn-secondary">Create a new account</Link>
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-line pt-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldAlert size={16} className="text-primary" aria-hidden="true" /> Demo credentials</p>
              <p className="mt-2 text-sm leading-relaxed text-body">
                The documented local demo account is <span className="font-medium text-ink">demo@tracelens.local</span> with password{' '}
                <span className="font-medium text-ink">TraceLens2026!</span>. The sign-in page can fill these for you.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/login" className="btn-secondary"><KeyRound size={15} aria-hidden="true" /> Open sign in</Link>
                <Link to="/judge" className="btn-ghost">Use judge mode instead</Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </PublicLayout>
  )
}

export default ForgotPassword
