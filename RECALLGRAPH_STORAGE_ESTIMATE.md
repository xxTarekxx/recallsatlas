# RecallGraph Storage Estimate

Generated: 2026-06-20

Scope: local estimation only. No production deployment, production database change, Docker change, or VPS mutation was performed.

## Short answer

0.5 GB is enough for the current RecallGraph dataset, but it is not enough for meaningful growth under the current schema.

The current local Postgres database is 82,246,679 bytes, about 78.4 MiB, for:

- 1,119 recalls
- 1,119 embeddings
- 6,527 related recall links

At the current measured storage density, a 500 MB database quota becomes tight around 5,400 recalls if leaving a 20% operational buffer, and reaches the full quota around 6,800 recalls. A 10,000-recall database is estimated at about 0.74 GB, so the free tier should be treated as a short trial/dev option rather than the production target.

## Provider quota context

- Neon docs currently describe the Free plan as 0.5 GB storage per project: https://neon.tech/docs/introduction/plans
- Supabase docs currently describe Free Plan database read-only behavior at 500 MB database size: https://supabase.com/docs/guides/platform/database-size

Use the lower/conservative interpretation of 500 MB when planning.

## Current JSON file sizes

| File | Bytes | MiB |
| --- | ---: | ---: |
| `backend/recallgraph/data/imports/dollarsandlife/fda/fda-recalls-en-eeat.json` | 22,390,463 | 21.353 |
| `backend/recallgraph/data/imports/dollarsandlife/general/general-recalls-en-eeat.json` | 35,840,447 | 34.180 |
| `backend/recallgraph/data/normalized/recalls.normalized.json` | 63,581,542 | 60.636 |
| `backend/recallgraph/data/evaluation/latest-evaluation-report.json` | 148,703 | 0.142 |
| `backend/recallgraph/data/evaluation/evaluation-queries.json` | 4,278 | 0.004 |
| `backend/recallgraph/data/normalized/normalization-report.json` | 669 | 0.001 |
| Total | 121,966,102 | 116.315 |

Notes:

- Source import JSON total is 58,230,910 bytes, or about 55.5 MiB.
- Normalized JSON is 63,581,542 bytes, or about 60.6 MiB.
- These files are not the same as managed Postgres storage, but they explain why the `recalls` table is larger than the embeddings alone.

## Local Postgres measurement

Local Postgres was available through the local RecallGraph database container. The backend `.env` did not include `RECALLGRAPH_DATABASE_URL`, so the measurement used the local dev connection from `docker-compose.recallgraph.yml`. No production database was queried.

Database total:

| Metric | Bytes | MiB |
| --- | ---: | ---: |
| `pg_database_size(current_database())` | 82,246,679 | 78.4 |

Relation sizes:

| Relation | Rows | Total bytes | MiB | Notes |
| --- | ---: | ---: | ---: | --- |
| `recalls` | 1,119 | 51,355,648 | 49.0 | Includes raw and normalized JSONB plus indexes/toast |
| `recall_embeddings` | 1,119 | 19,865,600 | 18.9 | Includes `vector(1536)` and IVFFLAT/index overhead |
| `related_recalls` | 6,527 | 2,629,632 | 2.5 | Related-link rows and indexes |
| Other RecallGraph tables | 4 rows plus empty eval tables | 114,688 | 0.1 | `sources`, `ingestion_runs`, empty evaluation tables |

Average row observations:

| Metric | Observed average |
| --- | ---: |
| Recall row | 42,409 bytes |
| Raw JSONB column | 19,460 bytes |
| Normalized JSONB column | 20,383 bytes |
| Canonical text | 643 bytes |
| Embedding vector column | 6,148 bytes |
| Embedding row | 6,311 bytes |
| Related recall row | 172 bytes |

The current embedding model rows are local mock embeddings, but they are 1536-dimensional. A real OpenAI `text-embedding-3-small` vector has the same dimensional storage footprint when stored as `vector(1536)`.

## 1536-dimensional embedding estimate

Assumption: `text-embedding-3-small`, 1536 dimensions, one embedding per recall.

Raw vector payload:

```text
1536 dimensions * 4 bytes per float = 6,144 bytes
```

Observed `pg_column_size(embedding)` is 6,148 bytes, which is effectively the raw vector plus small pgvector overhead.

For the current 1,119 recalls:

| Item | Bytes | MiB |
| --- | ---: | ---: |
| Raw vector payload only | 6,875,136 | 6.6 |
| Full `recall_embeddings` relation with indexes | 19,865,600 | 18.9 |

The embedding index roughly triples the raw vector-only footprint in the current local database. The larger total database size mostly comes from recall JSONB storage plus indexes.

## Growth projections

Projection method:

- Current measured DB density: about 73,500 bytes per recall, including database overhead.
- Current measured relation density: about 65,997 bytes per recall for the main RecallGraph tables.
- Related links scale from the current ratio: 6,527 links / 1,119 recalls = about 5.83 links per recall.
- Estimates are linear and should be treated as planning ranges, not exact bills.

| Recall count | Estimated related links | Raw 1536-vector payload | Embeddings table plus index | Current-schema DB estimate |
| ---: | ---: | ---: | ---: | ---: |
| 1,119 | 6,527 | 6.6 MiB | 18.9 MiB | 78.4 MiB / 0.08 GB |
| 10,000 | 58,329 | 58.6 MiB | 169.3 MiB | 701.0 MiB / 0.74 GB |
| 50,000 | 291,644 | 293.0 MiB | 846.5 MiB | 3,504.8 MiB / 3.68 GB |
| 100,000 | 583,289 | 585.9 MiB | 1,693.1 MiB | 7,009.5 MiB / 7.35 GB |

## Is 0.5 GB enough?

Yes for the current 1,119-recall dataset.

Using a conservative 500,000,000-byte quota:

- Current measured DB size: 82,246,679 bytes
- Current quota usage: about 16.4%
- Approximate remaining quota: 417,753,321 bytes
- Full-quota estimate: about 6,800 recalls
- Safer 80%-quota estimate: about 5,400 recalls

## When does 0.5 GB become too small?

With the current schema, plan for 0.5 GB to become too small around 5,000 to 7,000 recalls.

The practical cutoff is closer to 5,000 to 5,500 recalls if you want room for:

- Postgres vacuum and bloat
- index rebuilds
- evaluation runs
- future source fields
- more than one embedding model
- temporary import/migration overhead
- provider-specific branch or storage accounting

By 10,000 recalls, the current schema is estimated at roughly 0.74 GB, so a 0.5 GB free tier is expected to be over capacity.

## Recommendation

Use a free 0.5 GB managed Postgres tier only for initial proof-of-production, smoke testing, or demo traffic with the current dataset. For real production semantic search, choose a paid managed Postgres/pgvector plan or a provider tier with at least 2 GB available, preferably more if RecallGraph will ingest beyond a few thousand records.

If keeping costs low is critical, storage can be reduced later by:

- moving raw source JSON out of Postgres into object storage
- storing only normalized public fields in Postgres
- keeping one active embedding model at a time
- using smaller vectors only if the model/search quality tradeoff is acceptable
- revisiting vector index type and parameters after real query/load testing
