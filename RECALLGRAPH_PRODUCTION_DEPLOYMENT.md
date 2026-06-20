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

## Current Deployment Method

The tracked frontend deployment script uses a local build and uploads production Next.js artifacts to `/var/www/html/recallsatlas`, then restarts only the PM2 app named `recallsatlas`.

The tracked backend deployment script resets its remote backend target directory and is not appropriate for RecallGraph production work without narrowing its scope.

## Proposed Deployment Plan

1. Install or otherwise provide container tooling only after explicit approval, because Docker is absent on the VPS and installing it is a server-level change.
2. Start only the RecallGraph production Postgres service:
   ```bash
   export RECALLGRAPH_POSTGRES_PASSWORD="CHANGE_ME"
   docker compose -p recallgraph-prod -f docker-compose.recallgraph.prod.yml up -d
   ```
3. Confirm Postgres binds only to localhost on `127.0.0.1:54329`.
4. Set RecallGraph environment variables in the RecallsAtlas runtime environment:
   ```bash
   export RECALLGRAPH_DATABASE_URL="postgres://recallgraph:CHANGE_ME@127.0.0.1:54329/recallgraph"
   export RECALLGRAPH_EMBEDDING_PROVIDER="openai"
   ```
5. If no OpenAI key is available, use `RECALLGRAPH_EMBEDDING_PROVIDER=mock` and document that semantic search quality is not production-grade.
6. Run the RecallGraph backend pipeline from the deployed backend path after dependencies are current:
   ```bash
   npm ci
   npm run recallgraph:db:migrate
   npm run recallgraph:import
   npm run recallgraph:embed
   npm run recallgraph:graph
   npm run recallgraph:evaluate
   npm run recallgraph:db:status
   ```
7. Build the frontend and reload only the RecallsAtlas PM2 app:
   ```bash
   cd /var/www/html/recallsatlas
   npm ci
   npm run build
   pm2 reload recallsatlas --update-env
   ```
8. Verify RecallGraph and legacy routes over HTTPS.

## Rollback Plan

Previous production app state should be recorded immediately before deployment:

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
3. Leave the RecallGraph database running if the frontend rollback succeeds, because it is isolated and not publicly exposed.
4. If RecallGraph services must be stopped, stop only the RecallGraph production compose project:
   ```bash
   docker compose -p recallgraph-prod -f docker-compose.recallgraph.prod.yml stop
   ```

Do not use `docker compose down`, Docker prune commands, or global PM2 restarts without explicit approval.

## Current Blocker

Deployment cannot proceed under the requested Docker-based production architecture until Docker or equivalent compose-capable container tooling is installed or another approved Postgres/pgvector hosting path is selected.
