#!/usr/bin/env bash
# ==============================================================================
#  RipeAI Launch Controller
#  Starts the FastAPI backend and integrates the Node.js WhatsApp bridge service
# ==============================================================================
set -euo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Default configuration
HOST="${RIPEAI_HOST:-127.0.0.1}"
PORT="${RIPEAI_PORT:-8000}"
VENV_PATH="${VIRTUAL_ENV:-$PROJECT_ROOT/venv}"
RELOAD="--reload"
CLEAN_LOCKS=true

# Parse command line flags
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            echo "Usage: ./run.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --host <ip>       Bind host address (default: 127.0.0.1)"
            echo "  --port <port>     Bind port number (default: 8000)"
            echo "  --venv <path>     Path to custom virtual environment (default: ./venv or \$VIRTUAL_ENV)"
            echo "  --no-reload       Disable auto-reloading on code changes"
            echo "  --clean           Force kill stale background processes & remove browser locks"
            echo "  -h, --help        Show this help message"
            exit 0
            ;;
        --venv)
            VENV_PATH="$2"
            shift 2
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --no-reload)
            RELOAD=""
            shift
            ;;
        --clean)
            CLEAN_LOCKS=true
            echo "🧹 Performing deep cleanup of stale processes and locks..."
            pkill -9 -f "node src/index.js" 2>/dev/null || true
            pkill -9 -f "whatsapp-bot/.wweb_auth" 2>/dev/null || true
            rm -f "$PROJECT_ROOT/whatsapp-bot/.wweb_auth/session/Singleton"* 2>/dev/null || true
            shift
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Run './run.sh --help' for usage." >&2
            exit 1
            ;;
    esac
done

# Cleanup hook on termination
cleanup() {
    local exit_code=$?
    echo ""
    echo "🛑 Shutting down RipeAI..."
    
    # Kill background whatsapp bot if it was started under this session
    if [[ -n "${WA_PID:-}" ]] && kill -0 "$WA_PID" 2>/dev/null; then
        kill -SIGTERM "$WA_PID" 2>/dev/null || true
    fi

    # Clean Chromium locks so subsequent runs boot smoothly
    rm -f "$PROJECT_ROOT/whatsapp-bot/.wweb_auth/session/Singleton"* 2>/dev/null || true
    exit "$exit_code"
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Check Python environment & Uvicorn
PYTHON_BIN=""
UVICORN_BIN=""

if [[ -x "$VENV_PATH/bin/python" ]]; then
    PYTHON_BIN="$VENV_PATH/bin/python"
    UVICORN_BIN="$VENV_PATH/bin/uvicorn"
elif [[ -x "$PROJECT_ROOT/venv/bin/python" ]]; then
    PYTHON_BIN="$PROJECT_ROOT/venv/bin/python"
    UVICORN_BIN="$PROJECT_ROOT/venv/bin/uvicorn"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
    if command -v uvicorn >/dev/null 2>&1; then
        UVICORN_BIN="$(command -v uvicorn)"
    fi
else
    echo "❌ Error: Python 3 not found. Please install Python 3 to run RipeAI." >&2
    exit 1
fi

if [[ -z "$UVICORN_BIN" || ! -x "$UVICORN_BIN" ]]; then
    echo "⚠️  uvicorn executable not found in virtual environment."
    echo "📦 Attempting to install requirements via $PYTHON_BIN -m pip..."
    "$PYTHON_BIN" -m pip install -r requirements.txt
    if [[ -x "$PROJECT_ROOT/venv/bin/uvicorn" ]]; then
        UVICORN_BIN="$PROJECT_ROOT/venv/bin/uvicorn"
    else
        UVICORN_BIN="$(command -v uvicorn || true)"
    fi
fi

if [[ -z "$UVICORN_BIN" || ! -x "$UVICORN_BIN" ]]; then
    echo "❌ Error: uvicorn is still missing. Run: source venv/bin/activate && pip install -r requirements.txt" >&2
    exit 1
fi

# 2. Check Node.js and WhatsApp Bot prerequisites
BOT_DIR="$PROJECT_ROOT/whatsapp-bot"
if [[ -d "$BOT_DIR" ]]; then
    # Check if .env exists
    if [[ ! -f "$BOT_DIR/.env" && -f "$BOT_DIR/.env.example" ]]; then
        echo "ℹ️  Initializing whatsapp-bot/.env from .env.example..."
        cp "$BOT_DIR/.env.example" "$BOT_DIR/.env"
    fi

    # Check if node_modules exists
    if [[ ! -d "$BOT_DIR/node_modules" ]] && command -v npm >/dev/null 2>&1; then
        echo "📦 Installing WhatsApp bot dependencies (npm install)..."
        (cd "$BOT_DIR" && npm install --silent)
    fi

    # Clean Chromium singleton locks
    rm -f "$BOT_DIR/.wweb_auth/session/Singleton"* 2>/dev/null || true
fi

# 3. Check Local AI Engine (agy)
AGY_STATUS="Active (gemini-3.8-flash-high)"
if ! command -v agy >/dev/null 2>&1; then
    AGY_STATUS="⚠️  agy not in PATH (Fallbacks will be used)"
fi

# 4. Display Startup Banner
echo ""
echo "  ╔═══════════════════════════════════════════════════════════════╗"
echo "  ║                  🍎  RipeAI System Control                    ║"
echo "  ╠═══════════════════════════════════════════════════════════════╣"
echo "  ║  • Web Interface:    http://${HOST}:${PORT}                     ║"
echo "  ║  • WhatsApp Hub:     http://${HOST}:${PORT}/whatsapp            ║"
echo "  ║  • Setup Wizard:     http://${HOST}:${PORT}/setup               ║"
echo "  ║  • AI Engine:        ${AGY_STATUS}     ║"
echo "  ║  • Working Dir:      ${PROJECT_ROOT}         ║"
echo "  ╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Press Ctrl+C at any time to gracefully stop all services."
echo ""

# 5. Launch FastAPI via Uvicorn
if [[ -n "$RELOAD" ]]; then
    exec "$UVICORN_BIN" main:app --host "$HOST" --port "$PORT" --reload
else
    exec "$UVICORN_BIN" main:app --host "$HOST" --port "$PORT"
fi
