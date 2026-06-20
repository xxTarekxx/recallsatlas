# RecallGraph MVP Implementation

Date: 2026-06-19

## Implemented

- Created the RecallGraph module under `backend/recallgraph`.
- Added legacy baseline recall JSON into RecallsAtlas migration/import folders.
- Added deterministic FDA and CPSC/general normalizers with no OpenAI calls.
- Generated normalized canonical JSON and a normalization quality report.
- Added Postgres plus pgvector schema and Docker Compose services.
- Added database migration and import scripts.
- Added separate embedding generation with a provider abstraction.
- Added related recall matching and duplicate candidate infrastructure.
- Added fallback search evaluation scripts and starter query set.
- Added `/recallgraph` frontend routes, API routes, server helpers, and compact UI components.
- Repositioned RecallGraph as the AI recall intelligence layer: semantic recall search, related recall graph, data dashboard, evaluation reporting, and transparent pipeline pages.
- Added runtime-mode reporting so production can distinguish Postgres/vector mode, static fallback mode, mock embeddings, and missing database configuration without exposing secrets.
- Refactored the legacy FDA and CPSC/general main ingestion scripts into raw-source RecallGraph entrypoints.
- Added raw FDA/CPSC output locations under `backend/recallgraph/data/raw`.
- Added `recallgraph:assert:raw-clean` to keep the raw ingestion boundary free of AI/editorial behavior.
- Added docs, environment example, import manifest, and this implementation note.

## Intentionally not changed

- Existing MongoDB flow remains in place.
- Existing FDA/CPSC main scraper entrypoints remain in place, but now run raw-source ingestion only.
- Existing production deployment remains untouched.
- VPS-level Docker/Postgres installation remains unapproved and has not been attempted.
- RecallsAtlas has not been globally renamed.
- External related repos are not part of the active RecallGraph pipeline.

## Main commands

From `backend`:

```powershell
npm run recallgraph:normalize
npm run recallgraph:db:up
npm run recallgraph:db:migrate
npm run recallgraph:db:status
npm run recallgraph:import
npm run recallgraph:embed
npm run recallgraph:graph
npm run recallgraph:evaluate
```

From `frontend`:

```powershell
npm run lint
npm run build
```

## Known limitations

- The MVP can render from normalized JSON before Postgres is running. The local Postgres/pgvector path has also been verified with mock embeddings.
- Production currently uses the existing PM2/Apache frontend deployment path. The RecallGraph production DB still needs an approved managed Postgres, native Postgres, or Docker/Compose decision.
- If production has no `RECALLGRAPH_DATABASE_URL`, the UI reports database-not-configured status and does not claim real semantic search.
- The default embedding provider is deterministic mock embeddings for local development. Set `RECALLGRAPH_EMBEDDING_PROVIDER=openai` and `OPENAI_API_KEY` to use OpenAI embeddings.
- With `RECALLGRAPH_EMBEDDING_PROVIDER=mock`, the frontend/API uses Postgres keyword scoring for search ranking. Mock vectors verify the pgvector storage path, but they are not semantically meaningful.
- Related recall fallback in JSON mode is lexical/rule-based. In Postgres mode, the verified `related_recalls` table is used.
- Historical 9,712-record CPSC backup import is intentionally phase 2.
- The frontend displays copied source image paths where available, but image asset migration was not included in this MVP.
- `recallgraph:evaluate` currently writes JSON and Markdown reports; it does not yet insert rows into the `evaluation_runs` table.

## DB verification continuation

Verification date: 2026-06-19

Docker safety:

- Confirmed branch: `feature/recallgraph-mvp`.
- Confirmed port `54329` was free before starting RecallGraph Postgres.
- Started only the RecallGraph compose project with `docker compose -p recallgraph -f docker-compose.recallgraph.yml up -d`.
- Confirmed `recallgraph-postgres` and `recallgraph-redis` are running under the `recallgraph` compose project.
- Did not run Docker prune, Docker compose down, or commands that remove unrelated Docker containers, images, volumes, or networks.
- Unrelated Docker projects were visible in `docker ps` but were not touched.

Environment used:

```powershell
$env:RECALLGRAPH_DATABASE_URL="postgres://recallgraph:recallgraph_dev_password@localhost:54329/recallgraph"
$env:RECALLGRAPH_EMBEDDING_PROVIDER="mock"
```

Commands run from `backend`:

```powershell
npm run recallgraph:db:migrate
npm run recallgraph:import
npm run recallgraph:embed
npm run recallgraph:graph
npm run recallgraph:evaluate
npm run recallgraph:db:status
```

Results:

- DB migration succeeded.
- Import succeeded with 1,119 RecallGraph records.
- Mock embedding generation succeeded with 1,119 embedding rows created.
- Related recall graph build succeeded with 6,527 related recall links.
- Evaluation succeeded with 18 queries, 18 queries with results, and 0 zero-result queries.
- Read-only DB status:
  - `recalls`: 1,119
  - `recall_embeddings`: 1,119
  - distinct recalls with embeddings: 1,119
  - `related_recalls`: 6,527
  - import runs: 1

Frontend verification:

- `npm run build` passed.
- Existing Turbopack warning remains from `frontend/lib/general-recalls-data.ts`, not from new RecallGraph code.
- Verified the following pages returned HTTP 200 from a temporary Postgres-configured server:
  - `/recallgraph`
  - `/recallgraph/search`
  - `/recallgraph/dashboard`
  - `/recallgraph/evaluation`
  - `/recallgraph/recalls/htrc-and-haisito-t400-battery-chargers-recall-due-to-risk-of-serious-injury-and-death-from-fire-hazard-manufactured-by-h-recall`
  - `/recalls`
  - `/general-recalls`
- Verified the following API routes returned HTTP 200:
  - `/api/recallgraph/stats`
  - `/api/recallgraph/search?q=fire%20hazard`
  - `/api/recallgraph/evaluation`
  - `/api/recallgraph/recalls/htrc-and-haisito-t400-battery-chargers-recall-due-to-risk-of-serious-injury-and-death-from-fire-hazard-manufactured-by-h-recall`
  - `/api/recallgraph/related/cpsc_10689`
- Verified search probes returned results:
  - `fire hazard from battery chargers`: 10 results
  - `undeclared allergens in snacks`: 10 results
  - `children choking hazard`: 10 results
  - `lithium battery overheating`: 10 results
  - `salmonella contamination`: 10 results

Related repository note:

- This cleanup phase does not use or inspect external related repos.

Remaining blocked or skipped items:

- `npm test` remains blocked by existing MongoDB auth failure: `bad auth : authentication failed`.
- `npm run lint` remains blocked by the existing Next 16 `next lint` incompatibility.
- OpenAI/real semantic embedding verification remains a future step because this pass intentionally used mock embeddings.

## Next recommended phase

1. Review search results and populate expected recall IDs in the evaluation query set.
2. Add real semantic embeddings when ready, either OpenAI or a local model, and compare results against the mock/keyword baseline.
3. Decide whether legacy Mongo/static recall maintenance scripts should be archived after RecallGraph DB production is approved.
4. Add real semantic embeddings after selecting managed Postgres/pgvector.
5. Plan staging VPS deployment without changing production RecallsAtlas yet.

## Raw ingestion cleanup

Cleanup date: 2026-06-20

The main FDA and CPSC/general product scripts were retained as compatibility entrypoints:

- `backend/fdaRecalls/scripts/scrape/scrapeRecalls.js`
- `backend/generalRecalls/scripts/fetch/fetchGeneralRecalls.js`

They now call:

- `backend/recallgraph/src/ingest/fda/scrapeFdaRaw.js`
- `backend/recallgraph/src/ingest/cpsc/fetchCpscRaw.js`

Raw output defaults:

- `backend/recallgraph/data/raw/fda/fda-raw-latest.json`
- `backend/recallgraph/data/raw/cpsc/cpsc-raw-latest.json`

The deterministic normalizer keeps the current 1,119-record baseline and also reads the new raw latest files when present. Duplicate source URLs or source record IDs are skipped so future raw pulls can overlap the baseline safely.

The old FDA standalone localization script was removed:

- `backend/fdaRecalls/scripts/translate/recallTranslate.js`

Legacy Mongo/static scripts, current `/recalls` and `/general-recalls` data files, and the Lucene skeleton were left for phase 2 decisions.
