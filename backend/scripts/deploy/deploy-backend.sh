#!/usr/bin/env bash
set -euo pipefail

LIVE_BACKEND="/var/www/html/recallsatlas/backend"
REPO_BACKEND="/var/www/html/recallsatlas-repo/backend"

if [[ ! -d "$REPO_BACKEND" ]]; then
  echo "Repo backend not found: $REPO_BACKEND" >&2
  exit 1
fi

mkdir -p "$LIVE_BACKEND"

rm -rf "$LIVE_BACKEND/node_modules"
rm -f "$LIVE_BACKEND/package.json"
rm -f "$LIVE_BACKEND/package-lock.json"

rsync -av \
  --exclude 'node_modules/' \
  "$REPO_BACKEND/" "$LIVE_BACKEND/"

chmod +x "$LIVE_BACKEND/scripts/flows/"*.sh "$LIVE_BACKEND/scripts/deploy/"*.sh 2>/dev/null || true

echo "Installing production dependencies..."
(
  cd "$LIVE_BACKEND"
  npm install
)

echo "Restarting PM2 app..."
pm2 restart recallsatlas

echo "Backend deployed from $REPO_BACKEND to $LIVE_BACKEND"
