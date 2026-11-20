const BASE = '/api'
const MODE_EVENT = 'tracelens:api-mode'
const TOKEN_KEY = 'tracelens:token'

let offline = false

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token: string | null) {
  if (typeof localStorage === 'undefined') return
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage unavailable in this context */ }
}

function setOffline(value: boolean) {
  if (offline === value) return
  offline = value
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: { offline } }))
  }
}

export function isDemoMode() {
  return offline
}

const FEATURES = [
  'cpu_utilization',
  'memory_utilization',
  'disk_io_mbps',
  'network_mbps',
  'request_rate',
  'response_latency_ms',
  'error_rate',
  'connection_count',
] as const

const BASELINE: Record<string, number> = {
  cpu_utilization: 44.2,
  memory_utilization: 61.5,
  disk_io_mbps: 82.4,
  network_mbps: 46.8,
  request_rate: 310,
  response_latency_ms: 145,
  error_rate: 0.8,
  connection_count: 240,
}

const SCENARIOS = ['cpu_spike', 'memory_leak', 'network_surge', 'latency_spike', 'error_surge', 'combined_anomaly']

type TelemetryRow = {
  record_id: string
  label: number
  scenario: string
  cpu_utilization: number
  memory_utilization: number
  disk_io_mbps: number
  network_mbps: number
  request_rate: number
  response_latency_ms: number
  error_rate: number
  connection_count: number
}

function rand(i: number, salt: number) {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function round(v: number, places = 2) {
  const f = 10 ** places
  return Math.round(v * f) / f
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

const demoTelemetry: TelemetryRow[] = Array.from({ length: 60 }, (_, i) => {
  const anomalous = i % 10 === 7
  const scenario = anomalous ? SCENARIOS[i % SCENARIOS.length] : 'normal'
  return {
    record_id: `node-${String((i % 6) + 1).padStart(2, '0')}-t${String(i + 1).padStart(3, '0')}`,
    label: anomalous ? 1 : 0,
    scenario,
    cpu_utilization: round(clamp(34 + 20 * rand(i, 1) + (anomalous ? 38 : 0), 1, 100)),
    memory_utilization: round(clamp(52 + 18 * rand(i, 2) + (anomalous ? 25 : 0), 1, 100)),
    disk_io_mbps: round(55 + 55 * rand(i, 3) + (anomalous ? 90 : 0)),
    network_mbps: round(25 + 40 * rand(i, 4) + (anomalous ? 120 : 0)),
    request_rate: round(220 + 180 * rand(i, 5) + (anomalous ? 420 : 0), 0),
    response_latency_ms: round(90 + 110 * rand(i, 6) + (anomalous ? 520 : 0), 0),
    error_rate: round(0.2 + 1.3 * rand(i, 7) + (anomalous ? 7.5 : 0)),
    connection_count: round(160 + 150 * rand(i, 8) + (anomalous ? 780 : 0), 0),
  }
})

type Deviation = {
  feature: string
  value: number | null
  baseline_median: number | null
  deviation: number | null
  relative_pct: number | null
  status: string
}

function deviationsFor(row: TelemetryRow): Deviation[] {
  return FEATURES.map((feature) => {
    const value = Number(row[feature])
    const baseline = BASELINE[feature]
    const deviation = round(value - baseline)
    const relative_pct = round((deviation / baseline) * 100, 1)
    const magnitude = Math.abs(relative_pct)
    const status = magnitude >= 35 ? 'extreme' : magnitude >= 15 ? 'elevated' : 'normal'
    return { feature, value, baseline_median: baseline, deviation, relative_pct, status }
  })
}

function severityFor(score: number) {
  if (score >= 0.88) return 'critical'
  if (score >= 0.75) return 'high'
  if (score >= 0.62) return 'medium'
  return 'low'
}

function buildExplanation(row: TelemetryRow, score: number, method: string, affected: string[]) {
  const labels = affected.length ? affected.map((f) => f.replace(/_/g, ' ')).join(', ') : 'no single metric'
  return {
    severity: severityFor(score),
    affected_features: affected,
    evidence: affected.map((f) => `${f.replace(/_/g, ' ')} is ${Number(row[f as keyof TelemetryRow]).toFixed(2)} against a baseline median of ${BASELINE[f]}.`),
    model_interpretation: `${method.replace(/_/g, ' ')} placed this record in a low-density region of the eight-dimensional telemetry feature space (score ${score.toFixed(3)}).`,
    possible_explanation: `The deviation in ${labels} is consistent with a transient service disturbance; this is a hypothesis, not a confirmed root cause.`,
    recommended_investigation: [
      `Correlate ${labels} with deploy and incident timelines.`,
      'Inspect upstream dependency health and request volume for the same window.',
      'Check whether the pattern repeats at the same interval on other nodes.',
    ],
    unknowns: [
      'No user-impact or business-metric data is available.',
      'Synthetic telemetry cannot confirm a production cause.',
      'The detector is unsupervised and does not establish causality.',
    ],
    narrative: `This record was flagged mainly because ${labels} departed from the normal baseline. The model score is ${score.toFixed(3)}. Treat the evidence as a lead for investigation, not a root-cause claim.`,
  }
}

function buildDetectionResult(detectionId: string, datasetId: string, method: string, threshold: number, limit = demoTelemetry.length) {
  const source = demoTelemetry.slice(0, limit)
  const rows = source.map((row, idx) => {
    const score = round(row.label === 1 ? 0.64 + 0.34 * rand(idx, 9) : 0.08 + 0.44 * rand(idx, 10), 3)
    const flag = score >= threshold ? 1 : 0
    const deviations = deviationsFor(row)
    const affected = deviations
      .filter((d) => d.status === 'extreme')
      .sort((a, b) => Math.abs(b.relative_pct || 0) - Math.abs(a.relative_pct || 0))
      .slice(0, 3)
      .map((d) => d.feature)
    const explanation = buildExplanation(row, score, method, affected)
    return {
      record_id: row.record_id,
      score,
      flag,
      severity: explanation.severity,
      affected_features: affected,
      explanation,
      deviations: flag ? deviations : [],
      true_label: row.label,
    }
  })
  const nFlagged = rows.filter((r) => r.flag === 1).length
  return {
    detection_id: detectionId,
    dataset_id: datasetId,
    method,
    threshold,
    n_rows: rows.length,
    n_flagged: nFlagged,
    metrics: {
      n_samples: rows.length,
      accuracy: round(0.93 + 0.04 * rand(rows.length, 11), 3),
      precision: round(0.82 + 0.12 * rand(rows.length, 12), 3),
      recall: round(0.78 + 0.16 * rand(rows.length, 13), 3),
      f1: round(0.84 + 0.1 * rand(rows.length, 14), 3),
      roc_auc: round(0.91 + 0.07 * rand(rows.length, 15), 3),
      false_positive_rate: round(0.02 + 0.04 * rand(rows.length, 16), 3),
      true_negative: rows.length - nFlagged - 4,
      false_positive: 3,
      false_negative: 2,
      true_positive: nFlagged,
    },
    rows,
    result_path: 'demo://detection-result',
  }
}

let demoSeq = 0
function demoId(prefix: string) {
  demoSeq += 1
  return `${prefix}-demo-${String(demoSeq).padStart(3, '0')}`
}

const now = '2026-11-20T11:30:00Z'

const demoDatasets: any[] = [
  { id: 'ds-demo-train', name: 'synthetic_train_20261120.csv', path: 'datasets/synthetic/train_20261120.csv', n_rows: 960, kind: 'train', created_at: '2026-11-20T09:10:00Z' },
  { id: 'ds-demo-test', name: 'synthetic_test_20261120.csv', path: 'datasets/synthetic/test_20261120.csv', n_rows: 240, kind: 'test', created_at: '2026-11-20T09:11:00Z' },
  { id: 'ds-demo-full', name: 'synthetic_20261120.csv', path: 'datasets/synthetic/synthetic_20261120.csv', n_rows: 1200, kind: 'synthetic', created_at: '2026-11-20T09:12:00Z' },
]

const demoModels: any[] = [
  { id: 'mdl-demo-if', dataset_id: 'ds-demo-train', method: 'isolation_forest', threshold: 0.5, created_at: '2026-11-20T09:20:00Z' },
  { id: 'mdl-demo-mad', dataset_id: 'ds-demo-train', method: 'statistical_mad', threshold: 0.3, created_at: '2026-11-20T09:22:00Z' },
]

const demoResults: Record<string, any> = {
  'det-demo-1': buildDetectionResult('det-demo-1', 'ds-demo-test', 'isolation_forest', 0.5),
}

const demoDetections: any[] = [{
  id: 'det-demo-1',
  dataset_id: 'ds-demo-test',
  model_id: 'mdl-demo-if',
  method: 'isolation_forest',
  threshold: 0.5,
  n_flagged: demoResults['det-demo-1'].n_flagged,
  created_at: '2026-11-20T11:30:00Z',
  result_path: 'demo://det-demo-1',
}]

const demoIncidents: any[] = demoResults['det-demo-1'].rows
  .filter((r: any) => r.flag === 1)
  .slice(0, 8)
  .map((r: any, i: number) => ({
    id: `inc-demo-${String(i + 1).padStart(3, '0')}`,
    detection_id: 'det-demo-1',
    record_id: r.record_id,
    score: r.score,
    severity: r.severity,
    status: i === 0 ? 'investigating' : 'open',
    notes: '',
    created_at: '2026-11-20T11:31:00Z',
  }))

const demoExperiments: any[] = [{
  id: 'exp-demo-1',
  name: 'comparison',
  created_at: '2026-11-20T10:45:00Z',
  result_path: 'demo://exp-demo-1',
}]

const demoReports: any[] = [{
  id: 'rep-demo-1',
  kind: 'investigation',
  created_at: '2026-11-20T11:35:00Z',
  path: 'demo://rep-demo-1',
}]

function bodyOf(opts?: RequestInit): any {
  try {
    return opts?.body ? JSON.parse(String(opts.body)) : {}
  } catch {
    return {}
  }
}

async function request<T>(path: string, opts: RequestInit | undefined, fallback: () => T): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 15000)
  try {
    const isForm = typeof FormData !== 'undefined' && opts?.body instanceof FormData
    const token = getToken()
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    const headers = isForm
      ? { ...authHeader, ...(opts?.headers || {}) }
      : { 'Content-Type': 'application/json', ...authHeader, ...(opts?.headers || {}) }
    const res = await fetch(BASE + path, { ...opts, headers, signal: controller.signal })
    if (!res.ok) throw new Error(await res.text() || res.statusText)
    const data = await res.json() as T
    setOffline(false)
    return data
  } catch {
    setOffline(true)
    return fallback()
  } finally {
    window.clearTimeout(timer)
  }
}

/**
 * For auth and state-changing workflows, surface the real API error instead of
 * silently switching to offline demo fixtures.
 */
async function requestStrict<T>(path: string, opts: RequestInit): Promise<T> {
  const controller = new AbortController()
  // Render's free tier sleeps after idle; allow time for a cold start to wake.
  const timer = window.setTimeout(() => controller.abort(), 45000)
  try {
    const token = getToken()
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch(BASE + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...authHeader, ...(opts.headers || {}) },
      signal: controller.signal,
    })
    const text = await res.text()
    let data: any = {}
    try { data = text ? JSON.parse(text) : {} } catch { data = { detail: text } }
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || res.statusText || `HTTP ${res.status}`)
    }
    return data as T
  } finally {
    window.clearTimeout(timer)
  }
}

function datasetStats() {
  const column_stats: Record<string, any> = {}
  FEATURES.forEach((feature) => {
    const values = demoTelemetry.map((r) => Number(r[feature]))
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const sorted = [...values].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    column_stats[feature] = {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: round(mean),
      median,
      std: round(Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)),
    }
  })
  return {
    n_rows: demoTelemetry.length,
    n_missing_total: 0,
    duplicate_rows: 0,
    missing_by_column: Object.fromEntries(FEATURES.map((f) => [f, 0])),
    label_counts: { '0': demoTelemetry.filter((r) => r.label === 0).length, '1': demoTelemetry.filter((r) => r.label === 1).length },
    column_stats,
  }
}

export const api = {
  health: () => request<any>('/health', undefined,
    () => ({ status: 'demo', service: 'TraceLens', version: '1.0.0' })),

  listDatasets: () => request<any[]>('/datasets', undefined, () => demoDatasets),

  generateDataset: (body: any) => request<any>('/datasets/generate',
    { method: 'POST', body: JSON.stringify(body) },
    () => {
      const seed = Number(body?.seed) || 20261120
      const nRows = (Number(body?.n_normal) || 1200) + (Number(body?.n_anomaly) || 240)
      const dataset = {
        id: demoId('ds'),
        name: `synthetic_${seed}.csv`,
        path: `datasets/synthetic/synthetic_${seed}.csv`,
        n_rows: nRows,
        kind: 'synthetic',
        created_at: now,
      }
      demoDatasets.unshift(dataset)
      return { dataset_id: dataset.id, n_rows: nRows, n_normal: body?.n_normal ?? 1200, n_anomaly: body?.n_anomaly ?? 240, seed, path: dataset.path }
    }),

  uploadDataset: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<any>('/datasets/upload', { method: 'POST', body: fd }, () => {
      const dataset = {
        id: demoId('ds'),
        name: file.name,
        path: `datasets/raw/${file.name}`,
        n_rows: demoTelemetry.length,
        kind: 'uploaded',
        created_at: now,
      }
      demoDatasets.unshift(dataset)
      return { dataset_id: dataset.id, name: file.name, n_rows: demoTelemetry.length }
    })
  },

  previewDataset: (id: string, limit = 50) => request<any>(`/datasets/${id}/preview?limit=${limit}`, undefined, () => {
    const ds = demoDatasets.find((d) => d.id === id)
    return {
      columns: [...FEATURES, 'label', 'scenario', 'record_id'],
      n_rows: ds?.n_rows ?? demoTelemetry.length,
      preview: demoTelemetry.slice(0, limit),
      stats: datasetStats(),
    }
  }),

  getDataset: (id: string) => request<any>(`/datasets/${id}`, undefined,
    () => demoDatasets.find((d) => d.id === id) || demoDatasets[0]),

  listModels: () => request<any[]>('/models', undefined, () => demoModels),

  trainModel: (body: any) => request<any>('/train',
    { method: 'POST', body: JSON.stringify(body) },
    () => {
      const model = {
        id: demoId('mdl'),
        dataset_id: body?.dataset_id || demoDatasets[0].id,
        method: body?.method || 'isolation_forest',
        threshold: Number(body?.threshold ?? 0.5),
        created_at: now,
      }
      demoModels.unshift(model)
      return { ...model, model_id: model.id, n_train: demoTelemetry.length }
    }),

  runDetection: (body: any) => request<any>('/detect',
    { method: 'POST', body: JSON.stringify(body) },
    () => {
      const method = demoModels.find((m) => m.id === body?.model_id)?.method || body?.method || 'isolation_forest'
      const threshold = Number(body?.threshold ?? 0.5)
      const detectionId = demoId('det')
      const result = buildDetectionResult(detectionId, body?.dataset_id || 'ds-demo-test', method, threshold)
      demoResults[detectionId] = result
      demoDetections.unshift({
        id: detectionId,
        dataset_id: result.dataset_id,
        model_id: body?.model_id || '',
        method,
        threshold,
        n_flagged: result.n_flagged,
        created_at: now,
        result_path: `demo://${detectionId}`,
      })
      result.rows.filter((r: any) => r.flag === 1).forEach((r: any) => {
        demoIncidents.unshift({
          id: demoId('inc'),
          detection_id: detectionId,
          record_id: r.record_id,
          score: r.score,
          severity: r.severity,
          status: 'open',
          notes: '',
          created_at: now,
        })
      })
      return result
    }),

  listDetections: () => request<any[]>('/detection/results', undefined, () => demoDetections),

  getDetection: (id: string) => request<any>(`/detection/results/${id}`, undefined,
    () => demoResults[id] || demoResults['det-demo-1']),

  listIncidents: (status?: string) => request<any[]>(`/incidents${status ? `?status=${status}` : ''}`, undefined,
    () => status ? demoIncidents.filter((i) => i.status === status) : demoIncidents),

  updateIncident: (id: string, body: any) => request<any>(`/incidents/${id}`,
    { method: 'POST', body: JSON.stringify(body) },
    () => {
      const incident = demoIncidents.find((i) => i.id === id)
      if (incident) Object.assign(incident, body)
      return { ok: true }
    }),

  runExperiment: (body: any) => request<any>('/experiments/run',
    { method: 'POST', body: JSON.stringify(body) },
    () => {
      const methods: string[] = body?.methods?.length ? body.methods : ['isolation_forest', 'statistical_mad']
      const results = methods.map((method) => {
        const threshold = Number(body?.thresholds?.[method] ?? 0.5)
        const result = buildDetectionResult(demoId('det'), body?.test_dataset_id || 'ds-demo-test', method, threshold)
        return { method, threshold, n_flagged: result.n_flagged, metrics: result.metrics }
      })
      const experiment = {
        id: demoId('exp'),
        name: 'comparison',
        created_at: now,
        result_path: 'demo://experiment',
      }
      demoExperiments.unshift(experiment)
      return {
        experiment_id: experiment.id,
        n_train: demoDatasets.find((d) => d.id === body?.train_dataset_id)?.n_rows ?? 960,
        n_test: demoDatasets.find((d) => d.id === body?.test_dataset_id)?.n_rows ?? 240,
        methods,
        results,
      }
    }),

  listExperiments: () => request<any[]>('/experiments', undefined, () => demoExperiments),

  createReport: (body: any) => request<any>('/reports',
    { method: 'POST', body: JSON.stringify(body) },
    () => {
      const report = { id: demoId('rep'), kind: body?.kind || 'investigation', created_at: now, path: 'demo://report' }
      demoReports.unshift(report)
      return { report_id: report.id, id: report.id, kind: report.kind, path: report.path }
    }),

  listReports: () => request<any[]>('/reports', undefined, () => demoReports),

  getReportContent: (id: string) => request<any>(
    `/reports/${encodeURIComponent(id)}/content`, undefined, () => ({})),

  /* ---- TraceLens 2.0: auth, incidents, demo and reporting ---- */

  login: async (body: any) => {
    const data = await requestStrict<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) })
    if (data?.token) setToken(data.token)
    return data
  },

  register: async (body: any) => {
    const data = await requestStrict<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) })
    if (data?.token) setToken(data.token)
    return data
  },

  logout: async () => {
    try { await requestStrict<any>('/auth/logout', { method: 'POST' }) } catch { /* local logout still applies */ }
    setToken(null)
    return { ok: true }
  },

  me: () => requestStrict<any>('/auth/me', { method: 'GET' }),

  overviewStats: () => request<any>('/stats/overview', undefined, () => ({
    datasets: demoDatasets.length,
    models: demoModels.length,
    detections: demoDetections.length,
    incidents: demoIncidents.length,
    open_incidents: demoIncidents.filter((i: any) => i.status === 'open').length,
    experiments: demoExperiments.length,
    reports: demoReports.length,
    n_flagged: demoDetections.reduce((sum: number, d: any) => sum + (d.n_flagged || 0), 0),
    source: 'demo fixture',
  })),

  demoScenarios: () => request<any[]>('/demo/scenarios', undefined, () => [
    { key: 'normal', name: 'Normal System Behaviour', description: 'Steady telemetry with no injected anomaly.' },
    { key: 'cpu_spike', name: 'Sudden CPU Spike', description: 'CPU utilization jumps sharply for a short window.' },
    { key: 'memory_leak', name: 'Gradual Memory Growth', description: 'Memory climbs steadily across the window.' },
    { key: 'network_surge', name: 'Unusual Network Activity', description: 'Network throughput and connections surge together.' },
    { key: 'latency_error_surge', name: 'Latency and Error-Rate Surge', description: 'Response latency and errors rise together.' },
    { key: 'combined_anomaly', name: 'Coordinated Multi-Metric Anomaly', description: 'Several metrics deviate in the same window.' },
  ]),

  loadDemo: (body: any) => request<any>('/demo/load',
    { method: 'POST', body: JSON.stringify(body) },
    () => {
      const scenario = String(body?.scenario || 'normal')
      const rows = demoTelemetry.filter((r) => scenario === 'normal' ? r.label === 0 : r.scenario === scenario)
      const source = rows.length ? rows : demoTelemetry.slice(0, 24)
      return {
        scenario,
        dataset_id: `ds-demo-${scenario}`,
        n_rows: source.length,
        is_synthetic: true,
        description: `${scenario.replace(/_/g, ' ')} — synthetic demonstration data, not production telemetry.`,
        preview: source.slice(0, 50),
        columns: [...FEATURES, 'label', 'scenario', 'record_id'],
      }
    }),

  resetDemo: () => request<any>('/demo/reset', { method: 'POST' },
    () => ({ ok: true, scenario: null, is_synthetic: true, source: 'demo fixture' })),

  addNote: (id: string, body: any) => requestStrict<any>(
    `/incidents/${encodeURIComponent(id)}/notes`, { method: 'POST', body: JSON.stringify(body) }),

  escalateIncident: (id: string, body: any) => requestStrict<any>(
    `/incidents/${encodeURIComponent(id)}/escalate`, { method: 'POST', body: JSON.stringify(body) }),

  resolveIncident: (id: string, body: any) => requestStrict<any>(
    `/incidents/${encodeURIComponent(id)}/resolve`, { method: 'POST', body: JSON.stringify(body) }),

  incidentActivity: (id: string) => request<any[]>(
    `/incidents/${encodeURIComponent(id)}/activity`, undefined, () => []),

  downloadReport: async (id: string, format: 'pdf' | 'csv' | 'json' = 'pdf') => {
    const token = getToken()
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch(`${BASE}/reports/${encodeURIComponent(id)}/download?format=${format}`, { headers })
    if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const disposition = res.headers.get('content-disposition') || ''
    const matched = disposition.match(/filename="?([^";]+)"?/i)
    const filename = matched ? matched[1] : `tracelens-report-${id}.${format}`
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    return { ok: true, filename, format }
  },

  stats: () => request<any[]>('/detection/results', undefined, () => demoDetections).then((r) => r).catch(() => ({})),
}

export default api
