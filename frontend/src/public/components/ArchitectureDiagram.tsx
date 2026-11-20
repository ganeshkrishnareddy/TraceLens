import { useState } from 'react'
import { ArrowRight, Check, CircleDashed, Cpu, Database, FileBarChart, FlaskConical, ScanSearch, ShieldAlert, Sigma, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Eyebrow, Pill } from './ui'

type Node = {
  id: string
  step: string
  title: string
  icon: LucideIcon
  status: 'live' | 'planned'
  purpose: string
  detail: string
}

const nodes: Node[] = [
  {
    id: 'telemetry', step: '01', title: 'Telemetry input', icon: Database, status: 'live',
    purpose: 'Bring eight numeric system metrics into one labelled table.',
    detail: 'The seeded generator produces synthetic normal and anomalous records. CSV upload and generation both land in the Data Lab, where every synthetic row is visibly labelled. Nothing is pulled from a live customer environment.',
  },
  {
    id: 'baseline', step: '02', title: 'Baseline model', icon: Sigma, status: 'live',
    purpose: 'Learn a robust per-feature centre and spread from training data only.',
    detail: 'Feature medians and a scaled MAD estimate describe what "normal" looks like for each signal. The scaler is fit on the training split, so test rows do not leak into the baseline.',
  },
  {
    id: 'iforest', step: '03', title: 'Isolation Forest', icon: ScanSearch, status: 'live',
    purpose: 'Rank records by how easily they can be isolated in feature space.',
    detail: 'An unsupervised detector from scikit-learn. It is useful for ranking candidates; its scores are normalised per evaluated batch, so absolute thresholds should be read within a single run.',
  },
  {
    id: 'mad', step: '04', title: 'Statistical MAD', icon: Cpu, status: 'live',
    purpose: 'Flag records whose features deviate strongly from the robust baseline.',
    detail: 'A transparent robust z-score per feature, aggregated into a record score. Because the rule is simple, each flag can be traced back to the exact metric and value that drove it.',
  },
  {
    id: 'score', step: '05', title: 'Score & threshold', icon: ShieldAlert, status: 'live',
    purpose: 'Turn scores into flags with a threshold the operator can change.',
    detail: 'Each record receives a score, a flag and a severity label. Thresholds are explicit per method, and changing one produces a new run rather than silently rewriting history.',
  },
  {
    id: 'explain', step: '06', title: 'Explanation engine', icon: Sparkles, status: 'live',
    purpose: 'Translate a flag into evidence, a narrative and a list of unknowns.',
    detail: 'For each flagged record the engine lists the metrics that departed from baseline, the observed value against the baseline median, a plain-language hypothesis, suggested next checks and what the data cannot tell you.',
  },
  {
    id: 'incident', step: '07', title: 'Incident workspace', icon: ShieldAlert, status: 'live',
    purpose: 'Carry an anomaly into a human decision with an auditable trail.',
    detail: 'Notes, escalation and resolution are recorded against an incident with status transitions and an ordered activity history. Severity labels are always accompanied by words.',
  },
  {
    id: 'experiments', step: '08', title: 'Experiment lab', icon: FlaskConical, status: 'live',
    purpose: 'Compare methods on the same split using measured metrics.',
    detail: 'Runs write a configuration, per-record predictions and metrics to disk. Accuracy, precision, recall, F1, FPR and ROC AUC come from scikit-learn on real predictions and labels — never hardcoded.',
  },
  {
    id: 'report', step: '09', title: 'Report builder', icon: FileBarChart, status: 'live',
    purpose: 'Produce a human-readable report from verified run data.',
    detail: 'Reports include generation time, dataset information, method, findings and limitations, and can be downloaded as PDF, CSV or JSON. Only verified data is used.',
  },
  {
    id: 'remediation', step: '10', title: 'Automated remediation', icon: CircleDashed, status: 'planned',
    purpose: 'Planned only — automatic corrective action is not implemented.',
    detail: 'TraceLens currently stops at a recommended action for a human operator. It does not change production systems, and there is no autonomous remediation loop in this prototype.',
  },
]

export function ArchitectureDiagram() {
  const [selectedId, setSelectedId] = useState('telemetry')
  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0]

  return (
    <div>
      <Eyebrow>Interactive architecture</Eyebrow>
      <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Follow a signal through the system</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-body md:text-base">
        Select a component to read what it actually does. Components are marked live when the code exists
        in this repository, and planned when it does not.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Detection path</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {nodes.slice(0, 7).map((node) => (
              <NodeButton key={node.id} node={node} active={node.id === selectedId} onSelect={setSelectedId} />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em] text-muted">
            <ArrowRight size={14} aria-hidden="true" /> From the same run
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {nodes.slice(7).map((node) => (
              <NodeButton key={node.id} node={node} active={node.id === selectedId} onSelect={setSelectedId} />
            ))}
          </div>
        </div>

        <aside className="surface h-fit p-5 md:p-6" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft text-primary">
                <selected.icon size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Component {selected.step}</p>
                <h3 className="text-base font-semibold tracking-tight text-ink">{selected.title}</h3>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Pill tone={selected.status === 'live' ? 'success' : 'warning'}>
              {selected.status === 'live'
                ? <><Check size={12} aria-hidden="true" /> Live in this repository</>
                : <><CircleDashed size={12} aria-hidden="true" /> Planned — not implemented</>}
            </Pill>
          </div>
          <p className="mt-5 text-sm font-medium text-ink">{selected.purpose}</p>
          <p className="mt-3 text-sm leading-relaxed text-body">{selected.detail}</p>
        </aside>
      </div>
    </div>
  )
}

function NodeButton({ node, active, onSelect }: { node: Node; active: boolean; onSelect: (id: string) => void }) {
  const Icon = node.icon
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      aria-pressed={active}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        active ? 'border-primary bg-white shadow-card' : 'border-line bg-white hover:border-primary/40 hover:bg-soft'
      }`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-primary text-white' : 'bg-soft text-primary'}`}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted">{node.step}</span>
        <span className="block text-sm font-semibold text-ink">{node.title}</span>
        <span className="mt-1 block text-xs leading-snug text-muted">
          {node.status === 'live' ? 'Live component' : 'Planned only'}
        </span>
      </span>
    </button>
  )
}

export default ArchitectureDiagram
