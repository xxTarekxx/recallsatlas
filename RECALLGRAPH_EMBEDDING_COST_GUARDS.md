# RecallGraph Embedding Cost Guards

This document describes the local safeguards that prevent accidental RecallGraph embedding cost.

## Where Embeddings Happen

Record embeddings are generated only by:

```bash
cd backend
npm run recallgraph:embed
```

The script is:

```text
backend/recallgraph/src/scripts/generate-embeddings.js
```

Search query embeddings are generated only through the RecallGraph search API path:

```text
frontend/app/api/recallgraph/search/route.ts
frontend/lib/recallgraph/server/data.ts
frontend/lib/recallgraph/server/embeddings.ts
```

React pages and components do not call OpenAI directly. RecallGraph homepage, dashboard, and detail
pages do not generate record embeddings on page load.

## What Text Is Embedded

Record embeddings use only the Postgres `recalls.canonical_text` field, which comes from
`canonicalTextForEmbedding` during normalized import.

Embedding scope is fixed to:

```text
canonical
```

Each embedding row records:

- `recall_id`
- `embedding_scope`
- `model`
- `dimensions`
- `text_hash`

## What Is Never Embedded

The embedding script does not select or embed:

- `raw_record_json`
- `normalized_record_json`
- full source JSON
- HTML payloads
- image payloads or image JSON
- raw FDA/CPSC source records
- scraping output

The script validates canonical text before embedding and fails a record if the input appears to be
HTML, JSON, raw payload data, or above the hard safety limit.

## Unchanged Records Are Skipped

Before calling the embedding provider, the script calculates a hash of the final clean embedding
input and checks:

```text
recall_id + embedding_scope + model + text_hash
```

If that exact combination already exists, the record is skipped and no provider call is made.

When canonical text changes, the script embeds the changed text once and replaces older embeddings
for the same `recall_id + embedding_scope + model` after the new provider call succeeds.

## Force Re-Embedding

Full re-embedding is blocked by default.

This does not work by itself:

```bash
npm run recallgraph:embed -- --force
```

To force re-embedding, explicitly set:

```bash
RECALLGRAPH_ALLOW_FORCE_EMBED=true
npm run recallgraph:embed -- --force
```

Use force only when intentionally replacing embeddings for the same model and scope.

## Character Limits

Per-record input is capped by:

```text
RECALLGRAPH_MAX_EMBED_CHARS_PER_RECORD
```

Default:

```text
6000
```

If canonical text is longer than the configured max, it is truncated and the run logs
`truncated_inputs`.

A separate hard guard prevents accidental huge payloads:

```text
RECALLGRAPH_HARD_MAX_EMBED_CHARS_PER_RECORD
```

Default:

```text
24000
```

Inputs above the hard guard fail and are not embedded.

## Run Limits

Use a CLI limit for test runs:

```bash
npm run recallgraph:embed -- --limit=5
```

Or set:

```text
RECALLGRAPH_MAX_EMBEDDINGS_PER_RUN
```

If both are set, the smaller limit wins.

## Dry Run

Preview the run without provider calls or database writes:

```bash
npm run recallgraph:embed -- --dry-run
```

Dry-run output includes:

- total recalls checked
- skipped unchanged
- records that would embed
- deferred records due to run limits
- truncation count
- failure count
- estimated tokens and cost if configured

## Cost Estimate

The script estimates tokens from character count. For OpenAI cost estimates, set:

```text
RECALLGRAPH_OPENAI_EMBEDDING_USD_PER_1M_TOKENS
```

This keeps pricing configurable instead of hardcoding a value that may become stale.

## Query Embedding Cache

Search query embeddings use an in-memory server cache keyed by:

```text
provider + model + normalized query
```

The cache stores embeddings only, not secrets. It prevents repeated identical query submissions from
calling the provider again while the server process is warm.

The cache size can be configured with:

```text
RECALLGRAPH_QUERY_EMBEDDING_CACHE_SIZE
```

Default:

```text
128
```

Search query input is capped by:

```text
RECALLGRAPH_MAX_QUERY_EMBED_CHARS
```

Default:

```text
1000
```
