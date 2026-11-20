import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, Play, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../auth'
import api, { isDemoMode } from '../../api'
import { PublicLayout } from '../components/PublicLayout'
import { DemoPreview } from '../components/DemoPreview'
import { Callout, Container, ErrorNote, Eyebrow, Lead, LoadingRows, Pill, Section, SourceBadge } from '../components/ui'

const scenarioKeys = ['normal', 'cpu_spike', 'memory_leak', 'network_surge', 'latency_error_surge', 'combined_anomaly']

const DEMO_EMAIL = 'demo@tracelens.local'
const DEMO_PASSWORD = 'TraceLens2026!'

function WorkspaceSnapshot() {
  const [stats, setStats] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.overviewStats()
      .then((data: any) => { if (!cancelled) setStats(data) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Stats unavailable.') })
    return () => { cancelled = true }
  }, [])

  const cards = [
    ['Datasets', stats?.datasets], ['Detections', stats?.detections], ['Incidents', stats?.incidents],
    ['Experiments', stats?.experiments], ['Reports', stats?.reports], ['Flagged records', stats?.n_flagged],
  ]

  return (
    <div className="surface p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-tight text-ink">Workspace snapshot</p>
          <p className="mt-1 text-sm text-body">Counts are read from the database or a clearly labelled local fixture.</p>
        </div>
        <SourceBadge demoMode={isDemoMode()} />
      </div>
      <div className="mt-5">
        {error && <ErrorNote>{error}</ErrorNote>}
        {!stats && !error && <LoadingRows rows={2} label="Loading workspace snapshot" />}
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cards.map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-line bg-paper px-4 py-3">
                  <p className="text-xs font-medium text-muted">{label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{value ?? '—'}</p>
                </div>
              ))}
            </div>
            {stats.source && <p className="mt-4 text-xs text-muted">Source: {String(stats.source)}</p>}
          </>
        )}
      </div>
    </div>
  )
}

export function DemoAccess() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState('')

  async function signInWithDemo() {
    setSigningIn(true)
    setAuthError('')
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD)
      navigate('/app/overview')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Demo sign-in failed. Start the backend on port 8000 and try again.')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <PublicLayout>
      <section className="border-b border-line bg-white">
        <Container className="py-12 md:py-16">
          <Eyebrow>Interactive demo</Eyebrow>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Try the real workflow with labelled synthetic data
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-body md:text-lg">
            Load one of six scenarios, inspect the preview, then continue into the analyst workspace to run
            detection, explain a flag, escalate an incident and export a report.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/judge" className="btn-primary"><Play size={15} aria-hidden="true" /> Guided 3-minute walkthrough</Link>
            <Link to="/app/overview" className="btn-secondary">Open analyst workspace</Link>
          </div>
        </Container>
      </section>

      <Section tone="paper">
        <Eyebrow>Step 1 · Load a scenario</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Choose a labelled synthetic situation</h2>
        <Lead className="mt-4">
          The exact scenario keys used by the demo API are listed below. Each selects a generated dataset;
          none of these records come from a real system.
        </Lead>
        <div className="mt-5 flex flex-wrap gap-2">
          {scenarioKeys.map((key) => <Pill key={key}>{key}</Pill>)}
        </div>
        <div className="mt-6"><DemoPreview /></div>
      </Section>

      <Section tone="white">
        <div className="grid gap-6 lg:grid-cols-2">
          <WorkspaceSnapshot />
          <div className="surface p-5 md:p-6">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-primary" aria-hidden="true" />
              <p className="text-base font-semibold tracking-tight text-ink">Use the documented demo account</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-body">
              The demo account is a local prototype account. Signing in stores a session token in this browser
              and opens the analyst workspace.
            </p>
            <dl className="mt-5 space-y-3 rounded-lg border border-line bg-paper p-4 text-sm">
              <div><dt className="text-xs font-medium text-muted">Email</dt><dd className="mt-0.5 font-medium text-ink">{DEMO_EMAIL}</dd></div>
              <div><dt className="text-xs font-medium text-muted">Password</dt><dd className="mt-0.5 font-medium text-ink">{DEMO_PASSWORD}</dd></div>
            </dl>
            {authError && <div className="mt-4"><ErrorNote>{authError}</ErrorNote></div>}
            <button type="button" className="btn-primary mt-5 w-full sm:w-auto" onClick={signInWithDemo} disabled={signingIn}>
              <ShieldCheck size={15} aria-hidden="true" /> {signingIn ? 'Signing in…' : 'Sign in and open workspace'}
            </button>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Prefer your own account? <Link className="text-primary hover:underline" to="/register">Create a local account</Link> or <Link className="text-primary hover:underline" to="/login">sign in normally</Link>.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="soft">
        <Callout title="What happens next in the workspace" tone="synthetic">
          Run detection with a chosen method and threshold, open a flagged record's explanation, add notes and
          evidence, escalate with a recorded reason, resolve with a summary, then generate and download a report.
          Reset restores the initial demo state.
        </Callout>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/judge" className="btn-primary">Let judge mode guide me <ArrowRight size={15} aria-hidden="true" /></Link>
          <Link to="/how-it-works" className="btn-secondary">Read the six-step path</Link>
        </div>
      </Section>
    </PublicLayout>
  )
}

export default DemoAccess
