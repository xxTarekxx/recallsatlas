# RecallGraph MVP

RecallGraph is the new modular AI/data layer inside RecallsAtlas. It does not rename the project, remove the existing MongoDB flow, change production deployment, or modify DollarsAndLife.

## Architecture

```text
DollarsAndLife JSON copies
  -> deterministic normalizers
  -> normalized canonical JSON
  -> Postgres plus pgvector
  -> embedding job
  -> related recall builder
  -> API routes
  -> /recallgraph dashboard, search, detail, evaluation pages
```

Raw/source data, normalized records, embeddings, graph links, and evaluation output are intentionally separate. Scrapers and fetchers should collect factual source data only. AI enrichment and embeddings are separate jobs.

## Data flow

- Imports: `backend/recallgraph/data/imports/dollarsandlife`
- Raw storage convention: `backend/recallgraph/data/raw`
- Normalized output: `backend/recallgraph/data/normalized/recalls.normalized.json`
- Normalization report: `backend/recallgraph/data/normalized/normalization-report.json`
- Evaluation queries and reports: `backend/recallgraph/data/evaluation`

The MVP copies 366 FDA records and 753 CPSC/general product recall records from DollarsAndLife. DollarsAndLife remains read-only.

## Environment

Copy or reference `backend/recallgraph/.env.example`.

Required for Postgres jobs:

- `RECALLGRAPH_DATABASE_URL`

Optional:

- `RECALLGRAPH_DATABASE_SSL`
- `RECALLGRAPH_EMBEDDING_PROVIDER=mock`
- `RECALLGRAPH_EMBEDDING_PROVIDER=openai`
- `RECALLGRAPH_OPENAI_EMBEDDING_MODEL`
- `RECALLGRAPH_EMBEDDING_DIMENSIONS`
- `OPENAI_API_KEY` when using OpenAI embeddings

The default embedding provider is deterministic `mock`, which keeps development and tests usable without API keys.

## Commands

Run from `C:\Users\perso\recallsatlas\backend`:

```powershell
npm run recallgraph:normalize
npm run recallgraph:db:up
$env:RECALLGRAPH_DATABASE_URL="postgres://recallgraph:recallgraph_dev_password@localhost:54329/recallgraph"
npm run recallgraph:db:migrate
npm run recallgraph:db:status
npm run recallgraph:import
npm run recallgraph:embed
npm run recallgraph:graph
npm run recallgraph:evaluate
```

From the repository root, start Docker explicitly with the project name:

```powershell
docker compose -p recallgraph -f docker-compose.recallgraph.yml up -d
docker compose -p recallgraph -f docker-compose.recallgraph.yml ps
```

Frontend routes:

- `/recallgraph`
- `/recallgraph/dashboard`
- `/recallgraph/search`
- `/recallgraph/evaluation`
- `/recallgraph/recalls/[slug]`

API routes:

- `/api/recallgraph/search`
- `/api/recallgraph/stats`
- `/api/recallgraph/health`
- `/api/recallgraph/recalls/[slug]`
- `/api/recallgraph/related/[id]`
- `/api/recallgraph/evaluation`

## Production notes

- Use `docker-compose.recallgraph.prod.yml` with `docker compose -p recallgraph-prod -f docker-compose.recallgraph.prod.yml up -d`.
- Set `RECALLGRAPH_POSTGRES_PASSWORD` only in the VPS shell or a VPS-only env file before starting production Postgres.
- The production Postgres bind is localhost-only: `127.0.0.1:54329:5432`.
- Redis is not part of the production compose file because current RecallGraph scripts do not require it.
- Copy `backend/recallgraph/.env.production.example` into the VPS environment as a reference, but do not commit real values.
- Use `RECALLGRAPH_EMBEDDING_PROVIDER=openai` plus `OPENAI_API_KEY` for production/demo-quality semantic search.
- Use `RECALLGRAPH_EMBEDDING_PROVIDER=mock` only for wiring tests; mock embeddings are deterministic but not semantically meaningful.

## Troubleshooting

- If Postgres is not running, the frontend falls back to normalized JSON for search, stats, detail, related recalls, and evaluation display.
- If embeddings are missing, search falls back to keyword matching.
- If `RECALLGRAPH_EMBEDDING_PROVIDER=mock`, API search uses Postgres keyword scoring for ranking because mock vectors verify plumbing but are not semantically meaningful.
- If `pg` is missing, run `npm install` in both `backend` and `frontend`.
- If Docker is unavailable, skip DB scripts and use normalized JSON fallback until Docker/Postgres is available.
- Do not put secrets in committed files.
