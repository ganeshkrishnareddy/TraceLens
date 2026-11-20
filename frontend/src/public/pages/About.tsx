import { Link } from 'react-router-dom'
import { BookOpen, Check, CircleDashed, Compass, ExternalLink, FileText, FlaskConical, GitBranch, Github, Layers3, Linkedin, Mail, ScanSearch, Server, ShieldCheck } from 'lucide-react'
import { PublicLayout } from '../components/PublicLayout'
import { BrandMark } from '../brand/BrandMark'
import { Callout, Container, Eyebrow, FeatureCard, Lead, Pill, Section } from '../components/ui'

const phases = [
  { n: '01', title: 'Problem framing', body: 'Define the gap: detectors produce flags, investigators need explanations and a decision trail. Write the problem statement and limitations before extending the code.' },
  { n: '02', title: 'Data and detectors', body: 'Add a seeded synthetic generator, eight telemetry features, a train/test split, Isolation Forest and robust statistical detectors, and measured evaluation.' },
  { n: '03', title: 'Explanation and incidents', body: 'Turn a flag into per-feature deviations, evidence sentences and unknowns. Add incident notes, escalation, resolution and an ordered activity trail.' },
  { n: '04', title: 'Public site and judge mode', body: 'Build a light-theme public site, an interactive architecture view and a short guided walkthrough that calls the same real API workflows.' },
]

export function About() {
  return (
    <PublicLayout>
      <section className="border-b border-line bg-white">
        <Container className="grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1fr)_auto] md:py-16">
          <div>
            <Eyebrow>About TraceLens</Eyebrow>
            <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              See Beyond the Alert. Understand the Anomaly.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-body md:text-lg">
              TraceLens is a local, explainable anomaly investigation prototype. It connects a real detection
              pipeline to the evidence and decisions that come after a flag — and keeps the entire path reviewable.
            </p>
            <p className="mt-4 text-sm font-semibold text-ink">Evidence-driven. Explainable. Reproducible.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/technology" className="btn-primary">See the technology</Link>
              <Link to="/judge" className="btn-secondary">Try the guided walkthrough</Link>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-line bg-paper shadow-card">
              <BrandMark size={104} title="TraceLens brand mark" />
            </div>
          </div>
        </Container>
      </section>

      <Section tone="paper">
        <Eyebrow>Who built it</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">One participant, independent project</h2>
        <Lead className="mt-4">
          TraceLens is submitted by ProgVision as an individual participant in AEGYTHON 2026. Development was
          AI-assisted. The project is self-contained: a backend, an ML engine, real generated artefacts,
          documentation and a React frontend all live in one repository.
        </Lead>
        <div className="surface mt-6 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">About me</p>
          <p className="mt-3 text-sm leading-relaxed text-body md:text-base">
            I'm Ganesh Krishna Reddy — the individual participant behind ProgVision and the builder of TraceLens.
            I put this project together as an independent, AI-assisted submission for AEGYTHON 2026, with a focus
            on making anomaly detection something an analyst can actually question and explain. The work spans the
            detection engine, the FastAPI backend, the React interface, the documentation and the guided judge
            walkthrough. You can reach me through the links below, or explore more of my work on my portfolio.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="surface p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">What is true</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-body">
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> The code and generated artefacts are in this repository.</li>
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> Metrics are computed from real predictions and labels on synthetic data.</li>
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> Reports, experiment config and per-record predictions are written to disk.</li>
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> The automated test suite is part of the repository.</li>
            </ul>
          </div>
          <div className="surface p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">What is not claimed</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-body">
              <li className="flex gap-2"><CircleDashed size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" /> No employees, customers or partnerships.</li>
              <li className="flex gap-2"><CircleDashed size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" /> No production deployment, certification or service-level guarantee.</li>
              <li className="flex gap-2"><CircleDashed size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" /> No accuracy claim on real-world telemetry.</li>
              <li className="flex gap-2"><CircleDashed size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" /> No causal root-cause inference from a detector score.</li>
            </ul>
          </div>
        </div>
        <div className="surface mt-6 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Contact the builder</p>
            <p className="mt-1 text-sm font-medium text-ink">Ganesh Krishna Reddy · ProgVision</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="btn-secondary inline-flex items-center gap-2" href="mailto:pganeshkrishnareddy@gmail.com">
              <Mail size={15} aria-hidden="true" /> Email
            </a>
            <a className="btn-secondary inline-flex items-center gap-2" href="https://linkedin.com/in/pganeshkrishnareddy" target="_blank" rel="noopener noreferrer">
              <Linkedin size={15} aria-hidden="true" /> LinkedIn
            </a>
            <a className="btn-secondary inline-flex items-center gap-2" href="https://github.com/ganeshkrishnareddy" target="_blank" rel="noopener noreferrer">
              <Github size={15} aria-hidden="true" /> GitHub
            </a>
            <a className="btn-secondary inline-flex items-center gap-2" href="https://github.com/ganeshkrishnareddy/TraceLens" target="_blank" rel="noopener noreferrer">
              <Github size={15} aria-hidden="true" /> Source on GitHub
            </a>
            <a className="btn-secondary inline-flex items-center gap-2" href="https://pganeshkrishnareddy.vercel.app/" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} aria-hidden="true" /> Portfolio
            </a>
          </div>
        </div>
      </Section>

      <Section tone="white">
        <Eyebrow>Development story</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Built in four broad phases</h2>
        <p className="mt-3 text-sm leading-relaxed text-body">
          These are phases of work, not a company history or a dated roadmap. Each phase corresponds to code
          and documents that can be inspected in the repository.
        </p>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {phases.map((phase) => (
            <li key={phase.n} className="surface p-5">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">Phase {phase.n}</span>
              <h3 className="mt-3 text-base font-semibold tracking-tight text-ink">{phase.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{phase.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="soft">
        <Eyebrow>What is in the repository</Eyebrow>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={Server} title="Backend" body="FastAPI routes for health, datasets, models, detection, incidents, experiments and reports, backed by a local SQLite store." />
          <FeatureCard icon={FlaskConical} title="ML engine" body="Seeded telemetry generation, Isolation Forest and statistical MAD/IQR detectors, evaluation and explainability helpers." />
          <FeatureCard icon={Layers3} title="Frontend" body="React 19, TypeScript, Vite and Tailwind 3. A light-only public site and an analyst workspace for the end-to-end flow." />
          <FeatureCard icon={FileText} title="Artefacts & docs" body="Generated datasets, models, experiments, reports and written documentation describing methods, architecture and limitations." />
        </div>
      </Section>

      <Section tone="paper">
        <Eyebrow>Principles</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Three rules that shape every screen</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <FeatureCard icon={ScanSearch} title="Evidence-driven" body="A claim in the interface is backed by a value from a run, a record in the database or a document in the repository." />
          <FeatureCard icon={ShieldCheck} title="Explainable" body="A flag is never shown alone. Its contributing metrics, baseline comparison and unknowns travel with it." />
          <FeatureCard icon={GitBranch} title="Reproducible" body="Seeds, thresholds and configurations are recorded, so a result can be re-run and compared rather than trusted on faith." />
        </div>
        <div className="mt-8">
          <Callout title="A note on data">
            All telemetry shown publicly is synthetic and labelled as such. TraceLens does not include, imply or
            require any real customer dataset. See <Link className="text-primary hover:underline" to="/research">research</Link> for the generation setup.
          </Callout>
        </div>
      </Section>

      <Section tone="white">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">Continue exploring</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="teal"><Compass size={12} aria-hidden="true" /> Independent prototype</Pill>
              <Pill><BookOpen size={12} aria-hidden="true" /> Documented methods</Pill>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/research" className="btn-primary">Research & methodology</Link>
            <Link to="/how-it-works" className="btn-secondary">How it works</Link>
          </div>
        </div>
      </Section>
    </PublicLayout>
  )
}

export default About
