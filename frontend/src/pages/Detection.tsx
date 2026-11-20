import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScanSearch, Cpu, Play, Loader2, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react'
import api from '../api'

type Dataset = { id: string; name: string; n_rows: number; kind: string; created_at: string }
type Model = { id: string; dataset_id: string; method: string; threshold: number; created_at: string }
type Metrics = {
  accuracy?: number
  precision?: number
  recall?: number
  f1?: number
  false_positive_rate?: number
  true_negative?: number
  false_positive?: number
  false_negative?: number
  true_positive?: number
  roc_auc?: number
}
type ResultRow = {
  record_id: string
  score: number
  flag: number
  severity: string
  affected_features: string[]
  explanation?: { narrative?: string }
}
type DetectionResult = {
  detection_id: string
  n_rows: number
  n_flagged: number
  threshold: number
  method: string
  metrics: Metrics
  rows: ResultRow[]
}

const sevColor: Record<string, string> = {
  critical: 'text-rose-700 bg-rose-50 border-rose-200',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-slate-700 bg-slate-100 border-slate-200',
}

const fmt = (v: any) => (v === null || v === undefined ? '-' : typeof v === 'number' ? v.toFixed(3) : String(v))

export default function Detection() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [datasetId, setDatasetId] = useState('')
  const [modelId, setModelId] = useState('')

  const [method, setMethod] = useState('isolation_forest')
  const [threshold, setThreshold] = useState('0.5')
  const [contamination, setContamination] = useState('0.1')
  const [zThreshold, setZThreshold] = useState('3.5')

  const [training, setTraining] = useState(false)
  const [running, setRunning] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState<DetectionResult | null>(null)

  const load = () => {
    setErr('')
    api.listDatasets().then((d) => {
      setDatasets(d || [])
      setDatasetId((cur) => cur || (d && d.length ? d[0].id : ''))
    }).catch((e: any) => setErr(String(e?.message || e)))
    api.listModels().then((m) => {
      setModels(m || [])
      setModelId((cur) => cur || (m && m.length ? m[0].id : ''))
    }).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const train = async () => {
    if (!datasetId) { setErr('Select a dataset to train on.'); return }
    setTraining(true); setErr(''); setNotice('')
    try {
      const body: Record<string, any> = {
        dataset_id: datasetId,
        method,
        threshold: parseFloat(threshold),
      }
      if (method === 'isolation_forest') body.contamination = parseFloat(contamination)
      if (method === 'statistical_mad') body.z_threshold = parseFloat(zThreshold)
      const r = await api.trainModel(body)
      setNotice(`Trained model ${r.model_id || r.id} on ${r.n_train ?? datasetId}.`)
      const m = await api.listModels()
      setModels(m || [])
      if (r.model_id || r.id) setModelId(r.model_id || r.id)
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setTraining(false)
    }
  }

  const run = async () => {
    if (!datasetId) { setErr('Select a dataset.'); return }
    if (!modelId) { setErr('Select or train a model first.'); return }
    setRunning(true); setErr(''); setNotice(''); setResult(null)
    try {
      const r = await api.runDetection({
        dataset_id: datasetId,
        model_id: modelId,
        threshold: parseFloat(threshold),
      })
      setResult(r)
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setRunning(false)
    }
  }

  const flagged = result ? (result.rows || []).filter((r) => r.flag === 1) : []
  const m = result?.metrics || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ScanSearch size={22} className="text-teal" /> Anomaly Detection
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Train a detector, run it over a dataset, and review flagged records with their evidence.
          </p>
        </div>
        <button onClick={load} className="btn btn-secondary inline-flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {err && (
        <div className="card p-4 text-sm text-rose-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {err}
        </div>
      )}
      {notice && <div className="card p-4 text-sm text-teal">{notice}</div>}

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Run configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="det-dataset" className="text-sm font-medium text-slate-700 block mb-1">Dataset</label>
            <select id="det-dataset" value={datasetId} onChange={(e) => setDatasetId(e.target.value)} className="w-full">
              {datasets.length === 0 && <option value="">No datasets yet</option>}
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name} · {d.kind} · {d.n_rows} rows</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="det-model" className="text-sm font-medium text-slate-700 block mb-1">Model</label>
            <select id="det-model" value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full">
              {models.length === 0 && <option value="">No models yet — train one below</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.id} · {m.method} · {m.dataset_id}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="det-threshold" className="text-sm font-medium text-slate-700 block mb-1">Decision threshold</label>
            <input
              id="det-threshold" type="number" step="0.01" min="0" max="1"
              value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-full"
            />
          </div>
        </div>
        <button onClick={run} disabled={running || !datasetId || !modelId} className="btn btn-primary disabled:opacity-50">
          {running ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
          <span className="ml-2">{running ? 'Running…' : 'Run detection'}</span>
        </button>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Cpu size={16} className="text-teal" /> Train a new model
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="tr-method" className="text-sm font-medium text-slate-700 block mb-1">Method</label>
            <select id="tr-method" value={method} onChange={(e) => setMethod(e.target.value)} className="w-full">
              <option value="isolation_forest">isolation_forest</option>
              <option value="statistical_mad">statistical_mad</option>
            </select>
          </div>
          <div>
            <label htmlFor="tr-threshold" className="text-sm font-medium text-slate-700 block mb-1">Threshold</label>
            <input id="tr-threshold" type="number" step="0.01" min="0" max="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-full" />
          </div>
          {method === 'isolation_forest' && (
            <div>
              <label htmlFor="tr-contamination" className="text-sm font-medium text-slate-700 block mb-1">Contamination</label>
              <input id="tr-contamination" type="number" step="0.01" min="0" max="0.5" value={contamination} onChange={(e) => setContamination(e.target.value)} className="w-full" />
            </div>
          )}
          {method === 'statistical_mad' && (
            <div>
              <label htmlFor="tr-z" className="text-sm font-medium text-slate-700 block mb-1">Z threshold</label>
              <input id="tr-z" type="number" step="0.1" min="0" value={zThreshold} onChange={(e) => setZThreshold(e.target.value)} className="w-full" />
            </div>
          )}
        </div>
        <button onClick={train} disabled={training || !datasetId} className="btn btn-secondary">
          {training ? <Loader2 className="animate-spin" size={16} /> : <Cpu size={16} />}
          <span className="ml-2">{training ? 'Training…' : 'Train model'}</span>
        </button>
      </div>

      {result && (
        <>
          <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-slate-500">Detection id</div><div className="font-semibold">{result.detection_id}</div></div>
            <div><div className="text-slate-500">Method</div><div className="font-semibold">{result.method}</div></div>
            <div><div className="text-slate-500">Threshold</div><div className="font-semibold">{fmt(result.threshold)}</div></div>
            <div><div className="text-slate-500">Rows / flagged</div><div className="font-semibold">{result.n_rows} / {result.n_flagged}</div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-4">
              <h2 className="font-semibold text-sm mb-3">Performance metrics</h2>
              <div className="overflow-auto">
                <table>
                  <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                  <tbody>
                    <tr><td>Accuracy</td><td>{fmt(m.accuracy)}</td></tr>
                    <tr><td>Precision</td><td>{fmt(m.precision)}</td></tr>
                    <tr><td>Recall</td><td>{fmt(m.recall)}</td></tr>
                    <tr><td>F1</td><td>{fmt(m.f1)}</td></tr>
                    <tr><td>ROC-AUC</td><td>{fmt(m.roc_auc)}</td></tr>
                    <tr><td>False positive rate</td><td>{fmt(m.false_positive_rate)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card p-4">
              <h2 className="font-semibold text-sm mb-3">Confusion matrix</h2>
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-500">True negative</div><div className="font-semibold">{m.true_negative ?? '-'}</div></div>
                <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-500">False positive</div><div className="font-semibold">{m.false_positive ?? '-'}</div></div>
                <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-500">False negative</div><div className="font-semibold">{m.false_negative ?? '-'}</div></div>
                <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-500">True positive</div><div className="font-semibold">{m.true_positive ?? '-'}</div></div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Flagged records ({flagged.length})</h2>
              <div className="flex items-center gap-4 text-sm">
                <Link to="/investigate" className="text-teal inline-flex items-center gap-1 hover:underline">
                  Investigation <ArrowRight size={14} />
                </Link>
                <Link to="/explain" className="text-teal inline-flex items-center gap-1 hover:underline">
                  Explainability <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            {flagged.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center">No records flagged at this threshold.</div>
            ) : (
              <div className="overflow-auto max-h-[520px]">
                <table>
                  <thead>
                    <tr><th>Record</th><th>Score</th><th>Severity</th><th>Affected features</th><th>Interpretation</th></tr>
                  </thead>
                  <tbody>
                    {flagged.map((r) => (
                      <tr key={r.record_id}>
                        <td className="font-medium whitespace-nowrap">{r.record_id}</td>
                        <td>{fmt(r.score)}</td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${sevColor[r.severity] || sevColor.low}`}>
                            {r.severity}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(r.affected_features || []).map((f) => (
                              <span key={f} className="px-2 py-0.5 rounded-full bg-teal/10 text-teal text-xs">{f.replace(/_/g, ' ')}</span>
                            ))}
                          </div>
                        </td>
                        <td className="text-xs text-slate-600 max-w-[320px]">{r.explanation?.narrative || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
