import type { ReactNode } from 'react'
import { ArrowRight, CircleAlert, Info, LoaderCircle, type LucideIcon } from 'lucide-react'

/* Small, dependency-free primitives shared by every public page.
   All colour, spacing and radius choices come from the transformation contract. */

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 md:px-6 ${className}`}>{children}</div>
}

export function Section({
  id,
  tone = 'paper',
  children,
  className = '',
}: {
  id?: string
  tone?: 'paper' | 'soft' | 'white'
  children: ReactNode
  className?: string
}) {
  const bg = tone === 'soft' ? 'bg-soft' : tone === 'white' ? 'bg-white' : 'bg-paper'
  return (
    <section id={id} className={`${bg} py-12 md:py-16 ${className}`}>
      <Container>{children}</Container>
    </section>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow mb-3">{children}</p>
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'warning' | 'success' }) {
  const palette = {
    neutral: 'border-line bg-white text-muted',
    teal: 'border-primary/25 bg-white text-primary',
    warning: 'border-warning/30 bg-white text-warning',
    success: 'border-success/30 bg-white text-success',
  }[tone]
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${palette}`}>{children}</span>
}

export function Lead({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`max-w-3xl text-base leading-relaxed text-body md:text-lg ${className}`}>{children}</p>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`surface p-5 md:p-6 ${className}`}>{children}</div>
}

export function FeatureCard({
  icon: Icon,
  title,
  body,
  tag,
}: {
  icon?: LucideIcon
  title: string
  body: ReactNode
  tag?: string
}) {
  return (
    <div className="surface p-5">
      {Icon && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-soft text-primary">
          <Icon size={20} aria-hidden="true" />
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
      {tag && <p className="mt-3 text-xs font-medium uppercase tracking-[0.1em] text-muted">{tag}</p>}
    </div>
  )
}

export function ArrowLink({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) {
  return (
    <a href={to} className={`inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover ${className}`}>
      {children}
      <ArrowRight size={15} aria-hidden="true" />
    </a>
  )
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'synthetic' | 'warning'
  title: string
  children: ReactNode
}) {
  const style = {
    info: 'border-secondary/25 bg-white text-body',
    synthetic: 'border-primary/25 bg-white text-body',
    warning: 'border-warning/30 bg-white text-body',
  }[tone]
  const Icon = tone === 'warning' ? CircleAlert : Info
  const iconColor = tone === 'warning' ? 'text-warning' : 'text-primary'
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 ${style}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <div className="mt-1 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export function FaqList({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
      {items.map((item) => (
        <details key={item.q} className="group px-4 py-4 md:px-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink marker:hidden">
            {item.q}
            <span className="shrink-0 text-primary transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
          </summary>
          <div className="mt-3 text-sm leading-relaxed text-body">{item.a}</div>
        </details>
      ))}
    </div>
  )
}

/** A zero-based, directly labelled bar. Used only with measured values. */
export function MetricBar({ label, value, caption }: { label: string; value: number; caption?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums font-semibold text-primary">{value.toFixed(4)}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-soft" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      {caption && <p className="mt-1.5 text-xs leading-relaxed text-muted">{caption}</p>}
    </div>
  )
}

export function LoadingRows({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-12 w-full" />
      ))}
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-critical/30 bg-white px-4 py-3 text-sm text-critical" role="alert">
      <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{children}</div>
    </div>
  )
}

export function Spinner({ label = 'Working' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" role="status" aria-live="polite">
      <LoaderCircle size={16} className="animate-spin text-primary" aria-hidden="true" />
      {label}…
    </span>
  )
}

export function SourceBadge({ demoMode }: { demoMode: boolean }) {
  return (
    <Pill tone={demoMode ? 'warning' : 'success'}>
      <span className={`h-1.5 w-1.5 rounded-full ${demoMode ? 'bg-warning' : 'bg-success'}`} aria-hidden="true" />
      {demoMode ? 'Demo fixture / offline fallback' : 'Live API'}
    </Pill>
  )
}
