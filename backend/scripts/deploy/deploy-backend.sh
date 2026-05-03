#!/usr/bin/env bash
# Deploy backend from THIS MACHINE to the VPS (no server-side repo copy).
#
# Prereqs: ssh, rsync in PATH (Git Bash / WSL / macOS / Linux).
#
# Config (pick one):
#   1) Create deploy-backend.env next to this script (see deploy-backend.env.example)
#   2) Environment: VPS_HOST=user@host  VPS_ROOT=/var/www/html/recallsatlas/backend
#   3) Args: ./deploy-backend.sh user@host [/remote/backend/path]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/deploy-backend.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

SSH_TARGET="${VPS_HOST:-}"
REMOTE_PATH="${VPS_ROOT:-${DEPLOY_REMOTE_BACKEND:-/var/www/html/recallsatlas/backend}}"
PM2_APP="${VPS_PM2_APP:-recallsatlas}"

if [[ -z "$SSH_TARGET" && -n "${DEPLOY_SSH_USER:-}" && -n "${DEPLOY_SSH_HOST:-}" ]]; then
  SSH_TARGET="${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}"
fi

if [[ "${1:-}" ]]; then
  SSH_TARGET="$1"
fi
if [[ "${2:-}" ]]; then
  REMOTE_PATH="$2"
fi

if [[ -z "$SSH_TARGET" ]]; then
  echo "Usage: $0 [user@host] [remote_backend_path]" >&2
  echo "Set VPS_HOST (or DEPLOY_SSH_USER + DEPLOY_SSH_HOST) in deploy-backend.env or the environment." >&2
  exit 1
fi

host_part="${SSH_TARGET#*@}"
if [[ "$SSH_TARGET" == "user@your-vps.example" || "$host_part" == "your-vps.example" || "$host_part" == "example.com" ]]; then
  echo "Refusing to deploy: VPS_HOST still looks like the template ($SSH_TARGET). Set your real user@hostname-or-IP." >&2
  exit 1
fi

if [[ ! -f "$BACKEND_ROOT/package.json" ]]; then
  echo "Expected backend package.json at: $BACKEND_ROOT" >&2
  exit 1
fi

SSH_BASE=(ssh)
RSYNC_EXTRA=()
if [[ -n "${VPS_SSH_KEY:-}" ]]; then
  SSH_BASE=(ssh -i "${VPS_SSH_KEY}")
  RSYNC_EXTRA=( -e "ssh -i ${VPS_SSH_KEY}" )
elif [[ -n "${DEPLOY_SSH_IDENTITY:-}" ]]; then
  SSH_BASE=(ssh -i "${DEPLOY_SSH_IDENTITY}")
  RSYNC_EXTRA=( -e "ssh -i ${DEPLOY_SSH_IDENTITY}" )
fi

echo "Local backend:  $BACKEND_ROOT"
echo "Remote target:  ${SSH_TARGET}:${REMOTE_PATH}"
echo "PM2 app:        $PM2_APP"

echo "Removing remote backend directory (full reset), then recreating..."
"${SSH_BASE[@]}" "$SSH_TARGET" "rm -rf '$REMOTE_PATH' && mkdir -p '$REMOTE_PATH'"

echo "Syncing files from local (excluding node_modules, .git)..."
rsync -avz "${RSYNC_EXTRA[@]}" \
  --exclude 'node_modules/' \
  --exclude '.git/' \
  "$BACKEND_ROOT/" "${SSH_TARGET}:${REMOTE_PATH}/"

echo "Making shell scripts executable on server..."
"${SSH_BASE[@]}" "$SSH_TARGET" "cd '$REMOTE_PATH' && chmod +x scripts/flows/*.sh scripts/deploy/*.sh 2>/dev/null || true"

echo "Installing production dependencies on server..."
"${SSH_BASE[@]}" "$SSH_TARGET" "cd '$REMOTE_PATH' && rm -rf node_modules && npm install --omit=dev"

echo "Restarting PM2 app..."
"${SSH_BASE[@]}" "$SSH_TARGET" "pm2 restart '$PM2_APP'"

echo "Done. Deployed $BACKEND_ROOT -> ${SSH_TARGET}:${REMOTE_PATH}"
