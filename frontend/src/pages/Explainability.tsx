import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Activity, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { api } from '../api'

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

type Row = {
  record_id: string
  score: number
  flag: number
  severity: string
  affected_features: string[]
  explanation: Explanation
  deviations: Deviation[]
  true_label?: number | null
}

type Detection = {
  detection_id: string
  n_rows: number
  n_flagged: number
  threshold: number
  method: string
  metrics?: any
  rows: Row[]
}

const sevColor: Record<string, string> = {
  critical: 'text-rose-700 bg-rose-50 border-rose-200',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-slate-700 bg-slate-50 border-slate-200',
}

export default function Explainability() {
  const [detections, setDetections] = useState<any[]>([])
  const [detId, setDetId] = useState('')
  const [det, setDet] = useState<Detection | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<string>('')

  useEffect(() => {
    api.listDetections().then((d) => {
      setDetections(d || [])
      if (d && d.length) setDetId(d[0].id)
    }).catch((e) => setErr(String(e)))
  }, [])

  useEffect(() => {
    if (!detId) return
    setLoading(true); setErr('')
    api.getDetection(detId).then((d) => {
      setDet(d)
      const flagged = (d.rows || []).filter((r: Row) => r.flag === 1)
      setSelectedRecord(flagged.length ? flagged[0].record_id : (d.rows?.[0]?.record_id || ''))
    }).catch((e) => setErr(String(e))).finally(() => setLoading(false))
  }, [detId])

  const rows = det?.rows || []
  const flagged = rows.filter((r) => r.flag === 1)
  const selected = rows.find((r) => r.record_id === selectedRecord) || null

  const chartData = (selected?.deviations || []).map((d) => ({
    feature: d.feature.replace(/_/g, ' '),
    observed: d.value ?? 0,
    baseline: d.baseline_median ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Explainability</h1>
        <p className="text-sm text-slate-500 mt-1">
          Grounded, human-readable explanations for flagged records. Observed evidence, model interpretation, possible explanation, recommended investigation and unknowns are kept separate.
        </p>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Detection run</label>
        <select value={detId} onChange={(e) => setDetId(e.target.value)} className="min-w-[260px]">
          {detections.length === 0 && <option value="">No detections yet</option>}
          {detections.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.id} · {d.method} · {d.n_flagged} flagged
            </option>
          ))}
        </select>
        {loading && <Loader2 className="animate-spin text-teal" size={18} />}
      </div>

      {err && <div className="card p-4 text-rose-700 text-sm">{err}</div>}

      {!det && !loading && (
        <div className="card p-8 text-center text-slate-500 text-sm">Select a detection run to inspect explanations.</div>
      )}

      {det && (
        <>
          <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-slate-500">Method</div><div className="font-semibold">{det.method}</div></div>
            <div><div className="text-slate-500">Threshold</div><div className="font-semibold">{det.threshold}</div></div>
            <div><div className="text-slate-500">Rows analysed</div><div className="font-semibold">{det.n_rows}</div></div>
            <div><div className="text-slate-500">Flagged</div><div className="font-semibold">{det.n_flagged}</div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-4 lg:col-span-1">
              <h2 className="font-semibold text-sm mb-3">Flagged records ({flagged.length})</h2>
              {flagged.length === 0 ? (
                <div className="text-sm text-slate-500">No flagged records in this run.</div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-auto">
                  {flagged.map((r) => (
                    <button
                      key={r.record_id}
                      onClick={() => setSelectedRecord(r.record_id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
                        selectedRecord === r.record_id ? 'border-teal bg-teal/5' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.record_id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${sevColor[r.severity] || sevColor.low}`}>
                          {r.severity}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">score {r.score.toFixed(3)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              {!selected ? (
                <div className="card p-8 text-center text-slate-500 text-sm">Select a flagged record.</div>
              ) : (
                <>
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={16} className="text-teal" />
                      <h2 className="font-semibold">Narrative</h2>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${sevColor[selected.severity] || sevColor.low}`}>
                        {selected.severity}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{selected.explanation.narrative}</p>
                  </div>

                  <div className="card p-4">
                    <h2 className="font-semibold text-sm mb-3">Feature deviation (observed vs baseline)</h2>
                    {chartData.length === 0 ? (
                      <div className="text-sm text-slate-500">No deviation data.</div>
                    ) : (
                      <div style={{ width: '100%', height: 260 }}>
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

                  <div className="card p-4">
                    <h2 className="font-semibold text-sm mb-2">Affected features</h2>
                    {selected.affected_features.length === 0 ? (
                      <div className="text-sm text-slate-500">No single feature dominated.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selected.affected_features.map((f) => (
                          <span key={f} className="px-2.5 py-1 rounded-full bg-teal/10 text-teal text-xs font-medium">
                            {f.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Section title="Observed evidence" icon={<CheckCircle2 size={16} className="text-teal" />}>
                    {selected.explanation.evidence.length === 0 ? (
                      <p className="text-sm text-slate-500">No strong per-feature deviation noted.</p>
                    ) : (
                      <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                        {selected.explanation.evidence.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    )}
                  </Section>

                  <Section title="Model interpretation" icon={<Activity size={16} className="text-slate-600" />}>
                    <p className="text-sm text-slate-700">{selected.explanation.model_interpretation}</p>
                  </Section>

                  <Section title="Possible explanation" icon={<AlertTriangle size={16} className="text-amber-600" />}>
                    <p className="text-sm text-slate-700">{selected.explanation.possible_explanation}</p>
                  </Section>

                  <Section title="Recommended investigation" icon={<CheckCircle2 size={16} className="text-teal" />}>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                      {selected.explanation.recommended_investigation.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </Section>

                  <Section title="Unknowns" icon={<AlertTriangle size={16} className="text-slate-500" />}>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                      {selected.explanation.unknowns.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </Section>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}
