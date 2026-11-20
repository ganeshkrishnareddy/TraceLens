import { useEffect, useState } from 'react'
import { Database, Upload, Sparkles, Loader2, RefreshCw, AlertTriangle, Search } from 'lucide-react'
import api from '../api'

type Dataset = { id: string; name: string; path: string; n_rows: number; created_at: string; kind: string }
type ColStat = { min: number | null; max: number | null; mean: number | null; median: number | null; std: number | null }
type PreviewStats = {
  error?: string
  n_rows?: number
  n_missing_total?: number
  duplicate_rows?: number
  missing_by_column?: Record<string, number>
  label_counts?: Record<string, number>
  column_stats?: Record<string, ColStat>
}
type Preview = { columns: string[]; n_rows: number; preview: Record<string, any>[]; stats: PreviewStats }

function cell(v: any) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(4)
  return String(v)
}

export default function DataLab() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [nNormal, setNNormal] = useState('1200')
  const [nAnomaly, setNAomaly] = useState('240')
  const [seed, setSeed] = useState('20261120')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState('')

  const [selectedId, setSelectedId] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewErr, setPreviewErr] = useState('')

  const load = () => {
    setLoading(true)
    setErr('')
    api.listDatasets()
      .then((d) => setDatasets(d || []))
      .catch((e: any) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openPreview = (id: string) => {
    setSelectedId(id)
    setPreview(null)
    setPreviewErr('')
    setPreviewLoading(true)
    api.previewDataset(id, 50)
      .then((p) => setPreview(p))
      .catch((e: any) => setPreviewErr(String(e?.message || e)))
      .finally(() => setPreviewLoading(false))
  }

  const generate = async () => {
    setBusy('generate'); setErr('')
    try {
      await api.generateDataset({
        n_normal: parseInt(nNormal, 10),
        n_anomaly: parseInt(nAnomaly, 10),
        seed: parseInt(seed, 10),
      })
      load()
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setBusy('')
    }
  }

  const upload = async () => {
    if (!file) { setErr('Choose a CSV file first.'); return }
    setBusy('upload'); setErr('')
    try {
      await api.uploadDataset(file)
      setFile(null)
      const input = document.getElementById('csv-file') as HTMLInputElement | null
      if (input) input.value = ''
      load()
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setBusy('')
    }
  }

  const stats = preview?.stats || {}
  const columns = preview?.columns || []
  const rows = preview?.preview || []
  const colStats = stats.column_stats || {}
  const missingByCol = stats.missing_by_column || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Database size={22} className="text-teal" /> Data Lab
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate seeded telemetry or upload a CSV, then inspect the data before detection.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Sparkles size={16} className="text-teal" /> Generate synthetic dataset
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="n-normal" className="text-sm font-medium text-slate-700 block mb-1">Normal rows</label>
              <input id="n-normal" type="number" min="1" value={nNormal} onChange={(e) => setNNormal(e.target.value)} className="w-full" />
            </div>
            <div>
              <label htmlFor="n-anomaly" className="text-sm font-medium text-slate-700 block mb-1">Anomaly rows</label>
              <input id="n-anomaly" type="number" min="1" value={nAnomaly} onChange={(e) => setNAomaly(e.target.value)} className="w-full" />
            </div>
            <div>
              <label htmlFor="seed" className="text-sm font-medium text-slate-700 block mb-1">Seed</label>
              <input id="seed" type="number" value={seed} onChange={(e) => setSeed(e.target.value)} className="w-full" />
            </div>
          </div>
          <button onClick={generate} disabled={!!busy} className="btn btn-primary disabled:opacity-50">
            {busy === 'generate' ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            <span className="ml-2">{busy === 'generate' ? 'Generating…' : 'Generate dataset'}</span>
          </button>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Upload size={16} className="text-teal" /> Upload CSV
          </h2>
          <div>
            <label htmlFor="csv-file" className="text-sm font-medium text-slate-700 block mb-1">CSV file</label>
            <input
              id="csv-file" type="file" accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs"
            />
          </div>
          <button onClick={upload} disabled={!!busy || !file} className="btn btn-primary disabled:opacity-50">
            {busy === 'upload' ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            <span className="ml-2">{busy === 'upload' ? 'Uploading…' : 'Upload dataset'}</span>
          </button>
          <p className="text-xs text-slate-500">
            The CSV needs the telemetry feature columns used by the detectors. Uploaded files are validated by the API.
          </p>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-sm mb-3">Datasets ({datasets.length})</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
            <Loader2 className="animate-spin text-teal" size={16} /> Loading datasets…
          </div>
        ) : datasets.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center">No datasets yet. Generate or upload one above.</div>
        ) : (
          <div className="overflow-auto">
            <table>
              <thead>
                <tr><th>Name</th><th>Kind</th><th>Rows</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d.id} className={selectedId === d.id ? 'bg-teal/5' : ''}>
                    <td className="font-medium">{d.name}</td>
                    <td>{d.kind}</td>
                    <td>{(d.n_rows || 0).toLocaleString()}</td>
                    <td className="text-xs text-slate-500">{d.created_at}</td>
                    <td>
                      <button
                        onClick={() => openPreview(d.id)}
                        className="text-teal text-sm inline-flex items-center gap-1 hover:underline"
                      >
                        <Search size={14} /> Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <div className="card p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-sm">Preview · {selectedId}</h2>
            <button onClick={() => openPreview(selectedId)} className="btn btn-secondary inline-flex items-center gap-2">
              <RefreshCw size={14} /> Reload preview
            </button>
          </div>

          {previewLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <Loader2 className="animate-spin text-teal" size={16} /> Loading preview…
            </div>
          )}
          {previewErr && <div className="text-sm text-rose-700">{previewErr}</div>}
          {!previewLoading && !previewErr && preview && (
            <>
              {stats.error && <div className="text-sm text-amber-700">{stats.error}</div>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Total rows</div>
                  <div className="font-semibold">{(stats.n_rows ?? preview.n_rows ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Missing cells</div>
                  <div className="font-semibold">{stats.n_missing_total ?? 0}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Duplicate rows</div>
                  <div className="font-semibold">{stats.duplicate_rows ?? 0}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Preview shown</div>
                  <div className="font-semibold">{rows.length} rows</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Column statistics</h3>
                {Object.keys(colStats).length === 0 ? (
                  <div className="text-sm text-slate-500">No numeric column statistics available.</div>
                ) : (
                  <div className="overflow-auto">
                    <table>
                      <thead>
                        <tr><th>Column</th><th>Min</th><th>Max</th><th>Mean</th><th>Median</th><th>Std</th><th>Missing</th></tr>
                      </thead>
                      <tbody>
                        {Object.entries(colStats).map(([col, s]) => (
                          <tr key={col}>
                            <td className="font-medium">{col}</td>
                            <td>{cell(s.min)}</td>
                            <td>{cell(s.max)}</td>
                            <td>{cell(s.mean)}</td>
                            <td>{cell(s.median)}</td>
                            <td>{cell(s.std)}</td>
                            <td>{missingByCol[col] ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">First {rows.length} rows</h3>
                {columns.length === 0 || rows.length === 0 ? (
                  <div className="text-sm text-slate-500">No rows to display.</div>
                ) : (
                  <div className="overflow-auto max-h-[420px] border border-slate-200 rounded-lg">
                    <table>
                      <thead>
                        <tr>{columns.map((c) => <th key={c} className="whitespace-nowrap">{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i}>
                            {columns.map((c) => <td key={c} className="whitespace-nowrap text-xs">{cell(r[c])}</td>)}
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
      )}
    </div>
  )
}
