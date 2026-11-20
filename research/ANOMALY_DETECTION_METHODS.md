# Anomaly Detection Methods — Research Note for TraceLens

**Purpose:** justify the two detectors implemented in `ml-engine/`, the explainability design, and the threshold/evaluation practice for AEGYTHON 2026 Challenge 02 "Find the Anomaly".
**Author:** Tango · AGENT 1 (Research & Competition Strategist) / AGENT 8 (Reviewer)
**Date:** 2026-11-20
**Scope:** system telemetry — CPU %, memory %, disk I/O, network throughput, request rate, response latency, error rate, connection count.

---

## 1. Problem framing

TraceLens works with one-minute-aggregated host telemetry: eight numeric features plus a binary label. The generator injects nine documented scenarios — `cpu_spike`, `memory_leak`, `network_surge`, `latency_spike`, `error_surge`, `combined_anomaly`, `multi_metric`, `missing_measurement`, `noisy` — so the detector must handle both single-metric extremes and coordinated multi-metric shifts, plus missing and noisy readings ([AI_ML_METHODOLOGY.md](../documentation/AI_ML_METHODOLOGY.md)).

Three properties drive the method choice:

1. **No labels at scoring time.** The detector must be unsupervised: fit on normal-heavy training data, then score new records.
2. **Small, explainable feature set.** Eight interpretable columns make a transparent baseline competitive with a tree ensemble.
3. **Trust matters as much as the flag.** Every alert must be translated into evidence an on-call engineer can check.

Those constraints favour exactly the pair implemented here: an **Isolation Forest** (multivariate, non-linear) and a **robust MAD statistical baseline** (transparent, per-feature), with a deviation-based explanation layer on top.

---

## 2. Isolation Forest

### Principle

Isolation Forest builds an ensemble of random trees. At each node it picks a feature and a random split value; anomalies are expected to be **isolated in fewer splits** because they occupy sparse regions of the feature space. The average path length across trees gives an anomaly score; shorter paths mean more anomalous [1].

### Configuration used in TraceLens

From `ml-engine/detect.py`:

| Parameter | Value | Reason |
| --- | --- | --- |
| `n_estimators` | 200 | Stable averaging without meaningful runtime cost at this scale |
| `contamination` | 0.1 | Prior estimate of anomalous share; affects the internal offset, not the flagging threshold used here |
| `random_state` | 20261120 | Reproducibility |
| `n_jobs` | 1 | Deterministic execution order |
| Input | `RobustScaler`-transformed training matrix | Removes scale dominance between features |

The raw score is `-model.decision_function(X)` (higher = more anomalous), then **min–max normalised over the scored batch** to `[0, 1]`; a record is flagged when `score >= threshold` (default 0.5) [2].

### Strengths

- Captures **interactions between features** — a moderate shift in several metrics can be anomalous even when no single one is extreme.
- No distance metric or distributional assumption; works with mixed scales after scaling.
- Linear-time behaviour and a well-understood ensemble variance reduction.

### Weaknesses and failure modes in this project

- **Batch-relative scores.** Min–max normalisation uses `raw.min()` and `raw.max()` of the current batch. The same record can receive a different score when scored alone versus in a large batch, so scores are comparable *within* a detection run but **not across runs**. A reviewer flag: persist the raw `decision_function` value or calibrate against a fixed reference batch before claiming cross-run comparability.
- **Sensitivity to `contamination`.** The offset shifts with the assumed anomaly rate; if the real rate differs substantially, scores drift even though ranking stays useful.
- **Weak on sparse/local anomalies** in very high dimensions (not a concern with eight features).
- **Opaque feature attribution.** Path-length contributions are not directly readable, which is why a separate explanation layer is required.

---

## 3. Robust statistical baseline (MAD, with IQR as the conceptual neighbour)

### Principle

Median and Median Absolute Deviation are **robust**: unlike mean and standard deviation, they are barely influenced by the outliers being detected. For a feature `x`, the conventional robust z-score is:

```
MAD       = median(|x − median(x)|)
scaledMAD = 1.4826 × MAD          # consistency constant for normally distributed data
z         = |x_i − median(x)| / scaledMAD
```

The factor 1.4826 (`1 / 0.6745`) makes `scaledMAD` a consistent estimator of σ for normal data, so `z ≈ 3.5` marks a rare deviation under a roughly normal assumption [3, 5]. Tukey's IQR rule (`x < Q1 − 1.5·IQR` or `x > Q3 + 1.5·IQR`) is the boxplot analogue and is conceptually the same idea — a robust centre plus a robust spread [4]. TraceLens uses MAD because it is simpler to fit and store per feature.

### Configuration used in TraceLens

From `ml-engine/detect.py`:

- Fit per-feature `median` and `scaledMAD` on the **scaled training matrix**; floor `scaledMAD` at `1e-9` to avoid divide-by-zero on constant columns.
- `z_threshold = 3.5` per feature.
- Batch score = `0.6 × (fraction of features with z ≥ 3.5) + 0.4 × clip(max_z / (2 × 3.5), 0, 1)`, clipped to `[0, 1]`.
- Flag when `score >= threshold` (default 0.3).

The blend is deliberate: the first term rewards **multi-metric** anomalies (the `combined_anomaly` / `multi_metric` scenarios), the second keeps single-feature extremes visible.

### Strengths

- **Transparent and auditable** — every component can be recomputed by hand from the stored medians and MADs.
- No iterative fit, no randomness, no model file strictly required.
- Robust to the anomalies themselves contaminating the centre estimate.
- Naturally handles missing-value scenarios once imputation has run.

### Weaknesses and failure modes in this project

- **Feature independence assumed.** It ignores correlation between metrics, so a coordinated but individually mild shift can score low.
- **Univariate only.** Cannot express "latency high *while* request rate is low" as a single deviation.
- **Small-sample instability.** With only 36–72 rows per experiment split, per-feature MAD estimates are noisy; results moved materially between the two recorded runs (§7).
- **Floor hack.** `1e-9` keeps arithmetic safe but makes a near-constant feature produce enormous z-scores; that column would dominate the max term.
- **Scale dependence of the z threshold.** Because MAD is fitted on `RobustScaler` output, `z = 3.5` no longer means "3.5 robust spreads in original units"; it means 3.5 spreads of an IQR-normalised column. The transform is deterministic and documented, but the interpretation should be stated explicitly in reports.

---

## 4. Side-by-side comparison

| Dimension | Isolation Forest | Robust MAD baseline |
| --- | --- | --- |
| Family | Tree ensemble, unsupervised | Robust univariate statistics |
| Training required | Yes (fit trees on training matrix) | Yes (fit medians / MADs), but trivial |
| Multivariate interactions | Captured | Not captured |
| Transparency | Low without a separate explainer | High — per-feature z-scores |
| Distributional assumption | None explicit | Approximate normality for the 1.4826 constant / 3.5 rule |
| Sensitivity to anomalous training rows | Low–moderate | Low (robust centre) |
| Handling of constant features | Tolerated | Needs the `1e-9` floor; can dominate |
| Runtime at this scale | Small but larger | Negligible |
| Score comparability across batches | **No** (batch min–max) | Yes, if medians/MADs are fixed at fit time |
| Best use here | Catch coordinated subtle anomalies | Baseline, sanity check, and the most explainable result |

**Why the project keeps both.** Agreement between two methodologically independent detectors is a useful confidence signal; disagreement is a prompt to inspect rather than an error to hide. It also directly serves the AI/ML (25) and Creativity (20) rubric criteria without adding dependencies.

---

## 5. Explainability approaches

### 5.1 Deviation-based (implemented in `explain.py`)

For each flagged record the system computes, per feature: value, baseline median, absolute deviation, relative percentage and a status (`missing` / `normal` / `elevated` / `extreme`). `identify_affected_features` returns up to three `extreme` features, falling back to the three largest absolute deviations. The narrative then separates five fields:

| Field | Question it answers |
| --- | --- |
| `evidence` | What was actually observed, in units, versus the baseline? |
| `model_interpretation` | What score did the model assign, what was the threshold, what was the decision? |
| `possible_explanation` | What pattern is consistent with the data? (explicitly **non-causal**) |
| `recommended_investigation` | What should a human check next? |
| `unknowns` | Root cause, benign-vs-real, user impact — all explicitly unknown |

This is an **intrinsic, data-grounded** explanation strategy: it does not pretend to open the Isolation Forest, but it is faithful to what was measured and avoids fabricated root causes. That honesty is a stronger competition asset than a smoother-sounding but unjustified narrative.

**Reviewer caveat:** the detector uses robust MAD statistics, while `explain.py` labels `elevated` / `extreme` using baseline `std` (falling back to 1.0). A feature can therefore be `extreme` in the explanation yet below the detector's robust z threshold, or vice versa. Aligning the explanation to robust spread (e.g. the stored `scaledMAD`) would make the two layers consistent.

### 5.2 Model-agnostic post-hoc alternatives (not implemented)

| Method | Idea | Why not now |
| --- | --- | --- |
| LIME [7] | Fit a local linear surrogate around each prediction by perturbing inputs | Adds a dependency and stochastic local explanations; explains the model, not the incident |
| SHAP [8] | Attribute prediction to features via Shapley values with a consistent additive sum | Heavy for a tree ensemble in a browser demo; attributions would still need the same "what to check next" wrapper |
| LOF [6] | Local density relative to neighbours | Would be a *third* detector; useful future work for local anomalies, but increases scope |
| Robust Mahalanobis distance [5] | Multivariate robust covariance distance | Attractive bridge between the two current methods; needs enough samples for a stable covariance estimate (not true at 36–72 rows) |

**Decision:** ship the deviation-based layer now, document SHAP/LIME as future work. The rubric rewards a working, reproducible explanation the judges can trace to real numbers more than a novel explainer that destabilises the demo.

---

## 6. Threshold selection and evaluation practice

- Both detectors expose a configurable threshold, and the Experiment Lab compares methods × thresholds. This is a genuine strength for the Functionality criterion.
- **Risk:** if a threshold is chosen because it maximises F1 *on the test set*, the reported test metrics are no longer an unbiased estimate. The defensible pattern is: choose threshold on a validation split (or from the 0.1 contamination prior), freeze it, then evaluate once on the held-out test set. The current documentation should state which was done.
- Metrics are computed with scikit-learn from actual predictions and labels: accuracy, precision, recall, F1, confusion counts, false-positive rate and ROC AUC, with `zero_division=0` for well-defined edge cases [2]. No metric is hard-coded or invented.
- Because scores are per-batch for Isolation Forest, ROC AUC computed on one batch is meaningful for that batch only; publish the batch size alongside it.

---

## 7. Evidence from this project

Both recorded experiments used paired train/test frames with a fixed seed and stratified split. Numbers below are copied from the experiment JSON files, not estimated.

| Run | Test rows | Method | Threshold | Precision | Recall | F1 | FPR | ROC AUC |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `exp-e6f79ec7ab30` | 36 | isolation_forest | 0.5 | 0.667 | 0.667 | 0.667 | 0.067 | 0.950 |
| `exp-e6f79ec7ab30` | 36 | statistical_mad | 0.3 | 1.000 | 0.833 | 0.909 | 0.000 | 0.978 |
| `exp-4ceb9977f528` | 72 | isolation_forest | 0.5 | 0.909 | 0.833 | 0.870 | 0.017 | 0.876 |
| `exp-4ceb9977f528` | 72 | statistical_mad | 0.3 | 0.909 | 0.833 | 0.870 | 0.017 | 0.876 |

**Honest reading.** The 36-row run favours MAD strongly; at 72 rows both methods tie. This is exactly the small-sample instability described in §3 — a reminder that the headline number should come from a larger canonical run (1,200 normal + 240 anomalies is the documented default in `README.md`) and that the small runs should be presented as smoke tests, not performance claims. ROC AUC also falls from ~0.95–0.98 to 0.876 as the sample grows, further evidence that the tiny-run figures are optimistic.

---

## 8. Limitations and responsible claims

- **Synthetic telemetry only.** Results demonstrate the method on generated data; they are not evidence of production outage prediction.
- **No causal inference.** "Possible explanation" is a pattern description; root cause is always listed as unknown.
- **No concept drift, streaming or seasonality modelling.** A diurnal term exists in normal CPU generation, but there is no adaptive baseline.
- **Two independent methods, not an exhaustive survey.** LOF, one-class SVM, autoencoders and robust covariance are legitimate alternatives left as future work.
- **Small evaluation sets to date** — see §7.
- **Reference note.** The citations below are standard literature references recorded from established sources; a live web lookup was unavailable when this note was written, so exact page numbers should be re-checked against the publisher if the rubric requires formal bibliography verification.

---

## 9. References

1. F. T. Liu, K. M. Ting and Z.-H. Zhou, "Isolation Forest," *Proc. 8th IEEE International Conference on Data Mining (ICDM 2008)*, Pisa, Italy, Dec 2008, pp. 413–422. doi:10.1109/ICDM.2008.17.
2. scikit-learn developers, "sklearn.ensemble.IsolationForest" and "Metrics and scoring: quantifying the quality of predictions," *scikit-learn 1.9 documentation*, 2026. https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html
3. B. Iglewicz and D. C. Hoaglin, *How to Detect and Handle Outliers*, ASQC Basic References in Quality Control, Vol. 16, 1993.
4. J. W. Tukey, *Exploratory Data Analysis*, Addison-Wesley, 1977.
5. P. J. Rousseeuw and M. Hubert, "Robust statistics for outlier detection," *WIREs Data Mining and Knowledge Discovery*, vol. 1, no. 1, pp. 73–79, 2011. doi:10.1002/widm.2.
6. M. M. Breunig, H.-P. Kriegel, R. T. Ng and J. Sander, "LOF: Identifying Density-Based Local Outliers," *Proc. ACM SIGMOD International Conference on Management of Data*, 2000, pp. 93–104. doi:10.1145/335191.335388.
7. M. T. Ribeiro, S. Singh and C. Guestrin, "'Why Should I Trust You?': Explaining the Predictions of Any Classifier," *Proc. 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 2016, pp. 1135–1144. doi:10.1145/2939672.2939778.
8. S. M. Lundberg and S.-I. Lee, "A Unified Approach to Interpreting Model Predictions," *Advances in Neural Information Processing Systems 30 (NIPS 2017)*, 2017, pp. 4765–4774.

— Tango
