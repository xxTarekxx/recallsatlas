#!/usr/bin/env bash
set -euo pipefail

REPO_FRONTEND="${REPO_FRONTEND:-/var/www/html/recallsatlas-repo/frontend}"
LIVE_ROOT="${LIVE_ROOT:-/var/www/html/recallsatlas}"
PM2_APP="${PM2_APP:-recallsatlas}"

echo "Source repo frontend: $REPO_FRONTEND"
echo "Live app root:        $LIVE_ROOT"
echo "PM2 app:              $PM2_APP"

if [[ ! -d "$REPO_FRONTEND" ]]; then
  echo "Repo frontend directory not found: $REPO_FRONTEND" >&2
  exit 1
fi

if [[ ! -d "$LIVE_ROOT" ]]; then
  echo "Live app root not found: $LIVE_ROOT" >&2
  exit 1
fi

cd "$REPO_FRONTEND"

echo "Removing repo .next..."
rm -rf .next

echo "Running npm build in repo frontend..."
npm run build

if [[ ! -d ".next" ]]; then
  echo "Build finished but .next is missing in $REPO_FRONTEND" >&2
  exit 1
fi

for required in next.config.mjs package.json package-lock.json; do
  if [[ ! -f "$required" ]]; then
    echo "Required file missing in repo frontend: $required" >&2
    exit 1
  fi
done

echo "Cleaning live frontend artifacts..."
rm -rf "$LIVE_ROOT/.next" "$LIVE_ROOT/node_modules"
rm -f "$LIVE_ROOT/next.config.mjs" "$LIVE_ROOT/package.json" "$LIVE_ROOT/package-lock.json"

echo "Copying package manifests and Next config..."
cp -f package.json package-lock.json next.config.mjs "$LIVE_ROOT/"

echo "Installing production dependencies in live app..."
(
  cd "$LIVE_ROOT"
  npm install --omit=dev
)

echo "Copying built .next output..."
cp -a .next "$LIVE_ROOT/"

echo "Restarting PM2 app..."
pm2 restart "$PM2_APP"

echo "Done."
