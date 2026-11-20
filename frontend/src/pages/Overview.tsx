import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Database, Rows3, Cpu, ScanSearch, AlertTriangle, CircleDot,
  Loader2, RefreshCw, ArrowRight, LayoutDashboard,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import api from '../api'

type Dataset = { id: string; name: string; n_rows: number; kind: string; created_at: string }
type Detection = {
  id: string
  dataset_id: string
  method: string
  threshold: number
  n_flagged: number
  created_at: string
}
type Incident = {
  id: string
  detection_id: string
  record_id: string
  severity: string
  status: string
  created_at: string
}
type Model = { id: string; method: string; created_at: string }

const sevColor: Record<string, string> = {
  critical: 'text-rose-700 bg-rose-50 border-rose-200',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-slate-700 bg-slate-100 border-slate-200',
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-slate-600">{label}</div>
        <Icon size={18} className="text-teal" />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-navy">{value}</div>
    </div>
  )
}

export default function Overview() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [detections, setDetections] = useState<Detection[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = () => {
    setLoading(true)
    setErr('')
    Promise.all([
      api.listDatasets(),
      api.listDetections(),
      api.listIncidents(),
      api.listModels(),
    ])
      .then(([d, det, inc, m]) => {
        setDatasets(d || [])
        setDetections(det || [])
        setIncidents(inc || [])
        setModels(m || [])
      })
      .catch((e: any) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const totalRows = datasets.reduce((sum, d) => sum + (Number(d.n_rows) || 0), 0)
  const totalFlagged = detections.reduce((sum, d) => sum + (Number(d.n_flagged) || 0), 0)
  const openIncidents = incidents.filter((i) => i.status === 'open').length

  const chartData = detections.slice(0, 10).map((d) => ({
    name: String(d.id).slice(0, 8),
    flagged: Number(d.n_flagged) || 0,
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Pipeline status at a glance.</p>
        </div>
        <div className="card p-12 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="animate-spin text-teal" size={18} /> Loading dashboard…
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <LayoutDashboard size={22} className="text-teal" /> Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pipeline status at a glance — every figure comes from recorded data.
          </p>
        </div>
        <button onClick={load} className="btn btn-secondary inline-flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {err && (
        <div className="card p-4 text-sm text-rose-700 flex flex-wrap items-center gap-3">
          <AlertTriangle size={16} /> {err}
          <button onClick={load} className="text-teal underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label="Datasets" value={datasets.length} icon={Database} />
        <Kpi label="Rows processed" value={totalRows.toLocaleString()} icon={Rows3} />
        <Kpi label="Models trained" value={models.length} icon={Cpu} />
        <Kpi label="Detections run" value={detections.length} icon={ScanSearch} />
        <Kpi label="Anomalies flagged" value={totalFlagged.toLocaleString()} icon={AlertTriangle} />
        <Kpi label="Open incidents" value={openIncidents} icon={CircleDot} />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Flagged counts by detection</h2>
          <Link to="/detect" className="text-sm text-teal inline-flex items-center gap-1 hover:underline">
            Anomaly Detection <ArrowRight size={14} />
          </Link>
        </div>
        {chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
            No detection runs yet — run a detection to see flagged counts here.
          </div>
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="flagged" fill="#0e7c7b" name="Flagged" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-3">Recent detections</h2>
          {detections.length === 0 ? (
            <div className="text-sm text-slate-500 py-6 text-center">
              No detection runs recorded. <Link to="/detect" className="text-teal hover:underline">Run one</Link>.
            </div>
          ) : (
            <div className="overflow-auto">
              <table>
                <thead>
                  <tr><th>ID</th><th>Method</th><th>Flagged</th><th>Created</th></tr>
                </thead>
                <tbody>
                  {detections.slice(0, 5).map((d) => (
                    <tr key={d.id}>
                      <td className="font-medium">{String(d.id).slice(0, 10)}</td>
                      <td>{d.method}</td>
                      <td className="font-semibold">{d.n_flagged}</td>
                      <td className="text-xs text-slate-500">{d.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Recent incidents</h2>
            <Link to="/investigate" className="text-sm text-teal inline-flex items-center gap-1 hover:underline">
              Investigate <ArrowRight size={14} />
            </Link>
          </div>
          {incidents.length === 0 ? (
            <div className="text-sm text-slate-500 py-6 text-center">No incidents recorded yet.</div>
          ) : (
            <div className="overflow-auto">
              <table>
                <thead>
                  <tr><th>Record</th><th>Severity</th><th>Status</th><th>Created</th></tr>
                </thead>
                <tbody>
                  {incidents.slice(0, 5).map((i) => (
                    <tr key={i.id}>
                      <td className="font-medium">{i.record_id}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${sevColor[i.severity] || sevColor.low}`}>
                          {i.severity}
                        </span>
                      </td>
                      <td className="text-xs">{i.status}</td>
                      <td className="text-xs text-slate-500">{i.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
