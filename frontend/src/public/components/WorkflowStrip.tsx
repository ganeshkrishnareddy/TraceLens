import { Link } from 'react-router-dom'
import { ArrowRight, Check, CircleDashed } from 'lucide-react'

export type WorkflowStep = {
  n: string
  title: string
  short: string
  detail: string
  feature: string
  status: 'live' | 'planned'
}

export const workflowSteps: WorkflowStep[] = [
  { n: '01', title: 'Observe', short: 'Signal from one place', detail: 'Eight numeric telemetry metrics are generated or uploaded and previewed in the Data Lab. Synthetic rows are labelled.', feature: 'Data Lab', status: 'live' },
  { n: '02', title: 'Learn', short: 'A baseline of normal', detail: 'A robust per-feature centre and spread are fit on the training split only, so the baseline describes ordinary behaviour.', feature: 'Model training', status: 'live' },
  { n: '03', title: 'Detect', short: 'Rank and flag', detail: 'Isolation Forest and statistical MAD produce scores and flags for the same dataset, with an explicit threshold per run.', feature: 'Anomaly detection', status: 'live' },
  { n: '04', title: 'Explain', short: 'Why this record', detail: 'The explanation lists deviating metrics, observed values against baseline medians, a hypothesis, next checks and unknowns.', feature: 'Explainability view', status: 'live' },
  { n: '05', title: 'Investigate', short: 'Evidence and notes', detail: 'An analyst attaches evidence references and notes, and moves the incident through triage and investigation states.', feature: 'Incident workspace', status: 'live' },
  { n: '06', title: 'Escalate', short: 'A recorded decision', detail: 'Escalation captures reason, severity, priority, owner, summary and recommended action, and writes an audit entry.', feature: 'Incident escalation', status: 'live' },
  { n: '07', title: 'Resolve', short: 'Closed with a summary', detail: 'Resolution records a human-written summary and closes the loop with a downloadable report built from verified data.', feature: 'Reports', status: 'live' },
]

export function WorkflowStrip() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {workflowSteps.map((step) => (
        <li key={step.n} className="surface flex flex-col p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">Act {step.n}</span>
            {step.status === 'live'
              ? <Check size={14} className="text-success" aria-label="Available now" />
              : <CircleDashed size={14} className="text-warning" aria-label="Planned" />}
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">{step.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-body">{step.short}</p>
          <p className="mt-auto pt-3 text-xs font-medium text-muted">{step.feature}</p>
        </li>
      ))}
      <li className="flex flex-col justify-center rounded-xl border border-dashed border-line bg-white p-4">
        <p className="text-sm font-semibold text-ink">See it end to end</p>
        <p className="mt-1 text-xs leading-relaxed text-body">A short guided run connects every step with real API calls.</p>
        <Link to="/judge" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover">
          Open judge mode <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </li>
    </ol>
  )
}

export default WorkflowStrip
