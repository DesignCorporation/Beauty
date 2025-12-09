#!/bin/bash

# 🚀 Frontend Deploy Script - Beauty Platform
# Собирает фронтенд и перезапускает процесс через Orchestrator
# Для dev-окружения с Node.js services

set -e

echo "🚀 Frontend Deployment for Beauty Platform"
echo "=========================================="

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Проверяем что мы в правильной директории
if [ ! -f "package.json" ]; then
    error "package.json не найден. Запустите из корня проекта (/root/projects/beauty)"
fi

# ===========================
# 1. ПОСТРОЕНИЕ ФРОНТЕНДА
# ===========================

info "Этап 1: Построение фронтенда..."
echo ""

# Выбор приложения для сборки (или все)
if [ -z "${1:-}" ]; then
    APPS=("salon-crm" "admin-panel" "client-booking")
    echo "Выбери приложение для сборки:"
    echo "1) salon-crm (Salon CRM)"
    echo "2) admin-panel (Admin Panel)"
    echo "3) client-booking (Client Portal)"
    echo "4) все (all apps)"
    echo ""
    read -p "Выбор (1-4) [1]: " choice
    choice=${choice:-1}

    case $choice in
        1) APPS=("salon-crm") ;;
        2) APPS=("admin-panel") ;;
        3) APPS=("client-booking") ;;
        4) APPS=("salon-crm" "admin-panel" "client-booking") ;;
        *) error "Неверный выбор!" ;;
    esac
fi

for APP in "${APPS[@]}"; do
    echo ""
    info "Сборка $APP..."

    if [ "$APP" = "landing-page" ]; then
        # Landing Page использует Next.js, нужен другой подход
        info "Landing Page пока используется Next.js, пропускаю"
        continue
    fi

    # Сборка через pnpm
    if pnpm --filter "$APP" build; then
        success "$APP собран успешно (dist/ готов)"
    else
        error "Ошибка при сборке $APP"
    fi
done

# ===========================
# 2. ПРОВЕРКА ORCHESTRATOR
# ===========================

echo ""
info "Этап 2: Проверка Orchestrator..."

# Проверяем что Orchestrator работает
if ! curl -s http://localhost:6030/orchestrator/status-all > /dev/null 2>&1; then
    warning "Orchestrator недоступен на http://localhost:6030"
    warning "Убедитесь что сервисы запущены (./beauty-dev.sh status)"
    exit 1
fi

success "Orchestrator доступен"

# ===========================
# 3. ПЕРЕЗАПУСК СЕРВИСОВ
# ===========================

echo ""
info "Этап 3: Перезапуск фронтенд сервисов..."
echo ""

# Функция для перезапуска через Orchestrator
restart_service() {
    local SERVICE_ID=$1
    local SERVICE_NAME=$2
    local PORT=$3

    echo -n "Перезапуск $SERVICE_NAME (порт $PORT)... "

    if curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"action":"restart"}' \
        "http://localhost:6030/orchestrator/services/$SERVICE_ID/actions" > /dev/null 2>&1; then

        # Ждем пока сервис запустится
        sleep 3

        # Проверяем что сервис запущен
        if curl -s -f "http://localhost:$PORT/health" > /dev/null 2>&1 || \
           curl -s -f "http://localhost:$PORT" > /dev/null 2>&1; then
            success "OK"
            return 0
        fi
    fi

    error "FAILED"
    return 1
}

# Карта сервисов
declare -A SERVICES
SERVICES["salon-crm"]="salon-crm,Salon CRM,6001"
SERVICES["admin-panel"]="admin-panel,Admin Panel,6002"
SERVICES["client-booking"]="client-booking,Client Portal,6003"

RESTART_FAILED=0

for APP in "${APPS[@]}"; do
    if [ -z "${SERVICES[$APP]:-}" ]; then
        continue
    fi

    IFS=',' read -r SERVICE_ID SERVICE_NAME PORT <<< "${SERVICES[$APP]}"

    if ! restart_service "$SERVICE_ID" "$SERVICE_NAME" "$PORT"; then
        RESTART_FAILED=1
    fi
done

if [ $RESTART_FAILED -eq 1 ]; then
    warning "Некоторые сервисы не перезапустились"
    warning "Проверьте логи: curl http://localhost:6030/orchestrator/services/SERVICE_ID/logs"
fi

# ===========================
# 4. ИНСТРУКЦИИ ДЛЯ ПОЛЬЗОВАТЕЛЯ
# ===========================

echo ""
echo "=========================================="
success "Деплой фронтенда завершен!"
echo "=========================================="
echo ""
echo "📋 Что делать дальше:"
echo ""
echo "1️⃣  Hard Refresh браузера (очистить кэш):"
echo "    • Windows/Linux: Ctrl + Shift + R"
echo "    • macOS: Cmd + Shift + R"
echo ""
echo "2️⃣  Проверить что загружен новый бандл:"
echo "    • Открыть DevTools (F12)"
echo "    • Перейти на Network вкладку"
echo "    • Проверить что hash файлов изменился"
echo "    • Например: SalonSettingsPage-XXX.js (XXX должен быть новый)"
echo ""
echo "3️⃣  Проверить консоль на ошибки:"
echo "    • Если есть ошибки 404 — это ок, это значит API еще не раскатан"
echo "    • Graceful fallback показывает дефолтные данные"
echo ""
echo "📊 Статус сервисов:"
echo ""

# Показываем статус всех сервисов
for APP in "${APPS[@]}"; do
    if [ -z "${SERVICES[$APP]:-}" ]; then
        continue
    fi

    IFS=',' read -r SERVICE_ID SERVICE_NAME PORT <<< "${SERVICES[$APP]}"

    if curl -s -f "http://localhost:$PORT/health" > /dev/null 2>&1 || \
       curl -s -f "http://localhost:$PORT" > /dev/null 2>&1; then
        echo "✅ $SERVICE_NAME: http://localhost:$PORT"
    else
        echo "⚠️  $SERVICE_NAME: недоступен на http://localhost:$PORT"
    fi
done

echo ""
echo "🔗 Основные URLs:"
echo "   • Salon CRM:     http://localhost:6001"
echo "   • Admin Panel:   http://localhost:6002"
echo "   • Client Portal: http://localhost:6003"
echo ""
echo "❓ Если что-то не работает:"
echo "   • Проверьте логи: tail -100 ~/.pm2/logs/salon-crm-out.log"
echo "   • Статус сервисов: curl http://localhost:6030/orchestrator/status-all | jq"
echo "   • Перезапуск вручную: ./beauty-dev.sh restart salon-crm"
echo ""
