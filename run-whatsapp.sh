#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$SCRIPT_DIR/whatsapp-bot"

if [ ! -d "$BOT_DIR" ]; then
    echo "Error: WhatsApp bot directory not found at $BOT_DIR" >&2
    exit 1
fi

cd "$BOT_DIR"

if [ ! -d "node_modules" ]; then
    echo "Node modules not found. Running npm install..."
    npm install
fi

echo "Starting RipeAI WhatsApp Assistant..."
exec npm start
