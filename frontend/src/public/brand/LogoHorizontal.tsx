import { BrandMark } from './BrandMark'

export type LogoHorizontalProps = {
  size?: number
  compact?: boolean
  showDescriptor?: boolean
  className?: string
  title?: string
}

/** Horizontal wordmark: mark on the left, name and descriptor on the right. */
export function LogoHorizontal({
  size = 34,
  compact = false,
  showDescriptor = true,
  className = '',
  title = 'TraceLens — Explainable Anomaly Intelligence',
}: LogoHorizontalProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} role="img" aria-label={title}>
      <BrandMark size={size} title="" aria-hidden="true" />
      <span className="leading-tight">
        <span className="block text-[16px] font-semibold tracking-tight text-ink">Trace<span className="text-primary">Lens</span></span>
        {!compact && showDescriptor && (
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
            Explainable Anomaly Intelligence
          </span>
        )}
      </span>
    </span>
  )
}

export default LogoHorizontal
