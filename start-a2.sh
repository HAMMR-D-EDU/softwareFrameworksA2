#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$ROOT_DIR/a2/server"
CLIENT_DIR="$ROOT_DIR/a2/client"

kill_port() {
  local port="$1"
  if lsof -ti:"$port" >/dev/null 2>&1; then
    lsof -ti:"$port" | xargs kill -9 >/dev/null 2>&1 || true
  fi
}

# Start MongoDB via Homebrew if not running (best-effort, silent)
if ! pgrep -x mongod >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    brew services start mongodb-community@8.0 >/dev/null 2>&1 || \
    brew services start mongodb-community >/dev/null 2>&1 || true
  fi
fi

# Free dev ports silently
kill_port 3000
kill_port 3001
kill_port 4200

# Start server and client
(
  cd "$SERVER_DIR"
  npm start >/dev/null 2>&1
) &

(
  cd "$CLIENT_DIR"
  ng serve --ssl true --port 4200 >/dev/null 2>&1
) &

sleep 5

# Open both client and server URLs
if command -v open >/dev/null 2>&1; then
  open https://localhost:4200 >/dev/null 2>&1 || true
  open https://localhost:3000 >/dev/null 2>&1 || true
fi

wait


