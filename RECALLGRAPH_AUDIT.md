# RecallGraph Audit

Audit date: 2026-06-19
Workspace audited: `C:\Users\perso\recallsatlas`
Related project inspected: `C:\Users\perso\dollarsandlife`

This is a discovery-only audit. No scraper, database, frontend, deployment, or OpenAI behavior has been changed. The only change made for this task is this audit report.

## Current project summary

RecallsAtlas is a Next.js plus Node/MongoDB recall site with three recall lanes:

- FDA recalls: strongest current lane in RecallsAtlas. Data is scraped with Playwright, enriched with OpenAI, stored as JSON, and importable into MongoDB.
- General product recalls: code exists, but the active generated RecallsAtlas JSON currently contains zero records. Historical backup data exists outside the normal active flow.
- Vehicle recalls: lookup is mostly live NHTSA API based, with sparse local seed/cache data and optional OpenAI rewrite/translation.

The repository also includes a Java/Lucene `search-service`, but it appears to be a small skeleton service and is not the current source of search truth.

DollarsAndLife contains a newer and more complete recall subsystem. Its FDA and general recall datasets are larger and more current than RecallsAtlas. It appears that a better version of the recall pipeline was copied or moved there, while RecallsAtlas retained older or partial versions.

Recommended source of truth:

- Make RecallsAtlas/RecallGraph the source of truth for recall ingestion, AI enrichment, embeddings, evaluation, and graph/statistics.
- Use the DollarsAndLife recall subsystem as the migration seed because it currently has the better pipeline and fuller data.
- Keep DollarsAndLife as a consumer/display surface only if desired, instead of letting the recall pipeline live there long term.

## Project structure

### RecallsAtlas

Top-level folders and files:

- `.git`
- `.vscode`
- `backend`
- `frontend`
- `generalRecallsBackup`
- `search-service`
- `.gitignore`
- `README.md`
- `REPORT.md`

Technology stack:

- Frontend: Next.js `16.2.4`, React `19.2.5`, TypeScript.
- Backend scripts: Node.js/CommonJS.
- Database: MongoDB, database name `recallsatlas`.
- AI: OpenAI SDK in backend and frontend-side API helpers.
- Vehicle data: NHTSA public API.
- Search experiment: Java 17, Jetty, Lucene.
- No Prisma schema found.
- No Supabase schema found.
- No pgvector, Pinecone, LangChain, LlamaIndex, or embeddings pipeline found.
- Firebase was not found as a recall storage layer in RecallsAtlas.

Important RecallsAtlas config files:

- `frontend/package.json`
- `frontend/next.config.mjs`
- `backend/package.json`
- `backend/database/mongodb.js`
- `backend/scripts/mongodb.js`
- `search-service/pom.xml`
- `backend/.env`
- `backend/scripts/.env`
- `frontend/.env.local`

Environment keys observed by name only:

- `MONGODB_URI`
- `OPENAI_API_KEY`
- `IMAGE_BASE_DIR`
- `RESEND_API_KEY`
- `ALERT_EMAIL`
- `NEXT_PUBLIC_SITE_URL`
- `CARS_JSON_PATH`

No secret values are included in this report.

### DollarsAndLife

Related folders inspected:

- `C:\Users\perso\dollarsandlife\server\recalls`
- `C:\Users\perso\dollarsandlife\frontend\data\recalls`
- `C:\Users\perso\dollarsandlife\frontend\lib\recalls`
- `C:\Users\perso\dollarsandlife\frontend\app\[lang]\recalls`

Technology stack:

- Frontend: Next.js `15.5.18`.
- Backend: Node.js scripts/server, MongoDB, OpenAI, Playwright, sharp.
- Recall database import targets: MongoDB database `dollarsandlife_data`, collections `recalls_fda`, `recalls_general`, `recalls_cars`.
- Firebase exists in DollarsAndLife overall, but the inspected recall flow is not Firebase-based.

## Important RecallsAtlas frontend routes and API endpoints

Pages:

- `frontend/app/page.tsx`
- `frontend/app/recalls/page.tsx`
- `frontend/app/recalls/[slug]/page.tsx`
- `frontend/app/recalls/preview/[id]/page.tsx`
- `frontend/app/recalls/vehicle/[campaignNumber]/page.tsx`
- `frontend/app/recalls/vehicles/page.tsx`
- `frontend/app/general-recalls/page.tsx`
- `frontend/app/general-recalls/[slug]/page.tsx`
- `frontend/app/category/[category]/page.tsx`
- `frontend/app/brand/page.tsx`
- `frontend/app/brand/[brand]/page.tsx`
- `frontend/app/year/page.tsx`
- `frontend/app/year/[year]/page.tsx`
- `frontend/app/cars/page.tsx`
- `frontend/app/about/page.tsx`
- `frontend/app/contact/page.tsx`
- `frontend/app/privacy/page.tsx`
- `frontend/app/methodology/page.tsx`
- localized `[lang]` variants for multiple recall pages.

API endpoints:

- `frontend/app/api/recalls/route.ts`
- `frontend/app/api/recalls/json/route.ts`
- `frontend/app/api/recalls/suggest/route.ts`
- `frontend/app/api/general-recalls/route.ts`
- `frontend/app/api/general-recalls/suggest/route.ts`
- `frontend/app/api/cars/lookup/route.ts`
- `frontend/app/api/cars/translate/route.ts`

Reusable frontend files:

- `frontend/lib/recalls-list-data.ts`
- `frontend/lib/general-recalls-data.ts`
- `frontend/lib/general-recalls-list-data.ts`
- `frontend/lib/recallCategoryFilter.ts`
- `frontend/lib/cars/fetchCarRecalls.ts`
- `frontend/lib/cars/rewriteRecall.ts`
- `frontend/lib/cars/translateRecall.ts`
- `frontend/components/fda/RecallDetail.tsx`

## Existing recall flow map

Current RecallsAtlas flow:

```text
FDA website
  -> backend/fdaRecalls/scripts/scrape/scrapeRecalls.js
  -> raw extraction plus OpenAI editorial enrichment in same script
  -> backend/fdaRecalls/data/fda-recalls-en-eeat.json
  -> backend/scripts/sync/importCleanRecallCollections.js
  -> MongoDB recallsatlas.recalls
  -> frontend/lib/recalls-list-data.ts and /api/recalls
  -> /recalls, /recalls/[slug], brand/category/year pages

CPSC / SaferProducts API
  -> backend/generalRecalls/scripts/fetch/fetchGeneralRecalls.js
  -> optional OpenAI enrichment unless --source-only is used
  -> backend/generalRecalls/data/general-recalls-en-eeat.json
  -> active file currently has 0 records
  -> frontend/lib/general-recalls-data.ts static loader
  -> /general-recalls and /general-recalls/[slug]

NHTSA API
  -> frontend/lib/cars/fetchCarRecalls.ts
  -> frontend/app/api/cars/lookup/route.ts
  -> optional OpenAI rewrite
  -> MongoDB cars cache plus sparse local JSON
  -> vehicle lookup and vehicle recall pages
```

Current DollarsAndLife flow:

```text
FDA website
  -> server/recalls/fda/scripts/scrape/scrapeRecalls.js
  -> JSON dataset
  -> translation/check/update scripts
  -> optimized frontend JSON
  -> optional Mongo import
  -> Next.js recall pages under /[lang]/recalls

CPSC / SaferProducts API
  -> server/recalls/general/scripts/fetch/fetchGeneralRecalls.js
  -> source-only mode or AI enriched mode
  -> translation/build optimized scripts
  -> optimized frontend JSON
  -> optional Mongo import
  -> Next.js recall pages under /[lang]/recalls/general

NHTSA API
  -> frontend/lib/recalls/vehicleRecallLookup.ts
  -> MongoDB cache recalls_cars
  -> vehicle recall pages/API
```

## What exists in RecallsAtlas

### FDA pipeline

Key files:

- `backend/fdaRecalls/scripts/scrape/scrapeRecalls.js`
- `backend/fdaRecalls/scripts/translate/recallTranslate.js`
- `backend/fdaRecalls/data/fda-recalls-en-eeat.json`
- `backend/fdaRecalls/data/image-map.json`
- `backend/scripts/sync/importCleanRecallCollections.js`
- `backend/scripts/audit/recallContentAudit.js`

Behavior:

- Uses Playwright to scrape FDA recall listing and detail pages.
- Extracts source/detail facts, contacts, images, dates, announcement text, and tables.
- Uses OpenAI in the same scraper to produce editorial/SEO recall content.
- Writes enriched JSON to `backend/fdaRecalls/data/fda-recalls-en-eeat.json`.
- Can import FDA records into MongoDB collection `recalls`.

Current FDA data:

- `backend/fdaRecalls/data/fda-recalls-en-eeat.json`: 304 records.
- `backend/fdaRecalls/data/image-map.json`: 971 entries.
- All 304 records have `slug`, `sourceUrl`, `datePublished`, `brandName`, `productDescription`, and `reason`.
- 1 record is missing `productType`.
- 51 records are missing images.
- Date range based on `datePublished`: 2024-12-31 to 2026-04-13.
- No duplicate slugs were found in the sampled scan.
- `sourcePublishedAt` was absent from all 304 records in the active JSON.
- `sourceTables` was absent or empty in all 304 records checked.
- Legacy fields such as `report_date`, `classification`, and `distribution` appear on 295 of 304 records.

### General product recall pipeline

Key files:

- `backend/generalRecalls/scripts/fetch/fetchGeneralRecalls.js`
- `backend/generalRecalls/data/general-recalls-en-eeat.json`
- `backend/generalRecalls/data/general-recalls-image-map.json`
- `generalRecallsBackup`

Behavior:

- Uses the CPSC/SaferProducts API endpoint `https://www.saferproducts.gov/RestWebServices/Recall`.
- Supports `--source-only`, which can fetch factual source records without OpenAI enrichment.
- Otherwise imports OpenAI and requires `OPENAI_API_KEY`.
- Writes to `backend/generalRecalls/data/general-recalls-en-eeat.json`.

Current general product recall data:

- Active RecallsAtlas generated file `backend/generalRecalls/data/general-recalls-en-eeat.json`: 0 records.
- Active image map `backend/generalRecalls/data/general-recalls-image-map.json`: 0 entries.
- Backup CSV folder `generalRecallsBackup`: 303 CSV files with about 2,639 data rows.
- Backup API-shaped file `generalRecallsBackup/testing2.json`: 9,712 CPSC-style records.

Common CPSC source fields in `testing2.json`:

- `RecallID`
- `RecallNumber`
- `RecallDate`
- `Description`
- `URL`
- `Title`
- `ConsumerContact`
- `LastPublishDate`
- `Products`
- `Inconjunctions`
- `Images`
- `Injuries`
- `Manufacturers`
- `Retailers`
- `Importers`
- `Distributors`
- `SoldAtLabel`
- `ManufacturerCountries`
- `ProductUPCs`
- `Hazards`
- `Remedies`
- `RemedyOptions`

The active general recall route probably has little or no content unless another data source exists outside the inspected active path.

### Vehicle recall lane

Key files:

- `backend/carsRecalls/scripts/sync/carsJsonToMongo.js`
- `backend/carsRecalls/data/cars.json`
- `backend/database/cars/data/cars.json`
- `frontend/lib/cars/fetchCarRecalls.ts`
- `frontend/lib/cars/rewriteRecall.ts`
- `frontend/lib/cars/translateRecall.ts`
- `frontend/app/api/cars/lookup/route.ts`
- `frontend/app/api/cars/translate/route.ts`

Behavior:

- Uses NHTSA API for live vehicle recall lookup.
- Can cache/upsert vehicle recalls into MongoDB.
- Can use OpenAI to rewrite and translate vehicle recall content.
- Local seed JSON currently has only 2 records and is too sparse to be a strong data source.

### Search service

Key file:

- `search-service/src/main/java/search/SearchService.java`

Behavior:

- Jetty endpoint `/search?q=...`.
- Uses Lucene index path `./lucene-index`.
- Searches title field and returns title/slug pairs.
- No complete index builder or wiring to current RecallsAtlas data was found.

## What exists in DollarsAndLife

The DollarsAndLife recall subsystem appears newer and more complete.

Key server files and folders:

- `C:\Users\perso\dollarsandlife\server\recalls\README.md`
- `C:\Users\perso\dollarsandlife\server\recalls\fda\scripts\scrape\scrapeRecalls.js`
- `C:\Users\perso\dollarsandlife\server\recalls\fda\data\fda-recalls-en-eeat.json`
- `C:\Users\perso\dollarsandlife\server\recalls\general\scripts\fetch\fetchGeneralRecalls.js`
- `C:\Users\perso\dollarsandlife\server\recalls\general\data\general-recalls-en-eeat.json`
- `C:\Users\perso\dollarsandlife\server\recalls\sync\build-optimized-recall-json.cjs`
- `C:\Users\perso\dollarsandlife\server\recalls\sync\import-recalls-to-mongo.cjs`

Key frontend files and folders:

- `C:\Users\perso\dollarsandlife\frontend\data\recalls\fda`
- `C:\Users\perso\dollarsandlife\frontend\data\recalls\general`
- `C:\Users\perso\dollarsandlife\frontend\data\recalls\cars`
- `C:\Users\perso\dollarsandlife\frontend\lib\recalls\staticRecallData.ts`
- `C:\Users\perso\dollarsandlife\frontend\lib\recalls\vehicleRecallLookup.ts`
- `C:\Users\perso\dollarsandlife\frontend\app\[lang]\recalls`
- `C:\Users\perso\dollarsandlife\frontend\app\api\recalls\vehicles\lookup\route.ts`

DollarsAndLife data counts:

- Server FDA source JSON: 366 records.
- Server general source JSON: 753 records.
- Frontend optimized FDA JSON: 366 records.
- Frontend optimized general JSON: 753 records.
- Frontend cars JSON: 2 records.

Important quality notes:

- DollarsAndLife FDA has 62 more FDA source URLs than RecallsAtlas.
- All 304 RecallsAtlas FDA source URLs are present in DollarsAndLife.
- DollarsAndLife general product recall data has 753 active records, while RecallsAtlas active general recall JSON has 0.
- Some DollarsAndLife filenames are stale or misleading. Example: a filename containing `304` currently contains 366 records.
- DollarsAndLife FDA server data has 62 records without `languages`, while frontend derived files may have different translation coverage.
- DollarsAndLife general data has 753 records, but only 653 have some derived fields such as `metaDescription` or dedupe-related fields, indicating mixed generations.

## What appears moved, deleted, or duplicated

Likely moved or copied from RecallsAtlas to DollarsAndLife:

- FDA scraping/enrichment flow.
- General CPSC fetch/enrichment flow.
- Optimized static recall JSON build flow.
- Mongo import flow.
- Vehicle recall lookup/cache concepts.
- Multilingual recall page structure.

Likely stale or incomplete in RecallsAtlas:

- General recall active generated JSON is empty even though backups exist.
- FDA data stops earlier than DollarsAndLife.
- RecallsAtlas does not have the optimized static recall data build flow seen in DollarsAndLife.
- Search service exists but is not a complete modern AI/vector search path.

Duplicated concepts:

- FDA scraper in both repos.
- General recall fetcher in both repos.
- OpenAI editorial/translation logic in both repos.
- Mongo import scripts in both repos.
- Vehicle recall API/cache logic in both repos.

Recommendation:

- Treat DollarsAndLife `server/recalls` as the best migration seed.
- Move the recall pipeline back into RecallsAtlas/RecallGraph as the canonical data platform.
- After RecallGraph is stable, make DollarsAndLife consume generated public JSON/API output from RecallGraph or remove the duplicated pipeline there.

## Current data sources and sample fields

### FDA source fields currently represented

Observed normalized/enriched fields include:

- `slug`
- `sortOrder`
- `canonicalUrl`
- `headline`
- `datePublished`
- `dateModified`
- `description`
- `keywords`
- `content`
- `sourceUrl`
- `scrapedAt`
- `pageTypeLabel`
- `disclaimer`
- `title`
- `companyAnnouncementDate`
- `companyAnnouncementDateTime`
- `fdaPublishDate`
- `fdaPublishDateTime`
- `companyName`
- `brandName`
- `brandNames`
- `productDescription`
- `productType`
- `regulatedProducts`
- `reason`
- `contacts`
- `contentCurrentAsOf`
- `rawImageSources`
- `images`
- `image`
- `languages`
- `translatedAt`
- `backupSeedVersion`
- `report_date`
- `label`
- `classification`
- `distribution`
- `terminated`
- `terminatedCheckedAt`
- `_contentHash`

Source/factual fields and AI/content fields are currently stored together. RecallGraph should preserve raw source facts separately from AI-generated summaries, classifications, embeddings, and translations.

### CPSC/general source fields currently represented

The backup API-shaped records contain:

- `RecallID`
- `RecallNumber`
- `RecallDate`
- `Description`
- `URL`
- `Title`
- `ConsumerContact`
- `LastPublishDate`
- `Products`
- `Inconjunctions`
- `Images`
- `Injuries`
- `Manufacturers`
- `Retailers`
- `Importers`
- `Distributors`
- `SoldAtLabel`
- `ManufacturerCountries`
- `ProductUPCs`
- `Hazards`
- `Remedies`
- `RemedyOptions`

DollarsAndLife general records add site fields such as:

- `slug`
- `primaryCategorySlug`
- `categorySlugs`
- `categorySources`
- `sortOrder`
- `languages`
- `metaDescription`
- `content`
- `disclaimer`

### Vehicle/NHTSA fields to preserve

The current local vehicle seed is sparse. RecallGraph should normalize richer NHTSA fields from live lookups:

- `campaignNumber`
- `manufacturer`
- `component`
- `summary`
- `consequence`
- `remedy`
- `notes`
- `reportReceivedDate`
- `potentialNumberOfUnitsAffected`
- `modelYear`
- `make`
- `model`
- `sourceUrl`
- `rawNhtsaPayload`

## Current AI and OpenAI usage

OpenAI usage found:

- `backend/fdaRecalls/scripts/scrape/scrapeRecalls.js`
- `backend/generalRecalls/scripts/fetch/fetchGeneralRecalls.js`
- `backend/fdaRecalls/scripts/translate/recallTranslate.js`
- `frontend/lib/cars/rewriteRecall.ts`
- `frontend/lib/cars/translateRecall.ts`
- `frontend/app/api/cars/lookup/route.ts`
- `frontend/app/api/cars/translate/route.ts`
- equivalent recall scripts under `C:\Users\perso\dollarsandlife\server\recalls`

Important finding:

- FDA scraping and OpenAI editorial enrichment are mixed in the same script.
- General CPSC fetching is better because it supports `--source-only`, but still imports OpenAI and performs enrichment in the same main fetch script when not in source-only mode.
- Vehicle lookup can optionally call OpenAI for rewriting and translations.

No current evidence of:

- Embeddings.
- pgvector.
- Pinecone.
- LangChain.
- LlamaIndex.
- Vector similarity search.
- Recall graph/link builder.
- Search evaluation set.

Recommended separation:

```text
Raw ingest job
  -> fetch/scrape factual source records only
  -> store raw source payload and source HTML/API metadata
  -> no OpenAI calls

Normalizer job
  -> convert raw records into canonical recall/product/company/hazard records
  -> deterministic cleaning and validation
  -> no generative content required

AI enrichment job
  -> summaries, translations, hazard labels, category labels
  -> citation-backed outputs that point to source fields
  -> explicit model/version/prompt/run tracking

Embedding job
  -> produce embeddings from source-backed canonical text
  -> store vectors separately

Similarity/graph job
  -> compute related recalls and duplicate candidates
  -> store scored links with reasons and provenance
```

## Current database and schema

### RecallsAtlas database

MongoDB is the current database layer.

Database:

- `recallsatlas`

Known collections:

- `recalls`
- `generalRecalls`
- `cars`

Important files:

- `backend/database/mongodb.js`
- `backend/scripts/mongodb.js`
- `backend/scripts/sync/importCleanRecallCollections.js`
- `backend/carsRecalls/scripts/sync/carsJsonToMongo.js`
- frontend API/list files that directly query MongoDB.

The current schema is document-oriented and recall-type-specific. It is workable for a listing site, but not ideal for RecallGraph because AI enrichment, raw source provenance, embeddings, graph links, and evaluation should be tracked as separate artifacts.

### DollarsAndLife database

MongoDB import target:

- database `dollarsandlife_data`
- collections `recalls_fda`, `recalls_general`, `recalls_cars`

Key file:

- `C:\Users\perso\dollarsandlife\server\recalls\sync\import-recalls-to-mongo.cjs`

Indexes include:

- `slug`
- `id`
- `brandName`
- `productType`
- `recallDate`
- `datePublished`

## Recommended RecallGraph architecture

Recommended practical architecture:

```text
Source connectors
  FDA scraper, CPSC API fetcher, NHTSA API fetcher

Raw storage
  data/raw/{source}/{run_id}.json
  raw source URLs, timestamps, source payloads, source HTML/API records

Normalizer
  deterministic source-specific parsers
  canonical recall/product/company/hazard/category records

Database import
  Postgres plus pgvector recommended for RecallGraph
  MongoDB can remain temporarily as a legacy/import bridge

AI enrichment
  summaries, translations, classification, citation-backed answers
  model/prompt/run metadata saved separately from raw facts

Embedding generation
  canonical recall text to vector rows
  separate from scrape and normalize

Similarity and graph builder
  duplicate candidates
  related recalls
  company/product/hazard clusters
  scored links with explanation/provenance

API layer
  Next.js Route Handlers or separate Node API
  search, facets, recall detail, related recalls, trends, ingestion status

Frontend
  RecallGraph dashboard
  semantic search
  detail pages
  related recalls graph
  company/product/hazard trend pages
  ingestion/evaluation dashboard

Evaluation
  query set
  expected relevant results
  search quality metrics
  regression report

Deployment
  Docker Compose on VPS
  web app, worker, Postgres/pgvector, Redis queue, optional legacy Mongo bridge
```

For a portfolio-grade AI/data project, Postgres plus pgvector is a better long-term core than only MongoDB. MongoDB can still be used temporarily to import existing records and compare old/new outputs.

## Recommended database schema

Suggested Postgres/pgvector schema:

### `sources`

- `id`
- `name`
- `source_type`: `fda`, `cpsc`, `nhtsa`, etc.
- `base_url`
- `trust_level`
- `created_at`

### `ingestion_runs`

- `id`
- `source_id`
- `run_type`: `raw_fetch`, `normalize`, `ai_enrich`, `embed`, `graph_build`
- `started_at`
- `finished_at`
- `status`
- `command`
- `record_count`
- `error_count`
- `metadata_json`

### `recalls`

- `id`
- `source_id`
- `source_record_id`
- `source_url`
- `slug`
- `title`
- `description`
- `recall_date`
- `published_at`
- `fetched_at`
- `last_seen_at`
- `status`
- `recall_type`: `fda`, `product`, `vehicle`
- `raw_record_json`
- `normalized_record_json`
- `created_at`
- `updated_at`

### `companies`

- `id`
- `name`
- `normalized_name`
- `website`
- `country`
- `metadata_json`

### `products`

- `id`
- `name`
- `brand_name`
- `product_type`
- `model`
- `upc`
- `category_id`
- `metadata_json`

### `recall_events`

- `id`
- `recall_id`
- `company_id`
- `product_id`
- `event_type`: `announcement`, `termination_check`, `update`, `translation`, `classification`
- `event_date`
- `details_json`

### `hazards`

- `id`
- `name`
- `normalized_name`
- `description`
- `parent_hazard_id`

### `categories`

- `id`
- `name`
- `slug`
- `parent_category_id`
- `source`

### Join tables

- `recall_companies`
- `recall_products`
- `recall_hazards`
- `recall_categories`

### `embeddings`

- `id`
- `recall_id`
- `embedding_scope`: `title`, `summary`, `full_source`, `hazard_product`
- `model`
- `dimensions`
- `text_hash`
- `embedding vector`
- `created_at`

### `recall_links` / `related_recalls`

- `id`
- `source_recall_id`
- `target_recall_id`
- `link_type`: `duplicate_candidate`, `same_company`, `same_hazard`, `same_product`, `semantic_related`
- `score`
- `reason`
- `method`
- `run_id`
- `created_at`

### `ai_enrichments`

- `id`
- `recall_id`
- `run_id`
- `enrichment_type`: `summary`, `classification`, `translation`, `qa_context`
- `model`
- `prompt_version`
- `input_hash`
- `output_json`
- `citations_json`
- `created_at`

### `evaluation_queries`

- `id`
- `query`
- `intent`
- `expected_recall_ids`
- `filters_json`
- `notes`
- `created_at`

### `evaluation_runs`

- `id`
- `run_id`
- `search_method`
- `metrics_json`
- `results_json`
- `created_at`

## Current frontend reuse and new RecallGraph pages

Reusable current frontend:

- Recall listing pages and pagination patterns.
- Recall detail page structure.
- Brand/category/year browse pages.
- Vehicle lookup UI/API concepts.
- Language handling and translation display.
- Existing metadata/SEO helpers.

Pages to add or rebuild for RecallGraph:

- `/dashboard`: high-level recall counts, source freshness, hazard trends, company trends.
- `/search`: semantic search plus keyword/facet filters.
- `/recalls/[slug]`: upgraded citation-backed detail page.
- `/recalls/[slug]/graph`: related recalls graph and duplicate candidates.
- `/companies/[company]`: company recall history, hazard mix, product clusters.
- `/products/[product]`: product recall trend page.
- `/hazards/[hazard]`: hazard category page.
- `/ingestion`: run status, source freshness, failures, record counts.
- `/evaluation`: search quality dashboard, query set, precision/recall metrics.

## Data quality findings

RecallsAtlas data quality issues:

- General active dataset is empty even though large backups exist.
- FDA dataset is older than DollarsAndLife by 62 records.
- FDA raw facts and AI-generated fields are mixed in the same document.
- Some fields are inconsistent across generations.
- `sourcePublishedAt` is missing from the active FDA records checked.
- `sourceTables` is absent or empty in active FDA records checked.
- 51 of 304 FDA records have no images.
- 1 of 304 FDA records is missing `productType`.
- Vehicle seed data has only 2 records and lacks rich NHTSA fields.
- Multiple Mongo connection helpers exist and should be consolidated later.
- Java/Lucene search is separate from the current data flow and may be stale.

DollarsAndLife data quality issues:

- Some filenames no longer match actual counts.
- FDA server data has 366 records, but translation/language coverage differs between source and derived files.
- General data has 753 records, but some derived metadata exists only on 653 records.
- Current data is optimized for static site display, not provenance, embeddings, evaluation, or graph analytics.

Recommended cleaning and normalization:

- Preserve raw source payloads before enrichment.
- Normalize all dates to ISO timestamps plus display dates.
- Normalize company names and brand names.
- Normalize product types and categories.
- Extract hazards into structured rows.
- Deduplicate by source URL, source record ID, recall number, company/product/date similarity, and embedding similarity.
- Store images as separate media rows or structured JSON with source URL, local path, alt text, width, height, and fetch status.
- Split generated summaries/translations from source facts.
- Track every AI output with model, prompt version, input hash, and citations.

## AI and data features to add

Practical MVP features using the current data:

- Embeddings with pgvector.
- Semantic recall search.
- Related recall matching.
- Duplicate detection.
- Company/product clustering.
- Hazard/category classification.
- Statistics dashboard.
- Citation-backed AI summaries.
- Evaluation set with search quality metrics.

Good first embedding text:

- title/headline
- company/brand/product
- product description
- reason/hazard
- remedy or consumer action
- source description/content excerpt

Do not embed only AI-generated summaries. Use source-backed canonical text so results remain auditable.

## MVP implementation plan

Recommended MVP scope:

1. Create a new RecallGraph data folder/module inside RecallsAtlas without renaming the whole project yet.
2. Import the better DollarsAndLife FDA and general source JSON into RecallsAtlas as migration input.
3. Add raw-source storage conventions:
   - `backend/recallgraph/data/raw/fda`
   - `backend/recallgraph/data/raw/cpsc`
   - `backend/recallgraph/data/raw/nhtsa`
4. Add deterministic normalizers for FDA, CPSC, and NHTSA into canonical JSON.
5. Add Postgres plus pgvector schema and Docker Compose for local/VPS deployment.
6. Load normalized recalls into Postgres.
7. Generate embeddings in a separate job.
8. Build semantic search API.
9. Build RecallGraph search page and upgraded recall detail page.
10. Add related recall matching by vector similarity plus shared company/product/hazard rules.
11. Add dashboard statistics.
12. Add a small evaluation query set and CLI report.

MVP should avoid:

- Renaming the project immediately.
- Deleting current Mongo flow.
- Removing OpenAI logic.
- Changing production deployment before the new pipeline is proven.
- Trying to build a full graph database before basic pgvector/search/evaluation works.

## Advanced implementation plan

After MVP:

- Add source freshness monitors and ingestion status UI.
- Add scheduled workers for FDA/CPSC/NHTSA updates.
- Add graph visualization with filters by hazard/company/product/category.
- Add duplicate review queue with accept/reject labels.
- Add company/product clustering reports.
- Add alerting for new high-severity recalls.
- Add citation-backed Q&A over selected recall records.
- Add multilingual enrichment as a separate job.
- Add admin review for AI classifications.
- Add historical trend analysis by source/category/hazard/company.
- Add exportable datasets and public methodology page.
- Add benchmark reports comparing keyword search, vector search, hybrid search, and reranked search.

## Deployment plan for VPS/Docker

Recommended Docker Compose services:

- `web`: Next.js RecallGraph frontend/API.
- `worker`: Node worker for ingestion, normalization, AI enrichment, embeddings, and graph builds.
- `postgres`: Postgres with pgvector extension.
- `redis`: optional queue/cache for background jobs.
- `mongo`: optional temporary legacy import bridge only if needed.
- `nginx` or `caddy`: reverse proxy and TLS if not already handled elsewhere.

Recommended deployment sequence:

1. Keep current production deployment unchanged.
2. Build RecallGraph locally against migrated data.
3. Add Docker Compose for staging on VPS.
4. Backfill data into Postgres/pgvector.
5. Verify search, detail pages, dashboard, and evaluation.
6. Point a staging subdomain at RecallGraph.
7. Cut over production only after user approval.

No current RecallsAtlas cron file was found. Existing npm scripts could be scheduled later through cron, systemd timers, GitHub Actions, or a queue worker, but scheduling should wait until ingestion and enrichment are separated.

## Exact files that need to be changed later

Do not change these until implementation is approved.

RecallsAtlas files likely to change:

- `backend/fdaRecalls/scripts/scrape/scrapeRecalls.js`
- `backend/generalRecalls/scripts/fetch/fetchGeneralRecalls.js`
- `backend/fdaRecalls/scripts/translate/recallTranslate.js`
- `backend/scripts/sync/importCleanRecallCollections.js`
- `backend/scripts/audit/recallContentAudit.js`
- `backend/database/mongodb.js`
- `backend/scripts/mongodb.js`
- `backend/carsRecalls/scripts/sync/carsJsonToMongo.js`
- `frontend/lib/recalls-list-data.ts`
- `frontend/lib/general-recalls-data.ts`
- `frontend/lib/general-recalls-list-data.ts`
- `frontend/lib/recallCategoryFilter.ts`
- `frontend/lib/cars/fetchCarRecalls.ts`
- `frontend/lib/cars/rewriteRecall.ts`
- `frontend/lib/cars/translateRecall.ts`
- `frontend/app/api/recalls/route.ts`
- `frontend/app/api/general-recalls/route.ts`
- `frontend/app/api/cars/lookup/route.ts`
- `frontend/app/api/cars/translate/route.ts`
- `frontend/app/recalls/[slug]/page.tsx`
- `frontend/app/general-recalls/[slug]/page.tsx`
- `frontend/components/fda/RecallDetail.tsx`
- `search-service/src/main/java/search/SearchService.java`

Likely new RecallsAtlas files/folders:

- `backend/recallgraph`
- `backend/recallgraph/data/raw`
- `backend/recallgraph/data/normalized`
- `backend/recallgraph/ingest`
- `backend/recallgraph/normalize`
- `backend/recallgraph/enrich`
- `backend/recallgraph/embed`
- `backend/recallgraph/graph`
- `backend/recallgraph/evaluation`
- `db/schema.sql`
- `db/migrations`
- `docker-compose.yml`
- `frontend/app/search`
- `frontend/app/dashboard`
- `frontend/app/ingestion`
- `frontend/app/evaluation`
- `frontend/app/companies/[company]`
- `frontend/app/products/[product]`
- `frontend/app/hazards/[hazard]`

DollarsAndLife files to use as migration references:

- `C:\Users\perso\dollarsandlife\server\recalls\README.md`
- `C:\Users\perso\dollarsandlife\server\recalls\fda\scripts\scrape\scrapeRecalls.js`
- `C:\Users\perso\dollarsandlife\server\recalls\fda\data\fda-recalls-en-eeat.json`
- `C:\Users\perso\dollarsandlife\server\recalls\general\scripts\fetch\fetchGeneralRecalls.js`
- `C:\Users\perso\dollarsandlife\server\recalls\general\data\general-recalls-en-eeat.json`
- `C:\Users\perso\dollarsandlife\server\recalls\sync\build-optimized-recall-json.cjs`
- `C:\Users\perso\dollarsandlife\server\recalls\sync\import-recalls-to-mongo.cjs`
- `C:\Users\perso\dollarsandlife\frontend\lib\recalls\staticRecallData.ts`
- `C:\Users\perso\dollarsandlife\frontend\lib\recalls\vehicleRecallLookup.ts`
- `C:\Users\perso\dollarsandlife\frontend\data\recalls`
- `C:\Users\perso\dollarsandlife\frontend\app\[lang]\recalls`

## Exact commands and scripts currently available

### RecallsAtlas backend

From `backend/package.json`:

```powershell
npm test
npm run fetch-fda-recalls
npm run fetch-fda-recalls:10
npm run fetch-general-recalls
npm run fetch-general-recalls:20
npm run fetch-general-recalls:source-only
npm run reset-generated-recalls
npm run restore-fda-backup-seed
npm run restore-fda-seed-images
npm run audit:recall-content
npm run import-recalls-clean
npm run import-recalls-clean:replace
```

### RecallsAtlas frontend

From `frontend/package.json`:

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm run deploy:next
```

### RecallsAtlas search service

From `search-service/pom.xml`, Maven/Java project:

```powershell
mvn package
java -cp target/classes search.SearchService
```

Exact generated jar/run command may need verification during implementation.

### DollarsAndLife recall scripts

Relevant scripts observed in DollarsAndLife server package:

```powershell
npm run audit:recalls
npm run audit:recalls:fda
npm run audit:recalls:general
npm run build:recalls:optimized
npm run build:recalls:optimized:dry-run
npm run build:recalls:optimized:multilingual
npm run build:recalls:optimized:multilingual:dry-run
npm run import:recalls
npm run import:recalls:dry-run
npm run import:recalls:fda
npm run import:recalls:general
npm run recalls:cars:sync
npm run recalls:fda:scrape
npm run recalls:fda:scrape:10
npm run recalls:fda:check-terminated
npm run recalls:fda:check-terminated:dry-run
npm run recalls:fda:translate
npm run recalls:fda:translate:dry-run
npm run recalls:fda:update
npm run recalls:general:fetch
npm run recalls:general:fetch:20
npm run recalls:general:fetch:source-only
npm run recalls:general:translate
npm run recalls:general:translate:dry-run
npm run recalls:general:update
```

## Risks

- Scraper and AI enrichment are mixed, so source facts and generated content can be hard to separate after the fact.
- Moving too quickly to rename/deploy could break the existing RecallsAtlas surface before RecallGraph is proven.
- DollarsAndLife currently has the better data, but keeping two independent recall pipelines will cause drift.
- Current general recall state in RecallsAtlas is misleading because backups exist but active generated data is empty.
- AI summaries need explicit citations and provenance to avoid blending generated claims with official recall facts.
- Date fields and category fields vary across record generations.
- Some frontend pages depend on Mongo while others depend on static JSON loaders, so data flow is inconsistent.
- Existing Java/Lucene search may distract from the better pgvector/hybrid-search direction unless intentionally retired or isolated.
- VPS/Docker introduction should be staged to avoid production deployment churn.

## Questions before implementation

1. Should RecallGraph live inside the current RecallsAtlas repository first, or do you want a new repository after this audit?
2. Should RecallsAtlas production remain online unchanged while RecallGraph is built behind a staging route/subdomain?
3. Should DollarsAndLife stop owning recall ingestion once RecallGraph has imported its current data?
4. Do you want Postgres plus pgvector as the long-term database, with MongoDB only as a migration bridge?
5. Which source should be the first MVP priority: FDA, CPSC/general product recalls, or NHTSA vehicle recalls?
6. Should the initial RecallGraph UI be public-facing, admin/portfolio-facing, or both?
7. Should OpenAI enrichment keep using the current models/prompts initially, or should prompts be redesigned during the split?
8. Do you want historical CPSC backup data from `generalRecallsBackup/testing2.json` imported, or only the cleaner DollarsAndLife 753-record dataset first?
9. Should multilingual recall content remain in scope for MVP, or move to phase 2?
10. What VPS/domain should be used for staging when deployment is approved?

## Recommended next step

Before implementation, approve one of these directions:

1. MVP foundation in RecallsAtlas: add RecallGraph raw/normalized data modules, pgvector schema, and import the better DollarsAndLife data.
2. Data rescue first: restore/compare RecallsAtlas active data from DollarsAndLife and backups, without changing frontend behavior.
3. Scraper split first: separate raw FDA/CPSC ingestion from OpenAI enrichment while keeping the current Mongo/frontend flow.
