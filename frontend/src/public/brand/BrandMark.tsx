import { useId, type SVGProps } from 'react'

/**
 * Original TraceLens mark, mirrored from frontend/public/brand/logo-compact.svg:
 * a six-blade aperture lens holding a telemetry signal trace with three linked
 * evidence nodes (the highest peak in secondary blue). Geometry only — no stock
 * art. Each instance gets its own clip-path id so repeated marks do not collide.
 */
export type BrandMarkProps = SVGProps<SVGSVGElement> & {
  size?: number
  title?: string
}

const BLADES = [
  'M53.84 34.68 A22 22 0 0 1 45.24 49.57',
  'M40.60 52.25 A22 22 0 0 1 23.40 52.25',
  'M18.76 49.57 A22 22 0 0 1 10.16 34.68',
  'M10.16 29.32 A22 22 0 0 1 18.76 14.43',
  'M23.40 11.75 A22 22 0 0 1 40.60 11.75',
  'M45.24 14.43 A22 22 0 0 1 53.84 29.32',
]

export function BrandMark({ size = 32, title = 'TraceLens', ...rest }: BrandMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const clipId = `tl-lens-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <title>{title}</title>
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="16" />
        </clipPath>
      </defs>
      <g fill="none" stroke="#0E7C7B" strokeWidth="4" strokeLinecap="round">
        {BLADES.map((d) => <path key={d} d={d} />)}
      </g>
      <circle cx="32" cy="32" r="16" fill="#E8F4F3" />
      <g clipPath={`url(#${clipId})`}>
        <path d="M14 26h36M14 40h36" stroke="#94A3B8" strokeOpacity="0.35" strokeWidth="1" />
        <path
          d="M14 40 L21 40 L26 25 L33 37 L39 19 L50 19"
          fill="none"
          stroke="#0B1F3A"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="26" cy="25" r="3" fill="#0E7C7B" stroke="#FFFFFF" strokeWidth="1.6" />
        <circle cx="33" cy="37" r="3" fill="#0E7C7B" stroke="#FFFFFF" strokeWidth="1.6" />
        <circle cx="39" cy="19" r="3.4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.8" />
      </g>
    </svg>
  )
}

export default BrandMark
