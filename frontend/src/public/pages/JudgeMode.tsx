import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, CircleAlert, Download, FileText, Flag, RotateCcw, Siren, StickyNote, Timer } from 'lucide-react'
import api, { isDemoMode } from '../../api'
import { PublicLayout } from '../components/PublicLayout'
import { Callout, Container, EmptyState, ErrorNote, Eyebrow, Lead, LoadingRows, Pill, Section, SourceBadge, Spinner } from '../components/ui'

type Scenario = { key: string; name?: string; description?: string }

const steps = [
  { label: 'Problem', hint: 'Why this matters' },
  { label: 'Dataset', hint: 'Preloaded synthetic scenario' },
  { label: 'Detection', hint: 'Real detection run' },
  { label: 'Explain', hint: 'Evidence for a flag' },
  { label: 'Escalate', hint: 'A recorded decision' },
  { label: 'Report', hint: 'Downloadable output' },
]

const fallbackScenarios: Scenario[] = [
  { key: 'cpu_spike', name: 'Sudden CPU Spike' },
  { key: 'memory_leak', name: 'Gradual Memory Growth' },
  { key: 'network_surge', name: 'Unusual Network Activity' },
  { key: 'latency_error_surge', name: 'Latency and Error-Rate Surge' },
  { key: 'combined_anomaly', name: 'Coordinated Multi-Metric Anomaly' },
  { key: 'normal', name: 'Normal System Behaviour' },
]

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function StepShell({
  step, title, intro, children,
}: {
  step: number
  title: string
  intro: string
  children: ReactNode
}) {
  return (
    <div className="surface p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Step {step + 1} of {steps.length}</span>
        <Pill tone="teal">{steps[step]?.hint}</Pill>
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink md:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-body">{intro}</p>
      <div className="mt-6">{children}</div>
    </div>
  )
}

export function JudgeMode() {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [scenarios, setScenarios] = useState<Scenario[]>(fallbackScenarios)
  const [scenario, setScenario] = useState('cpu_spike')
  const [loaded, setLoaded] = useState<any>(null)
  const [method, setMethod] = useState('statistical_mad')
  const [threshold, setThreshold] = useState('0.3')
  const [detection, setDetection] = useState<any>(null)
  const [flagged, setFlagged] = useState<any[]>([])
  const [selectedRow, setSelectedRow] = useState<any>(null)
  const [incident, setIncident] = useState<any>(null)
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('Confirmed deviation from robust baseline on labelled synthetic telemetry.')
  const [severity, setSeverity] = useState('high')
  const [priority, setPriority] = useState('P2')
  const [owner, setOwner] = useState('demo triage')
  const [recommended, setRecommended] = useState('Correlate with deploy timeline and inspect upstream dependency health for the same window.')
  const [escalated, setEscalated] = useState<any>(null)
  const [resolved, setResolved] = useState<any>(null)
  const [resolution, setResolution] = useState('Synthetic demonstration closed after documented evidence review.')
  const [activity, setActivity] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [finished, setFinished] = useState(false)
  const demoMode = isDemoMode()

  useEffect(() => {
    if (startedAt === null || finished) return
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAt, finished])

  useEffect(() => {
    let cancelled = false
    api.demoScenarios()
      .then((rows: any) => { if (!cancelled && Array.isArray(rows) && rows.length) setScenarios(rows) })
      .catch(() => { /* documented fallback list is already present */ })
    return () => { cancelled = true }
  }, [])

  const explanation = selectedRow?.explanation || null
  const evidence: string[] = explanation?.evidence || []
  const unknowns: string[] = explanation?.unknowns || []
  const nextChecks: string[] = explanation?.recommended_investigation || []

  const progress = useMemo(() => Math.round(((step + (finished ? 1 : 0)) / steps.length) * 100), [step, finished])

  function fail(err: unknown, fallback: string) {
    setError(err instanceof Error ? err.message : fallback)
  }

  function begin() {
    setStartedAt(Date.now())
    setNotice('')
    setError('')
    setStep(1)
  }

  async function loadScenario() {
    setBusy(true); setError(''); setNotice('')
    try {
      const data: any = await api.loadDemo({ scenario })
      setLoaded(data)
      setStep(2)
    } catch (err) { fail(err, 'The demo dataset could not be loaded.') }
    finally { setBusy(false) }
  }

  async function runDetection() {
    setBusy(true); setError(''); setNotice('')
    try {
      const data: any = await api.runDetection({
        dataset_id: loaded?.dataset_id || 'ds-demo-test',
        method,
        threshold: Number(threshold),
      })
      setDetection(data)
      const rows: any[] = Array.isArray(data?.rows) ? data.rows : []
      const flags = rows.filter((r) => r.flag === 1).sort((a, b) => Number(b.score) - Number(a.score))
      setFlagged(flags)
      const top = flags[0] || rows[0] || null
      setSelectedRow(top)

      let found: any = null
      try {
        const incidents: any[] = await api.listIncidents()
        found = incidents.find((i) => i.record_id === top?.record_id) || incidents[0] || null
      } catch { /* incident list is optional at this point */ }
      setIncident(found)

      if (top?.explanation?.narrative) {
        setNote(`Reviewed flagged record ${top.record_id}: ${top.explanation.narrative}`)
        const refs = (top.explanation.evidence || []).slice(0, 3).join(' | ')
        setReason(`Robust-baseline deviation on ${(top.affected_features || []).join(', ') || 'multiple metrics'}.`)
        setRecommended(`${top.explanation.recommended_investigation?.[0] || 'Correlate with deploy timeline.'} Evidence: ${refs}`)
      }
      setStep(3)
    } catch (err) { fail(err, 'Detection failed. Check the dataset and try again.') }
    finally { setBusy(false) }
  }

  async function addNote() {
    if (!incident) return
    setBusy(true); setError('')
    try {
      await api.addNote(incident.id, { note: note || 'Evidence reviewed during guided walkthrough.' })
      setNotice('Note recorded against the incident.')
      await refreshActivity()
    } catch (err) { fail(err, 'Live API required to record a note. Start the backend on port 8000 and retry.') }
    finally { setBusy(false) }
  }

  async function refreshActivity() {
    if (!incident) return
    try {
      const rows: any = await api.incidentActivity(incident.id)
      if (Array.isArray(rows)) setActivity(rows)
    } catch { /* audit trail stays empty with an honest label */ }
  }

  async function escalate() {
    if (!incident) return
    setBusy(true); setError('')
    try {
      const data: any = await api.escalateIncident(incident.id, {
        reason,
        severity,
        priority,
        assigned_owner: owner,
        investigation_summary: note || 'Guided walkthrough investigation.',
        evidence_refs: evidence.slice(0, 3),
        recommended_action: recommended,
      })
      setEscalated(data)
      setIncident(data?.incident || incident)
      setNotice('Incident escalated and audit entry written.')
      await refreshActivity()
    } catch (err) { fail(err, 'Live API required to escalate. Start the backend on port 8000 and retry.') }
    finally { setBusy(false) }
  }

  async function resolve() {
    if (!incident) return
    setBusy(true); setError('')
    try {
      const data: any = await api.resolveIncident(incident.id, { summary: resolution })
      setResolved(data)
      setIncident(data?.incident || incident)
      setNotice('Incident resolved with a recorded summary.')
      await refreshActivity()
    } catch (err) { fail(err, 'Live API required to resolve. Start the backend on port 8000 and retry.') }
    finally { setBusy(false) }
  }

  async function generateReport() {
    setBusy(true); setError('')
    try {
      const data: any = await api.createReport({
        kind: 'incident_investigation',
        detection_id: detection?.detection_id,
        incident_id: incident?.id,
        scenario,
        method,
        threshold: Number(threshold),
        summary: note,
        limitations: unknowns,
      })
      setReport(data)
      setStep(6)
      setFinished(true)
    } catch (err) { fail(err, 'Report generation failed.') }
    finally { setBusy(false) }
  }

  async function download(format: 'pdf' | 'csv' | 'json') {
    if (!report?.report_id && !report?.id) return
    setError('')
    try {
      await api.downloadReport(String(report.report_id || report.id), format)
      setNotice(`${format.toUpperCase()} download started.`)
    } catch (err) { fail(err, `The ${format.toUpperCase()} download failed in this environment.`) }
  }

  async function reset() {
    setBusy(true); setError('')
    try { await api.resetDemo() } catch { /* still clear the local walkthrough state */ }
    setStep(0); setStartedAt(null); setElapsed(0); setFinished(false)
    setLoaded(null); setDetection(null); setFlagged([]); setSelectedRow(null); setIncident(null)
    setEscalated(null); setResolved(null); setReport(null); setActivity([]); setNotice('')
    setNote(''); setReason('Confirmed deviation from robust baseline on labelled synthetic telemetry.')
    setSeverity('high'); setPriority('P2'); setOwner('demo triage')
    setRecommended('Correlate with deploy timeline and inspect upstream dependency health for the same window.')
    setResolution('Synthetic demonstration closed after documented evidence review.')
    setBusy(false)
    setNotice('Demo reset. Initial environment restored.')
  }

  const showStep = (n: number) => !finished && step === n

  return (
    <PublicLayout>
      <section className="border-b border-line bg-white">
        <Container className="py-10 md:py-14">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Eyebrow>Guided judge mode</Eyebrow>
              <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">A three-minute walkthrough, with real calls</h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-body">
                Problem → preloaded dataset → real detection → anomaly explanation → incident escalation → final report.
                No separate fake pipeline: every action below calls the same API as the analyst workspace.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2">
              <SourceBadge demoMode={demoMode} />
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink"><Timer size={16} className="text-primary" aria-hidden="true" /> {fmt(elapsed)} elapsed</span>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
              <span>Walkthrough progress</span><span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Walkthrough progress">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {steps.map((s, i) => {
                const done = finished || i < step
                const active = !finished && i === step
                return (
                  <li key={s.label} className={`rounded-lg border px-3 py-2 text-xs ${active ? 'border-primary bg-white font-semibold text-primary' : done ? 'border-line bg-white text-ink' : 'border-line bg-paper text-muted'}`}>
                    <span className="mr-1.5">{done ? <Check size={12} className="inline" aria-hidden="true" /> : String(i + 1).padStart(2, '0')}</span>
                    {s.label}
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn-secondary" onClick={reset} disabled={busy}>
              <RotateCcw size={15} aria-hidden="true" /> Reset walkthrough
            </button>
            <Link to="/demo" className="btn-ghost">Open the full demo</Link>
          </div>
        </Container>
      </section>

      <Section tone="paper">
        <div className="mx-auto max-w-4xl space-y-5">
          {error && <ErrorNote>{error}</ErrorNote>}
          {notice && <div className="rounded-lg border border-success/30 bg-white px-4 py-3 text-sm text-success" role="status" aria-live="polite">{notice}</div>}

          {showStep(0) && (
            <StepShell step={0} title="1 · The problem" intro="A detector can flag a record. The hard part is turning that flag into evidence, a decision and a report someone can audit.">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-white p-4"><p className="text-sm font-semibold text-ink">Signal</p><p className="mt-1 text-sm text-body">Eight telemetry metrics arrive as labelled synthetic records.</p></div>
                <div className="rounded-lg border border-line bg-white p-4"><p className="text-sm font-semibold text-ink">Flag</p><p className="mt-1 text-sm text-body">A real detector scores each row against a threshold.</p></div>
                <div className="rounded-lg border border-line bg-white p-4"><p className="text-sm font-semibold text-ink">Decision</p><p className="mt-1 text-sm text-body">Evidence, notes, escalation and a report close the loop.</p></div>
              </div>
              <Callout title="Everything you see is synthetic" tone="synthetic">
                The scenario data is generated demonstration data. No production telemetry, customer impact or
                accuracy claim is involved.
              </Callout>
              <button type="button" className="btn-primary mt-6" onClick={begin}>Begin the walkthrough <ArrowRight size={15} aria-hidden="true" /></button>
            </StepShell>
          )}

          {showStep(1) && (
            <StepShell step={1} title="2 · Preloaded dataset" intro="Choose a labelled scenario and load it through the demo API. The preview shows the exact rows the detector will see.">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <label className="field-label" htmlFor="judge-scenario">Scenario</label>
                  <select id="judge-scenario" className="w-full" value={scenario} onChange={(e) => setScenario(e.target.value)}>
                    {scenarios.map((s) => <option key={s.key} value={s.key}>{s.name || s.key.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <button type="button" className="btn-primary" onClick={loadScenario} disabled={busy}>{busy ? 'Loading…' : 'Load dataset'}</button>
              </div>
              {busy && <div className="mt-5"><LoadingRows rows={3} label="Loading demo dataset" /></div>}
              {loaded && (
                <div className="mt-5 rounded-lg border border-line bg-paper p-4">
                  <div className="flex flex-wrap gap-2">
                    <Pill tone="teal">Synthetic dataset</Pill>
                    <Pill>{loaded.n_rows ?? '—'} rows</Pill>
                    <Pill>dataset {loaded.dataset_id || 'preview'}</Pill>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-body">{loaded.description || 'Labelled synthetic demonstration data.'}</p>
                  {(loaded.preview || []).slice(0, 3).map((row: any) => (
                    <p key={String(row.record_id)} className="mt-2 font-mono text-xs text-muted">
                      {String(row.record_id)} · cpu {String(row.cpu_utilization)} · latency {String(row.response_latency_ms)} · label {String(row.label)}
                    </p>
                  ))}
                </div>
              )}
            </StepShell>
          )}

          {showStep(2) && (
            <StepShell step={2} title="3 · Real detection" intro="Pick a method and threshold, then run the detection pipeline on the dataset you just loaded.">
              <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
                <div>
                  <label className="field-label" htmlFor="judge-method">Method</label>
                  <select id="judge-method" className="w-full" value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="statistical_mad">statistical_mad</option>
                    <option value="isolation_forest">isolation_forest</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="judge-threshold">Threshold</label>
                  <input id="judge-threshold" className="w-full" type="number" min="0" max="1" step="0.05" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                </div>
                <button type="button" className="btn-primary" onClick={runDetection} disabled={busy}>{busy ? 'Running…' : 'Run detection'}</button>
              </div>
              {detection && (
                <div className="mt-6 rounded-lg border border-line bg-white p-4">
                  <p className="text-sm font-semibold text-ink">Run {String(detection.detection_id)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill tone="teal">{String(detection.method)}</Pill>
                    <Pill>{String(detection.n_rows)} rows scored</Pill>
                    <Pill tone="warning">{String(detection.n_flagged)} flagged</Pill>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    These counts come from this run. Metrics are computed from real predictions and labels on synthetic data.
                  </p>
                  <button type="button" className="btn-primary mt-5" onClick={() => setStep(3)}>Review the top anomaly <ArrowRight size={15} aria-hidden="true" /></button>
                </div>
              )}
            </StepShell>
          )}

          {showStep(3) && (
            <StepShell step={3} title="4 · Anomaly explanation" intro="Read the evidence attached to the highest-scoring flagged record. A hypothesis is not a root cause, and the unknowns are shown explicitly.">
              {!selectedRow ? (
                <EmptyState title="No flagged record in this run">Try a different scenario or lower the threshold, then run detection again.</EmptyState>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="teal">{String(selectedRow.record_id)}</Pill>
                    <Pill tone="warning">score {String(selectedRow.score)}</Pill>
                    <Pill>severity {String(selectedRow.severity || explanation?.severity || 'unknown')}</Pill>
                  </div>
                  {flagged.length > 1 && (
                    <div>
                      <label className="field-label" htmlFor="judge-record">Choose another flagged record</label>
                      <select id="judge-record" className="w-full sm:max-w-sm" value={String(selectedRow.record_id)} onChange={(e) => setSelectedRow(flagged.find((r) => String(r.record_id) === e.target.value) || selectedRow)}>
                        {flagged.map((r) => <option key={String(r.record_id)} value={String(r.record_id)}>{String(r.record_id)} · score {String(r.score)}</option>)}
                      </select>
                    </div>
                  )}
                  {explanation?.narrative && <p className="rounded-lg border border-line bg-paper p-4 text-sm leading-relaxed text-body">{String(explanation.narrative)}</p>}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-line bg-white p-4">
                      <p className="text-sm font-semibold text-ink">Evidence</p>
                      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-body">{evidence.length ? evidence.map((e, i) => <li key={i}>• {e}</li>) : <li>No evidence list was returned for this record.</li>}</ul>
                    </div>
                    <div className="rounded-lg border border-line bg-white p-4">
                      <p className="text-sm font-semibold text-ink">Next checks</p>
                      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-body">{nextChecks.length ? nextChecks.map((e, i) => <li key={i}>• {e}</li>) : <li>No suggested checks were returned.</li>}</ul>
                    </div>
                    <div className="rounded-lg border border-line bg-white p-4">
                      <p className="text-sm font-semibold text-ink">Unknowns</p>
                      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-body">{unknowns.length ? unknowns.map((e, i) => <li key={i}>• {e}</li>) : <li>No unknowns were returned.</li>}</ul>
                    </div>
                  </div>
                  <button type="button" className="btn-primary" onClick={() => setStep(4)}>Continue to the incident decision <ArrowRight size={15} aria-hidden="true" /></button>
                </div>
              )}
            </StepShell>
          )}

          {showStep(4) && (
            <StepShell step={4} title="5 · Record the decision" intro="Attach a note, then escalate with an explicit reason and severity. Escalation and resolution write audit entries through the live API.">
              {!incident ? (
                <div className="space-y-4">
                  <EmptyState title="No incident record is linked to this run">
                    Detection did not produce an accessible incident in this environment. You can still review the explanation, but escalation will not be attempted without a real incident ID.
                  </EmptyState>
                  <button type="button" className="btn-secondary" onClick={() => setStep(5)}>Continue to the report</button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="teal">Incident {String(incident.id)}</Pill>
                    <Pill>status {String(incident.status || 'open')}</Pill>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="judge-note">Investigation note</label>
                    <textarea id="judge-note" rows={3} className="w-full" value={note} onChange={(e) => setNote(e.target.value)} />
                    <button type="button" className="btn-secondary mt-2" onClick={addNote} disabled={busy}>
                      <StickyNote size={15} aria-hidden="true" /> Record note
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="judge-reason">Escalation reason</label>
                      <textarea id="judge-reason" rows={2} className="w-full" value={reason} onChange={(e) => setReason(e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="judge-recommended">Recommended action</label>
                      <textarea id="judge-recommended" rows={2} className="w-full" value={recommended} onChange={(e) => setRecommended(e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="judge-severity">Severity</label>
                      <select id="judge-severity" className="w-full" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                        <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="judge-priority">Priority</label>
                      <select id="judge-priority" className="w-full" value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="P3">P3</option><option value="P2">P2</option><option value="P1">P1</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="field-label" htmlFor="judge-owner">Assigned owner label (demo)</label>
                      <input id="judge-owner" className="w-full" value={owner} onChange={(e) => setOwner(e.target.value)} />
                    </div>
                  </div>
                  {escalated && !resolved && (
                    <div>
                      <label className="field-label" htmlFor="judge-resolution">Resolution summary</label>
                      <textarea id="judge-resolution" rows={2} className="w-full" value={resolution} onChange={(e) => setResolution(e.target.value)} />
                      <p className="mt-1 text-xs text-muted">This exact text is sent when you resolve the incident.</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className="btn-primary" onClick={escalate} disabled={busy}>
                      <Siren size={15} aria-hidden="true" /> Escalate incident
                    </button>
                    {escalated && !resolved && (
                      <button type="button" className="btn-secondary" onClick={resolve} disabled={busy}>
                        <Check size={15} aria-hidden="true" /> Resolve incident
                      </button>
                    )}
                  </div>
                  {escalated && <p className="text-sm text-success" role="status">Escalation recorded. Status: {String(escalated?.incident?.status || 'escalated')}.</p>}
                  {resolved && <p className="text-sm text-success" role="status">Resolution recorded. Status: {String(resolved?.incident?.status || 'resolved')}.</p>}
                  {activity.length > 0 && (
                    <div className="rounded-lg border border-line bg-paper p-4">
                      <p className="text-sm font-semibold text-ink">Audit trail</p>
                      <ol className="mt-2 space-y-1 text-xs text-body">
                        {activity.map((a: any, i: number) => (
                          <li key={i}>• {String(a.action ?? a.event ?? 'action')} {a.created_at ? `· ${String(a.created_at)}` : ''}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 border-t border-line pt-4">
                    <button type="button" className="btn-primary" onClick={generateReport} disabled={busy}>
                      <FileText size={15} aria-hidden="true" /> Generate final report
                    </button>
                    <span className="self-center text-xs text-muted">Reporting can proceed even if a live write was unavailable.</span>
                  </div>
                </div>
              )}
            </StepShell>
          )}

          {showStep(5) && (
            <StepShell step={5} title="6 · Final report" intro="Create a report from the verified run data, then download it in the format you need.">
              {busy ? <Spinner label="Generating report" /> : (
                <button type="button" className="btn-primary" onClick={generateReport}>Generate report</button>
              )}
            </StepShell>
          )}

          {finished && (
            <div className="surface p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white"><Check size={20} aria-hidden="true" /></span>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-ink">Walkthrough complete</h2>
                  <p className="mt-1 text-sm text-body">Completed in {fmt(elapsed)}. Report {report?.report_id || report?.id ? String(report.report_id || report.id) : 'created'}.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-paper p-4"><p className="text-xs text-muted">Scenario</p><p className="mt-1 text-sm font-semibold text-ink">{scenario}</p></div>
                <div className="rounded-lg border border-line bg-paper p-4"><p className="text-xs text-muted">Method</p><p className="mt-1 text-sm font-semibold text-ink">{method}</p></div>
                <div className="rounded-lg border border-line bg-paper p-4"><p className="text-xs text-muted">Flagged in run</p><p className="mt-1 text-sm font-semibold text-ink">{String(detection?.n_flagged ?? 0)}</p></div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" className="btn-primary" onClick={() => download('pdf')}><Download size={15} aria-hidden="true" /> Download PDF</button>
                <button type="button" className="btn-secondary" onClick={() => download('csv')}>Download CSV</button>
                <button type="button" className="btn-secondary" onClick={() => download('json')}>Download JSON</button>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
                <button type="button" className="btn-secondary" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Reset and replay</button>
                <Link to="/demo" className="btn-ghost">Explore the full demo</Link>
                <Link to="/research" className="btn-ghost">Read the methodology</Link>
              </div>
              <div className="mt-6">
                <Callout title="What was real in this run">
                  Scenario loading, detection, explanation, reporting and downloads use the same API as the
                  analyst workspace. Note, escalation and resolution require the local backend to be running;
                  if it is not, the page says so instead of pretending the write succeeded.
                </Callout>
              </div>
            </div>
          )}

          {busy && !finished && <div className="mt-4"><Spinner label="Working" /></div>}
        </div>
      </Section>

      <Section tone="white">
        <div className="mx-auto max-w-4xl">
          <Lead>
            Judge mode is a shell around the real product, not a separate demonstration pipeline. Reset restores
            the initial environment so the walkthrough can be run again from a clean state.
          </Lead>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/technology" className="btn-secondary">See how it is built</Link>
            <Link to="/about" className="btn-ghost">About the project</Link>
          </div>
        </div>
      </Section>
    </PublicLayout>
  )
}

export default JudgeMode
