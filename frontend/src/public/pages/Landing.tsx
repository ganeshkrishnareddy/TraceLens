import { Link } from 'react-router-dom'
import { Activity, BookOpen, Check, Fingerprint, FlaskConical, GitBranch, Layers3, LockKeyhole, Search, ShieldCheck, Siren, Workflow } from 'lucide-react'
import { PublicLayout } from '../components/PublicLayout'
import { BrandMark } from '../brand/BrandMark'
import { ArchitectureDiagram } from '../components/ArchitectureDiagram'
import { StoryActs } from '../components/StoryActs'
import { WorkflowStrip } from '../components/WorkflowStrip'
import { ScreenshotFrame } from '../components/ScreenshotFrame'
import { DemoPreview } from '../components/DemoPreview'
import { Callout, Container, Eyebrow, FaqList, FeatureCard, Lead, Pill, Section } from '../components/ui'

const differentiators = [
  { icon: Fingerprint, title: 'Explainability first', body: 'Every flag carries the metrics that caused it, the observed value against a baseline median, and a plain-language narrative.' },
  { icon: Layers3, title: 'Multiple methods', body: 'Isolation Forest and statistical MAD run on the same dataset, so results can be compared instead of assumed.' },
  { icon: Activity, title: 'Baseline-aware', body: 'Deviations are measured against a robust centre learned from training data, not an arbitrary fixed threshold alone.' },
  { icon: Search, title: 'Evidence-first', body: 'Notes, evidence references and audit entries connect an anomaly to a human decision.' },
  { icon: GitBranch, title: 'Reproducible', body: 'Seeds, thresholds, configurations and per-record predictions are written to disk with each experiment run.' },
  { icon: LockKeyhole, title: 'Local and offline-friendly', body: 'The stack runs on this machine with a local SQLite store; no cloud service is required for the core workflow.' },
  { icon: FlaskConical, title: 'Transparent synthetic data', body: 'Generated telemetry is labelled synthetic everywhere it appears. No real customer data is implied.' },
  { icon: BookOpen, title: 'Human-readable narratives', body: 'Reports state findings, method, generation time and limitations in language an investigator can actually use.' },
]

function HeroVisual() {
  const features = ['cpu utilisation', 'memory use', 'disk I/O', 'network', 'request rate', 'latency', 'error rate', 'connections']
  return (
    <div className="surface p-5 md:p-6" aria-label="Illustrative product layout, not measured data">
      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <BrandMark size={28} title="" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink">Signal window</span>
        </div>
        <Pill>Illustrative</Pill>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Eight connected signals</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {features.map((f, i) => (
          <li key={f} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${i === 5 ? 'border-primary/40 bg-white text-ink' : 'border-line bg-paper text-body'}`}>
            <span>{f}</span>
            {i === 5 && <span className="font-semibold text-primary">flagged</span>}
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-lg border border-line bg-paper p-3">
        <p className="text-xs font-semibold text-ink">Explanation attached</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Response latency departed from its robust baseline. Evidence, unknowns and next checks travel with the flag.
        </p>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        This panel is a layout illustration. It shows no measured values or performance claims.
      </p>
    </div>
  )
}

export function Landing() {
  return (
    <PublicLayout>
      {/* 1 — Hero */}
      <section className="border-b border-line bg-white">
        <Container className="grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:py-16">
          <div>
            <Eyebrow>TraceLens · Explainable Anomaly Intelligence</Eyebrow>
            <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl lg:text-[48px] lg:leading-[1.08]">
              See Beyond the Alert. Understand the Anomaly.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-body md:text-lg">
              See the signal. Understand the anomaly. Act with confidence. TraceLens turns a flagged telemetry
              record into evidence, a human-readable explanation and a traceable investigation.
            </p>
            <p className="mt-4 text-sm font-semibold text-ink">Evidence-driven. Explainable. Reproducible.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/demo" className="btn-primary">Explore the interactive demo</Link>
              <Link to="/judge" className="btn-secondary">Take the 3-minute walkthrough</Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Pill tone="teal">Synthetic data, clearly labelled</Pill>
              <Pill>Local prototype</Pill>
              <Pill>ProgVision · AEGYTHON 2026</Pill>
            </div>
          </div>
          <HeroVisual />
        </Container>
      </section>

      {/* 2 — Problem */}
      <Section tone="paper">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="max-w-3xl text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          Detection output alone does not answer the question an investigator actually has
        </h2>
        <Lead className="mt-4">
          Monitoring produces continuous streams of ordinary-looking numbers. A detector can point at a row,
          but the work begins after the flag: what changed, why it matters, and what was decided.
        </Lead>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <FeatureCard icon={Activity} title="Signals are plentiful" body="CPU, memory, disk, network, requests, latency, errors and connections all move at once.More streams mean more places for a fault to hide." />
          <FeatureCard icon={Search} title="Anomalies look ordinary" body="A deviation appears inside normal variation for a short window. A single number rarely tells you which metric moved or when." />
          <FeatureCard icon={Siren} title="A score is not an answer" body="A ranking tells you where to look. Without evidence and an audit trail, the decision that follows cannot be explained later." />
        </div>
      </Section>

      {/* 3 — Connected approach */}
      <Section tone="white">
        <Eyebrow>Connected approach</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          Observe → learn → detect → explain → investigate → escalate → resolve
        </h2>
        <Lead className="mt-4">
          Each step is a real feature in this repository. No step is presented as available if the code does not exist.
        </Lead>
        <div className="mt-8"><WorkflowStrip /></div>
        <div className="mt-6"><Callout title="No autonomous remediation" tone="warning">
          TraceLens recommends a next action for a person to take. Automated corrective action is planned work, not a shipped feature.
        </Callout></div>
      </Section>

      {/* Story mode — six scroll acts */}
      <StoryActs />

      {/* 4 — Product experience */}
      <Section tone="paper">
        <Eyebrow>Product experience</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">The analyst workspace, in real captures</h2>
        <Lead className="mt-4">
          These images are screenshots captured from the running prototype. They show the working flows, not concept art.
        </Lead>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ScreenshotFrame src="/screenshots/overview.png" alt="Analyst overview screen" caption="Overview — the analyst landing view after entering the workspace." />
          <ScreenshotFrame src="/screenshots/data-lab.png" alt="Data Lab screen" caption="Data Lab — dataset generation, upload and preview." />
          <ScreenshotFrame src="/screenshots/detection.png" alt="Anomaly detection results" caption="Detection — methods, thresholds and measured run results." />
          <ScreenshotFrame src="/screenshots/explainability.png" alt="Explainability view" caption="Explainability — deviations and evidence for a flagged record." />
          <ScreenshotFrame src="/screenshots/investigation.png" alt="Incident investigation screen" caption="Investigation — notes, status and evidence on an incident." />
          <ScreenshotFrame src="/screenshots/reports.png" alt="Reports screen" caption="Reports — generating and downloading a run report." />
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted">
          Source: captures in demo/shots, reproduced at /screenshots. Regenerate from the running app with scripts/capture_screenshots.mjs.
        </p>
      </Section>

      {/* 5 — Differentiators */}
      <Section tone="white">
        <Eyebrow>Why it is different</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Eight design choices, no accuracy promises</h2>
        <Lead className="mt-4">
          TraceLens competes on clarity and traceability. It makes no claim about accuracy on real systems:
          every number published by the app comes from a run against the labelled synthetic data in this repository.
        </Lead>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {differentiators.map((d) => <FeatureCard key={d.title} icon={d.icon} title={d.title} body={d.body} />)}
        </div>
      </Section>

      {/* 6 — Interactive architecture */}
      <Section tone="paper"><ArchitectureDiagram /></Section>

      {/* 7 — Built by ProgVision */}
      <Section tone="soft">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
          <div>
            <Eyebrow>Built by ProgVision</Eyebrow>
            <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              An independent AEGYTHON 2026 project, developed with AI assistance
            </h2>
            <Lead className="mt-4">
              TraceLens was built as one participant's submission. The repository contains a working FastAPI backend,
              a seeded telemetry generator, detection and evaluation code, an incident lifecycle, reporting,
              a React frontend and genuine generated artefacts. The development story is deliberately plain:
              no invented team, customers, certifications, partnerships or production deployment.
            </Lead>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/about" className="btn-primary">Read the full about page</Link>
              <Link to="/research" className="btn-secondary">Research & methodology</Link>
            </div>
          </div>
          <div className="surface p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">What is honest about this build</p>
            <ul className="mt-4 space-y-3 text-sm text-body">
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> Real code and real artefacts are in the repository.</li>
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> Metrics come from measurement on seeded synthetic data.</li>
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> Detector output is a lead for investigation, not a root-cause claim.</li>
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> Limitations are documented alongside results.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 8 — Research & methodology */}
      <Section tone="white">
        <Eyebrow>Research & methodology</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Measured values, with their limits stated</h2>
        <Lead className="mt-4">
          A reference run generated 1,200 normal and 240 anomalous rows (seed 20261120), split 70/30 into
          1,008 training and 432 test rows with 72 anomalies in the test set. The table below is measured output,
          not a target.
        </Lead>
        <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="min-w-[720px]">
            <thead><tr><th>Method</th><th>Threshold</th><th>Flagged</th><th>Precision</th><th>Recall</th><th>F1</th><th>FPR</th><th>ROC AUC</th></tr></thead>
            <tbody>
              <tr><td>isolation_forest</td><td>0.50</td><td>41</td><td>1.0000</td><td>0.5694</td><td>0.7257</td><td>0.0000</td><td>0.8861</td></tr>
              <tr><td>statistical_mad</td><td>0.30</td><td>55</td><td>1.0000</td><td>0.7639</td><td>0.8661</td><td>0.0000</td><td>0.9011</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Source: documentation/EXPERIMENT_RESULTS.md. Zero false positives are a property of this seeded synthetic
          split, not a guarantee for other data. See the research page for full context and the smaller smoke tests.
        </p>
        <div className="mt-6"><Link to="/research" className="btn-secondary">Read the methodology</Link></div>
      </Section>

      {/* 9 — Interactive demo preview */}
      <Section tone="paper">
        <Eyebrow>Interactive demo preview</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Load a scenario and look at the evidence</h2>
        <div className="mt-6"><DemoPreview /></div>
      </Section>

      {/* 10 — FAQ */}
      <Section tone="white">
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Questions worth asking</h2>
        <div className="mt-8">
          <FaqList items={[
            { q: 'Is this a production anomaly detection service?', a: 'No. It is a local, self-contained prototype built for AEGYTHON 2026. There is no customer deployment, no cloud dependency for the core flow, and no claim of production readiness.' },
            { q: 'Where do the numbers come from?', a: <>The app and public site show results measured on seeded synthetic telemetry in this repository. Anything illustrated rather than measured is labelled as an illustration. See <Link className="text-primary hover:underline" to="/research">research & methodology</Link>.</> },
            { q: 'Does the detector tell me the root cause?', a: 'No. It produces a score, a set of deviating metrics and a hypothesis with explicit unknowns. Causality is not inferred, and the explanation says so.' },
            { q: 'What can I do in judge mode?', a: <>It runs a short guided sequence through the same real API workflows: load a labelled scenario, run detection, read an explanation, record an incident decision and generate a report. It can be reset at any time. <Link className="text-primary hover:underline" to="/judge">Open judge mode</Link>.</> },
            { q: 'Why are some things marked planned?', a: 'Because they are not implemented. The architecture view marks each component live or planned so that nothing is implied to exist before the code exists.' },
            { q: 'Which account can I use to try the workspace?', a: <>The documented demo account is <span className="font-medium text-ink">demo@tracelens.local</span> with password <span className="font-medium text-ink">TraceLens2026!</span>. You can also <Link className="text-primary hover:underline" to="/register">create a local account</Link>.</> },
          ]} />
        </div>
      </Section>

      <Section tone="soft">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">Ready to see the workflow end to end?</h2>
            <p className="mt-2 text-sm text-body">Three minutes, real API calls, fully resettable.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/judge" className="btn-primary"><Workflow size={16} aria-hidden="true" /> Start judge mode</Link>
            <Link to="/technology" className="btn-secondary"><ShieldCheck size={16} aria-hidden="true" /> How it is built</Link>
          </div>
        </div>
      </Section>
    </PublicLayout>
  )
}

export default Landing
