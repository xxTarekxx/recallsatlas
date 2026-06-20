# RecallGraph Raw Ingestion Cleanup Report

Date: 2026-06-20

Scope: repo cleanup only inside `C:\Users\perso\recallsatlas`. No deployment, server changes, Docker install, Postgres install, or VPS mutation was performed.

## Summary

RecallGraph is now the canonical recall data pipeline:

```text
Raw ingest
  -> raw JSON files
  -> deterministic normalizers
  -> Postgres import
  -> embeddings
  -> related recall graph
  -> evaluation
  -> frontend/API
```

The FDA and CPSC/general product entrypoints were kept, but they now call raw-only RecallGraph ingestion modules. Raw ingestion no longer creates article copy, SEO fields, localized output, or generated summaries.

## Kept and refactored

| File | Classification | Notes |
| --- | --- | --- |
| `backend/fdaRecalls/scripts/scrape/scrapeRecalls.js` | refactor | Kept as compatibility entrypoint; now calls `scrapeFdaRaw`. |
| `backend/generalRecalls/scripts/fetch/fetchGeneralRecalls.js` | refactor | Kept as compatibility entrypoint; now calls `fetchCpscRaw`. |
| `backend/recallgraph/src/ingest/fda/scrapeFdaRaw.js` | keep | New raw FDA scraper. |
| `backend/recallgraph/src/ingest/cpsc/fetchCpscRaw.js` | keep | New raw CPSC API fetcher. |
| `backend/recallgraph/src/ingest/shared/*` | keep | Shared CLI args, hashing, run manifest, and output helpers. |
| `backend/recallgraph/src/scripts/normalize-recalls.js` | refactor | Keeps existing baseline input and adds new raw file inputs when present. |
| `backend/recallgraph/src/normalize/normalizeFdaRecall.js` | refactor | Accepts new raw FDA fields such as `sourceRecordId` and `announcementText`. |
| `backend/recallgraph/src/normalize/normalizeGeneralRecall.js` | refactor | Accepts new raw CPSC `sourceRecordId`. |

## Deleted

| File | Reason |
| --- | --- |
| `backend/fdaRecalls/scripts/translate/recallTranslate.js` | Old standalone AI localization script. It is not part of RecallGraph raw ingestion and was not referenced by backend package scripts. |

## Package scripts

Added:

| Script | Command |
| --- | --- |
| `recallgraph:ingest:fda` | `node fdaRecalls/scripts/scrape/scrapeRecalls.js` |
| `recallgraph:ingest:cpsc` | `node generalRecalls/scripts/fetch/fetchGeneralRecalls.js` |
| `recallgraph:ingest:raw` | `npm run recallgraph:ingest:fda && npm run recallgraph:ingest:cpsc` |
| `recallgraph:assert:raw-clean` | `node recallgraph/src/scripts/assert-raw-ingest-clean.js` |

Repointed:

| Script | New behavior |
| --- | --- |
| `fetch-fda-recalls` | Raw FDA ingest. |
| `fetch-fda-recalls:10` | Raw FDA ingest with `--limit=10`. |
| `fetch-general-recalls` | Raw CPSC ingest. |
| `fetch-general-recalls:20` | Raw CPSC ingest with `--limit=20`. |
| `fetch-general-recalls:source-only` | Compatibility alias for raw CPSC ingest. |

Removed package scripts: none.

## Inventory and classification

| Area | Classification | Notes |
| --- | --- | --- |
| `backend/fdaRecalls/scripts/scrape/scrapeRecalls.js` | keep/refactor | Main FDA ingest path; raw-only after cleanup. |
| `backend/generalRecalls/scripts/fetch/fetchGeneralRecalls.js` | keep/refactor | Main CPSC/general product ingest path; raw-only after cleanup. |
| `backend/fdaRecalls/data/fda-recalls-en-eeat.json` | keep | Existing frontend/Mongo-era data file; not overwritten by raw ingest. |
| `backend/generalRecalls/data/general-recalls-en-eeat.json` | keep | Existing frontend data file; not overwritten by raw ingest. |
| `backend/scripts/sync/importCleanRecallCollections.js` | phase 2 / needs decision | Old Mongo import flow, still possibly useful for legacy pages. |
| `backend/scripts/sync/resetGeneratedRecallData.js` | phase 2 / needs decision | Old generated-data maintenance script. |
| `backend/scripts/sync/restoreFdaBackupSeed.js` | phase 2 / needs decision | Old FDA backup restoration helper. |
| `backend/scripts/sync/restoreFdaSeedImages.js` | phase 2 / needs decision | Old FDA image restoration helper. |
| `backend/scripts/audit/recallContentAudit.js` | phase 2 / needs decision | Audits old enriched data files. |
| `backend/carsRecalls/scripts/sync/carsJsonToMongo.js` | phase 2 / needs decision | Vehicle recall Mongo sync; outside FDA/CPSC raw-ingest cleanup. |
| `backend/recallgraph/src/embed/embeddingProvider.js` | keep | AI/vector stage is separate from raw ingest. |
| `backend/recallgraph/src/scripts/generate-embeddings.js` | keep | Later embedding stage. |
| `backend/recallgraph/src/scripts/build-related-recalls.js` | keep | Later graph stage. |
| `backend/recallgraph/src/scripts/evaluate-search.js` | keep | Evaluation stage. |
| `search-service/` | phase 2 / needs decision | Old Lucene skeleton, not referenced by current package scripts. |
| `frontend/lib/recallgraph/*` and `frontend/app/api/recallgraph/*` | keep | Current RecallGraph API/UI surface. |
| `frontend/lib/general-recalls-data.ts` | phase 2 / needs decision | Still supports existing `/general-recalls` static fallback behavior. |
| `frontend/lib/recalls-list-data.ts` and `frontend/app/recalls/*` | keep | Existing `/recalls` Mongo/listing flow must remain intact. |

## Search findings

The requested inventory search found:

- OpenAI/API-key usage in old FDA/CPSC scripts before this cleanup.
- OpenAI usage in RecallGraph embedding code, which is allowed because embeddings are a later stage.
- Mongo usage in legacy backend import/sync scripts and frontend legacy routes.
- Old enriched data references in frontend legacy recall pages.
- A stale Lucene `search-service` skeleton with no package script references.

Only the raw ingestion surface was changed in this branch. Legacy Mongo/static/listing cleanup is left for phase 2 because those files may still support existing `/recalls` and `/general-recalls` behavior.

## Raw outputs

FDA default:

```powershell
npm run recallgraph:ingest:fda
```

Writes:

- `backend/recallgraph/data/raw/fda/fda-raw-latest.json`
- `backend/recallgraph/data/raw/fda/fda-raw-YYYYMMDD-HHMMSS.json`
- `backend/recallgraph/data/raw/runs/fda-raw-run-YYYYMMDD-HHMMSS.json`

CPSC/default:

```powershell
npm run recallgraph:ingest:cpsc
```

Writes:

- `backend/recallgraph/data/raw/cpsc/cpsc-raw-latest.json`
- `backend/recallgraph/data/raw/cpsc/cpsc-raw-YYYYMMDD-HHMMSS.json`
- `backend/recallgraph/data/raw/runs/cpsc-raw-run-YYYYMMDD-HHMMSS.json`

Dry runs:

```powershell
npm run recallgraph:ingest:fda -- --limit=2 --dry-run
npm run recallgraph:ingest:cpsc -- --limit=2 --dry-run
```

## Cleanliness assertion

Run from `backend`:

```powershell
npm run recallgraph:assert:raw-clean
```

The assertion scans only:

- `backend/fdaRecalls/scripts/scrape/scrapeRecalls.js`
- `backend/generalRecalls/scripts/fetch/fetchGeneralRecalls.js`
- `backend/recallgraph/src/ingest/`

It fails if the raw ingestion surface contains disallowed AI/editorial terms.

## Phase 2 decisions

- Decide whether legacy Mongo import/reset/restore scripts remain needed after production RecallGraph DB is live.
- Decide whether old enriched JSON files should become read-only archives once RecallGraph is the source of truth for `/recalls` and `/general-recalls`.
- Decide whether to remove or archive `search-service/`.
- Decide whether car recall Mongo sync belongs in RecallGraph or remains separate.
- Decide whether frontend legacy comments/types referencing old generated data should be updated after route migration.
