# Problem Statement

## Context

Modern services emit high-volume system telemetry — CPU, memory, disk I/O,
network throughput, request rate, latency, error rate and connection counts.
Abrupt deviations in these signals can indicate incidents such as resource
saturation, memory leaks, traffic surges or failing dependencies. Two practical
problems make this difficult:

1. **Detection.** Anomalies are rare and multi-dimensional. A single-threshold
   rule on one metric misses combined or subtle deviations and produces false
   alarms.
2. **Trust and investigation.** A binary "anomaly / normal" output does not tell
   an on-call engineer what was observed, why the model flagged it, what to check
   next, or what remains unknown.

## Objective

TraceLens aims to deliver a transparent, end-to-end anomaly-detection and
incident-investigation workbench that:

- produces **reproducible labelled telemetry** with documented anomaly types;
- applies **two independent detection approaches** so results can be compared;
- evaluates performance with **standard metrics computed against ground truth**;
- explains every flag with **structured, evidence-grounded narratives** that
  explicitly separate observation, model interpretation, plausible
  (non-causal) explanation, recommended investigation and unknowns;
- tracks incidents through a lightweight workflow and produces portable reports.

## Success criteria

- Deterministic output for a fixed seed and configuration.
- Leakage-safe train/test split (disjoint record IDs, stratified by label).
- Anomaly scores in `[0, 1]`; thresholds visibly change flag counts.
- Metrics computed with scikit-learn from actual predictions and labels.
- Every explanation includes affected features and non-empty evidence for
  strongly anomalous records.
- Full automated test suite runnable from one command.

## Scope boundaries

TraceLens is a demonstration and evaluation platform built on **synthetic
telemetry**. It does not claim to diagnose root cause, predict real outages, or
operate a production monitoring pipeline. See `LIMITATIONS.md`.
