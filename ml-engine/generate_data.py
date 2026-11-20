"""
TraceLens · reproducible telemetry generator (CLI entry point).

Generates labelled synthetic system telemetry with documented anomaly scenarios
and a leakage-safe train/test split. All randomness is driven by one fixed seed,
so two runs with the same seed produce byte-identical CSV files.

Run from anywhere:

    python ml-engine/generate_data.py
    python ml-engine/generate_data.py --seed 20261120 --n-normal 1200 --n-anomaly 240

Outputs (default):
    datasets/synthetic/telemetry.csv   (+ telemetry.meta.json)
    datasets/synthetic/train.csv       (+ train.meta.json)
    datasets/synthetic/test.csv        (+ test.meta.json)

The generation logic lives in data_generator.py; this module is the stable
command-line interface used by train.py and the reproduction notes.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

import data_generator as dg

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT_DIR = ROOT / "datasets" / "synthetic"


def generate(
    seed: int = dg.RANDOM_SEED,
    n_normal: int = 1200,
    n_anomaly: int = 240,
    test_size: float = 0.3,
    out_dir: Path = DEFAULT_OUT_DIR,
) -> dict[str, Path]:
    """Generate dataset + split, save CSVs, return the generated paths."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    cfg = dg.GeneratorConfig(n_normal=n_normal, n_anomaly=n_anomaly, seed=seed)
    df = dg.generate_dataset(cfg)
    train, test = dg.make_train_test_split(df, test_size=test_size, seed=seed)

    paths = {
        "dataset": out_dir / "telemetry.csv",
        "train": out_dir / "train.csv",
        "test": out_dir / "test.csv",
    }
    dg.save_dataset(df, paths["dataset"], seed=seed)
    dg.save_dataset(train, paths["train"], seed=seed)
    dg.save_dataset(test, paths["test"], seed=seed)
    return paths


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate labelled TraceLens telemetry")
    parser.add_argument("--seed", type=int, default=dg.RANDOM_SEED)
    parser.add_argument("--n-normal", type=int, default=1200)
    parser.add_argument("--n-anomaly", type=int, default=240)
    parser.add_argument("--test-size", type=float, default=0.3)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    args = parser.parse_args(argv)

    paths = generate(
        seed=args.seed,
        n_normal=args.n_normal,
        n_anomaly=args.n_anomaly,
        test_size=args.test_size,
        out_dir=args.out_dir,
    )

    full = pd.read_csv(paths["dataset"])
    print(f"Generated {len(full)} labelled rows (seed={args.seed}).")
    print(f"  labels: {full['label'].value_counts().to_dict()}")
    print(f"  scenarios: {full['scenario'].value_counts().to_dict()}")
    for name, path in paths.items():
        print(f"  {name}: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
