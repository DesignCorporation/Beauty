#!/bin/bash
# Beauty Platform - Orchestrator Watchdog Script
# Проверяет работоспособность оркестратора и автоматически запускает его при необходимости

set -e

# Конфигурация
ORCHESTRATOR_URL="http://localhost:6030"
HEALTH_ENDPOINT="$ORCHESTRATOR_URL/health"
PROJECT_ROOT="/root/projects/beauty"
LOG_FILE="$PROJECT_ROOT/logs/orchestrator-watchdog.log"
START_SCRIPT="$PROJECT_ROOT/scripts/start-orchestrator.sh"
MAX_RETRIES=3
RETRY_DELAY=5

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

# Функция для проверки health endpoint
check_orchestrator_health() {
    local response
    response=$(curl -s -w "%{http_code}" -o /dev/null --connect-timeout 5 --max-time 10 "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Функция для проверки процесса оркестратора
check_orchestrator_process() {
    if pgrep -f "tsx.*orchestrator" > /dev/null || pgrep -f "node.*orchestrator" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Основная логика watchdog
main() {
    log "🔍 Orchestrator Watchdog: Starting health check..."

    # Проверяем health endpoint
    if check_orchestrator_health; then
        log "✅ Orchestrator is healthy (HTTP 200 OK)"
        exit 0
    fi

    log "⚠️  Orchestrator health check failed"

    # Проверяем процесс
    if check_orchestrator_process; then
        log "🔄 Orchestrator process is running but not responding to health checks"
        log "🛑 Stopping unresponsive orchestrator..."
        "$START_SCRIPT" stop || true
        sleep 2
    else
        log "❌ Orchestrator process is not running"
    fi

    # Пытаемся запустить оркестратор
    log "🚀 Attempting to start orchestrator..."

    for attempt in $(seq 1 $MAX_RETRIES); do
        log "📌 Attempt $attempt of $MAX_RETRIES"

        if "$START_SCRIPT" start; then
            log "✅ Orchestrator start command executed successfully"

            # Ждем и проверяем здоровье
            sleep $RETRY_DELAY

            if check_orchestrator_health; then
                log "🎉 Orchestrator successfully started and is healthy!"
                exit 0
            else
                log "⚠️  Orchestrator started but health check still failing"
            fi
        else
            log "❌ Failed to execute orchestrator start command"
        fi

        if [ $attempt -lt $MAX_RETRIES ]; then
            log "⏳ Waiting ${RETRY_DELAY}s before retry..."
            sleep $RETRY_DELAY
        fi
    done

    log "🚨 CRITICAL: Failed to start orchestrator after $MAX_RETRIES attempts"
    log "🔔 Manual intervention required!"

    # Отправляем алерт если есть система уведомлений
    if [ -f "$PROJECT_ROOT/scripts/send-alert.sh" ]; then
        "$PROJECT_ROOT/scripts/send-alert.sh" "CRITICAL: Orchestrator watchdog failed after $MAX_RETRIES attempts"
    fi

    exit 1
}

# Создаем директорию для логов если не существует
mkdir -p "$(dirname "$LOG_FILE")"

# Запускаем основную логику
main "$@"
