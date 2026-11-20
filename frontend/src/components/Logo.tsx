import type { SVGProps } from 'react'

type MarkProps = SVGProps<SVGSVGElement> & {
  size?: number
  title?: string
  inverse?: boolean
}

const BLADES = [
  'M53.84 34.68 A22 22 0 0 1 45.24 49.57',
  'M40.60 52.25 A22 22 0 0 1 23.40 52.25',
  'M18.76 49.57 A22 22 0 0 1 10.16 34.68',
  'M10.16 29.32 A22 22 0 0 1 18.76 14.43',
  'M23.40 11.75 A22 22 0 0 1 40.60 11.75',
  'M45.24 14.43 A22 22 0 0 1 53.84 29.32',
]

/** Original TraceLens mark: a segmented aperture lens holding a signal trace and three evidence nodes. */
export function LogoMark({ size = 32, title = 'TraceLens', inverse = false, ...rest }: MarkProps) {
  const ring = inverse ? '#5EE0D0' : '#0E7C7B'
  const disc = inverse ? '#123A46' : '#E8F4F3'
  const trace = inverse ? '#FFFFFF' : '#0B1F3A'
  const node = inverse ? '#5EE0D0' : '#0E7C7B'
  const anomaly = inverse ? '#93C5FD' : '#2563EB'
  const grid = inverse ? '#FFFFFF' : '#94A3B8'
  const clipId = inverse ? 'tl-react-lens-inverse' : 'tl-react-lens'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title} {...rest}>
      <title>{title}</title>
      <defs>
        <clipPath id={clipId}><circle cx="32" cy="32" r="16" /></clipPath>
      </defs>
      <g fill="none" stroke={ring} strokeWidth="4" strokeLinecap="round">
        {BLADES.map((d) => <path key={d} d={d} />)}
      </g>
      <circle cx="32" cy="32" r="16" fill={disc} />
      <g clipPath={`url(#${clipId})`}>
        <path d="M14 26h36M14 40h36" stroke={grid} strokeOpacity={inverse ? 0.18 : 0.35} strokeWidth="1" />
        <path
          d="M14 40 L21 40 L26 25 L33 37 L39 19 L50 19"
          fill="none" stroke={trace} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="26" cy="25" r="3" fill={node} stroke="#FFFFFF" strokeWidth="1.6" />
        <circle cx="33" cy="37" r="3" fill={node} stroke="#FFFFFF" strokeWidth="1.6" />
        <circle cx="39" cy="19" r="3.4" fill={anomaly} stroke="#FFFFFF" strokeWidth="1.8" />
      </g>
    </svg>
  )
}

type LogoProps = {
  size?: number
  inverse?: boolean
  showDescriptor?: boolean
  className?: string
}

/** Horizontal wordmark for the landing page, app sidebar and reports. */
export function Logo({ size = 32, inverse = false, showDescriptor = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} inverse={inverse} />
      <div className="leading-tight">
        <div className={`text-base font-semibold tracking-tight ${inverse ? 'text-white' : 'text-ink'}`}>
          Trace<span className={inverse ? 'text-[#5EE0D0]' : 'text-primary'}>Lens</span>
        </div>
        {showDescriptor && (
          <div className={`text-[10px] font-medium uppercase tracking-[0.14em] ${inverse ? 'text-white/60' : 'text-muted'}`}>
            Explainable Anomaly Intelligence
          </div>
        )}
      </div>
    </div>
  )
}

export default Logo
