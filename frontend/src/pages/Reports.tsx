import { useEffect, useState } from 'react'
import { FileText, Loader2, Download } from 'lucide-react'
import { api } from '../api'

export default function Reports() {
  const [reports, setReports] = useState<any[]>([])
  const [detections, setDetections] = useState<any[]>([])
  const [detId, setDetId] = useState('')
  const [kind, setKind] = useState('investigation')
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState('')
  const [created, setCreated] = useState<any>(null)

  const load = () => {
    api.listReports().then((r) => setReports(r || [])).catch((e) => setErr(String(e)))
  }

  useEffect(() => {
    load()
    api.listDetections().then((d) => {
      setDetections(d || [])
      if (d && d.length) setDetId(d[0].id)
    }).catch(() => {})
  }, [])

  const create = async () => {
    if (!detId) { setErr('Select a detection run.'); return }
    setCreating(true); setErr('')
    try {
      const r = await api.createReport({ detection_id: detId, kind })
      setCreated(r)
      load()
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate investigation reports from detection runs and download results.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Create report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Detection run</label>
            <select value={detId} onChange={(e) => setDetId(e.target.value)} className="w-full">
              {detections.length === 0 && <option value="">No detections yet</option>}
              {detections.map((d: any) => (
                <option key={d.id} value={d.id}>{d.id} · {d.method} · {d.n_flagged} flagged</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full">
              <option value="investigation">investigation</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={create} disabled={creating} className="btn btn-primary disabled:opacity-50">
            {creating ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
            <span className="ml-2">{creating ? 'Generating…' : 'Generate'}</span>
          </button>
          {err && <span className="text-sm text-rose-700">{err}</span>}
        </div>
        {created && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-2">
            <div><span className="text-slate-500">Report id:</span> <span className="font-semibold">{created.report_id || created.id}</span></div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/reports/${created.report_id || created.id}/download`}
                className="btn btn-secondary inline-flex items-center gap-2"
                target="_blank" rel="noreferrer"
              >
                <Download size={14} /> Download report
              </a>
              <button
                onClick={() => window.open(`/api/detection/results/${detId}`, '_blank')}
                className="btn btn-secondary inline-flex items-center gap-2"
              >
                <Download size={14} /> Download detection JSON
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-sm mb-3">Reports</h2>
        {reports.length === 0 ? (
          <div className="text-sm text-slate-500">No reports yet.</div>
        ) : (
          <div className="overflow-auto">
            <table>
              <thead>
                <tr><th>ID</th><th>Kind</th><th>Created</th><th>Download</th></tr>
              </thead>
              <tbody>
                {reports.map((r: any) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.id}</td>
                    <td>{r.kind}</td>
                    <td className="text-xs text-slate-500">{r.created_at}</td>
                    <td>
                      <a href={`/api/reports/${r.id}/download`} className="text-teal hover:underline text-sm" target="_blank" rel="noreferrer">
                        download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-sm mb-2">Download detection result JSON</h2>
        <div className="flex items-center gap-3">
          <select value={detId} onChange={(e) => setDetId(e.target.value)} className="min-w-[260px]">
            {detections.map((d: any) => <option key={d.id} value={d.id}>{d.id}</option>)}
          </select>
          <button
            onClick={() => detId && window.open(`/api/detection/results/${detId}`, '_blank')}
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <Download size={14} /> Open JSON
          </button>
        </div>
      </div>
    </div>
  )
}
