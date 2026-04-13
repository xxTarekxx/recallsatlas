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
  --exclude '.env' \
  "$REPO_BACKEND/" "$LIVE_BACKEND/"

echo "Backend deployed from $REPO_BACKEND to $LIVE_BACKEND"
