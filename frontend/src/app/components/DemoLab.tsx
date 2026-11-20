import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Download, FlaskConical, History, Loader2, Play,
  RotateCcw, RotateCw, ScanSearch, Trash2, X,
} from 'lucide-react'
import api from '../../api'
import {
  EmptyState, ErrorState, LoadingInline, Section, SeverityBadge, SkeletonTable,
  SourceBadge, SyntheticBadge, fmtDate, fmtNum, fmtScore, ToastViewport, useToasts,
} from './ui'

type DetectionResult = {
  detection_id?: string
  dataset_id?: string
  method?: string
  threshold?: number
  n_rows?: number
  n_flagged?: number
  metrics?: Record<string, number>
  rows?: any[]
}

type HistoryEntry = {
  scenario: string
  method: string
  threshold: number
  n_flagged: number
  detection_id?: string
  at: string
}

const DEFAULT_SCENARIOS = [
  { key: 'normal', name: 'Normal System Behaviour', description: 'Steady telemetry with no injected anomaly.' },
  { key: 'cpu_spike', name: 'Sudden CPU Spike', description: 'CPU utilization jumps sharply for a short window.' },
  { key: 'memory_leak', name: 'Gradual Memory Growth', description: 'Memory climbs steadily across the window.' },
  { key: 'network_surge', name: 'Unusual Network Activity', description: 'Network throughput and connections surge together.' },
  { key: 'latency_error_surge', name: 'Latency and Error-Rate Surge', description: 'Response latency and errors rise together.' },
  { key: 'combined_anomaly', name: 'Coordinated Multi-Metric Anomaly', description: 'Several metrics deviate in the same window.' },
]

/** The six-scenario interactive demo. Every record shown here is labelled synthetic. */
export function DemoLab() {
  const navigate = useNavigate()
  const { toasts, push, dismiss } = useToasts()

  const [scenarios, setScenarios] = useState<any[]>(DEFAULT_SCENARIOS)
  const [scenariosLoading, setScenariosLoading] = useState(true)
  const [scenario, setScenario] = useState('normal')
  const [loaded, setLoaded] = useState<any>(null)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [method, setMethod] = useState('isolation_forest')
  const [threshold, setThreshold] = useState('0.5')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedRow, setSelectedRow] = useState<any>(null)
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf')
  const [exporting, setExporting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    api.demoScenarios()
      .then((s) => { if (alive && Array.isArray(s) && s.length) setScenarios(s) })
      .catch(() => { /* documented defaults remain in place */ })
      .finally(() => { if (alive) setScenariosLoading(false) })
    return () => { alive = false }
  }, [])

  const loadScenario = useCallback(async (key: string) => {
    setScenario(key)
    setLoadingDemo(true)
    setErr('')
    setResult(null)
    setSelectedRow(null)
    try {
      const data = await api.loadDemo({ scenario: key })
      setLoaded(data)
      push(`Loaded synthetic scenario “${key.replace(/_/g, ' ')}”.`, 'info')
    } catch (e: any) {
      setErr(String(e?.message || e))
      push(`Could not load scenario: ${e?.message || e}`, 'error')
    } finally {
      setLoadingDemo(false)
    }
  }, [push])

  const execute = useCallback(async (cfg: { scenario: string; datasetId: string; method: string; threshold: number }) => {
    setRunning(true)
    setErr('')
    setSelectedRow(null)
    try {
      const r: any = await api.runDetection({
        dataset_id: cfg.datasetId,
        model_id: undefined,
        method: cfg.method,
        scenario: cfg.scenario,
        threshold: cfg.threshold,
      })
      setResult(r)
      setHistory((prev) => [{
        scenario: cfg.scenario,
        method: cfg.method,
        threshold: cfg.threshold,
        n_flagged: Number(r?.n_flagged) || 0,
        detection_id: r?.detection_id,
        at: new Date().toISOString(),
      }, ...prev].slice(0, 20))
      push('Detection finished. Metrics come from the detection pipeline over synthetic data.', 'success')
    } catch (e: any) {
      setErr(String(e?.message || e))
      push(`Detection failed: ${e?.message || e}`, 'error')
    } finally {
      setRunning(false)
    }
  }, [push])

  const run = () => {
    if (!loaded) { push('Load a scenario before running detection.', 'error'); return }
    void execute({
      scenario: loaded.scenario || scenario,
      datasetId: loaded.dataset_id,
      method,
      threshold: Number(threshold),
    })
  }

  const replay = async () => {
    const last = history[0]
    if (!last) { push('There is no previous run to replay.', 'error'); return }
    setMethod(last.method)
    setThreshold(String(last.threshold))
    setScenario(last.scenario)
    setLoadingDemo(true)
    try {
      const data = await api.loadDemo({ scenario: last.scenario })
      setLoaded(data)
      await execute({
        scenario: last.scenario,
        datasetId: data.dataset_id,
        method: last.method,
        threshold: last.threshold,
      })
    } catch (e: any) {
      push(`Replay failed: ${e?.message || e}`, 'error')
    } finally {
      setLoadingDemo(false)
    }
  }

  const reset = async () => {
    setResetting(true)
    try {
      await api.resetDemo()
      setLoaded(null)
      setResult(null)
      setSelectedRow(null)
      setHistory([])
      setScenario('normal')
      push('Demo environment reset to its initial state.', 'success')
    } catch (e: any) {
      push(`Reset failed: ${e?.message || e}`, 'error')
    } finally {
      setResetting(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
    push('Demo run history cleared.', 'info')
  }

  const exportReport = async () => {
    if (!result) { push('Run a detection before exporting a report.', 'error'); return }
    setExporting(true)
    try {
      const rep: any = await api.createReport({
        detection_id: result.detection_id,
        kind: 'anomaly detection',
        scenario: loaded?.scenario,
        source: 'synthetic demo',
      })
      const reportId = rep?.report_id || rep?.id
      const out = await api.downloadReport(reportId, format)
      push(`Report exported as ${out?.filename || `${reportId}.${format}`}.`, 'success')
    } catch (e: any) {
      push(`Export failed: ${e?.message || e}`, 'error')
    } finally {
      setExporting(false)
    }
  }

  const flagged = result ? (result.rows || []).filter((r) => r.flag === 1) : []
  const metrics = result?.metrics || {}
  const previewRows: any[] = Array.isArray(loaded?.preview) ? loaded.preview : []
  const previewColumns: string[] = Array.isArray(loaded?.columns)
    ? loaded.columns
    : Object.keys(previewRows[0] || {})

  return (
    <div className="space-y-4">
      <ToastViewport toasts={toasts} onDismiss={dismiss} />

      <Section
        title="Six-scenario interactive demo"
        icon={FlaskConical}
        actions={<div className="flex flex-wrap items-center gap-2">
          <SyntheticBadge />
          <button type="button" onClick={reset} disabled={resetting} className="btn btn-secondary">
            {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            Reset demo
          </button>
        </div>}
      >
        <p className="mb-3 text-sm leading-relaxed text-muted">
          Choose a labelled synthetic scenario, pick a detection method, run the real pipeline, read the
          explanation, then review the incident and export a report. All demo rows are visibly marked synthetic
          and never overwrite real datasets.
        </p>

        {scenariosLoading ? (
          <SkeletonTable rows={3} cols={3} />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Demo scenarios">
            {scenarios.map((s: any) => {
              const key = String(s.key || s.scenario || s.id)
              const active = key === scenario
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => void loadScenario(key)}
                  aria-pressed={active}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    active ? 'border-primary bg-primary/5' : 'border-line bg-white hover:bg-soft'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{s.name || key}</span>
                    <code className="rounded bg-soft px-1.5 py-0.5 text-[11px] text-muted">{key}</code>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{s.description}</p>
                </button>
              )
            })}
          </div>
        )}

        {err && <div className="mt-3"><ErrorState message={err} onRetry={() => void loadScenario(scenario)} /></div>}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="demo-method">Detection method</label>
            <select id="demo-method" value={method} onChange={(e) => setMethod(e.target.value)} className="w-full">
              <option value="isolation_forest">isolation_forest</option>
              <option value="statistical_mad">statistical_mad</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="demo-threshold">Decision threshold</label>
            <input
              id="demo-threshold" type="number" min="0" max="1" step="0.01"
              value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-full"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="button" onClick={run} disabled={running || loadingDemo || !loaded} className="btn btn-primary disabled:opacity-50">
              {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? 'Running…' : 'Run detection'}
            </button>
            <button type="button" onClick={() => void replay()} disabled={running || history.length === 0} className="btn btn-secondary disabled:opacity-50">
              <RotateCw size={15} /> Replay
            </button>
          </div>
        </div>
      </Section>

      {/* Synthetic preview */}
      <Section
        title="Synthetic dataset preview"
        icon={FlaskConical}
        actions={loaded ? <SyntheticBadge compact /> : undefined}
      >
        {loadingDemo ? (
          <LoadingInline label="Loading synthetic scenario…" />
        ) : !loaded ? (
          <EmptyState
            title="No scenario loaded"
            description="Select one of the six scenarios above to load a labelled synthetic preview."
            icon={FlaskConical}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-ink">{String(loaded.scenario || scenario).replace(/_/g, ' ')}</span>
              <span className="text-muted">·</span>
              <span className="text-muted">{fmtNum(loaded.n_rows)} synthetic rows</span>
              <SourceBadge source="synthetic demo fixture" />
            </div>
            <p className="text-sm text-body">{loaded.description}</p>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table>
                <thead>
                  <tr>{previewColumns.map((c) => <th key={c} className="whitespace-nowrap">{c.replace(/_/g, ' ')}</th>)}</tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 8).map((row: any, i: number) => (
                    <tr key={row?.record_id || i}>
                      {previewColumns.map((c) => (
                        <td key={c} className="whitespace-nowrap text-xs">
                          {typeof row?.[c] === 'number' ? row[c] : String(row?.[c] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewRows.length > 8 && (
              <p className="text-xs text-muted">Showing 8 of {previewRows.length} preview rows · all synthetic.</p>
            )}
          </div>
        )}
      </Section>

      {/* Results */}
      {result && (
        <Section
          title="Detection results"
          icon={ScanSearch}
          actions={<div className="flex flex-wrap items-center gap-2">
            <SourceBadge source="synthetic demo fixture" />
            <button type="button" onClick={() => navigate('/app/investigate')} className="btn btn-secondary">
              Review incidents
            </button>
          </div>}
        >
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            {[
              ['Detection', result.detection_id],
              ['Method', result.method],
              ['Rows analysed', fmtNum(result.n_rows)],
              ['Flagged', fmtNum(result.n_flagged)],
              ['Accuracy', fmtScore(metrics.accuracy)],
              ['Precision', fmtScore(metrics.precision)],
              ['Recall', fmtScore(metrics.recall)],
              ['F1', fmtScore(metrics.f1)],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border border-line bg-soft px-3 py-2">
                <div className="text-xs text-muted">{k}</div>
                <div className="break-all font-semibold text-ink">{v}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-ink">Flagged synthetic records ({flagged.length})</h3>
            {flagged.length === 0 ? (
              <EmptyState title="No records flagged" description="No synthetic record crossed the threshold in this run." icon={ScanSearch} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table>
                  <thead>
                    <tr><th>Record</th><th>Score</th><th>Severity</th><th>Affected features</th><th /></tr>
                  </thead>
                  <tbody>
                    {flagged.map((r: any, i: number) => (
                      <tr key={r?.record_id || i} className={selectedRow?.record_id === r?.record_id ? 'bg-primary/5' : ''}>
                        <td className="whitespace-nowrap font-medium">{r?.record_id}</td>
                        <td>{fmtScore(r?.score)}</td>
                        <td><SeverityBadge severity={r?.severity} /></td>
                        <td className="text-xs text-muted">{(r?.affected_features || []).map((f: string) => f.replace(/_/g, ' ')).join(', ') || '—'}</td>
                        <td>
                          <button type="button" onClick={() => setSelectedRow(r)} className="text-sm text-primary hover:underline">
                            Explain
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedRow && (
            <div className="mt-4 rounded-lg border border-line bg-soft p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">Anomaly explanation · {selectedRow.record_id}</h3>
                <button type="button" onClick={() => setSelectedRow(null)} aria-label="Close explanation" className="rounded p-1 text-muted hover:bg-line">
                  <X size={15} />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-body">
                {selectedRow?.explanation?.narrative || 'No narrative is attached to this record.'}
              </p>
              {Array.isArray(selectedRow?.explanation?.evidence) && selectedRow.explanation.evidence.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-body">
                  {selectedRow.explanation.evidence.map((e: string, i: number) => <li key={i}>{e}</li>)}
                </ul>
              )}
              <button type="button" onClick={() => navigate('/app/explain')} className="btn btn-ghost mt-2">
                Open full explainability view
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv' | 'json')}
              aria-label="Report format"
              className="w-auto py-1.5"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            <button type="button" onClick={() => void exportReport()} disabled={exporting} className="btn btn-secondary disabled:opacity-50">
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {exporting ? 'Exporting…' : 'Export report'}
            </button>
          </div>
        </Section>
      )}

      {/* Run history */}
      <Section
        title="Demo run history"
        icon={History}
        actions={
          <button type="button" onClick={clearHistory} disabled={history.length === 0} className="btn btn-secondary disabled:opacity-50">
            <Trash2 size={14} /> Clear history
          </button>
        }
      >
        {history.length === 0 ? (
          <EmptyState title="No runs yet" description="Each detection you run in this demo is recorded here for replay." icon={History} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table>
              <thead>
                <tr><th>Scenario</th><th>Method</th><th>Threshold</th><th>Flagged</th><th>Run at</th></tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={`${h.detection_id}-${i}`}>
                    <td className="whitespace-nowrap font-medium">{h.scenario.replace(/_/g, ' ')}</td>
                    <td className="whitespace-nowrap">{h.method}</td>
                    <td>{h.threshold.toFixed(2)}</td>
                    <td>{h.n_flagged}</td>
                    <td className="whitespace-nowrap text-xs text-muted">{fmtDate(h.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {history.length > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangle size={13} aria-hidden="true" /> History refers to synthetic demo runs only.
          </p>
        )}
      </Section>
    </div>
  )
}

export default DemoLab
