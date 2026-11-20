import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { FlaskConical, Play, RefreshCw } from 'lucide-react'
import api from '../api'
import { applyFilters, SearchInput, TimeRangeFilter, type TimeRange } from './components/Filters'
import {
  EmptyState, ErrorState, PageHeader, Section, SkeletonTable, SourceBadge,
  ToastViewport, fmtDate, fmtScore, useToasts,
} from './components/ui'

export function AppExperiments() {
  const { toasts, push, dismiss } = useToasts()
  const [experiments, setExperiments] = useState<any[]>([])
  const [datasets, setDatasets] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [trainId, setTrainId] = useState('')
  const [testId, setTestId] = useState('')
  const [methods, setMethods] = useState<string[]>(['isolation_forest', 'statistical_mad'])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<any>(null)
  const [err, setErr] = useState('')

  const [query, setQuery] = useState('')
  const [range, setRange] = useState<TimeRange>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const [exp, ds] = await Promise.all([api.listExperiments(), api.listDatasets()])
      const el = Array.isArray(exp) ? exp : []
      const dl = Array.isArray(ds) ? ds : []
      setExperiments(el)
      setDatasets(dl)
      setSelectedId((cur) => (cur && el.some((x: any) => x.id === cur) ? cur : (el[0]?.id || '')))
      setTrainId((cur) => cur || (dl[0]?.id || ''))
      setTestId((cur) => cur || (dl[1]?.id || dl[0]?.id || ''))
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => applyFilters(experiments, {
    query, range, from, to,
    getTime: (e: any) => e.created_at,
    getText: (e: any) => [e.id, e.name, e.result_path].join(' '),
  }), [experiments, query, range, from, to])

  const runComparison = async () => {
    if (!trainId || !testId) { push('Select training and test datasets.', 'error'); return }
    if (methods.length === 0) { push('Select at least one detection method.', 'error'); return }
    setRunning(true)
    setErr('')
    try {
      const r: any = await api.runExperiment({ train_dataset_id: trainId, test_dataset_id: testId, methods })
      setLastRun(r)
      push(`Experiment ${r?.experiment_id || ''} finished across ${methods.length} method(s).`, 'success')
      const exp = await api.listExperiments().catch(() => [])
      setExperiments(Array.isArray(exp) ? exp : [])
    } catch (e: any) {
      setErr(String(e?.message || e))
      push(`Experiment failed: ${e?.message || e}`, 'error')
    } finally {
      setRunning(false)
    }
  }

  const results: any[] = Array.isArray(lastRun?.results) ? lastRun.results : []
  const chartData = results.map((r: any) => ({
    method: String(r.method).replace(/_/g, ' '),
    f1: Number(r?.metrics?.f1) || 0,
    precision: Number(r?.metrics?.precision) || 0,
    recall: Number(r?.metrics?.recall) || 0,
  }))
  const selected = experiments.find((e: any) => String(e.id) === selectedId) || null

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        eyebrow="Analyst platform"
        title="Experiment Lab"
        description="Compare detection methods on the same datasets. Results are produced by the evaluation pipeline and shown side by side."
        icon={FlaskConical}
        actions={
          <button type="button" onClick={() => { void load(); push('Experiment list refreshed.', 'info') }} className="btn btn-secondary">
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {err && <ErrorState message={err} onRetry={() => void load()} />}

      <Section title="Configure comparison" icon={FlaskConical}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="exp-train">Training dataset</label>
            <select id="exp-train" value={trainId} onChange={(e) => setTrainId(e.target.value)} className="w-full">
              {datasets.map((d: any) => <option key={d.id} value={d.id}>{d.name || d.id}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="exp-test">Test dataset</label>
            <select id="exp-test" value={testId} onChange={(e) => setTestId(e.target.value)} className="w-full">
              {datasets.map((d: any) => <option key={d.id} value={d.id}>{d.name || d.id}</option>)}
            </select>
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className="field-label">Methods to compare</legend>
          <div className="flex flex-wrap gap-4">
            {['isolation_forest', 'statistical_mad'].map((m) => (
              <label key={m} className="inline-flex items-center gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={methods.includes(m)}
                  onChange={(e) => setMethods((prev) => e.target.checked ? [...prev, m] : prev.filter((x) => x !== m))}
                />
                <code>{m}</code>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="button" onClick={() => void runComparison()} disabled={running} className="btn btn-primary mt-4 disabled:opacity-50">
          {running ? <span className="animate-spin">◌</span> : <Play size={15} />}
          {running ? 'Running…' : 'Run comparison'}
        </button>
      </Section>

      {lastRun && (
        <Section title="Latest comparison result" icon={FlaskConical} actions={<SourceBadge source={lastRun?.result_path && String(lastRun.result_path).startsWith('demo://') ? 'demo fixture' : 'live backend'} />}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-lg border border-line">
              <table>
                <thead><tr><th>Method</th><th>Flagged</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead>
                <tbody>
                  {results.map((r: any, i: number) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap font-medium">{r?.method}</td>
                      <td>{r?.n_flagged ?? '—'}</td>
                      <td>{fmtScore(r?.metrics?.accuracy)}</td>
                      <td>{fmtScore(r?.metrics?.precision)}</td>
                      <td>{fmtScore(r?.metrics?.recall)}</td>
                      <td>{fmtScore(r?.metrics?.f1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="method" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="f1" name="F1" fill="#0E7C7B" />
                  <Bar dataKey="precision" name="Precision" fill="#2563EB" />
                  <Bar dataKey="recall" name="Recall" fill="#94A3B8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>
      )}

      <Section
        title={`Recorded experiments (${visible.length})`}
        icon={FlaskConical}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search experiments…" />
            <TimeRangeFilter value={range} onChange={setRange} from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          </div>
        }
      >
        {loading ? (
          <SkeletonTable rows={4} cols={3} />
        ) : visible.length === 0 ? (
          <EmptyState title="No experiments recorded" description="Run a comparison above to record an experiment." icon={FlaskConical} />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(260px,340px)_1fr]">
            <div className="overflow-x-auto rounded-lg border border-line">
              <table>
                <thead><tr><th>Experiment</th><th>Created</th></tr></thead>
                <tbody>
                  {visible.map((e: any, i: number) => (
                    <tr
                      key={e?.id || i}
                      onClick={() => setSelectedId(String(e.id))}
                      className={`cursor-pointer ${selectedId === String(e.id) ? 'bg-primary/5' : 'hover:bg-soft'}`}
                    >
                      <td className="whitespace-nowrap font-medium">{e?.name || e?.id}</td>
                      <td className="whitespace-nowrap text-xs text-muted">{fmtDate(e?.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected ? (
              <div className="rounded-lg border border-line bg-soft p-4 text-sm">
                <div className="mb-2 font-semibold text-ink">{selected.name || selected.id}</div>
                <dl className="space-y-1.5">
                  {[
                    ['ID', selected.id],
                    ['Created', fmtDate(selected.created_at)],
                    ['Result path', selected.result_path],
                    ['Method', selected.method],
                  ].filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between gap-3">
                      <dt className="text-muted">{k}</dt>
                      <dd className="break-all text-right font-medium text-ink">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
                {Array.isArray(selected.results) && selected.results.length > 0 && (
                  <p className="mt-3 text-xs text-muted">{selected.results.length} method result(s) stored with this experiment.</p>
                )}
              </div>
            ) : (
              <EmptyState title="Select an experiment" description="Choose an experiment to see its stored details." icon={FlaskConical} />
            )}
          </div>
        )}
      </Section>
    </div>
  )
}

export default AppExperiments
