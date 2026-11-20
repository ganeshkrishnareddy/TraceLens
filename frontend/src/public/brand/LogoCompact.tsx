import { BrandMark } from './BrandMark'

export type LogoCompactProps = {
  size?: number
  className?: string
  title?: string
}

/** Compact icon form for tight navigation bars and app headers. */
export function LogoCompact({ size = 32, className = '', title = 'TraceLens' }: LogoCompactProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <BrandMark size={size} title={title} />
    </span>
  )
}

export default LogoCompact
