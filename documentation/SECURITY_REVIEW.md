# Security Review

## Current posture

TraceLens is a local development / demonstration application. The following
controls are present in code:

| Area | Implementation |
| --- | --- |
| Upload type | Only `.csv` filenames accepted; other extensions are rejected with HTTP 400 |
| Upload size | 25 MB limit enforced after reading the request body (HTTP 413) |
| Path safety | Upload filenames reduced to `Path(filename).name`; a unique suffix avoids overwrites |
| CSV parsing | Files are parsed with pandas immediately; invalid files are deleted before registration |
| CORS | Development CORS allows localhost:5173, 127.0.0.1:5173 and `*` with credentials |
| Secrets | No hard-coded API keys; optional values should come from environment / `.env` (see `.env.example`) |
| Persistence | SQLite parameters are bound (`?` placeholders); report download resolves registered paths only |
| Deserialisation | Model pickle files are loaded only from the local `models/` directory registered by the app |

## Notes and recommendations for a hosted deployment

1. **CORS.** The wildcard origin combined with `allow_credentials=True` is
   suitable for local development only. Restrict `allow_origins` to the actual
   frontend origin before exposing the API publicly.
2. **Authentication.** The API currently has no authentication or per-user
   isolation. Add an auth layer and per-tenant storage for any multi-user use.
3. **File uploads.** Re-check content type and scan files in a real deployment;
   the current check is filename-based. The 25 MB body is held in memory.
4. **Pickle trust.** Model bundles are pickled. Only load files produced by this
   application; do not accept model uploads from untrusted users.
5. **Rate limiting.** No rate limits exist on generate/train/detect endpoints;
   expensive training can be abused on a public deployment.
6. **Transport.** Run behind HTTPS in production. Local
   `http://localhost` usage is expected.

## Data handling

All generated data is synthetic. Uploaded CSV content stays on the host running
the backend under `datasets/`. No data leaves the machine through TraceLens
itself; there are no external telemetry or analytics calls in the code.
