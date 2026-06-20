# RecallGraph MVP

RecallGraph is the new modular AI/data layer inside RecallsAtlas. It does not rename the project, remove the existing MongoDB flow, or change production deployment.

## Architecture

```text
raw source ingest
  -> raw JSON files
  -> deterministic normalizers
  -> normalized canonical JSON
  -> Postgres plus pgvector
  -> embedding job
  -> related recall builder
  -> API routes
  -> /recallgraph dashboard, search, detail, evaluation pages
```

Raw/source data, normalized records, embeddings, graph links, and evaluation output are intentionally separate. Scrapers and fetchers collect factual source data only. Embeddings, graph/evaluation, and any future enrichment are separate later stages.

## Data flow

- Raw FDA output: `backend/recallgraph/data/raw/fda/fda-raw-latest.json`
- Raw CPSC output: `backend/recallgraph/data/raw/cpsc/cpsc-raw-latest.json`
- Legacy baseline imports: `backend/recallgraph/data/imports`
- Normalized output: `backend/recallgraph/data/normalized/recalls.normalized.json`
- Normalization report: `backend/recallgraph/data/normalized/normalization-report.json`
- Evaluation queries and reports: `backend/recallgraph/data/evaluation`

The current baseline has 366 FDA records and 753 CPSC/general product recall records. New source pulls should use the raw ingest commands below and should not write over the old enriched frontend data files.

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
npm run recallgraph:assert:raw-clean
npm run recallgraph:ingest:fda -- --limit=10 --dry-run
npm run recallgraph:ingest:cpsc -- --limit=10 --dry-run
npm run recallgraph:ingest:raw
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

## Raw ingest commands

- FDA raw ingest: `npm run recallgraph:ingest:fda`
- CPSC raw ingest: `npm run recallgraph:ingest:cpsc`
- Both raw ingest jobs: `npm run recallgraph:ingest:raw`
- Dry-run FDA sample: `npm run recallgraph:ingest:fda -- --limit=2 --dry-run`
- Dry-run CPSC sample: `npm run recallgraph:ingest:cpsc -- --limit=2 --dry-run`

The compatibility scripts remain:

- `backend/fdaRecalls/scripts/scrape/scrapeRecalls.js`
- `backend/generalRecalls/scripts/fetch/fetchGeneralRecalls.js`

Those scripts are raw-only entrypoints. They do not generate article copy, SEO fields, localized output, or generated summaries.

## Production notes

- Current VPS deployment uses the existing RecallsAtlas frontend path: Apache proxies to the PM2 app `recallsatlas` on `127.0.0.1:3001`.
- Docker Engine was approved and installed on 2026-06-20 only for the isolated RecallGraph production pgvector service.
- Native Postgres installation on the VPS is still not approved.
- The production UI is designed to handle `RECALLGRAPH_DATABASE_URL` being absent. In that state it reports database-not-configured status instead of crashing.
- Production semantic search currently uses Docker/Compose with `docker-compose.recallgraph.prod.yml`.
- Start only the production RecallGraph service with `docker compose --env-file .env.recallgraph.prod -p recallgraph-prod -f docker-compose.recallgraph.prod.yml up -d`.
- Set `RECALLGRAPH_POSTGRES_PASSWORD` only in the VPS shell or a VPS-only env file before starting production Postgres.
- The compose production Postgres bind is localhost-only: `127.0.0.1:54329:5432`.
- Redis is not part of the production compose file because current RecallGraph scripts do not require it.
- Copy `backend/recallgraph/.env.production.example` into the VPS environment as a reference, but do not commit real values.
- Use `RECALLGRAPH_EMBEDDING_PROVIDER=openai` plus `OPENAI_API_KEY` for production/demo-quality semantic search.
- Use `RECALLGRAPH_EMBEDDING_PROVIDER=mock` only for wiring tests; mock embeddings are deterministic but not semantically meaningful.
- Current production embedding model: `text-embedding-3-small`.
- Current production counts: 1,119 recalls, 1,119 OpenAI embeddings, 8,952 related recall links.
- Current production search API mode: `semantic`, `fallback=false`, `embeddingProvider=openai`.
- The pgvector IVFFlat index must be reindexed after fresh embedding inserts. `npm run recallgraph:embed` handles this when it creates new rows.

## Troubleshooting

- If Postgres is not running, the frontend falls back to normalized JSON for search, stats, detail, related recalls, and evaluation display.
- If embeddings are missing, search falls back to keyword matching.
- If `RECALLGRAPH_EMBEDDING_PROVIDER=mock`, API search uses Postgres keyword scoring for ranking because mock vectors verify plumbing but are not semantically meaningful.
- If `pg` is missing, run `npm install` in both `backend` and `frontend`.
- If Docker is unavailable, skip DB scripts and use normalized JSON fallback until Docker/Postgres is available.
- Do not put secrets in committed files.
