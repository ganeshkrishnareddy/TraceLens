import { Check } from 'lucide-react'
import { statusLabel } from './ui'

/** Ordered incident lifecycle defined in the transformation contract. */
export const LIFECYCLE = [
  'detected',
  'triaged',
  'investigating',
  'escalated',
  'mitigating',
  'resolved',
  'closed',
] as const

export type LifecycleStage = (typeof LIFECYCLE)[number]

export function lifecycleIndex(status?: string): number {
  const s = (status || '').toLowerCase()
  if (s === 'open') return 0
  if (s === 'false_positive') return -1
  const idx = LIFECYCLE.indexOf(s as LifecycleStage)
  return idx >= 0 ? idx : 0
}

export function isTerminal(status?: string): boolean {
  const s = (status || '').toLowerCase()
  return s === 'resolved' || s === 'closed' || s === 'false_positive'
}

/** Compact horizontal stepper. Completed and current steps are labelled in words. */
export function LifecycleStepper({ status, compact = false }: { status?: string; compact?: boolean }) {
  const current = lifecycleIndex(status)
  const falsePositive = (status || '').toLowerCase() === 'false_positive'

  if (falsePositive) {
    return (
      <div className="rounded-lg border border-line bg-soft px-3 py-2 text-sm text-muted">
        Lifecycle ended as <span className="font-semibold text-ink">False positive</span> — no further action expected.
      </div>
    )
  }

  return (
    <ol
      className={`grid gap-1 ${compact ? 'grid-cols-7' : 'grid-cols-2 gap-y-3 sm:grid-cols-4 lg:grid-cols-7'}`}
      aria-label="Incident lifecycle progress"
    >
      {LIFECYCLE.map((stage, idx) => {
        const done = idx < current
        const active = idx === current
        return (
          <li key={stage} className="min-w-0">
            <div
              aria-current={active ? 'step' : undefined}
              className={[
                'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium',
                active
                  ? 'border-primary bg-primary text-white'
                  : done
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-line bg-white text-muted',
              ].join(' ')}
              title={`${idx + 1}. ${statusLabel(stage)}`}
            >
              <span className={[
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                active ? 'bg-white text-primary' : done ? 'bg-success text-white' : 'bg-soft text-muted',
              ].join(' ')}>
                {done ? <Check size={10} aria-hidden="true" /> : idx + 1}
              </span>
              <span className="truncate">{compact ? statusLabel(stage).split(' ')[0] : statusLabel(stage)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
