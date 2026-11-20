import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, Play, RefreshCw, ScanSearch } from 'lucide-react'
import api from '../api'
import { DemoLab } from './components/DemoLab'
import { EmptyState, ErrorState, PageHeader, Section, SeverityBadge, SourceBadge, ToastViewport, fmtDate, fmtScore, useToasts } from './components/ui'

type DetectionResult = {
  detection_id?: string
  dataset_id?: string
  method?: string
  threshold?: number
  n_rows?: number
  n_flagged?: number
  metrics?: Record<string, number>
  rows?: any[]
  result_path?: string
}

export function AppDetection() {
  const { toasts, push, dismiss } = useToasts()
  const [datasets, setDatasets] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [datasetId, setDatasetId] = useState('')
  const [modelId, setModelId] = useState('')
  const [method, setMethod] = useState('isolation_forest')
  const [threshold, setThreshold] = useState('0.5')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [detections, setDetections] = useState<any[]>([])
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const [d, m, det] = await Promise.all([
        api.listDatasets(),
        api.listModels(),
        api.listDetections(),
      ])
      const dl = Array.isArray(d) ? d : []
      const ml = Array.isArray(m) ? m : []
      setDatasets(dl)
      setModels(ml)
      setDetections(Array.isArray(det) ? det : [])
      setDatasetId((cur) => (cur && dl.some((x: any) => x.id === cur) ? cur : (dl[0]?.id || '')))
      setModelId((cur) => (cur && ml.some((x: any) => x.id === cur) ? cur : (ml[0]?.id || '')))
    } catch (e: any) {
      setErr(String(e?.message || e))
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const run = async () => {
    if (!datasetId) { push('Select a dataset first.', 'error'); return }
    if (!modelId) { push('Select or train a model first.', 'error'); return }
    setRunning(true)
    setErr('')
    try {
      const r: any = await api.runDetection({
        dataset_id: datasetId,
        model_id: modelId,
        threshold: Number(threshold),
      })
      setResult(r)
      push(`Detection ${r?.detection_id || ''} completed. ${r?.n_flagged ?? 0} records flagged.`, 'success')
      const det = await api.listDetections().catch(() => [])
      setDetections(Array.isArray(det) ? det : [])
    } catch (e: any) {
      setErr(String(e?.message || e))
      push(`Detection failed: ${e?.message || e}`, 'error')
    } finally {
      setRunning(false)
    }
  }

  const train = async () => {
    if (!datasetId) { push('Select a dataset to train on.', 'error'); return }
    setErr('')
    try {
      const r: any = await api.trainModel({ dataset_id: datasetId, method, threshold: Number(threshold) })
      push(`Trained model ${r?.model_id || r?.id || ''}.`, 'success')
      const m = await api.listModels().catch(() => [])
      const ml = Array.isArray(m) ? m : []
      setModels(ml)
      if (r?.model_id || r?.id) setModelId(r.model_id || r.id)
    } catch (e: any) {
      setErr(String(e?.message || e))
      push(`Training failed: ${e?.message || e}`, 'error')
    }
  }

  const flagged = result ? (result.rows || []).filter((r) => r.flag === 1) : []
  const metrics = result?.metrics || {}
  const fixture = Boolean(result?.result_path && String(result.result_path).startsWith('demo://'))

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        eyebrow="Analyst platform"
        title="Anomaly Detection"
        description="Run the real detection pipeline over recorded data, or use the labelled six-scenario demo below. Metrics are computed, never invented."
        icon={ScanSearch}
        actions={
          <button type="button" onClick={() => { void load(); push('Detection inputs refreshed.', 'info') }} className="btn btn-secondary">
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {err && <ErrorState message={err} onRetry={() => void load()} />}

      <Section title="Run configuration" icon={ScanSearch}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="det-dataset">Dataset</label>
            <select id="det-dataset" value={datasetId} onChange={(e) => setDatasetId(e.target.value)} className="w-full">
              {datasets.length === 0 && <option value="">No datasets available</option>}
              {datasets.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name || d.id} · {d.n_rows ?? '—'} rows</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="det-model">Model</label>
            <select id="det-model" value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full">
              {models.length === 0 && <option value="">No models available</option>}
              {models.map((m: any) => (
                <option key={m.id} value={m.id}>{m.id} · {m.method}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="det-threshold">Decision threshold</label>
            <input
              id="det-threshold" type="number" min="0" max="1" step="0.01"
              value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-full"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void run()} disabled={running || !datasetId || !modelId} className="btn btn-primary disabled:opacity-50">
            {running ? <span className="animate-spin">◌</span> : <Play size={15} />}
            {running ? 'Running…' : 'Run detection'}
          </button>
          <button type="button" onClick={() => void train()} disabled={!datasetId} className="btn btn-secondary">
            <Cpu size={15} /> Train model
          </button>
          <span className="text-xs text-muted">Method: <code>{method}</code></span>
        </div>
      </Section>

      {result && (
        <Section
          title="Detection results"
          icon={ScanSearch}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source={fixture ? 'demo fixture' : 'live backend'} />
              <Link to="/app/explain" className="text-sm text-primary hover:underline">Open explainability →</Link>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            {[
              ['Detection', result.detection_id],
              ['Method', result.method],
              ['Rows analysed', result.n_rows],
              ['Flagged', result.n_flagged],
              ['Accuracy', fmtScore(metrics.accuracy)],
              ['Precision', fmtScore(metrics.precision)],
              ['Recall', fmtScore(metrics.recall)],
              ['ROC-AUC', fmtScore(metrics.roc_auc)],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border border-line bg-soft px-3 py-2">
                <div className="text-xs text-muted">{k}</div>
                <div className="break-all font-semibold text-ink">{v ?? '—'}</div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-ink">Flagged records ({flagged.length})</h3>
            {flagged.length === 0 ? (
              <EmptyState title="No records flagged" description="No record crossed the configured threshold." icon={ScanSearch} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table>
                  <thead><tr><th>Record</th><th>Score</th><th>Severity</th><th>Affected features</th></tr></thead>
                  <tbody>
                    {flagged.map((r: any, i: number) => (
                      <tr key={r?.record_id || i}>
                        <td className="whitespace-nowrap font-medium">{r?.record_id}</td>
                        <td>{fmtScore(r?.score)}</td>
                        <td><SeverityBadge severity={r?.severity} /></td>
                        <td className="text-xs text-muted">{(r?.affected_features || []).map((f: string) => f.replace(/_/g, ' ')).join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Section>
      )}

      {detections.length > 0 && (
        <Section title="Recorded detections" icon={ScanSearch}>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table>
              <thead><tr><th>ID</th><th>Method</th><th>Flagged</th><th>Created</th></tr></thead>
              <tbody>
                {detections.slice(0, 10).map((d: any, i: number) => (
                  <tr key={d?.id || i}>
                    <td className="whitespace-nowrap font-medium">{d?.id}</td>
                    <td>{d?.method}</td>
                    <td>{d?.n_flagged ?? '—'}</td>
                    <td className="whitespace-nowrap text-xs text-muted">{fmtDate(d?.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <DemoLab />
    </div>
  )
}

export default AppDetection
