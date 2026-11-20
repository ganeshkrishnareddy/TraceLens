import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Activity, HelpCircle, Lightbulb, ListChecks, RefreshCw, ScanSearch } from 'lucide-react'
import api from '../api'
import { applyFilters, SearchInput, TimeRangeFilter, type TimeRange } from './components/Filters'
import {
  EmptyState, ErrorState, PageHeader, Section, SeverityBadge, SkeletonTable,
  SourceBadge, SyntheticBadge, fmtDate, fmtScore, ToastViewport, useToasts,
} from './components/ui'

export function AppExplain() {
  const { toasts, push, dismiss } = useToasts()
  const [detections, setDetections] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [err, setErr] = useState('')
  const [selectedRowId, setSelectedRowId] = useState('')

  const [query, setQuery] = useState('')
  const [range, setRange] = useState<TimeRange>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const d = await api.listDetections()
      const list = Array.isArray(d) ? d : []
      setDetections(list)
      setSelectedId((cur) => (cur && list.some((x: any) => x.id === cur) ? cur : (list[0]?.id || '')))
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!selectedId) { setResult(null); return }
    let alive = true
    setDetailLoading(true)
    api.getDetection(selectedId)
      .then((d) => { if (alive) { setResult(d); setSelectedRowId('') } })
      .catch((e: any) => { if (alive) setErr(String(e?.message || e)) })
      .finally(() => { if (alive) setDetailLoading(false) })
    return () => { alive = false }
  }, [selectedId])

  const visibleDetections = useMemo(() => applyFilters(detections, {
    query, range, from, to,
    getTime: (d: any) => d.created_at,
    getText: (d: any) => [d.id, d.method, d.dataset_id].join(' '),
  }), [detections, query, range, from, to])

  const rows: any[] = Array.isArray(result?.rows) ? result.rows : []
  const flagged = rows.filter((r) => r.flag === 1)
  const activeRow = rows.find((r) => r.record_id === selectedRowId) || flagged[0] || null
  const explanation = activeRow?.explanation || null
  const deviations: any[] = Array.isArray(activeRow?.deviations) ? activeRow.deviations : []
  const chartData = deviations.map((d) => ({
    metric: String(d.feature).replace(/_/g, ' '),
    observed: Number(d.value) || 0,
    baseline: Number(d.baseline_median) || 0,
  }))
  const fixture = Boolean(result?.result_path && String(result.result_path).startsWith('demo://'))

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        eyebrow="Analyst platform"
        title="Explainability"
        description="Read the evidence behind each flagged record: which metrics deviated, how the model interpreted them and what remains unknown."
        icon={Activity}
        actions={
          <button type="button" onClick={() => { void load(); push('Detection list refreshed.', 'info') }} className="btn btn-secondary">
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {err && <ErrorState message={err} onRetry={() => void load()} />}

      <Section
        title={`Detection runs (${visibleDetections.length})`}
        icon={ScanSearch}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search detections…" />
            <TimeRangeFilter value={range} onChange={setRange} from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          </div>
        }
      >
        {loading ? (
          <SkeletonTable rows={4} cols={4} />
        ) : visibleDetections.length === 0 ? (
          <EmptyState
            title="No detection runs available"
            description="Run a detection first to generate explanations."
            icon={ScanSearch}
            action={<Link to="/app/detect" className="btn btn-primary">Run detection</Link>}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table>
              <thead><tr><th>Detection</th><th>Method</th><th>Flagged</th><th>Created</th></tr></thead>
              <tbody>
                {visibleDetections.map((d: any, i: number) => (
                  <tr
                    key={d?.id || i}
                    onClick={() => setSelectedId(String(d.id))}
                    className={`cursor-pointer ${selectedId === String(d.id) ? 'bg-primary/5' : 'hover:bg-soft'}`}
                  >
                    <td className="whitespace-nowrap font-medium">{d?.id}</td>
                    <td>{d?.method}</td>
                    <td>{d?.n_flagged ?? '—'}</td>
                    <td className="whitespace-nowrap text-xs text-muted">{fmtDate(d?.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {detailLoading ? (
        <div className="card p-6"><SkeletonTable rows={6} cols={3} /></div>
      ) : !result ? (
        <EmptyState title="Select a detection run" description="Choose a run above to read its anomaly explanations." icon={Activity} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={fixture ? 'demo fixture' : 'live backend'} />
            {result?.is_synthetic && <SyntheticBadge />}
            <span className="text-sm text-muted">
              {fmtScore(result?.metrics?.accuracy)} accuracy · {fmtScore(result?.metrics?.f1)} F1 · {rows.length} rows
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
            <Section title={`Flagged records (${flagged.length})`} icon={ScanSearch}>
              {flagged.length === 0 ? (
                <EmptyState title="No flagged records" description="This detection did not flag any records." icon={ScanSearch} />
              ) : (
                <div className="max-h-[560px] space-y-2 overflow-y-auto">
                  {flagged.map((r: any, i: number) => (
                    <button
                      key={r?.record_id || i}
                      type="button"
                      onClick={() => setSelectedRowId(String(r.record_id))}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        activeRow?.record_id === r.record_id ? 'border-primary bg-primary/5' : 'border-line bg-white hover:bg-soft'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{r?.record_id}</span>
                        <SeverityBadge severity={r?.severity} />
                      </div>
                      <div className="mt-1 text-xs text-muted">Score {fmtScore(r?.score)}</div>
                    </button>
                  ))}
                </div>
              )}
            </Section>

            {!activeRow ? (
              <EmptyState title="No record selected" description="Select a flagged record to read its explanation." icon={Activity} />
            ) : (
              <div className="min-w-0 space-y-4">
                <Section title="Narrative" icon={Activity}>
                  <p className="text-sm leading-relaxed text-body">
                    {explanation?.narrative || 'No narrative is attached to this record.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SeverityBadge severity={explanation?.severity || activeRow?.severity} />
                    {(explanation?.affected_features || []).map((f: string) => (
                      <span key={f} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {f.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </Section>

                <Section title="Metric deviation · observed vs baseline" icon={Activity}>
                  {chartData.length === 0 ? (
                    <EmptyState title="No deviation data" description="This record has no attached per-metric deviations." icon={Activity} />
                  ) : (
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="metric" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={56} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="observed" name="Observed" fill="#0E7C7B" />
                          <Bar dataKey="baseline" name="Baseline median" fill="#94A3B8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Section>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Section title="Evidence" icon={ListChecks}>
                    {(explanation?.evidence || []).length ? (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-body">
                        {explanation.evidence.map((e: string, i: number) => <li key={i}>{e}</li>)}
                      </ul>
                    ) : <p className="text-sm text-muted">No strong per-metric deviation noted.</p>}
                  </Section>
                  <Section title="Model interpretation" icon={Lightbulb}>
                    <p className="text-sm leading-relaxed text-body">
                      {explanation?.model_interpretation || 'No interpretation is available.'}
                    </p>
                  </Section>
                  <Section title="Possible explanation" icon={Lightbulb}>
                    <p className="text-sm leading-relaxed text-body">
                      {explanation?.possible_explanation || 'No hypothesis is available.'}
                    </p>
                  </Section>
                  <Section title="Recommended investigation" icon={ListChecks}>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-body">
                      {(explanation?.recommended_investigation || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  </Section>
                </div>

                <Section title="Unknowns & limits" icon={HelpCircle}>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-body">
                    {(explanation?.unknowns || []).map((u: string, i: number) => <li key={i}>{u}</li>)}
                  </ul>
                  <Link to="/app/investigate" className="btn btn-primary mt-3">
                    Review in Investigation
                  </Link>
                </Section>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AppExplain
