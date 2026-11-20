import { useEffect, useState } from 'react'
import { FlaskConical, Loader2, Play } from 'lucide-react'
import { api } from '../api'

type Dataset = { id: string; name: string; n_rows: number; kind: string }

export default function ExperimentLab() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [trainId, setTrainId] = useState('')
  const [testId, setTestId] = useState('')
  const [methods, setMethods] = useState<Record<string, boolean>>({
    isolation_forest: true,
    statistical_mad: true,
  })
  const [thresholds, setThresholds] = useState<Record<string, string>>({
    isolation_forest: '0.5',
    statistical_mad: '0.3',
  })
  const [running, setRunning] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    api.listDatasets().then((d) => {
      setDatasets(d || [])
      if (d && d.length) {
        setTrainId(d[0].id)
        setTestId(d.length > 1 ? d[1].id : d[0].id)
      }
    }).catch((e) => setErr(String(e)))
    api.listExperiments().then((e) => setHistory(e || [])).catch(() => {})
  }, [])

  const toggleMethod = (m: string) => setMethods((s) => ({ ...s, [m]: !s[m] }))

  const run = async () => {
    const chosen = Object.keys(methods).filter((m) => methods[m])
    if (chosen.length === 0) { setErr('Select at least one method.'); return }
    if (!trainId || !testId) { setErr('Select train and test datasets.'); return }
    setRunning(true); setErr('')
    try {
      const thr: Record<string, number> = {}
      chosen.forEach((m) => { thr[m] = parseFloat(thresholds[m] || '0.5') })
      const r = await api.runExperiment({
        train_dataset_id: trainId,
        test_dataset_id: testId,
        methods: chosen,
        thresholds: thr,
      })
      setResult(r)
      const h = await api.listExperiments()
      setHistory(h || [])
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Experiment Lab</h1>
        <p className="text-sm text-slate-500 mt-1">
          Reproducible comparison of detection methods and thresholds on labelled synthetic data.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Train dataset</label>
            <select value={trainId} onChange={(e) => setTrainId(e.target.value)} className="w-full">
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.id} · {d.kind} · {d.n_rows} rows</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Test dataset</label>
            <select value={testId} onChange={(e) => setTestId(e.target.value)} className="w-full">
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.id} · {d.kind} · {d.n_rows} rows</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">Methods</label>
          <div className="flex flex-wrap gap-4">
            {['isolation_forest', 'statistical_mad'].map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!methods[m]} onChange={() => toggleMethod(m)} />
                {m.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(methods).filter((m) => methods[m]).map((m) => (
            <div key={m}>
              <label className="text-sm font-medium text-slate-700 block mb-1">Threshold · {m.replace(/_/g, ' ')}</label>
              <input
                type="number" step="0.01" min="0" max="1"
                value={thresholds[m]} onChange={(e) => setThresholds((s) => ({ ...s, [m]: e.target.value }))}
                className="w-full"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={run} disabled={running} className="btn btn-primary disabled:opacity-50">
            {running ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            <span className="ml-2">{running ? 'Running…' : 'Run experiment'}</span>
          </button>
          {err && <span className="text-sm text-rose-700">{err}</span>}
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="card p-4 text-sm">
            <div className="flex flex-wrap gap-6">
              <div><span className="text-slate-500">Train rows</span> <span className="font-semibold">{result.n_train}</span></div>
              <div><span className="text-slate-500">Test rows</span> <span className="font-semibold">{result.n_test}</span></div>
              <div><span className="text-slate-500">Methods</span> <span className="font-semibold">{(result.methods || []).join(', ')}</span></div>
              {result.experiment_id && <div><span className="text-slate-500">Experiment id</span> <span className="font-semibold">{result.experiment_id}</span></div>}
            </div>
          </div>

          <div className="card p-4 overflow-auto">
            <h2 className="font-semibold text-sm mb-3">Results</h2>
            <table>
              <thead>
                <tr>
                  <th>Method</th><th>Precision</th><th>Recall</th><th>F1</th><th>Accuracy</th><th>FPR</th><th>Flagged</th><th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                {(result.results || []).map((r: any, i: number) => {
                  const m = r.metrics || {}
                  return (
                    <tr key={i}>
                      <td className="font-medium">{r.method}</td>
                      <td>{fmt(m.precision)}</td>
                      <td>{fmt(m.recall)}</td>
                      <td>{fmt(m.f1)}</td>
                      <td>{fmt(m.accuracy)}</td>
                      <td>{fmt(m.false_positive_rate)}</td>
                      <td>{r.n_flagged}</td>
                      <td>{r.threshold}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(result.results || []).map((r: any, i: number) => {
              const m = r.metrics || {}
              return (
                <div key={i} className="card p-4">
                  <h3 className="font-semibold text-sm mb-3">Confusion matrix · {r.method.replace(/_/g, ' ')}</h3>
                  <div className="grid grid-cols-2 gap-2 text-center text-sm">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">TN</div>
                      <div className="font-semibold">{m.true_negative ?? '-'}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">FP</div>
                      <div className="font-semibold">{m.false_positive ?? '-'}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">FN</div>
                      <div className="font-semibold">{m.false_negative ?? '-'}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">TP</div>
                      <div className="font-semibold">{m.true_positive ?? '-'}</div>
                    </div>
                  </div>
                  {m.roc_auc != null && (
                    <div className="text-xs text-slate-500 mt-2">ROC-AUC: {fmt(m.roc_auc)}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card p-4">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <FlaskConical size={16} className="text-teal" /> Experiment history
        </h2>
        {history.length === 0 ? (
          <div className="text-sm text-slate-500">No experiments run yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between text-sm border-b border-slate-100 py-2">
                <div>
                  <span className="font-medium">{h.id}</span>
                  <span className="text-slate-500 ml-2">{h.name}</span>
                </div>
                <span className="text-xs text-slate-500">{h.created_at}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function fmt(v: any) {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'number') return v.toFixed(3)
  return String(v)
}
