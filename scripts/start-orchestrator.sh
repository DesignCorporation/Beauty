#!/bin/bash
#
# Beauty Platform Orchestrator Startup Script
# Запускает оркестратор в фоне для production environment
#
# Usage:
#   ./scripts/start-orchestrator.sh [start|stop|restart|status]
#

set -euo pipefail

# Configuration
# Calculate BASE_DIR relative to this script (assumes script is in /scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

ORCHESTRATOR_DIR="$BASE_DIR/services/orchestrator"
ORCHESTRATOR_PID_FILE="$BASE_DIR/logs/beauty-orchestrator.pid"
ORCHESTRATOR_LOG_FILE="$BASE_DIR/logs/beauty-orchestrator.log"
ORCHESTRATOR_PORT=${ORCHESTRATOR_PORT:-6030}

# Ensure log directory exists
mkdir -p "$(dirname "$ORCHESTRATOR_LOG_FILE")"

# Function to check if orchestrator is running
is_running() {
    if [[ -f "$ORCHESTRATOR_PID_FILE" ]]; then
        local pid=$(cat "$ORCHESTRATOR_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            rm -f "$ORCHESTRATOR_PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to start orchestrator
start_orchestrator() {
    if is_running; then
        echo "🔄 Orchestrator is already running (PID: $(cat "$ORCHESTRATOR_PID_FILE"))"
        return 0
    fi

    echo "🚀 Starting Beauty Platform Orchestrator..."

    cd "$ORCHESTRATOR_DIR"

    # Ensure pnpm is in PATH (критично для nohup окружения)
    export PATH="/root/bin:/root/.local/share/pnpm:$PATH"

    # Build orchestrator before starting to guarantee dist/ is fresh
    pnpm install --frozen-lockfile >/dev/null 2>&1 || true

    if pnpm run build >/dev/null 2>&1; then
        echo "✅ Orchestrator build succeeded"
        nohup pnpm run start > "$ORCHESTRATOR_LOG_FILE" 2>&1 &
    else
        echo "⚠️ Orchestrator build failed, falling back to dev mode" >&2
        nohup pnpm run dev > "$ORCHESTRATOR_LOG_FILE" 2>&1 &
    fi
    local pid=$!

    # Save PID
    echo "$pid" > "$ORCHESTRATOR_PID_FILE"

    # Wait a moment and check if it's still running
    sleep 3
    if kill -0 "$pid" 2>/dev/null; then
        echo "✅ Orchestrator started successfully (PID: $pid)"
        echo "📊 Port: $ORCHESTRATOR_PORT"
        echo "📝 Logs: $ORCHESTRATOR_LOG_FILE"
        echo "🩺 Health: http://localhost:$ORCHESTRATOR_PORT/health"
        return 0
    else
        echo "❌ Failed to start orchestrator"
        rm -f "$ORCHESTRATOR_PID_FILE"
        return 1
    fi
}

# Function to stop orchestrator
stop_orchestrator() {
    if ! is_running; then
        echo "⏹️  Orchestrator is not running"
        return 0
    fi

    local pid=$(cat "$ORCHESTRATOR_PID_FILE")
    echo "🛑 Stopping orchestrator (PID: $pid)..."

    # Graceful shutdown
    if kill -TERM "$pid" 2>/dev/null; then
        # Wait up to 10 seconds for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 "$pid" 2>/dev/null; then
                break
            fi
            sleep 1
        done

        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo "⚠️  Forcing shutdown..."
            kill -KILL "$pid" 2>/dev/null || true
        fi
    fi

    rm -f "$ORCHESTRATOR_PID_FILE"
    echo "✅ Orchestrator stopped"
}

# Function to restart orchestrator
restart_orchestrator() {
    echo "🔄 Restarting orchestrator..."
    stop_orchestrator
    sleep 2
    start_orchestrator
}

# Function to show status
show_status() {
    if is_running; then
        local pid=$(cat "$ORCHESTRATOR_PID_FILE")
        echo "✅ Orchestrator is running (PID: $pid)"

        # Try to get status from API
        if command -v curl >/dev/null 2>&1; then
            echo "📊 API Status:"
            curl -s "http://localhost:$ORCHESTRATOR_PORT/health" 2>/dev/null | \
                python3 -m json.tool 2>/dev/null || \
                echo "   API not responding"
        fi

        # Show recent logs
        if [[ -f "$ORCHESTRATOR_LOG_FILE" ]]; then
            echo ""
            echo "📝 Recent logs:"
            tail -5 "$ORCHESTRATOR_LOG_FILE"
        fi
    else
        echo "❌ Orchestrator is not running"
        return 1
    fi
}

# Main script logic
case "${1:-start}" in
    start)
        start_orchestrator
        ;;
    stop)
        stop_orchestrator
        ;;
    restart)
        restart_orchestrator
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the orchestrator in background"
        echo "  stop    - Stop the orchestrator gracefully"
        echo "  restart - Restart the orchestrator"
        echo "  status  - Show orchestrator status and health"
        echo ""
        echo "Environment variables:"
        echo "  ORCHESTRATOR_PORT - Port for orchestrator (default: 6030)"
        exit 1
        ;;
esac
