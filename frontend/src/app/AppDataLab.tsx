import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Database, Eye, FlaskConical, Loader2, RefreshCw, Rows3,
} from 'lucide-react'
import api from '../api'
import { applyFilters, SearchInput, TimeRangeFilter, type TimeRange } from './components/Filters'
import {
  EmptyState, ErrorState, PageHeader, Section, SkeletonTable, SyntheticBadge,
  ToastViewport, fmtDate, fmtNum, useToasts,
} from './components/ui'

export function AppDataLab() {
  const { toasts, push, dismiss } = useToasts()
  const [datasets, setDatasets] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [err, setErr] = useState('')

  const [query, setQuery] = useState('')
  const [range, setRange] = useState<TimeRange>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [scenarios, setScenarios] = useState<any[]>([])
  const [scenario, setScenario] = useState('normal')
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoPreview, setDemoPreview] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const [d, s] = await Promise.all([api.listDatasets(), api.demoScenarios()])
      const list = Array.isArray(d) ? d : []
      setDatasets(list)
      setSelectedId((cur) => (cur && list.some((x: any) => x.id === cur) ? cur : (list[0]?.id || '')))
      setScenarios(Array.isArray(s) ? s : [])
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!selectedId) { setPreview(null); return }
    let alive = true
    setPreviewLoading(true)
    api.previewDataset(selectedId)
      .then((p) => { if (alive) setPreview(p) })
      .catch((e: any) => { if (alive) setErr(String(e?.message || e)) })
      .finally(() => { if (alive) setPreviewLoading(false) })
    return () => { alive = false }
  }, [selectedId])

  const visible = useMemo(() => applyFilters(datasets, {
    query, range, from, to,
    getTime: (d: any) => d.created_at,
    getText: (d: any) => [d.id, d.name, d.kind, d.path].join(' '),
  }), [datasets, query, range, from, to])

  const loadSynthetic = async () => {
    setDemoLoading(true)
    setErr('')
    try {
      const data = await api.loadDemo({ scenario })
      setDemoPreview(data)
      push(`Loaded synthetic scenario “${scenario.replace(/_/g, ' ')}”.`, 'success')
    } catch (e: any) {
      setErr(String(e?.message || e))
      push(`Could not load synthetic data: ${e?.message || e}`, 'error')
    } finally {
      setDemoLoading(false)
    }
  }

  const previewRows: any[] = Array.isArray(preview?.preview) ? preview.preview : []
  const previewColumns: string[] = Array.isArray(preview?.columns) ? preview.columns : Object.keys(previewRows[0] || {})
  const demoRows: any[] = Array.isArray(demoPreview?.preview) ? demoPreview.preview : []
  const demoColumns: string[] = Array.isArray(demoPreview?.columns) ? demoPreview.columns : Object.keys(demoRows[0] || {})

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        eyebrow="Analyst platform"
        title="Data Lab"
        description="Inspect recorded datasets and load clearly labelled synthetic scenarios. Previews show real rows; nothing here modifies stored data."
        icon={Database}
        actions={
          <button type="button" onClick={() => { void load(); push('Dataset list refreshed.', 'info') }} className="btn btn-secondary">
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {err && <ErrorState message={err} onRetry={() => void load()} />}

      <Section
        title={`Datasets (${visible.length})`}
        icon={Database}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search datasets…" />
            <TimeRangeFilter value={range} onChange={setRange} from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          </div>
        }
      >
        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : visible.length === 0 ? (
          <EmptyState title="No datasets found" description="Adjust your search or period to see recorded datasets." icon={Database} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table>
              <thead><tr><th>Name</th><th>Kind</th><th>Rows</th><th>Created</th><th /></tr></thead>
              <tbody>
                {visible.map((d: any, idx) => (
                  <tr
                    key={d?.id || idx}
                    onClick={() => setSelectedId(String(d.id))}
                    className={`cursor-pointer ${selectedId === String(d.id) ? 'bg-primary/5' : 'hover:bg-soft'}`}
                  >
                    <td className="whitespace-nowrap font-medium text-ink">{d?.name || d?.id}</td>
                    <td className="capitalize">{d?.kind || '—'}</td>
                    <td>{fmtNum(d?.n_rows)}</td>
                    <td className="whitespace-nowrap text-xs text-muted">{fmtDate(d?.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(String(d.id)) }}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Eye size={14} /> Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Dataset preview" icon={Eye}>
        {previewLoading ? (
          <div className="py-4"><SkeletonTable rows={4} cols={6} /></div>
        ) : !preview ? (
          <EmptyState title="No dataset selected" description="Choose a dataset above to inspect its preview and column statistics." icon={Eye} />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-ink">{selectedId}</span>
              <span className="text-muted">·</span>
              <span className="inline-flex items-center gap-1 text-muted"><Rows3 size={14} /> {fmtNum(preview?.n_rows)} rows</span>
            </div>
            {preview?.stats && (
              <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <div className="rounded-lg border border-line bg-soft px-3 py-2"><span className="text-muted">Missing values</span><div className="font-semibold text-ink">{fmtNum(preview.stats.n_missing_total)}</div></div>
                <div className="rounded-lg border border-line bg-soft px-3 py-2"><span className="text-muted">Duplicate rows</span><div className="font-semibold text-ink">{fmtNum(preview.stats.duplicate_rows)}</div></div>
                <div className="rounded-lg border border-line bg-soft px-3 py-2"><span className="text-muted">Normal / anomaly</span><div className="font-semibold text-ink">{preview.stats.label_counts?.['0'] ?? '—'} / {preview.stats.label_counts?.['1'] ?? '—'}</div></div>
                <div className="rounded-lg border border-line bg-soft px-3 py-2"><span className="text-muted">Columns profiled</span><div className="font-semibold text-ink">{Object.keys(preview.stats.column_stats || {}).length}</div></div>
              </div>
            )}
            <PreviewTable columns={previewColumns} rows={previewRows} />
          </div>
        )}
      </Section>

      <Section
        title="Load synthetic scenario"
        icon={FlaskConical}
        actions={<SyntheticBadge />}
        description="Six labelled scenarios are available for a safe demo. These rows are generated fixtures, not production telemetry."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="field-label" htmlFor="data-scenario">Scenario</label>
            <select id="data-scenario" value={scenario} onChange={(e) => setScenario(e.target.value)} className="w-full">
              {scenarios.map((s: any) => (
                <option key={s.key || s.scenario} value={s.key || s.scenario}>{s.name || s.key || s.scenario}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => void loadSynthetic()} disabled={demoLoading} className="btn btn-primary disabled:opacity-50">
            {demoLoading ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
            {demoLoading ? 'Loading…' : 'Load synthetic preview'}
          </button>
        </div>
        {demoPreview && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-ink">{String(demoPreview.scenario).replace(/_/g, ' ')}</span>
              <SyntheticBadge compact />
              <span className="text-muted">{fmtNum(demoPreview.n_rows)} synthetic rows</span>
            </div>
            <p className="text-sm text-body">{demoPreview.description}</p>
            <PreviewTable columns={demoColumns} rows={demoRows} />
          </div>
        )}
      </Section>
    </div>
  )
}

function PreviewTable({ columns, rows }: { columns: string[]; rows: any[] }) {
  if (!rows.length) {
    return <EmptyState title="No preview rows" description="This dataset has no rows available to preview." icon={Eye} />
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table>
        <thead><tr>{columns.map((c) => <th key={c} className="whitespace-nowrap">{c.replace(/_/g, ' ')}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, 12).map((row: any, i: number) => (
            <tr key={row?.record_id || i}>
              {columns.map((c) => (
                <td key={c} className="whitespace-nowrap text-xs">
                  {typeof row?.[c] === 'number' ? row[c] : String(row?.[c] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-3 py-2 text-xs text-muted">
        Showing {Math.min(12, rows.length)} of {rows.length} preview rows.
      </p>
    </div>
  )
}

export default AppDataLab
