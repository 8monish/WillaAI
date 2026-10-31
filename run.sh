#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

if ! command -v agy >/dev/null 2>&1; then
    printf 'Warning: the configured local model is not available on PATH. RipeAI will start, but local Gemini prompts may fail.\n' >&2
fi

HOST="${RIPEAI_HOST:-127.0.0.1}"
PORT="${RIPEAI_PORT:-8000}"

if [[ -x "$PROJECT_ROOT/venv/bin/uvicorn" ]]; then
    exec "$PROJECT_ROOT/venv/bin/uvicorn" main:app --host "$HOST" --port "$PORT" --reload
elif command -v uvicorn >/dev/null 2>&1; then
    exec uvicorn main:app --host "$HOST" --port "$PORT" --reload
else
    printf 'uvicorn not found. Install project dependencies with: python3 -m pip install -r requirements.txt\n' >&2
    exit 1
fi
