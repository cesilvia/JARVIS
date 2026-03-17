#!/bin/bash
set -euo pipefail

REPO_DIR="$HOME/Projects/JARVIS/app"
LOG_FILE="$HOME/Projects/JARVIS/deploy.log"
LOCK_FILE="/tmp/jarvis-deploy.lock"

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
    exit 0
fi
trap 'rm -f "$LOCK_FILE"' EXIT
touch "$LOCK_FILE"

cd "$REPO_DIR"

# Ensure docker is in PATH (required for launchd sessions on macOS)
export PATH="$PATH:/usr/local/bin"

# Fetch latest from origin
git fetch origin main --quiet

# Compare local HEAD with remote
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') Deploying ${REMOTE:0:7} (was ${LOCAL:0:7})" >> "$LOG_FILE"

# Pull and rebuild
git pull origin main --ff-only
docker compose up -d --build jarvis

# Prune old Docker images to prevent disk bloat
docker image prune -f >> /dev/null 2>&1

echo "$(date '+%Y-%m-%d %H:%M:%S') Deploy complete" >> "$LOG_FILE"
