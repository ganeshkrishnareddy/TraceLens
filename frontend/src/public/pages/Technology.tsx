import { Link } from 'react-router-dom'
import { Binary, Braces, Gauge, GitBranch, ListChecks, RotateCcw, ScanSearch, Sigma, Table2 } from 'lucide-react'
import { PublicLayout } from '../components/PublicLayout'
import { ArchitectureDiagram } from '../components/ArchitectureDiagram'
import { Callout, Container, Eyebrow, FeatureCard, Lead, Section } from '../components/ui'

const features = [
  ['cpu_utilization', 'CPU utilisation'],
  ['memory_utilization', 'Memory utilisation'],
  ['disk_io_mbps', 'Disk throughput (MB/s)'],
  ['network_mbps', 'Network throughput (MB/s)'],
  ['request_rate', 'Request rate'],
  ['response_latency_ms', 'Response latency (ms)'],
  ['error_rate', 'Error rate'],
  ['connection_count', 'Connection count'],
]

export function Technology() {
  return (
    <PublicLayout>
      <section className="border-b border-line bg-white">
        <Container className="py-12 md:py-16">
          <Eyebrow>Technology</Eyebrow>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Two detectors, one baseline, and an explanation attached to every flag
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-body md:text-lg">
            TraceLens keeps the detection methods deliberately simple and auditable. The value is in how a
            score becomes evidence, and how that evidence stays connected to the investigation that follows.
          </p>
          <p className="mt-4 text-sm font-semibold text-ink">Evidence-driven. Explainable. Reproducible.</p>
        </Container>
      </section>

      <Section tone="paper">
        <Eyebrow>Detection methods</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Complementary, not competing truths</h2>
        <Lead className="mt-4">
          Both methods run on the same prepared dataset. Neither is described as "better" in the abstract;
          the experiment lab compares them on a specific split and prints the measured metrics.
        </Lead>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <FeatureCard icon={Binary} title="Isolation Forest" body="An unsupervised tree ensemble that isolates observations in feature space. Records needing fewer splits to isolate receive higher anomaly scores." tag="scikit-learn" />
          <FeatureCard icon={Sigma} title="Statistical MAD" body="A robust z-score built from each feature's median and scaled median absolute deviation. Large deviations raise the record score." tag="robust statistics" />
          <FeatureCard icon={Table2} title="IQR as a concept" body="Tukey's boxplot rule is documented as the conceptual analogue of a robust centre plus robust spread. The implemented per-feature detector uses MAD." tag="documented, not a separate detector" />
        </div>
      </Section>

      <Section tone="white">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
          <div>
            <Eyebrow>Input signals</Eyebrow>
            <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Eight numeric features per record</h2>
            <Lead className="mt-4">
              Each record has a stable identifier, a synthetic scenario label and eight numeric signals. The
              generator uses a fixed seed so the same dataset can be recreated.
            </Lead>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {features.map(([key, label]) => (
                <li key={key} className="flex flex-col rounded-lg border border-line bg-white px-3 py-2.5">
                  <span className="text-sm font-medium text-ink">{label}</span>
                  <span className="mt-0.5 font-mono text-[11px] text-muted">{key}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="surface h-fit p-5 md:p-6">
            <Eyebrow>Inside a score</Eyebrow>
            <ol className="mt-4 space-y-4">
              {[
                ['Fit on training data', 'A RobustScaler and per-feature baseline are learned from the training split only.'],
                ['Score every test row', 'Each method produces a numeric score for each record using the same prepared features.'],
                ['Apply an explicit threshold', 'A configured threshold turns scores into flags. Changing it creates a new run, not a silent rewrite.'],
                ['Attach the evidence', 'For each flag, deviations from baseline are converted into sentences, a hypothesis and unknowns.'],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soft text-xs font-semibold text-primary">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-body">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section tone="paper"><ArchitectureDiagram /></Section>

      <Section tone="white">
        <Eyebrow>Explainability</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">What an explanation contains</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={Gauge} title="Deviations" body="Observed value against the baseline median for the metrics that moved most, with a relative percentage." />
          <FeatureCard icon={ListChecks} title="Evidence sentences" body="Plain statements such as 'response latency is X against a baseline median of Y', written from the actual record." />
          <FeatureCard icon={ScanSearch} title="Hypothesis and next checks" body="A possible explanation labelled as a hypothesis, plus suggested correlations and checks for the investigator." />
          <FeatureCard icon={Braces} title="Explicit unknowns" body="What the data cannot say: user impact, production cause and causality are named rather than guessed." />
        </div>
        <div className="mt-8">
          <Callout title="A score is not a root cause" tone="warning">
            TraceLens is unsupervised and does not establish causality. An explanation is a lead for investigation.
            It never claims to have identified the definitive cause of an incident.
          </Callout>
        </div>
      </Section>

      <Section tone="soft">
        <Eyebrow>Reproducibility</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Every run leaves a record</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <FeatureCard icon={GitBranch} title="Configuration" body="Dataset, method, threshold and seed are captured with the experiment configuration." />
          <FeatureCard icon={Table2} title="Per-record predictions" body="Score, flag and (where available) true label are written to a CSV for every test record." />
          <FeatureCard icon={RotateCcw} title="Measured metrics" body="Accuracy, precision, recall, F1, confusion counts, false-positive rate and ROC AUC are computed by scikit-learn." />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-body">
          Because Isolation Forest scores are min-max normalised per evaluated batch, thresholds should be
          interpreted within a single run. Small test splits are also unstable — the research page shows how
          the same methods rank differently at 36 and 72 rows.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/research" className="btn-primary">Read measured results</Link>
          <Link to="/how-it-works" className="btn-secondary">See the seven steps</Link>
        </div>
      </Section>
    </PublicLayout>
  )
}

export default Technology
