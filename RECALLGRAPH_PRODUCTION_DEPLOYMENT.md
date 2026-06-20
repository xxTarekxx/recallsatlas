# RecallGraph Production Deployment Note

Date: 2026-06-19

## Current VPS Discovery

- SSH user observed: `root`
- Hostname observed: `ubuntu`
- Disk: `/dev/vda1` has about 207 GB available.
- Memory: about 7.7 GiB total, about 5.3 GiB available.
- Node: `v20.20.2`
- npm: `10.8.2`
- Docker tooling: `docker`, `docker-compose`, `podman`, and `nerdctl` were not found.
- Web server: Apache is active. Nginx and Caddy were not active from the checked commands.
- RecallsAtlas domain: `recallsatlas.com` and `www.recallsatlas.com`
- Reverse proxy: Apache proxies HTTPS traffic for RecallsAtlas to `http://127.0.0.1:3001/`.
- Current RecallsAtlas live app path: `/var/www/html/recallsatlas`
- Current RecallsAtlas backend path: `/var/www/html/recallsatlas/backend`
- Current process manager: PM2
- Current PM2 app name: `recallsatlas`
- Current PM2 cwd: `/var/www/html/recallsatlas`
- Current PM2 command: `npm start`
- Existing env file locations observed, without reading values:
  - `/var/www/html/recallsatlas/.env`
  - `/var/www/html/recallsatlas/backend/.env`
  - `/var/www/html/recallsatlas/backend/scripts/.env`
- Existing `/recalls` and `/general-recalls` returned HTTP 200 locally from the VPS on port 3001 before any server changes.
- Ports `54329` and `6389` were not listening during discovery.

No VPS mutation was performed during discovery.

## Production Semantic Search Deployment

Deployment date: 2026-06-20

Approved server change:

- Docker Engine and Docker Compose plugin were installed on Ubuntu 22.04 from the official Docker apt repository.
- Native Postgres was not installed.
- Apache configuration was not changed.
- DNS was not changed.
- Only PM2 app `recallsatlas` was reloaded.
- No unrelated PM2 apps were restarted.
- No Docker prune, remove, `down`, or global cleanup commands were run.

Docker versions after install:

- Docker Engine: `29.6.0`
- Docker Compose: `v5.1.4`

RecallGraph production DB:

- Docker Compose project: `recallgraph-prod`
- Compose file: `/var/www/html/recallsatlas/docker-compose.recallgraph.prod.yml`
- Container: `recallgraph-prod-postgres`
- Image: `pgvector/pgvector:pg16`
- Volume: `recallgraph_prod_pgdata`
- Host bind: `127.0.0.1:54329->5432/tcp`
- Redis: omitted because current RecallGraph scripts do not require it.
- VPS-only env file: `/var/www/html/recallsatlas/.env.recallgraph.prod`

Runtime environment:

- `RECALLGRAPH_DATABASE_URL` is set only in VPS env files.
- `RECALLGRAPH_EMBEDDING_PROVIDER=openai`
- `RECALLGRAPH_OPENAI_EMBEDDING_MODEL=text-embedding-3-small`
- `RECALLGRAPH_EMBEDDING_DIMENSIONS=1536`
- `OPENAI_API_KEY` is present in the secure VPS environment and was not printed or committed.

Production pipeline:

```bash
cd /var/www/html/recallsatlas
docker compose --env-file .env.recallgraph.prod -p recallgraph-prod -f docker-compose.recallgraph.prod.yml up -d

cd /var/www/html/recallsatlas/backend
npm ci --omit=dev
npm run recallgraph:db:migrate
npm run recallgraph:import
npm run recallgraph:embed
npm run recallgraph:graph
npm run recallgraph:evaluate
npm run recallgraph:db:status
```

Results:

- Migration passed; pgvector is enabled and `recall_embeddings.embedding` is `vector(1536)`.
- Import passed with 1,119 recalls.
- Embeddings passed with 1,119 OpenAI embeddings using `text-embedding-3-small`.
- Related graph passed with 8,952 links:
  - 5,505 deterministic rule links.
  - 3,447 vector-similarity links.
- Evaluation passed with `pgvector-openai-text-embedding-3-small`.
  - 18 queries.
  - 18 queries with results.
  - 0 zero-result queries.

Production health:

```json
{
  "ok": true,
  "database": "ok",
  "embeddingProvider": "openai",
  "recallCount": 1119,
  "embeddingCount": 1119,
  "relatedLinkCount": 8952,
  "evaluationQueryCount": 18
}
```

Production search now returns:

- `mode=semantic`
- `fallback=false`
- `embeddingProvider=openai`

## Current Deployment Method

The tracked frontend deployment script uses a local build and uploads production Next.js artifacts to `/var/www/html/recallsatlas`, then restarts only the PM2 app named `recallsatlas`.

The tracked backend deployment script resets its remote backend target directory and is not appropriate for RecallGraph production work without narrowing its scope.

## Deployment Plan

Current deployed path:

1. Keep Apache proxying RecallsAtlas to PM2 app `recallsatlas` on `127.0.0.1:3001`.
2. Run RecallGraph Postgres/pgvector in Docker project `recallgraph-prod`.
3. Bind Postgres to localhost only.
4. Deploy frontend through the existing RecallsAtlas PM2 path:
   ```bash
   cd /var/www/html/recallsatlas
   npm ci
   npm run build
   pm2 reload recallsatlas --update-env
   ```
5. Verify RecallGraph and legacy routes over HTTPS.

## Rollback Plan

Production app state should be recorded immediately before future deployments:

```bash
pm2 list
docker ps 2>/dev/null || true
```

If a deploy fails after the frontend changes:

1. Restore the prior deployed RecallsAtlas frontend artifact or redeploy the previous known-good local build.
2. Reload only the RecallsAtlas PM2 app:
   ```bash
   pm2 reload recallsatlas --update-env
   ```
3. Leave the RecallGraph DB running if the frontend rollback succeeds, because it is isolated and not publicly exposed.
4. If RecallGraph services must be stopped, stop only the RecallGraph production compose project:
   ```bash
   cd /var/www/html/recallsatlas
   docker compose --env-file .env.recallgraph.prod -p recallgraph-prod -f docker-compose.recallgraph.prod.yml stop
   ```

To restart only RecallGraph Postgres:

```bash
cd /var/www/html/recallsatlas
docker compose --env-file .env.recallgraph.prod -p recallgraph-prod -f docker-compose.recallgraph.prod.yml up -d
```

Do not use `docker compose down`, Docker prune commands, Docker remove commands, or global PM2 restarts without explicit approval.

## Current Status

RecallGraph production semantic search is live and verified.

- Production DB: `database=ok`
- Embedding provider: `openai`
- Search mode: `semantic`
- Static fallback: disabled during healthy DB/OpenAI operation
- Existing `/recalls` and `/general-recalls`: verified 200

If RecallGraph DB becomes unavailable, the UI and APIs still retain safe fallback handling and must label fallback mode honestly.
