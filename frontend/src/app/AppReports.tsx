import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, CalendarDays, CheckCircle2, ChevronRight, Database, Download,
  FileText, GitBranch, Loader2, RefreshCw, ShieldCheck,
} from 'lucide-react'
import api from '../api'
import { applyFilters, SearchInput, TimeRangeFilter, type TimeRange } from './components/Filters'
import {
  EmptyState, ErrorState, PageHeader, Section, SkeletonBlock, SkeletonTable,
  SourceBadge, ToastViewport, fmtDate, useToasts,
} from './components/ui'

const REPORT_TYPES = [
  { value: 'anomaly detection', label: 'Anomaly detection' },
  { value: 'incident investigation', label: 'Incident investigation' },
  { value: 'escalation history', label: 'Escalation history' },
  { value: 'experiment evaluation', label: 'Experiment evaluation' },
  { value: 'dataset quality', label: 'Dataset quality' },
]

const KIND_LABEL: Record<string, string> = {
  anomaly_detection: 'Anomaly Detection Report',
  incident_investigation: 'Incident Investigation Report',
  escalation_history: 'Escalation History Report',
  experiment_evaluation: 'Experiment Evaluation Report',
  dataset_quality: 'Dataset Quality Report',
}

const KPI_LABEL: Record<string, string> = {
  n_rows: 'Records', n_flagged: 'Flagged', severity: 'Severity classes',
  n_incidents: 'Incidents', n_notes: 'Notes', n_escalations: 'Escalations',
  statuses: 'Statuses', priorities: 'Priorities', n_resolved: 'Resolved',
  methods: 'Methods', metrics: 'Metrics', n_columns: 'Columns',
  n_missing: 'Missing values', scenarios: 'Scenarios', labels: 'Labels',
  experiment_id: 'Experiment',
}

function reportKpis(payload: any): [string, string][] {
  const sc = payload?.source_counts || {}
  const items: [string, string][] = []
  Object.entries(sc).forEach(([key, value]: [string, any]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      items.push([KPI_LABEL[key] || key, String(Object.keys(value).length)])
    } else if (typeof value === 'number') {
      items.push([KPI_LABEL[key] || key, String(value)])
    } else if (typeof value === 'string' && value.length <= 18) {
      items.push([KPI_LABEL[key] || key, value])
    }
  })
  if (typeof sc.n_rows === 'number' && sc.n_rows && typeof sc.n_flagged === 'number') {
    items.splice(2, 0, ['Flag rate', `${((100 * sc.n_flagged) / sc.n_rows).toFixed(1)}%`])
  }
  return items.slice(0, 4)
}

function severityClass(value: any) {
  const v = String(value || '').toLowerCase()
  if (v === 'critical') return 'bg-red-50 text-red-700'
  if (v === 'high') return 'bg-amber-50 text-amber-700'
  if (v === 'medium' || v === 'low') return 'bg-teal-50 text-teal-700'
  return 'bg-soft text-muted'
}

function ReportSheet({ payload, onDownload, downloading }: {
  payload: any
  onDownload: (id: string, fmt: 'pdf' | 'csv' | 'json') => void
  downloading: string
}) {
  if (!payload || !Object.keys(payload).length) {
    return <EmptyState title="No preview available" description="Open a stored report to see its document preview." icon={FileText} />
  }

  const id = payload.report_id || payload.id
  const kpis = reportKpis(payload)
  const ds = payload.dataset || {}
  const sections = Array.isArray(payload.sections) ? payload.sections : []
  const records = Array.isArray(payload.records) ? payload.records : []

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className="relative overflow-hidden bg-navy px-6 py-6 text-white">
        <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-6 h-24 w-24 rounded-full border border-teal-300/20" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200">
          TraceLens · Analyst report
        </p>
        <h3 className="mt-2 max-w-lg text-xl font-semibold leading-snug tracking-tight">
          {payload.title || KIND_LABEL[payload.kind] || 'TraceLens Report'}
        </h3>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-300">
          <span className="font-mono">{id}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {fmtDate(payload.generated_at)}</span>
          <span className="capitalize">{String(payload.kind || '').replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div className="px-6 py-5">
        {kpis.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {kpis.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-paper px-3 py-2.5">
                <p className="truncate text-base font-semibold text-ink" title={value}>{value}</p>
                <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-soft px-3 py-2 text-xs text-body">
          <span className="inline-flex items-center gap-1.5"><Database size={12} className="text-primary" /> {ds.name || ds.id || 'unregistered dataset'}</span>
          <span className="inline-flex items-center gap-1.5"><GitBranch size={12} className="text-primary" /> {payload.method || 'n/a'}</span>
          {payload.data_verified && <span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 size={12} /> Data verified</span>}
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-primary" />
            <h4 className="text-sm font-semibold text-ink">Executive summary</h4>
          </div>
          <ol className="mt-3 space-y-2.5">
            {(payload.findings || []).map((finding: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-body">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-semibold text-white">{i + 1}</span>
                <span>{finding}</span>
              </li>
            ))}
          </ol>
        </div>

        {sections.map((section: any, i: number) => (
          <div key={i} className="mt-6">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-primary" />
              <h4 className="text-sm font-semibold text-ink">{section.heading || 'Detail'}</h4>
            </div>
            <ul className="mt-3 space-y-1.5">
              {(Array.isArray(section.body) ? section.body : [section.body]).map((item: any, j: number) => (
                <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-body">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{String(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {records.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-primary" />
              <h4 className="text-sm font-semibold text-ink">Flagged records</h4>
              <span className="text-xs text-muted">({records.length})</span>
            </div>
            <div className="mt-3 overflow-x-auto rounded-lg border border-line">
              <table>
                <thead><tr><th>Record</th><th>Severity</th><th>Score</th></tr></thead>
                <tbody>
                  {records.slice(0, 8).map((r: any, i: number) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap font-mono text-xs">{r.record_id}</td>
                      <td><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${severityClass(r.severity)}`}>{r.severity || 'n/a'}</span></td>
                      <td className="font-mono text-xs">{Number(r.score || 0).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(payload.limitations || []).length > 0 && (
          <div className="mt-6 rounded-lg border border-line bg-paper p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <ShieldCheck size={13} /> Limitations and scope
            </p>
            <ul className="mt-2 space-y-1.5">
              {payload.limitations.map((item: string, i: number) => (
                <li key={i} className="text-xs leading-relaxed text-muted">· {item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs text-muted">All figures are computed from local TraceLens data.</p>
          <div className="flex flex-wrap gap-2">
            {(['pdf', 'csv', 'json'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => onDownload(String(id), fmt)}
                disabled={downloading === `${id}:${fmt}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-soft disabled:opacity-50"
              >
                {downloading === `${id}:${fmt}` ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppReports() {
  const { toasts, push, dismiss } = useToasts()
  const [reports, setReports] = useState<any[]>([])
  const [detections, setDetections] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [detectionId, setDetectionId] = useState('')
  const [incidentId, setIncidentId] = useState('')
  const [kind, setKind] = useState('anomaly detection')
  const [creating, setCreating] = useState(false)
  const [downloading, setDownloading] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf')

  const [query, setQuery] = useState('')
  const [range, setRange] = useState<TimeRange>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState('')
  const [payload, setPayload] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const [rep, det, inc] = await Promise.all([
        api.listReports(),
        api.listDetections(),
        api.listIncidents(),
      ])
      const rl = Array.isArray(rep) ? rep : []
      const dl = Array.isArray(det) ? det : []
      const il = Array.isArray(inc) ? inc : []
      setReports(rl)
      setDetections(dl)
      setIncidents(il)
      setDetectionId((cur) => (cur && dl.some((x: any) => x.id === cur) ? cur : (dl[0]?.id || '')))
      setIncidentId((cur) => (cur && il.some((x: any) => x.id === cur) ? cur : (il[0]?.id || '')))
      setSelected((cur) => (cur && rl.some((x: any) => (x.report_id || x.id) === cur)
        ? cur : String(rl[0]?.report_id || rl[0]?.id || '')))
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!selected) { setPayload(null); return }
    let alive = true
    setPreviewLoading(true)
    api.getReportContent(selected)
      .then((data) => { if (alive) setPayload(data) })
      .catch(() => { if (alive) setPayload(null) })
      .finally(() => { if (alive) setPreviewLoading(false) })
    return () => { alive = false }
  }, [selected])

  const visible = useMemo(() => applyFilters(reports, {
    query, range, from, to,
    getTime: (r: any) => r.created_at,
    getText: (r: any) => [r.id, r.kind, r.title, r.path].join(' '),
  }), [reports, query, range, from, to])

  const create = async () => {
    setCreating(true)
    setErr('')
    try {
      const body: Record<string, any> = { kind }
      if (detectionId) body.detection_id = detectionId
      if (incidentId) body.incident_id = incidentId
      const r: any = await api.createReport(body)
      const newId = String(r?.report_id || r?.id || '')
      push(`Report ${newId} generated.`, 'success')
      const rep = await api.listReports().catch(() => [])
      setReports(Array.isArray(rep) ? rep : [])
      if (newId) setSelected(newId)
    } catch (e: any) {
      setErr(String(e?.message || e))
      push(`Report generation failed: ${e?.message || e}`, 'error')
    } finally {
      setCreating(false)
    }
  }

  const download = async (id: string, fmt: 'pdf' | 'csv' | 'json') => {
    setDownloading(`${id}:${fmt}`)
    try {
      const out = await api.downloadReport(id, fmt)
      push(`Downloaded ${out?.filename || `${id}.${fmt}`}.`, 'success')
    } catch (e: any) {
      push(`Download failed: ${e?.message || e}`, 'error')
    } finally {
      setDownloading('')
    }
  }

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        eyebrow="Analyst platform"
        title="Reports"
        description="Generate a report from recorded detections and incidents, preview the document, then export a real PDF, CSV or JSON file."
        icon={FileText}
        actions={
          <button type="button" onClick={() => { void load(); push('Report list refreshed.', 'info') }} className="btn btn-secondary">
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {err && <ErrorState message={err} onRetry={() => void load()} />}

      <Section title="Generate a report" icon={FileText}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="rep-kind">Report type</label>
            <select id="rep-kind" value={kind} onChange={(e) => setKind(e.target.value)} className="w-full">
              {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="rep-detection">Detection run</label>
            <select id="rep-detection" value={detectionId} onChange={(e) => setDetectionId(e.target.value)} className="w-full">
              <option value="">No detection selected</option>
              {detections.map((d: any) => <option key={d.id} value={d.id}>{d.id} · {d.method}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="rep-incident">Incident (optional)</label>
            <select id="rep-incident" value={incidentId} onChange={(e) => setIncidentId(e.target.value)} className="w-full">
              <option value="">No incident selected</option>
              {incidents.map((i: any) => <option key={i.id} value={i.id}>{i.id} · {i.record_id}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void create()} disabled={creating} className="btn btn-primary disabled:opacity-50">
            {creating ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            {creating ? 'Generating…' : 'Generate report'}
          </button>
          {detections.length === 0 && <span className="text-xs text-warning">Run a detection first to attach findings to the report.</span>}
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <Section
          title={`Report library (${visible.length})`}
          icon={FileText}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput value={query} onChange={setQuery} placeholder="Search reports…" />
              <TimeRangeFilter value={range} onChange={setRange} from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            </div>
          }
        >
          {loading ? (
            <SkeletonTable rows={5} cols={3} />
          ) : visible.length === 0 ? (
            <EmptyState title="No reports yet" description="Generate a report above, or widen the search and period." icon={FileText} />
          ) : (
            <div className="space-y-2">
              {visible.map((r: any) => {
                const id = String(r?.report_id || r?.id || '')
                const isFixture = typeof r?.path === 'string' && r.path.startsWith('demo://')
                const active = id === selected
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelected(id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${active ? 'border-primary bg-teal-50/60 ring-1 ring-primary/20' : 'border-line bg-white hover:bg-soft'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{KIND_LABEL[r?.kind] || String(r?.title || r?.kind || 'Report').replace(/_/g, ' ')}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted">{id}</p>
                      </div>
                      <ChevronRight size={15} className={active ? 'text-primary' : 'text-muted'} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {fmtDate(r?.created_at)}</span>
                      <SourceBadge source={isFixture ? 'demo fixture' : 'live backend'} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Section>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-ink">Document preview</h2>
              <p className="text-xs text-muted">Read the stored report before exporting it.</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={format} onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv' | 'json')} aria-label="Quick download format" className="w-auto py-1.5 text-xs">
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
              <button
                type="button"
                disabled={!selected || Boolean(downloading)}
                onClick={() => { if (selected) void download(selected, format) }}
                className="btn btn-secondary text-xs"
              >
                <Download size={13} /> Download selected
              </button>
            </div>
          </div>
          {previewLoading ? <SkeletonBlock className="h-96" /> : (
            <ReportSheet payload={payload} onDownload={(id, fmt) => void download(id, fmt)} downloading={downloading} />
          )}
        </div>
      </div>
    </div>
  )
}

export default AppReports
