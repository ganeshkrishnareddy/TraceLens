import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  Activity, AlertTriangle, ArrowRight, CircleDot, Database, FileText,
  FlaskConical, LayoutDashboard, RefreshCw, ScanSearch,
} from 'lucide-react'
import api from '../api'
import { applyFilters, SearchInput, TimeRangeFilter, type TimeRange } from './components/Filters'
import { LIFECYCLE } from './components/IncidentLifecycle'
import {
  EmptyState, ErrorState, KpiCard, PageHeader, Section, SeverityBadge,
  SkeletonGrid, SkeletonTable, SourceBadge, StatusBadge, ToastViewport,
  fmtDate, useToasts,
} from './components/ui'

export function AppOverview() {
  const { toasts, push, dismiss } = useToasts()
  const [stats, setStats] = useState<any>(null)
  const [incidents, setIncidents] = useState<any[]>([])
  const [detections, setDetections] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [query, setQuery] = useState('')
  const [range, setRange] = useState<TimeRange>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const [s, inc, det, rep] = await Promise.all([
        api.overviewStats(),
        api.listIncidents(),
        api.listDetections(),
        api.listReports(),
      ])
      setStats(s || {})
      setIncidents(Array.isArray(inc) ? inc : [])
      setDetections(Array.isArray(det) ? det : [])
      setReports(Array.isArray(rep) ? rep : [])
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filteredIncidents = useMemo(() => applyFilters(incidents, {
    query, range, from, to,
    getTime: (i: any) => i.created_at || i.updated_at,
    getText: (i: any) => [i.id, i.record_id, i.severity, i.status].join(' '),
  }), [incidents, query, range, from, to])

  const lifecycleData = LIFECYCLE.map((stage) => ({
    stage: stage.replace(/_/g, ' '),
    count: incidents.filter((i: any) => {
      const s = String(i.status || 'detected').toLowerCase()
      return s === stage || (stage === 'detected' && s === 'open')
    }).length,
  }))

  const refresh = () => { void load(); push('Overview refreshed.', 'info') }

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        eyebrow="Analyst platform"
        title="Platform Overview"
        description="A live view of recorded datasets, detections, incidents and reports. Every figure is derived from stored data or a labelled demo fixture."
        icon={LayoutDashboard}
        actions={
          <button type="button" onClick={refresh} className="btn btn-secondary">
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {err && <ErrorState message={err} onRetry={() => void load()} />}

      {loading ? (
        <>
          <SkeletonGrid />
          <div className="card p-5"><SkeletonTable rows={5} cols={4} /></div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={stats?.source} />
            {stats?.generated_at && <span className="text-xs text-muted">Generated {fmtDate(stats.generated_at)}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Datasets" value={stats?.datasets ?? 0} icon={Database} />
            <KpiCard label="Models" value={stats?.models ?? 0} icon={Activity} />
            <KpiCard label="Detections" value={stats?.detections ?? 0} icon={ScanSearch} />
            <KpiCard label="Anomalies flagged" value={stats?.n_flagged ?? detections.reduce((a, d) => a + (Number(d.n_flagged) || 0), 0)} icon={AlertTriangle} tone="warning" />
            <KpiCard label="Open incidents" value={stats?.open_incidents ?? incidents.filter((i) => String(i.status) === 'open').length} icon={CircleDot} tone="critical" />
            <KpiCard label="Reports" value={stats?.reports ?? reports.length} icon={FileText} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section
              title="Incidents by lifecycle stage"
              icon={Activity}
              actions={<Link to="/app/investigate" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Investigate <ArrowRight size={14} /></Link>}
            >
              {incidents.length === 0 ? (
                <EmptyState title="No incidents recorded" description="Run a detection to create incidents." icon={CircleDot} />
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={lifecycleData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={52} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Incidents" fill="#0E7C7B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>

            <Section
              title="Quick actions"
              icon={FlaskConical}
              description="Follow the real workflow from raw data to a downloadable report."
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { to: '/app/data', label: 'Load & preview data', icon: Database },
                  { to: '/app/detect', label: 'Run a detection', icon: ScanSearch },
                  { to: '/app/investigate', label: 'Investigate incidents', icon: CircleDot },
                  { to: '/app/reports', label: 'Generate a report', icon: FileText },
                ].map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-3 text-sm font-medium text-ink transition-colors hover:bg-soft">
                    <span className="inline-flex items-center gap-2"><Icon size={16} className="text-primary" />{label}</span>
                    <ArrowRight size={14} className="text-muted" />
                  </Link>
                ))}
              </div>
            </Section>
          </div>

          <Section
            title={`Recent incidents (${filteredIncidents.length})`}
            icon={CircleDot}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <SearchInput value={query} onChange={setQuery} placeholder="Search incidents…" />
                <TimeRangeFilter value={range} onChange={setRange} from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
              </div>
            }
          >
            {filteredIncidents.length === 0 ? (
              <EmptyState
                title="No incidents in view"
                description="Widen the search or period, or run a detection to create incidents."
                icon={CircleDot}
                action={<Link to="/app/detect" className="btn btn-primary">Run detection</Link>}
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table>
                  <thead>
                    <tr><th>Record</th><th>Severity</th><th>Status</th><th>Score</th><th>Created</th></tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.slice(0, 12).map((i: any, idx) => (
                      <tr key={i?.id || idx}>
                        <td className="whitespace-nowrap font-medium">{i?.record_id || i?.id}</td>
                        <td><SeverityBadge severity={i?.severity} /></td>
                        <td><StatusBadge status={i?.status} /></td>
                        <td>{typeof i?.score === 'number' ? i.score.toFixed(3) : '—'}</td>
                        <td className="whitespace-nowrap text-xs text-muted">{fmtDate(i?.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {detections.length > 0 && (
            <Section title="Recent detections" icon={ScanSearch}>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table>
                  <thead><tr><th>Detection</th><th>Method</th><th>Flagged</th><th>Created</th></tr></thead>
                  <tbody>
                    {detections.slice(0, 8).map((d: any, idx) => (
                      <tr key={d?.id || idx}>
                        <td className="whitespace-nowrap font-medium">{d?.id}</td>
                        <td>{d?.method}</td>
                        <td>{d?.n_flagged ?? '—'}</td>
                        <td className="whitespace-nowrap text-xs text-muted">{fmtDate(d?.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

export default AppOverview
