# RecallGraph Database

RecallGraph uses Postgres with pgvector for the MVP data store. The existing RecallsAtlas MongoDB flow remains untouched.

## Local database

From the repository root:

```powershell
docker compose -f docker-compose.recallgraph.yml up -d
```

Set the backend and frontend environment variable:

```powershell
$env:RECALLGRAPH_DATABASE_URL="postgres://recallgraph:recallgraph_dev_password@localhost:54329/recallgraph"
```

Then run from `backend`:

```powershell
npm run recallgraph:db:migrate
npm run recallgraph:import
npm run recallgraph:embed
npm run recallgraph:graph
```

The first migration creates `sources`, `ingestion_runs`, `recalls`, `recall_embeddings`, `related_recalls`, `evaluation_queries`, and `evaluation_runs`.
