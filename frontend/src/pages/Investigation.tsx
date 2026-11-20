import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
  Search, Loader2, RefreshCw, AlertTriangle, Activity, CheckCircle2,
  ClipboardList, HelpCircle, Save,
} from 'lucide-react'
import api from '../api'

type Incident = {
  id: string
  detection_id: string
  record_id: string
  score: number
  severity: string
  status: string
  notes: string
  created_at: string
}
type Deviation = {
  feature: string
  value: number | null
  baseline_median: number | null
  deviation: number | null
  relative_pct: number | null
  status: string
}
type Explanation = {
  severity: string
  affected_features: string[]
  evidence: string[]
  model_interpretation: string
  possible_explanation: string
  recommended_investigation: string[]
  unknowns: string[]
  narrative: string
}
type DetailRow = { record_id: string; explanation: Explanation; deviations: Deviation[] }

const sevColor: Record<string, string> = {
  critical: 'text-rose-700 bg-rose-50 border-rose-200',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-slate-700 bg-slate-100 border-slate-200',
}
const statusColor: Record<string, string> = {
  open: 'text-teal bg-teal/10 border-teal/30',
  investigating: 'text-amber-700 bg-amber-50 border-amber-200',
  resolved: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  false_positive: 'text-slate-700 bg-slate-100 border-slate-200',
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">{icon}{title}</h3>
      {children}
    </div>
  )
}

export default function Investigation() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [tab, setTab] = useState<'open' | 'all'>('open')
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<DetailRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('open')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  const load = () => {
    setLoading(true); setErr('')
    api.listIncidents()
      .then((i) => {
        const list = i || []
        setIncidents(list)
        setSelectedId((cur) => {
          if (cur && list.some((x: Incident) => x.id === cur)) return cur
          const first = list.find((x: Incident) => x.status === 'open') || list[0]
          return first ? first.id : ''
        })
      })
      .catch((e: any) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const inc = incidents.find((i) => i.id === selectedId)
    setNotes(inc?.notes || '')
    setStatus(inc?.status || 'open')
    if (!inc) { setDetail(null); return }
    setDetailLoading(true); setErr('')
    api.getDetection(inc.detection_id)
      .then((d) => {
        const row = (d.rows || []).find((r: DetailRow) => r.record_id === inc.record_id)
        setDetail(row || null)
      })
      .catch((e: any) => setErr(String(e?.message || e)))
      .finally(() => setDetailLoading(false))
  }, [selectedId, incidents])

  const visible = tab === 'open'
    ? incidents.filter((i) => i.status === 'open' || i.status === 'investigating')
    : incidents
  const selected = incidents.find((i) => i.id === selectedId) || null
  const explanation = detail?.explanation
  const chartData = (detail?.deviations || []).map((d) => ({
    feature: d.feature.replace(/_/g, ' '),
    observed: d.value ?? 0,
    baseline: d.baseline_median ?? 0,
  }))

  const save = async () => {
    if (!selectedId) return
    setSaving(true); setSaved(''); setErr('')
    try {
      const updated = await api.updateIncident(selectedId, { status, notes })
      setIncidents((prev) => prev.map((i) => (
        i.id === selectedId ? { ...i, ...updated, status, notes } : i
      )))
      setSaved('Incident updated.')
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Search size={22} className="text-teal" /> Investigation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Triage flagged incidents with grounded evidence and record the investigation outcome.
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

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            {(['open', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm capitalize ${tab === t ? 'bg-teal text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {t === 'open' ? 'Open' : 'All'}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">{visible.length} incident{visible.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
            <Loader2 className="animate-spin text-teal" size={16} /> Loading incidents…
          </div>
        ) : visible.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center">
            {tab === 'open' ? 'No open incidents — nothing needs attention right now.' : 'No incidents recorded yet.'}
          </div>
        ) : (
          <div className="overflow-auto">
            <table>
              <thead>
                <tr><th>Record</th><th>Score</th><th>Severity</th><th>Status</th><th>Created</th></tr>
              </thead>
              <tbody>
                {visible.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => { setSelectedId(i.id); setSaved('') }}
                    className={`cursor-pointer ${selectedId === i.id ? 'bg-teal/5' : 'hover:bg-slate-50'}`}
                  >
                    <td className="font-medium">{i.record_id}</td>
                    <td>{typeof i.score === 'number' ? i.score.toFixed(3) : '-'}</td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${sevColor[i.severity] || sevColor.low}`}>
                        {i.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[i.status] || statusColor.open}`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{i.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="card p-4">
              <h2 className="font-semibold text-sm mb-3">Incident overview</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Incident</span><span className="font-medium">{selected.id}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Record</span><span className="font-medium">{selected.record_id}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Detection</span><span className="font-medium break-all">{selected.detection_id}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Score</span><span className="font-medium">{typeof selected.score === 'number' ? selected.score.toFixed(3) : '-'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Severity</span><span className={`text-xs px-2 py-0.5 rounded-full border ${sevColor[selected.severity] || sevColor.low}`}>{selected.severity}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Status</span><span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[selected.status] || statusColor.open}`}>{selected.status}</span></div>
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <h2 className="font-semibold text-sm flex items-center gap-2"><ClipboardList size={16} className="text-teal" /> Investigation notes</h2>
              <div>
                <label htmlFor="status" className="text-sm font-medium text-slate-700 block mb-1">Status</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                  <option value="open">open</option>
                  <option value="investigating">investigating</option>
                  <option value="resolved">resolved</option>
                  <option value="false_positive">false_positive</option>
                </select>
              </div>
              <div>
                <label htmlFor="notes" className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className="w-full" placeholder="What did you find? What action was taken?" />
              </div>
              <button onClick={save} disabled={saving} className="btn btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                <span className="ml-2">{saving ? 'Saving…' : 'Save update'}</span>
              </button>
              {saved && <div className="text-sm text-teal">{saved}</div>}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {detailLoading && (
              <div className="card p-8 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="animate-spin text-teal" size={16} /> Loading explanation…
              </div>
            )}
            {!detailLoading && !detail && (
              <div className="card p-8 text-center text-sm text-slate-500">
                No explanation row found for this record in its detection run.
              </div>
            )}
            {!detailLoading && detail && (
              <>
                <Section title="Narrative" icon={<Activity size={16} className="text-teal" />}>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {explanation?.narrative || 'No narrative available.'}
                  </p>
                </Section>

                <div className="card p-4">
                  <h3 className="font-semibold text-sm mb-3">Metric deviation · baseline vs observed</h3>
                  {chartData.length === 0 ? (
                    <div className="text-sm text-slate-500">No deviation data for this record.</div>
                  ) : (
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="feature" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="observed" fill="#0e7c7b" name="Observed" />
                          <Bar dataKey="baseline" fill="#94a3b8" name="Baseline median" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <Section title="Affected features" icon={<Activity size={16} className="text-teal" />}>
                  {(explanation?.affected_features || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No single feature dominated this flag.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(explanation?.affected_features || []).map((f) => (
                        <span key={f} className="px-2.5 py-1 rounded-full bg-teal/10 text-teal text-xs font-medium">
                          {f.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="Evidence" icon={<CheckCircle2 size={16} className="text-teal" />}>
                  {(explanation?.evidence || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No strong per-feature deviation noted.</p>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                      {(explanation?.evidence || []).map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </Section>

                <Section title="Model interpretation" icon={<Activity size={16} className="text-slate-600" />}>
                  <p className="text-sm text-slate-700">{explanation?.model_interpretation || '-'}</p>
                </Section>

                <Section title="Possible explanation" icon={<AlertTriangle size={16} className="text-amber-600" />}>
                  <p className="text-sm text-slate-700">{explanation?.possible_explanation || '-'}</p>
                </Section>

                <Section title="Recommended investigation" icon={<CheckCircle2 size={16} className="text-teal" />}>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                    {(explanation?.recommended_investigation || []).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </Section>

                <Section title="Unknowns" icon={<HelpCircle size={16} className="text-slate-500" />}>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                    {(explanation?.unknowns || []).map((u, i) => <li key={i}>{u}</li>)}
                  </ul>
                </Section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
