#!/usr/bin/env bash
set -euo pipefail

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required for checksum-based sync." >&2
  exit 1
fi

sync_checksum() {
  local src="$1"
  local dest="$2"

  if [[ ! -e "$src" ]]; then
    echo "Skipping missing source: $src"
    return 0
  fi

  mkdir -p "$dest"

  rsync -avc --itemize-changes \
    "$src/" "$dest/"
}

sync_checksum \
  "/var/www/html/recallsatlas/public/images/generalRecalls" \
  "/var/www/html/recallsatlas-repo/frontend/public/images/generalRecalls"

sync_checksum \
  "/var/www/html/recallsatlas/public/images/recalls" \
  "/var/www/html/recallsatlas-repo/frontend/public/images/recalls"

echo "Live image and script data synced into /var/www/html/recallsatlas-repo"
