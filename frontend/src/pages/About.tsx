import { Info, Cpu, Database, Globe, Shield, FlaskConical } from 'lucide-react'

const stack = [
  { name: 'React', version: '19', license: 'MIT', role: 'UI framework' },
  { name: 'TypeScript', version: '5.7', license: 'Apache-2.0', role: 'Typed JavaScript' },
  { name: 'Vite', version: '6', license: 'MIT', role: 'Build tooling / dev server' },
  { name: 'Tailwind CSS', version: '3.4', license: 'MIT', role: 'Utility-first styling' },
  { name: 'Recharts', version: '2.15', license: 'MIT', role: 'Charts' },
  { name: 'React Router', version: '7', license: 'MIT', role: 'Client-side routing' },
  { name: 'lucide-react', version: '0.468', license: 'ISC', role: 'Icons' },
  { name: 'FastAPI', version: '0.115', license: 'MIT', role: 'Backend API' },
  { name: 'Uvicorn', version: '0.32', license: 'BSD-3', role: 'ASGI server' },
  { name: 'Pydantic', version: '2', license: 'MIT', role: 'Request/response validation' },
  { name: 'pandas', version: '2.x', license: 'BSD-3', role: 'Data handling' },
  { name: 'NumPy', version: '2.x', license: 'BSD-3', role: 'Numerical arrays' },
  { name: 'scikit-learn', version: '1.x', license: 'BSD-3', role: 'Isolation Forest, metrics' },
  { name: 'SQLite', version: '3', license: 'Public domain', role: 'Persistence' },
]

export default function About() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">About & Methodology</h1>
        <p className="text-sm text-slate-500 mt-1">
          TraceLens — Explainable AI for Anomaly Detection. AEGYTHON 2026, Challenge 02. Solo entry by ProgVision.
        </p>
      </div>

      <Section title="Problem" icon={<Info size={16} className="text-teal" />}>
        <p className="text-sm text-slate-700 leading-relaxed">
          Operational telemetry streams (CPU, memory, disk, network, request rate, latency, error rate, connections)
          produce high volumes of data, and anomalies are rare and context-dependent. Off-the-shelf detectors flag
          records but rarely explain why, leaving operators to reverse-engineer the cause. TraceLens focuses on
          explainability: every flagged record carries observed evidence, a model interpretation, a cautious possible
          explanation, recommended investigation steps, and explicit unknowns.
        </p>
      </Section>

      <Section title="Solution" icon={<Shield size={16} className="text-teal" />}>
        <p className="text-sm text-slate-700 leading-relaxed">
          A small full-stack application that ingests telemetry datasets, trains two independent detectors, runs
          detection, and produces per-record explanations. Results can be compared across methods and thresholds in an
          experiment lab, and exported as investigation reports. All explanations are computed from actual measured
          values; the system does not claim root cause.
        </p>
      </Section>

      <Section title="Architecture" icon={<Cpu size={16} className="text-teal" />}>
        <div className="flex flex-col md:flex-row items-stretch gap-3">
          <Box title="Frontend" sub="React 19 + TS + Vite + Tailwind" detail="Pages, charts, forms" />
          <Arrow />
          <Box title="Backend API" sub="FastAPI + Pydantic" detail="Routing, validation, persistence" />
          <Arrow />
          <Box title="ML Engine" sub="Python modules" detail="Features, detectors, explain, evaluate" />
        </div>
        <div className="mt-4 flex flex-col md:flex-row items-stretch gap-3">
          <Box title="Storage" sub="SQLite + filesystem" detail="Datasets, models, results, reports" />
          <Arrow />
          <Box title="Datasets" sub="CSV telemetry" detail="Synthetic (seeded) or uploaded" />
          <Arrow />
          <Box title="Reports" sub="Markdown files" detail="Per-detection investigation reports" />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          The frontend proxies /api to the backend (port 8000 in development). The ML engine is imported by the backend
          as a Python package; detectors are pickled to disk and reused.
        </p>
      </Section>

      <Section title="Detection methodology" icon={<FlaskConical size={16} className="text-teal" />}>
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <span className="font-semibold">Isolation Forest (scikit-learn).</span> Tree-based isolation with 200 estimators.
            Anomaly score is derived from the decision function, min-max normalised to [0,1]; a record is flagged when
            its score meets or exceeds the configured threshold (default 0.5). Contamination default 0.1.
          </div>
          <div>
            <span className="font-semibold">Statistical baseline (MAD).</span> Per-feature median and Median Absolute
            Deviation (with 1.4826 consistency constant). Robust z-scores are computed; a record's score blends the
            fraction of features exceeding the z-threshold (default 3.5) with a normalised maximum robust z. Default
            threshold 0.3.
          </div>
          <div>
            <span className="font-semibold">Features (8):</span> cpu_utilization, memory_utilization, disk_io_mbps,
            network_mbps, request_rate, response_latency_ms, error_rate, connection_count.
          </div>
          <div>
            <span className="font-semibold">Explainability.</span> Per-feature deviation against a median baseline, affected
            features selected by extreme status then by absolute deviation. Explanations separate observed evidence,
            model interpretation, possible explanation, recommended investigation and unknowns. Root cause is never
            asserted.
          </div>
        </div>
      </Section>

      <Section title="Data generation" icon={<Database size={16} className="text-teal" />}>
        <p className="text-sm text-slate-700 leading-relaxed">
          Synthetic telemetry is generated with a fixed seed (20261120) for reproducibility. Normal rows follow a mild
          diurnal trend with Gaussian noise. Anomalous rows are injected across documented scenarios: cpu_spike,
          memory_leak, network_surge, latency_spike, error_surge, combined_anomaly, multi_metric, missing_measurement,
          noisy. Every record carries a ground-truth label and a scenario tag, enabling metric computation. Users may
          also upload their own CSV provided it contains the eight feature columns.
        </p>
      </Section>

      <Section title="Evaluation methodology" icon={<FlaskConical size={16} className="text-teal" />}>
        <p className="text-sm text-slate-700 leading-relaxed">
          On labelled test data the system computes precision, recall, F1, accuracy, false-positive rate, confusion-matrix
          counts (TP/FP/TN/FN), ROC-AUC (when scores are available), and counts of true/predicted anomalies. Experiments
          fit the scaler on the training split only and evaluate on a separate test split to avoid leakage.
        </p>
      </Section>

      <Section title="Limitations" icon={<AlertIcon />}>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
          <li>Synthetic data only by default; real-world performance is not claimed.</li>
          <li>Detectors are unsupervised-ish baselines; thresholds are configured, not auto-tuned.</li>
          <li>Explanations are descriptive and do not establish root cause or user impact.</li>
          <li>Missing values are imputed with column medians, which can mask collection issues.</li>
          <li>Persistence is local SQLite + filesystem; no multi-user or auth layer.</li>
          <li>Statistical baseline assumes per-feature independence and stationary baselines.</li>
        </ul>
      </Section>

      <Section title="Open-source attribution" icon={<Globe size={16} className="text-teal" />}>
        <div className="overflow-auto">
          <table>
            <thead><tr><th>Library</th><th>Version</th><th>License</th><th>Use</th></tr></thead>
            <tbody>
              {stack.map((s) => (
                <tr key={s.name}>
                  <td className="font-medium">{s.name}</td>
                  <td>{s.version}</td>
                  <td>{s.license}</td>
                  <td>{s.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Licenses as published by each project; verify against upstream for authoritative terms.
        </p>
      </Section>

      <Section title="Tech stack" icon={<Cpu size={16} className="text-teal" />}>
        <p className="text-sm text-slate-700">
          Frontend: React 19, TypeScript, Vite, Tailwind CSS, Recharts, React Router, lucide-react.
          Backend: FastAPI, Uvicorn, Pydantic, SQLite. ML: pandas, NumPy, scikit-learn.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Box({ title, sub, detail }: { title: string; sub: string; detail: string }) {
  return (
    <div className="flex-1 border border-slate-200 rounded-xl p-4 bg-white">
      <div className="font-semibold text-sm text-teal">{title}</div>
      <div className="text-xs text-slate-600 mt-1">{sub}</div>
      <div className="text-xs text-slate-400 mt-1">{detail}</div>
    </div>
  )
}

function Arrow() {
  return <div className="hidden md:flex items-center text-slate-400 font-bold">→</div>
}

function AlertIcon() {
  return <span className="text-amber-600">⚠</span>
}
