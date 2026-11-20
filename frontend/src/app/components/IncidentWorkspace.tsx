import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertTriangle, CheckCircle2, ClipboardList, History, Loader2,
  Paperclip, Plus, RefreshCw, Send, ShieldAlert, X,
} from 'lucide-react'
import api from '../../api'
import { applyFilters, SearchInput, TimeRangeFilter, type TimeRange } from './Filters'
import { isTerminal, LifecycleStepper } from './IncidentLifecycle'
import {
  EmptyState, ErrorState, LoadingInline, PageHeader, Section, SeverityBadge,
  SkeletonTable, SourceBadge, StatusBadge, SyntheticBadge, fmtDate, fmtScore,
  ToastViewport, useToasts,
} from './ui'

type EscalationDraft = {
  reason: string
  severity: string
  priority: string
  assigned_owner: string
  investigation_summary: string
  evidence_refs: string
  recommended_action: string
}

const EMPTY_ESCALATION: EscalationDraft = {
  reason: '',
  severity: 'medium',
  priority: 'P3',
  assigned_owner: '',
  investigation_summary: '',
  evidence_refs: '',
  recommended_action: '',
}

function activityText(a: any): string {
  return String(a?.message || a?.detail || a?.note || a?.action || a?.type || 'Event recorded')
}

function activityTime(a: any): any {
  return a?.timestamp || a?.created_at || a?.at || a?.time
}

function activityKind(a: any): string {
  return String(a?.type || a?.action || a?.event || '').toLowerCase()
}

function parseRefs(text: string): string[] {
  return text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
}

/** Full incident lifecycle UI: triage, evidence, notes, escalation, audit and resolution. */
export function IncidentWorkspace() {
  const { toasts, push, dismiss } = useToasts()

  const [incidents, setIncidents] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [err, setErr] = useState('')

  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<TimeRange>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [activity, setActivity] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [escalation, setEscalation] = useState<EscalationDraft>(EMPTY_ESCALATION)
  const [escalating, setEscalating] = useState(false)
  const [resolution, setResolution] = useState('')
  const [resolving, setResolving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [extraRefs, setExtraRefs] = useState<string[]>([])
  const [refInput, setRefInput] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const bump = () => setReloadKey((k) => k + 1)

  const loadIncidents = useCallback(async (status?: string) => {
    setListLoading(true)
    setErr('')
    try {
      const data = await api.listIncidents(status && status !== 'all' ? status : undefined)
      const list = Array.isArray(data) ? data : []
      setIncidents(list)
      setSelectedId((cur) => {
        if (cur && list.some((i: any) => i.id === cur)) return cur
        return list.length ? String(list[0].id) : ''
      })
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => { void loadIncidents(statusFilter) }, [statusFilter, reloadKey, loadIncidents])

  useEffect(() => {
    const inc = incidents.find((i) => String(i.id) === selectedId)
    if (!inc) {
      setActivity([])
      setDetail(null)
      setNoteText('')
      setResolution('')
      return
    }
    let alive = true
    setActivityLoading(true)
    setDetailLoading(true)
    Promise.all([
      api.incidentActivity(inc.id).catch(() => []),
      inc.detection_id ? api.getDetection(inc.detection_id).catch(() => null) : Promise.resolve(null),
    ]).then(([acts, det]: any[]) => {
      if (!alive) return
      setActivity(Array.isArray(acts) ? acts : [])
      const row = det && Array.isArray(det.rows)
        ? det.rows.find((r: any) => r.record_id === inc.record_id) || null
        : null
      setDetail(row)
      setNoteText(String(inc.notes || ''))
      setResolution(String(inc.resolution_summary || ''))
      setEscalation(EMPTY_ESCALATION)
      setExtraRefs(Array.isArray(inc.evidence_refs) ? inc.evidence_refs.map(String) : [])
    }).finally(() => {
      if (!alive) return
      setActivityLoading(false)
      setDetailLoading(false)
    })
    return () => { alive = false }
  }, [selectedId, incidents])

  const visible = useMemo(() => applyFilters(incidents, {
    query,
    range,
    from,
    to,
    getTime: (i: any) => i.created_at || i.updated_at,
    getText: (i: any) => [i.id, i.record_id, i.detection_id, i.severity, i.status].join(' '),
  }), [incidents, query, range, from, to])

  const selected = incidents.find((i) => String(i.id) === selectedId) || null
  const explanation = detail?.explanation || null
  const modelEvidence: string[] = Array.isArray(explanation?.evidence) ? explanation.evidence : []
  const notes = activity.filter((a) => /note/.test(activityKind(a)) || a?.note)
  const evidenceFromActivity = activity.filter((a) => /evidence|reference/.test(activityKind(a)))

  const addRef = () => {
    const value = refInput.trim()
    if (!value) { push('Enter an evidence reference first.', 'error'); return }
    setExtraRefs((prev) => [...prev, value])
    setRefInput('')
  }

  const addNote = async () => {
    if (!selected) return
    if (!noteText.trim()) { push('Write a note before saving.', 'error'); return }
    setSavingNote(true)
    try {
      await api.addNote(selected.id, { note: noteText.trim() })
      push('Investigation note recorded.', 'success')
      setNoteText('')
      bump()
    } catch (e: any) {
      push(`Could not save note: ${e?.message || e}`, 'error')
    } finally {
      setSavingNote(false)
    }
  }

  const submitEscalation = async () => {
    if (!selected) return
    if (!escalation.reason.trim()) { push('An escalation reason is required.', 'error'); return }
    if (!escalation.assigned_owner.trim()) { push('Assign an owner before escalating.', 'error'); return }
    const refs = [...extraRefs, ...parseRefs(escalation.evidence_refs)]
    setEscalating(true)
    try {
      await api.escalateIncident(selected.id, {
        reason: escalation.reason.trim(),
        severity: escalation.severity,
        priority: escalation.priority,
        assigned_owner: escalation.assigned_owner.trim(),
        investigation_summary: escalation.investigation_summary.trim(),
        evidence_refs: refs,
        recommended_action: escalation.recommended_action.trim(),
      })
      push(`Incident ${selected.id} escalated to ${escalation.assigned_owner.trim()}.`, 'success')
      setEscalation(EMPTY_ESCALATION)
      bump()
    } catch (e: any) {
      push(`Escalation failed: ${e?.message || e}`, 'error')
    } finally {
      setEscalating(false)
    }
  }

  const recordResolution = async () => {
    if (!selected) return
    if (!resolution.trim()) { push('Write a resolution summary before recording it.', 'error'); return }
    setResolving(true)
    try {
      await api.resolveIncident(selected.id, { summary: resolution.trim() })
      push('Resolution summary recorded. Status is now resolved.', 'success')
      bump()
    } catch (e: any) {
      push(`Could not resolve incident: ${e?.message || e}`, 'error')
    } finally {
      setResolving(false)
    }
  }

  const closeIncident = async () => {
    if (!selected) return
    setClosing(true)
    try {
      await api.updateIncident(selected.id, { status: 'closed' })
      push('Incident closed. Audit trail updated.', 'success')
      bump()
    } catch (e: any) {
      push(`Could not close incident: ${e?.message || e}`, 'error')
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="space-y-6">
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        eyebrow="Analyst workspace"
        title="Investigation & Incident Lifecycle"
        description="Triage flagged records, attach evidence, escalate with a full handover and record the resolution — every step is added to the audit trail."
        icon={ClipboardList}
        actions={
          <button type="button" onClick={bump} className="btn btn-secondary">
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {err && <ErrorState message={err} onRetry={() => void loadIncidents(statusFilter)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
        {/* Incident list */}
        <Section title={`Incidents (${visible.length})`} icon={Activity}>
          <div className="space-y-3">
            <SearchInput value={query} onChange={setQuery} placeholder="Search incidents…" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by lifecycle status"
                className="w-full py-1.5"
              >
                <option value="all">All statuses</option>
                <option value="detected">detected</option>
                <option value="triaged">triaged</option>
                <option value="investigating">investigating</option>
                <option value="escalated">escalated</option>
                <option value="mitigating">mitigating</option>
                <option value="resolved">resolved</option>
                <option value="closed">closed</option>
              </select>
              <TimeRangeFilter
                value={range} onChange={setRange}
                from={from} to={to} onFromChange={setFrom} onToChange={setTo}
              />
            </div>

            {listLoading ? (
              <SkeletonTable rows={5} cols={3} />
            ) : visible.length === 0 ? (
              <EmptyState
                title="No incidents in view"
                description="Run a detection to create incidents, or widen the search and time filters."
                icon={ClipboardList}
                action={<Link to="/app/detect" className="btn btn-primary">Go to detection</Link>}
              />
            ) : (
              <div className="max-h-[560px] overflow-auto">
                <table>
                  <thead>
                    <tr><th>Record</th><th>Status</th><th>Severity</th></tr>
                  </thead>
                  <tbody>
                    {visible.map((i: any) => (
                      <tr
                        key={i.id}
                        onClick={() => setSelectedId(String(i.id))}
                        aria-selected={String(i.id) === selectedId}
                        className={`cursor-pointer ${String(i.id) === selectedId ? 'bg-primary/5' : 'hover:bg-soft'}`}
                      >
                        <td>
                          <div className="font-medium text-ink">{i.record_id || i.id}</div>
                          <div className="text-xs text-muted">{fmtDate(i.created_at)}</div>
                        </td>
                        <td><StatusBadge status={i.status} /></td>
                        <td><SeverityBadge severity={i.severity} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Section>

        {/* Incident detail */}
        {!selected ? (
          <EmptyState
            title="Select an incident"
            description="Choose an incident from the list to review its evidence and lifecycle actions."
            icon={ClipboardList}
          />
        ) : (
          <div className="min-w-0 space-y-4">
            <Section
              title="Lifecycle"
              icon={Activity}
              actions={<div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={selected.status} />
                <SeverityBadge severity={selected.severity} />
                <SourceBadge source={selected.source} />
              </div>}
            >
              <LifecycleStepper status={selected.status} />
              {isTerminal(selected.status) && (
                <p className="mt-3 text-xs text-muted">
                  This incident is in a terminal state. Reopening a new incident requires a fresh detection.
                </p>
              )}
            </Section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Section title="Incident overview" icon={ClipboardList}>
                <dl className="space-y-2 text-sm">
                  {[
                    ['Incident ID', selected.id],
                    ['Record', selected.record_id],
                    ['Detection', selected.detection_id],
                    ['Score', fmtScore(selected.score)],
                    ['Created', fmtDate(selected.created_at)],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between gap-3">
                      <dt className="text-muted">{k}</dt>
                      <dd className="break-all text-right font-medium text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Section>

              <Section
                title="Evidence"
                icon={Paperclip}
                actions={detail?.is_synthetic || selected?.is_synthetic ? <SyntheticBadge compact /> : undefined}
              >
                {detailLoading ? (
                  <LoadingInline label="Loading evidence…" />
                ) : (
                  <div className="space-y-3 text-sm">
                    {modelEvidence.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-body">
                        {modelEvidence.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    )}
                    {Array.isArray(explanation?.affected_features) && explanation.affected_features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {explanation.affected_features.map((f: string) => (
                          <span key={f} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {String(f).replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                    {modelEvidence.length === 0 && !(explanation?.affected_features || []).length && (
                      <p className="text-muted">No detector evidence is attached to this record yet.</p>
                    )}
                    <div className="space-y-1.5">
                      {extraRefs.map((ref, i) => (
                        <div key={`${ref}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-soft px-2 py-1.5 text-xs">
                          <span className="break-all text-body">{ref}</span>
                          <button
                            type="button"
                            onClick={() => setExtraRefs((prev) => prev.filter((_, idx) => idx !== i))}
                            aria-label={`Remove evidence reference ${ref}`}
                            className="rounded p-0.5 text-muted hover:bg-line hover:text-ink"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                      {evidenceFromActivity.map((a, i) => (
                        <div key={`act-${i}`} className="rounded-lg border border-line px-2 py-1.5 text-xs text-muted">
                          {activityText(a)}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={refInput}
                        onChange={(e) => setRefInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRef() } }}
                        placeholder="Add an evidence reference (dashboard, trace, log id)"
                        aria-label="New evidence reference"
                        className="min-w-0 flex-1"
                      />
                      <button type="button" onClick={addRef} className="btn btn-secondary" aria-label="Add evidence reference">
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </Section>
            </div>

            <Section title="Investigation notes" icon={ClipboardList}>
              <div className="space-y-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="Record what you found, what you checked and what remains unclear…"
                  aria-label="Investigation note"
                  className="w-full"
                />
                <div className="flex items-center gap-3">
                  <button type="button" onClick={addNote} disabled={savingNote} className="btn btn-primary disabled:opacity-50">
                    {savingNote ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    {savingNote ? 'Saving…' : 'Add note'}
                  </button>
                  <span className="text-xs text-muted">Notes are appended to the audit trail.</span>
                </div>
                {activityLoading ? (
                  <LoadingInline label="Loading notes…" />
                ) : notes.length > 0 ? (
                  <ul className="space-y-2">
                    {notes.map((a, i) => (
                      <li key={i} className="rounded-lg border border-line bg-white p-3 text-sm">
                        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                          <span>{a?.actor || 'Analyst'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{fmtDate(activityTime(a))}</span>
                        </div>
                        <p className="leading-relaxed text-body">{a?.note || a?.message || a?.detail || activityText(a)}</p>
                      </li>
                    ))}
                  </ul>
                ) : selected.notes ? (
                  <div className="rounded-lg border border-line bg-soft p-3 text-sm text-body">{selected.notes}</div>
                ) : (
                  <p className="text-sm text-muted">No notes recorded yet.</p>
                )}
              </div>
            </Section>

            <Section
              title="Escalate incident"
              icon={ShieldAlert}
              actions={<span className="text-xs text-muted">Creates an audit entry and hands the incident to an owner.</span>}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="field-label" htmlFor="esc-reason">Reason for escalation *</label>
                  <textarea
                    id="esc-reason" rows={2} value={escalation.reason}
                    onChange={(e) => setEscalation({ ...escalation, reason: e.target.value })}
                    placeholder="Why does this need escalation?"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="esc-severity">Severity</label>
                  <select
                    id="esc-severity" value={escalation.severity}
                    onChange={(e) => setEscalation({ ...escalation, severity: e.target.value })}
                    className="w-full"
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="esc-priority">Priority</label>
                  <select
                    id="esc-priority" value={escalation.priority}
                    onChange={(e) => setEscalation({ ...escalation, priority: e.target.value })}
                    className="w-full"
                  >
                    <option value="P1">P1 — immediate</option>
                    <option value="P2">P2 — urgent</option>
                    <option value="P3">P3 — normal</option>
                    <option value="P4">P4 — low</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="esc-owner">Assigned owner *</label>
                  <input
                    id="esc-owner" value={escalation.assigned_owner}
                    onChange={(e) => setEscalation({ ...escalation, assigned_owner: e.target.value })}
                    placeholder="Name or team taking ownership"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="esc-refs">Evidence references</label>
                  <input
                    id="esc-refs" value={escalation.evidence_refs}
                    onChange={(e) => setEscalation({ ...escalation, evidence_refs: e.target.value })}
                    placeholder="One reference per line or comma-separated"
                    className="w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label" htmlFor="esc-summary">Investigation summary</label>
                  <textarea
                    id="esc-summary" rows={3} value={escalation.investigation_summary}
                    onChange={(e) => setEscalation({ ...escalation, investigation_summary: e.target.value })}
                    placeholder="Summarise the evidence and what it points to."
                    className="w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label" htmlFor="esc-action">Recommended action</label>
                  <textarea
                    id="esc-action" rows={2} value={escalation.recommended_action}
                    onChange={(e) => setEscalation({ ...escalation, recommended_action: e.target.value })}
                    placeholder="What should the owner do next?"
                    className="w-full"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={submitEscalation} disabled={escalating} className="btn btn-primary disabled:opacity-50">
                  {escalating ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
                  {escalating ? 'Escalating…' : 'Escalate incident'}
                </button>
                {extraRefs.length > 0 && (
                  <span className="text-xs text-muted">{extraRefs.length} attached evidence reference(s) will be included.</span>
                )}
              </div>
            </Section>

            <Section
              title="Resolution summary"
              icon={CheckCircle2}
              actions={selected.status === 'resolved' || selected.status === 'closed'
                ? <span className="text-xs font-medium text-success">Resolved</span>
                : undefined}
            >
              <div className="space-y-3">
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                  placeholder="What was done, what was the outcome and what is still unknown?"
                  aria-label="Resolution summary"
                  className="w-full"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={recordResolution} disabled={resolving} className="btn btn-primary disabled:opacity-50">
                    {resolving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {resolving ? 'Recording…' : 'Record resolution'}
                  </button>
                  <button
                    type="button"
                    onClick={closeIncident}
                    disabled={closing || selected.status === 'closed'}
                    className="btn btn-secondary disabled:opacity-50"
                  >
                    {closing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {selected.status === 'closed' ? 'Incident closed' : 'Close incident'}
                  </button>
                </div>
              </div>
            </Section>

            <Section title="Audit timeline" icon={History}>
              {activityLoading ? (
                <LoadingInline label="Loading audit trail…" />
              ) : activity.length === 0 ? (
                <EmptyState
                  title="No audit events yet"
                  description="Notes, escalations and resolutions will appear here in order."
                  icon={History}
                />
              ) : (
                <ol className="relative space-y-4 border-l border-line pl-5">
                  {activity.map((a, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" aria-hidden="true" />
                      <div className="text-sm font-medium text-ink">{activityText(a)}</div>
                      <div className="text-xs text-muted">
                        {a?.actor || 'System'} · {fmtDate(activityTime(a))}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}

export default IncidentWorkspace
