import { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle, CheckCircle2, Info, X, Loader2, Database, FlaskConical,
  FileText, Search, type LucideIcon,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Toasts — self-contained so no App.tsx / provider changes are needed */
/* ------------------------------------------------------------------ */

export type ToastTone = 'success' | 'error' | 'info'
export type Toast = { id: number; tone: ToastTone; message: string }

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    seq.current += 1
    const id = seq.current
    setToasts((prev) => [...prev, { id, tone, message }])
  }, [])
  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])
  return { toasts, push, dismiss }
}

export function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null
  const tone: Record<ToastTone, string> = {
    success: 'border-l-success',
    error: 'border-l-critical',
    info: 'border-l-secondary',
  }
  const Icon: Record<ToastTone, LucideIcon> = { success: CheckCircle2, error: AlertTriangle, info: Info }
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" role="region" aria-label="Notifications">
      {toasts.map((t) => {
        const I = Icon[t.tone]
        return (
          <div
            key={t.id}
            role="status"
            className={`surface flex items-start gap-2 border-l-4 p-3 text-sm shadow-lift ${tone[t.tone]}`}
          >
            <I size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-body">{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="rounded p-0.5 text-muted hover:bg-soft hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Headers, cards, sections                                            */
/* ------------------------------------------------------------------ */

export function PageHeader({
  eyebrow, title, description, icon: Icon, actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {Icon && <Icon size={22} className="shrink-0 text-primary" aria-hidden="true" />}
          {title}
        </h1>
        {description && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function KpiCard({
  label, value, icon: Icon, hint, tone = 'teal',
}: {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  tone?: 'teal' | 'blue' | 'warning' | 'critical'
}) {
  const tones: Record<string, string> = {
    teal: 'text-primary',
    blue: 'text-secondary',
    warning: 'text-warning',
    critical: 'text-critical',
  }
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-muted">{label}</div>
        <Icon size={18} className={tones[tone]} aria-hidden="true" />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  )
}

export function Section({
  title, icon: Icon, actions, description, children, className = '',
}: {
  title: string
  icon?: LucideIcon
  actions?: ReactNode
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`card p-4 md:p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          {Icon && <Icon size={16} className="text-primary" aria-hidden="true" />}
          {title}
        </h2>
        {actions}
      </div>
      {description && <p className="mb-3 -mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Badges                                                             */
/* ------------------------------------------------------------------ */

export function SeverityBadge({ severity }: { severity?: string }) {
  const value = (severity || 'low').toLowerCase()
  const map: Record<string, string> = {
    critical: 'border-critical/30 bg-critical/10 text-critical',
    high: 'border-warning/30 bg-warning/10 text-warning',
    medium: 'border-amber-300 bg-amber-50 text-amber-800',
    low: 'border-line bg-soft text-muted',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${map[value] || map.low}`}>
      {value}
    </span>
  )
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  detected: { label: 'Detected', className: 'border-line bg-soft text-muted' },
  open: { label: 'Detected (open)', className: 'border-line bg-soft text-muted' },
  triaged: { label: 'Triaged', className: 'border-secondary/30 bg-secondary/10 text-secondary' },
  investigating: { label: 'Investigating', className: 'border-warning/30 bg-warning/10 text-warning' },
  escalated: { label: 'Escalated', className: 'border-critical/30 bg-critical/10 text-critical' },
  mitigating: { label: 'Mitigating', className: 'border-warning/30 bg-warning/10 text-warning' },
  resolved: { label: 'Resolved', className: 'border-success/30 bg-success/10 text-success' },
  closed: { label: 'Closed', className: 'border-line bg-soft text-muted' },
  false_positive: { label: 'False positive', className: 'border-line bg-soft text-muted' },
}

export function StatusBadge({ status }: { status?: string }) {
  const info = STATUS_MAP[(status || 'detected').toLowerCase()] || STATUS_MAP.detected
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  )
}

export function statusLabel(status?: string) {
  return STATUS_MAP[(status || 'detected').toLowerCase()]?.label || 'Detected'
}

/** Visible label for any record that originates from the synthetic demo fixture. */
export function SyntheticBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning">
      <FlaskConical size={12} aria-hidden="true" />
      {compact ? 'Synthetic' : 'Synthetic · demo fixture'}
    </span>
  )
}

export function SourceBadge({ source }: { source?: string }) {
  const isFixture = !source || /demo|fixture|synthetic|offline/i.test(source)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
      isFixture ? 'border-warning/30 bg-warning/10 text-warning' : 'border-success/30 bg-success/10 text-success'
    }`}>
      <Database size={12} aria-hidden="true" />
      {isFixture ? 'Demo fixture' : 'Live data'}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Loading / empty / error states                                      */
/* ------------------------------------------------------------------ */

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6" role="status" aria-label="Loading statistics">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card p-4">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading table">
      <div className="skeleton h-8 w-full" />
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }, (_, c) => <div key={c} className="skeleton h-6 w-full" />)}
        </div>
      ))}
    </div>
  )
}

export function SkeletonBlock({ className = 'h-40' }: { className?: string }) {
  return <div className={`skeleton w-full ${className}`} role="status" aria-label="Loading content" />
}

export function LoadingInline({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted" role="status" aria-live="polite">
      <Loader2 size={16} className="animate-spin text-primary" aria-hidden="true" />
      {label}
    </div>
  )
}

export function EmptyState({
  title, description, icon: Icon = Search, action,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-4 py-10 text-center">
      <Icon size={26} className="text-muted" aria-hidden="true" />
      <div className="text-sm font-semibold text-ink">{title}</div>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-wrap items-center gap-3 border-critical/30 bg-critical/5 p-4 text-sm text-critical" role="alert">
      <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary">
          Retry
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function fmtNum(value: any): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return n.toLocaleString()
}

export function fmtScore(value: any): string {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(3) : '—'
}

export function fmtDate(value: any): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

/* Small helper icons reused by tab-like controls. */
export const TabIcons = { Database, FileText, FlaskConical }
