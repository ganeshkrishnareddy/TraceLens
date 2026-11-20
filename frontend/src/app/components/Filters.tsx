import { Search, Clock } from 'lucide-react'

export type TimeRange = 'all' | '24h' | '7d' | '30d' | 'custom'

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'custom', label: 'Custom' },
]

export function SearchInput({
  value, onChange, placeholder = 'Search…', id,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
}) {
  return (
    <div className="relative min-w-[180px] flex-1">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-9"
      />
    </div>
  )
}

export function TimeRangeFilter({
  value, onChange, from, to, onFromChange, onToChange,
}: {
  value: TimeRange
  onChange: (value: TimeRange) => void
  from?: string
  to?: string
  onFromChange?: (value: string) => void
  onToChange?: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted" htmlFor="time-range">
        <Clock size={14} aria-hidden="true" /> Period
      </label>
      <select
        id="time-range"
        value={value}
        onChange={(e) => onChange(e.target.value as TimeRange)}
        className="w-auto py-1.5"
      >
        {TIME_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      {value === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date" value={from || ''} onChange={(e) => onFromChange?.(e.target.value)}
            aria-label="From date" className="w-auto py-1.5"
          />
          <span className="text-xs text-muted">to</span>
          <input
            type="date" value={to || ''} onChange={(e) => onToChange?.(e.target.value)}
            aria-label="To date" className="w-auto py-1.5"
          />
        </div>
      )}
    </div>
  )
}

function inWindow(iso: any, range: TimeRange, from?: string, to?: string): boolean {
  if (range === 'all') return true
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  if (range === 'custom') {
    const start = from ? new Date(`${from}T00:00:00`) : null
    const end = to ? new Date(`${to}T23:59:59`) : null
    if (start && d < start) return false
    if (end && d > end) return false
    return true
  }
  const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720
  return d.getTime() >= Date.now() - hours * 60 * 60 * 1000
}

/**
 * Client-side search + time filtering used on recorded-data tables. The
 * reference clock is the real current time; records outside the selected
 * window are hidden rather than replaced with invented values.
 */
export function applyFilters<T>(
  items: T[] | undefined | null,
  opts: {
    query?: string
    range?: TimeRange
    from?: string
    to?: string
    getTime?: (item: T) => any
    getText?: (item: T) => string
  },
): T[] {
  const list = Array.isArray(items) ? items : []
  const q = (opts.query || '').trim().toLowerCase()
  return list.filter((item) => {
    if (q && opts.getText && !opts.getText(item).toLowerCase().includes(q)) return false
    if (opts.range && opts.range !== 'all' && opts.getTime) {
      return inWindow(opts.getTime(item), opts.range, opts.from, opts.to)
    }
    return true
  })
}
