import { Link } from 'react-router-dom'
import { AlertTriangle, BookOpen, FlaskConical, Info, RefreshCw } from 'lucide-react'
import { PublicLayout } from '../components/PublicLayout'
import { Callout, Container, Eyebrow, Lead, MetricBar, Section } from '../components/ui'

const reference = [
  { method: 'isolation_forest', threshold: '0.50', flagged: 41, tp: 41, fp: 0, fn: 31, tn: 360, accuracy: 0.9282, precision: 1, recall: 0.5694, f1: 0.7257, fpr: 0, auc: 0.8861 },
  { method: 'statistical_mad', threshold: '0.30', flagged: 55, tp: 55, fp: 0, fn: 17, tn: 360, accuracy: 0.9606, precision: 1, recall: 0.7639, f1: 0.8661, fpr: 0, auc: 0.9011 },
]

const smoke = [
  { run: 'exp-e6f79ec7ab30', rows: 36, method: 'isolation_forest', threshold: '0.5', precision: 0.667, recall: 0.667, f1: 0.667, fpr: 0.067, auc: 0.950 },
  { run: 'exp-e6f79ec7ab30', rows: 36, method: 'statistical_mad', threshold: '0.3', precision: 1, recall: 0.833, f1: 0.909, fpr: 0, auc: 0.978 },
  { run: 'exp-4ceb9977f528', rows: 72, method: 'isolation_forest', threshold: '0.5', precision: 0.909, recall: 0.833, f1: 0.870, fpr: 0.017, auc: 0.876 },
  { run: 'exp-4ceb9977f528', rows: 72, method: 'statistical_mad', threshold: '0.3', precision: 0.909, recall: 0.833, f1: 0.870, fpr: 0.017, auc: 0.876 },
]

export function Research() {
  return (
    <PublicLayout>
      <section className="border-b border-line bg-white">
        <Container className="py-12 md:py-16">
          <Eyebrow>Research & methodology</Eyebrow>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Measured on synthetic data, reported with its limits
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-body md:text-lg">
            Every value on this page was produced by running this repository's code on this machine. Nothing
            here is a target, estimate or claim about real production telemetry.
          </p>
          <p className="mt-4 text-sm font-semibold text-ink">Evidence-driven. Explainable. Reproducible.</p>
        </Container>
      </section>

      <Section tone="paper">
        <Eyebrow>Reference experiment</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">432-row test split, two methods</h2>
        <Lead className="mt-4">
          The generator produced 1,200 normal and 240 anomalous rows with seed 20261120 — 1,440 rows in total.
          A stratified 70/30 split gave 1,008 training rows and 432 test rows, including 72 true anomalies.
          A RobustScaler was fit on the training data only.
        </Lead>
        <div className="mt-8 -mx-1 overflow-x-auto px-1">
          <table className="min-w-[900px]">
            <thead>
              <tr><th>Method</th><th>Threshold</th><th>Flagged</th><th>TP</th><th>FP</th><th>FN</th><th>TN</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th><th>FPR</th><th>ROC AUC</th></tr>
            </thead>
            <tbody>
              {reference.map((r) => (
                <tr key={r.method}>
                  <td className="font-medium text-ink">{r.method}</td><td>{r.threshold}</td><td>{r.flagged}</td>
                  <td>{r.tp}</td><td>{r.fp}</td><td>{r.fn}</td><td>{r.tn}</td>
                  <td>{r.accuracy.toFixed(4)}</td><td>{r.precision.toFixed(4)}</td><td>{r.recall.toFixed(4)}</td>
                  <td>{r.f1.toFixed(4)}</td><td>{r.fpr.toFixed(4)}</td><td>{r.auc.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Source: documentation/EXPERIMENT_RESULTS.md. Metrics were computed with scikit-learn from actual
          predictions and labels with zero_division=0 for defined edge cases.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="surface p-5">
            <p className="text-sm font-semibold text-ink">statistical_mad · 432 test rows</p>
            <div className="mt-5 space-y-5">
              <MetricBar label="Precision" value={0.9606} caption="No false positives on this seeded split." />
              <MetricBar label="Recall" value={0.7639} caption="17 of 72 true anomalies were not flagged." />
              <MetricBar label="F1" value={0.8661} />
              <MetricBar label="ROC AUC" value={0.9011} />
            </div>
          </div>
          <div className="surface p-5">
            <p className="text-sm font-semibold text-ink">isolation_forest · 432 test rows</p>
            <div className="mt-5 space-y-5">
              <MetricBar label="Precision" value={1} caption="No false positives on this seeded split." />
              <MetricBar label="Recall" value={0.5694} caption="31 of 72 true anomalies were not flagged." />
              <MetricBar label="F1" value={0.7257} />
              <MetricBar label="ROC AUC" value={0.8861} />
            </div>
            <p className="mt-6 text-xs leading-relaxed text-muted">
              Bars start at zero and are labelled with the measured value. They describe this one synthetic split only.
            </p>
          </div>
        </div>
        <div className="mt-8">
          <Callout title="Honest reading">
            Both detectors produced zero false positives on this particular seeded split; that is a property
            of the synthetic setup, not a guarantee for other data. MAD recovered more true anomalies at the
            chosen thresholds, while Isolation Forest still ranked anomalies well by ROC AUC.
          </Callout>
        </div>
      </Section>

      <Section tone="white">
        <Eyebrow>Small-sample checks</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Why small runs are smoke tests, not claims</h2>
        <Lead className="mt-4">
          Two earlier runs on 36 and 72 rows are published in the research notes. Their numbers are real, but
          they are unstable: the ranking changes as the sample grows.
        </Lead>
        <div className="mt-8 -mx-1 overflow-x-auto px-1">
          <table className="min-w-[760px]">
            <thead><tr><th>Run</th><th>Test rows</th><th>Method</th><th>Threshold</th><th>Precision</th><th>Recall</th><th>F1</th><th>FPR</th><th>ROC AUC</th></tr></thead>
            <tbody>
              {smoke.map((s, i) => (
                <tr key={`${s.run}-${s.method}-${i}`}>
                  <td>{s.run}</td><td>{s.rows}</td><td>{s.method}</td><td>{s.threshold}</td>
                  <td>{s.precision.toFixed(3)}</td><td>{s.recall.toFixed(3)}</td><td>{s.f1.toFixed(3)}</td>
                  <td>{s.fpr.toFixed(3)}</td><td>{s.auc.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6">
          <Callout title="What the small runs show" tone="warning">
            The 36-row run favours MAD strongly; at 72 rows both methods tie. ROC AUC falls from roughly
            0.95–0.98 to 0.876 as the sample grows. This is the small-sample instability the research notes warn about.
          </Callout>
        </div>
      </Section>

      <Section tone="soft">
        <Eyebrow>Method background</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Sources behind the design</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="surface p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><FlaskConical size={16} className="text-primary" aria-hidden="true" /> Detection</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-body">
              <li>F. T. Liu, K. M. Ting and Z.-H. Zhou, "Isolation Forest," ICDM 2008.</li>
              <li>P. J. Rousseeuw and M. Hubert, "Robust statistics for outlier detection," WIREs Data Mining and Knowledge Discovery, 2011.</li>
              <li>Tukey's boxplot rule (Q1 − 1.5·IQR, Q3 + 1.5·IQR) as the conceptual analogue for a robust centre and spread.</li>
            </ul>
          </div>
          <div className="surface p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><BookOpen size={16} className="text-primary" aria-hidden="true" /> Explanation & evaluation</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-body">
              <li>M. M. Breunig et al., "LOF: Identifying Density-Based Local Outliers," ACM SIGMOD 2000 — background on local density.</li>
              <li>M. T. Ribeiro, S. Singh and C. Guestrin, "'Why Should I Trust You?'", ACM SIGKDD 2016 — background on explanations.</li>
              <li>scikit-learn implementations of Isolation Forest, RobustScaler and classification metrics.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="paper">
        <Eyebrow>Limitations</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">What these results do not establish</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="surface p-5"><AlertTriangle size={18} className="text-warning" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold text-ink">Synthetic only</h3><p className="mt-2 text-sm leading-relaxed text-body">No real telemetry, customer impact or business metric is present, so production performance is unknown.</p></div>
          <div className="surface p-5"><RefreshCw size={18} className="text-warning" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold text-ink">Seed and threshold dependent</h3><p className="mt-2 text-sm leading-relaxed text-body">Results depend on the generator seed and chosen thresholds. Rerun the documented command to reproduce them.</p></div>
          <div className="surface p-5"><Info size={18} className="text-warning" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold text-ink">Per-batch scores</h3><p className="mt-2 text-sm leading-relaxed text-body">Isolation Forest scores are min-max normalised per evaluated batch; absolute thresholds are meaningful within one run.</p></div>
          <div className="surface p-5"><BookOpen size={18} className="text-warning" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold text-ink">No causality</h3><p className="mt-2 text-sm leading-relaxed text-body">The detector is unsupervised. Explanations are hypotheses with unknowns, not confirmed root causes.</p></div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/technology" className="btn-primary">See the method details</Link>
          <Link to="/demo" className="btn-secondary">Run a measured demo</Link>
        </div>
      </Section>
    </PublicLayout>
  )
}

export default Research
