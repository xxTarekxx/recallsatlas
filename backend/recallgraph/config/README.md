# RecallGraph Config

RecallGraph reads configuration from environment variables. Do not put secrets in this folder.

Required for Postgres-backed jobs:

- `RECALLGRAPH_DATABASE_URL`

Optional:

- `RECALLGRAPH_DATABASE_SSL=1`
- `RECALLGRAPH_EMBEDDING_PROVIDER=mock`
- `RECALLGRAPH_EMBEDDING_PROVIDER=openai`
- `RECALLGRAPH_OPENAI_EMBEDDING_MODEL=text-embedding-3-small`
- `RECALLGRAPH_EMBEDDING_DIMENSIONS=1536`
- `OPENAI_API_KEY` when using OpenAI embeddings

The default embedding provider is deterministic mock embeddings so local normalization, imports, evaluation, and UI development can run without API keys.
