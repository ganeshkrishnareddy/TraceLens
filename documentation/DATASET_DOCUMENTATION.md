# Dataset Documentation

## Source

All datasets are produced by `ml-engine/data_generator.py` or uploaded by the
user through `POST /api/datasets/upload` (CSV, max 25 MB). The built-in dataset is
**synthetic** and labelled; it is not production telemetry.

## Schema

| Column | Type | Description |
| --- | --- | --- |
| `record_id` | string | Stable ID, `REC-000000` format |
| `timestamp` | ISO datetime | One-minute cadence from `start_time` (default 2026-11-01T00:00:00) |
| `cpu_utilization` | float | CPU percent |
| `memory_utilization` | float | Memory percent |
| `disk_io_mbps` | float | Disk throughput in MB/s |
| `network_mbps` | float | Network throughput in MB/s |
| `request_rate` | float | Requests per interval |
| `response_latency_ms` | float | Response latency in milliseconds |
| `error_rate` | float | Error percent |
| `connection_count` | float | Active connections |
| `label` | int | 0 = normal, 1 = anomaly |
| `scenario` | string | Anomaly type or `normal` |

The eight metric columns are the model feature set (`features.FEATURES`).

## Default configuration

`GeneratorConfig(n_normal=1200, n_anomaly=240, seed=20261120,
include_timestamps=True)` → 1440 rows, 1200 normal, 240 anomalous. A `.meta.json`
sidecar stores row counts, features, seed and scenario list whenever a dataset
is saved.

## Anomaly scenarios

| Scenario | Injected pattern |
| --- | --- |
| `cpu_spike` | CPU forced near 92–100% |
| `memory_leak` | Memory forced near 88–99%, CPU nudged up |
| `network_surge` | Network ≥200 MB/s and connections ×2.5 |
| `latency_spike` | Latency ≥500 ms, request rate ×0.6 |
| `error_surge` | Error rate 5–25%, latency +200 ms |
| `combined_anomaly` | CPU, memory and error rate all pushed high |
| `multi_metric` | Disk, network and connections pushed high |
| `missing_measurement` | CPU and latency set to NaN |
| `noisy` | Large Gaussian noise on CPU and memory |

Normal rows always carry `scenario = "normal"`.

## Train/test split

`make_train_test_split(df, test_size=0.3, seed=RANDOM_SEED)` produces a
stratified 70/30 split (default: 1008 train / 432 test rows, 72 anomalies in the
test set). Record IDs are disjoint between splits; the test code asserts this.

## Storage

- `datasets/synthetic/synthetic_<seed>.csv` — full generated dataset.
- `datasets/synthetic/train_<seed>.csv`, `test_<seed>.csv` — split outputs.
- `datasets/raw/` — user uploads with collision-safe names.
- `tracelens.db` — registry of dataset, model, detection, incident, experiment
  and report records.

## Uploads

Uploads must be `.csv` and ≤25 MB. The backend saves the bytes, parses them with
pandas (deleting the file if parsing fails), and registers the row count. Module
imports for validation are available via `features.validate_columns`. Uploaded
files are not automatically labelled; evaluation metrics require a `label`
column.
