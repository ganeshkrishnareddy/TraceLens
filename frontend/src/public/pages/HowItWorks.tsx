import { Link } from 'react-router-dom'
import { ArrowRight, Check, CircleDashed, FileDown, Flag, RotateCcw, Siren, StickyNote } from 'lucide-react'
import { PublicLayout } from '../components/PublicLayout'
import { ScreenshotFrame } from '../components/ScreenshotFrame'
import { workflowSteps } from '../components/WorkflowStrip'
import { Callout, Container, Eyebrow, Lead, Pill, Section } from '../components/ui'

const sequence = [
  { icon: Flag, title: 'Pick a labelled scenario', body: 'Choose one of six scenarios: normal, cpu spike, memory leak, network surge, latency/error surge or a combined anomaly.' },
  { icon: Check, title: 'Load and preview', body: 'The demo API returns a labelled synthetic dataset preview with a record count, columns and scenario description.' },
  { icon: RotateCcw, title: 'Choose a method and run detection', body: 'Select Isolation Forest or statistical MAD, set a threshold, and run the real pipeline against the loaded dataset.' },
  { icon: StickyNote, title: 'Open an explanation', body: "Inspect the flagged record's deviations, evidence sentences, hypothesis, next checks and unknowns." },
  { icon: Siren, title: 'Escalate with a reason', body: 'Attach a note, then escalate with severity, priority, an owner label, a summary and a recommended action.' },
  { icon: FileDown, title: 'Generate and download a report', body: 'Create a report from verified run data and download it as PDF, CSV or JSON.' },
]

export function HowItWorks() {
  return (
    <PublicLayout>
      <section className="border-b border-line bg-white">
        <Container className="py-12 md:py-16">
          <Eyebrow>How it works</Eyebrow>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            From a synthetic signal to a decision you can explain
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-body md:text-lg">
            The public site explains the product; the analyst workspace performs the work. This page maps
            every step to a real feature and shows the short path you can run yourself.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/demo" className="btn-primary">Open the demo</Link>
            <Link to="/judge" className="btn-secondary">Guided judge mode</Link>
          </div>
        </Container>
      </section>

      <Section tone="paper">
        <Eyebrow>The seven connected steps</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Each step is a feature, not a slide</h2>
        <Lead className="mt-4">
          The workflow below is the spine of the product. Live steps have working code in this repository;
          anything not implemented is explicitly marked planned.
        </Lead>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflowSteps.map((step) => (
            <li key={step.n} className="surface flex flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Step {step.n} · {step.title}</span>
                {step.status === 'live'
                  ? <Pill tone="success"><Check size={12} aria-hidden="true" /> Live</Pill>
                  : <Pill tone="warning"><CircleDashed size={12} aria-hidden="true" /> Planned</Pill>}
              </div>
              <p className="mt-4 text-sm font-medium text-ink">{step.short}</p>
              <p className="mt-2 text-sm leading-relaxed text-body">{step.detail}</p>
              <p className="mt-auto pt-4 text-xs font-medium text-muted">Where: {step.feature}</p>
            </li>
          ))}
          <li className="flex flex-col justify-center rounded-xl border border-dashed border-line bg-white p-5">
            <p className="text-sm font-semibold text-ink">Automated remediation</p>
            <p className="mt-2 text-sm leading-relaxed text-body">
              The loop ends with a recommended action for a person. Automatic corrective action is future work.
            </p>
            <div className="mt-4"><Pill tone="warning"><CircleDashed size={12} aria-hidden="true" /> Planned — not implemented</Pill></div>
          </li>
        </ol>
      </Section>

      <Section tone="white">
        <Eyebrow>Run it yourself</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">A six-step demo path</h2>
        <Lead className="mt-4">
          You can do this in the analyst workspace at your own pace, or let judge mode guide you through
          the same calls in about three minutes.
        </Lead>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sequence.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="rounded-xl border border-line bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-soft text-primary"><Icon size={18} aria-hidden="true" /></span>
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/demo" className="btn-primary">Start in the demo <ArrowRight size={15} aria-hidden="true" /></Link>
          <Link to="/judge" className="btn-secondary">Take the guided route</Link>
        </div>
      </Section>

      <Section tone="soft">
        <Eyebrow>What you will see</Eyebrow>
        <div className="grid gap-5 md:grid-cols-2">
          <ScreenshotFrame src="/screenshots/detection.png" alt="Detection results screen" caption="Detection results: method, threshold, flagged count and measured metrics for the run." label="Detection" />
          <ScreenshotFrame src="/screenshots/explainability.png" alt="Explanation screen" caption="Explainability: the deviating metrics, evidence and unknowns attached to a flagged record." label="Explanation" />
        </div>
        <div className="mt-8">
          <Callout title="Replay and reset are part of the workflow" tone="synthetic">
            The demo exposes a reset action that restores the initial state. Replaying a scenario creates a new
            labelled run rather than overwriting a previous result. All generated records are visibly synthetic.
          </Callout>
        </div>
      </Section>

      <Section tone="white">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">Start with the shortest complete path</h2>
            <p className="mt-2 text-sm text-body">Judge mode connects problem → data → detection → explanation → escalation → report, with reset.</p>
          </div>
          <Link to="/judge" className="btn-primary">Open judge mode</Link>
        </div>
      </Section>
    </PublicLayout>
  )
}

export default HowItWorks
