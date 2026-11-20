import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, RotateCcw } from 'lucide-react'
import api, { isDemoMode } from '../../api'
import { Callout, EmptyState, ErrorNote, LoadingRows, Pill, SourceBadge } from './ui'

type Scenario = { key: string; name?: string; description?: string }

type LoadedDemo = {
  scenario: string
  dataset_id?: string
  n_rows?: number
  is_synthetic?: boolean
  description?: string
  preview?: Array<Record<string, unknown>>
  columns?: string[]
}

const FALLBACK_SCENARIOS: Scenario[] = [
  { key: 'normal', name: 'Normal System Behaviour' },
  { key: 'cpu_spike', name: 'Sudden CPU Spike' },
  { key: 'memory_leak', name: 'Gradual Memory Growth' },
  { key: 'network_surge', name: 'Unusual Network Activity' },
  { key: 'latency_error_surge', name: 'Latency and Error-Rate Surge' },
  { key: 'combined_anomaly', name: 'Coordinated Multi-Metric Anomaly' },
]

const PREVIEW_COLUMNS = ['record_id', 'cpu_utilization', 'response_latency_ms', 'error_rate', 'scenario', 'label']

function pretty(key: string) {
  return key.replace(/_/g, ' ')
}

export function DemoPreview({ compact = false }: { compact?: boolean }) {
  const [scenarios, setScenarios] = useState<Scenario[]>(FALLBACK_SCENARIOS)
  const [selected, setSelected] = useState('cpu_spike')
  const [loaded, setLoaded] = useState<LoadedDemo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const demoMode = isDemoMode()

  useEffect(() => {
    let cancelled = false
    api.demoScenarios()
      .then((rows: any) => {
        if (!cancelled && Array.isArray(rows) && rows.length) setScenarios(rows)
      })
      .catch(() => { /* the documented fallback list is already shown */ })
    return () => { cancelled = true }
  }, [])

  async function load() {
    setBusy(true)
    setError('')
    try {
      const data: any = await api.loadDemo({ scenario: selected })
      setLoaded(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The demo dataset could not be loaded.')
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    setBusy(true)
    setError('')
    try {
      await api.resetDemo()
      setLoaded(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo reset failed.')
    } finally {
      setBusy(false)
    }
  }

  const active = scenarios.find((s) => s.key === selected)

  return (
    <div className="surface p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-tight text-ink">Load a labelled synthetic scenario</p>
          <p className="mt-1 text-sm leading-relaxed text-body">
            Every record below is generated demonstration data — never production telemetry.
          </p>
        </div>
        <SourceBadge demoMode={demoMode} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <div className="min-w-0">
          <label className="field-label" htmlFor="scenario-select">Scenario</label>
          <select
            id="scenario-select"
            className="w-full"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {scenarios.map((s) => (
              <option key={s.key} value={s.key}>{s.name || pretty(s.key)}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={load} disabled={busy}>
          <Play size={15} aria-hidden="true" /> {busy ? 'Loading…' : 'Load preview'}
        </button>
        <button type="button" className="btn-secondary" onClick={reset} disabled={busy}>
          <RotateCcw size={15} aria-hidden="true" /> Reset demo
        </button>
      </div>

      {active?.description && <p className="mt-3 text-xs leading-relaxed text-muted">{active.description}</p>}
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

      <div className="mt-5">
        {busy && <LoadingRows rows={3} label="Loading demo preview" />}
        {!busy && !loaded && (
          <EmptyState title="No scenario loaded">
            Choose a scenario and load it to see a labelled preview of the synthetic rows.
          </EmptyState>
        )}
        {!busy && loaded && (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Pill tone="teal">{pretty(loaded.scenario)}</Pill>
              <Pill>Synthetic data</Pill>
              <span className="text-xs text-muted">
                {loaded.n_rows != null ? `${loaded.n_rows} rows` : 'Preview'} · dataset {loaded.dataset_id || 'preview'}
              </span>
            </div>
            {loaded.description && <p className="mb-3 text-xs leading-relaxed text-muted">{loaded.description}</p>}
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="min-w-[560px] text-xs">
                <thead>
                  <tr>{PREVIEW_COLUMNS.map((c) => <th key={c}>{pretty(c)}</th>)}</tr>
                </thead>
                <tbody>
                  {(loaded.preview || []).slice(0, 5).map((row, i) => (
                    <tr key={String(row.record_id ?? i)}>
                      {PREVIEW_COLUMNS.map((c) => (
                        <td key={c}>{String(row[c] ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(loaded.preview || []).length === 0 && (
              <p className="mt-3 text-sm text-muted">This scenario returned no preview rows in the current environment.</p>
            )}
          </div>
        )}
      </div>

      {!compact && (
        <Callout title="What this preview is — and is not" tone="synthetic">
          It is a labelled synthetic dataset served by the demo API. It is not evidence about any real system,
          and no detection metric is displayed here. Run detection in the analyst workspace to see measured results.
        </Callout>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/demo" className="btn-primary">Open full demo</Link>
        <Link to="/judge" className="btn-secondary">Guided judge walkthrough</Link>
      </div>
    </div>
  )
}

export default DemoPreview
