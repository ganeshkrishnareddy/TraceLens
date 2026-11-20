# Contributing to TraceLens

Thanks for helping improve TraceLens. Please keep changes small, tested and
honest — no fabricated metrics or unverified claims in documentation.

## Setup

1. Install Python 3.10+ and Node.js 18+.
2. `python -m pip install -r backend/requirements.txt`
3. `cd frontend && npm install`
4. Run `python -m pytest backend/tests tests -q` from the repository root before
   making changes to confirm a clean baseline.

## Development workflow

1. Create a branch or worktree for the change.
2. Make the smallest change that solves the problem. Keep ml-engine modules
   dependency-light (numpy, pandas, scikit-learn).
3. Add or update tests next to the relevant area:
   - API/integration → `backend/tests/test_api.py`
   - generator → `backend/tests/test_data_generator.py`
   - features → `backend/tests/test_features.py`
   - detectors → `backend/tests/test_detectors.py`
   - metrics → `backend/tests/test_evaluate.py`
   - explanations → `tests/test_explain.py`
4. Run the full suite: `python -m pytest backend/tests tests -q`.
5. Update `documentation/TESTING_REPORT.md` if test counts change.

## Coding conventions

- Python: type hints where practical, module docstrings, no broad `except`
  around logic that should fail loudly.
- Frontend: TypeScript, functional React components, keep API calls in
  `frontend/src/api.ts`.
- Use fixed seeds in tests. Never assert exact anomaly scores that depend on
  library internals; assert shapes, ranges and relationships instead.
- Keep explanations non-causal: report observed evidence and unknowns rather
  than claiming a root cause.

## Reporting issues

Include the command run, the full error text, Python/Node versions and whether
the failure occurs from a clean dataset/DB state.

## Licence

By contributing you agree that your contributions are licensed under the MIT
License in `LICENSE`.
