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

Current approved path:

1. Do not install Docker or Postgres on the VPS without separate approval.
2. Deploy the RecallGraph frontend/app UI through the existing RecallsAtlas PM2 and Apache path.
3. Keep the UI honest about runtime mode:
   - `database=not_configured` when no `RECALLGRAPH_DATABASE_URL` is present.
   - `database=unreachable` when configuration exists but the database cannot be reached.
   - `embeddingProvider=mock` when mock embeddings are configured.
4. Build the frontend and reload only the RecallsAtlas PM2 app:
   ```bash
   cd /var/www/html/recallsatlas
   npm ci
   npm run build
   pm2 reload recallsatlas --update-env
   ```
5. Verify RecallGraph and legacy routes over HTTPS.

Production database options for a later approved step:

1. Managed Postgres with pgvector.
2. Native Postgres plus pgvector installed on the VPS.
3. Docker Engine plus Compose, then the isolated `recallgraph-prod` compose service.

Whichever DB path is selected later, Postgres must bind to localhost or a private managed endpoint only. Do not expose Postgres publicly.

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
3. If a RecallGraph database is added later, leave it running if the frontend rollback succeeds, because it should be isolated and not publicly exposed.
4. If Docker is approved later and RecallGraph services must be stopped, stop only the RecallGraph production compose project:
   ```bash
   docker compose -p recallgraph-prod -f docker-compose.recallgraph.prod.yml stop
   ```

Do not use `docker compose down`, Docker prune commands, or global PM2 restarts without explicit approval.

## Current Blocker

RecallGraph UI deployment can proceed through the existing frontend path. Full production semantic search remains blocked until one production DB path is approved:

- managed Postgres/pgvector,
- native Postgres/pgvector install,
- or Docker/Compose install.

Until then, production must label the runtime as database-not-configured or demo/infrastructure mode and must not claim real semantic ranking.
