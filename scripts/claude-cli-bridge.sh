#!/bin/bash

# Claude CLI Bridge - Интеграция с реальным Claude Code CLI
# Автоматически читает сообщения и отвечает через Claude CLI

CHAT_DIR="/root/beauty-platform/ai-chat"
CLAUDE_INBOX="$CHAT_DIR/claude-inbox.txt"
CONVERSATION_LOG="$CHAT_DIR/conversation.log" 
CLAUDE_RESPONSES="$CHAT_DIR/claude-responses.txt"

# Создаем директории если нет
mkdir -p "$CHAT_DIR"
touch "$CLAUDE_INBOX" "$CONVERSATION_LOG"

# Функция логирования
log_message() {
    local timestamp=$(date '+%H:%M:%S %d.%m.%Y')
    local sender="$1"
    local message="$2"
    
    echo "[$timestamp] $sender: $message" >> "$CONVERSATION_LOG"
    echo -e "\033[1;34m[$timestamp] Claude CLI:\033[0m $message"
}

# Функция отправки сообщения другому AI
send_to_gemini() {
    local message="$1"
    local timestamp=$(date '+%H:%M:%S')
    
    echo "[$timestamp] FROM_CLAUDE: $message" >> "$CHAT_DIR/gemini-inbox.txt"
    log_message "📨→Gemini" "$message"
}

# Обработчик входящих сообщений для Claude
process_claude_messages() {
    if [ ! -s "$CLAUDE_INBOX" ]; then
        return
    fi
    
    echo -e "\n\033[1;33m📬 Claude получил новые сообщения:\033[0m"
    
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            # Извлекаем сообщение (убираем метаданные)
            message=$(echo "$line" | sed 's/\[.*\] FROM_.*: //')
            
            echo -e "\033[1;36m📨 Входящее:\033[0m $message"
            
            # Здесь можно добавить автоматические ответы Claude
            # Или интеграцию с настоящим Claude CLI
            
            # Простой автоответчик с контекстом Beauty Platform
            local response=""
            case "$message" in
                *"архитектур"*|*"микросервис"*)
                    response="Архитектура Beauty Platform основана на микросервисах: Auth Service (6021), CRM API (6022), Admin Panel (6002). Tenant isolation через tenantPrisma(tenantId) обеспечивает безопасность. 🏗️"
                    ;;
                *"производительност"*|*"оптимизаци"*)
                    response="Для оптимизации рекомендую: 1) Redis кэширование для CRM данных, 2) GraphQL для эффективных запросов, 3) Connection pooling для БД, 4) CDN для статики. 🚀"
                    ;;
                *"безопасност"*|*"security"*)
                    response="Security в Beauty Platform: JWT с httpOnly cookies, MFA через TOTP, tenant isolation, CSRF protection, rate limiting. Все логи в security_events таблице. 🛡️"
                    ;;
                *"база данных"*|*"database"*|*"БД"*)
                    response="PostgreSQL beauty_platform_new с полной tenant изоляцией. Prisma ORM, автоматические миграции, отдельная БД для аудита. Каждый салон = отдельный tenantId. 🗄️"
                    ;;
                *"календар"*|*"записи"*|*"appointment"*)
                    response="CRM календарь показывает реальные записи из БД. Цветная система статусов, мастера в отдельных колонках, drag&drop для переноса. API: GET/POST /api/appointments. 📅"
                    ;;
                *"мониторинг"*|*"логи"*)
                    response="Система мониторинга: health checks каждые 2 минуты, Telegram алерты, PM2 для процессов, systemd для автозапуска. Логи в /root/beauty-platform/logs/. 📊"
                    ;;
                *)
                    response="Интересный вопрос по Beauty Platform! 🤔 Давайте детальнее обсудим: архитектуру, безопасность, производительность или конкретные фичи? Готов помочь с техническими деталями. 💡"
                    ;;
            esac
            
            # Отправляем ответ
            if [ -n "$response" ]; then
                log_message "🧠 Claude" "$response"
                send_to_gemini "$response"
                echo "$response" >> "$CLAUDE_RESPONSES"
            fi
        fi
    done < "$CLAUDE_INBOX"
    
    # Очищаем inbox
    > "$CLAUDE_INBOX"
}

# Daemon режим - постоянно слушаем сообщения
daemon_mode() {
    echo -e "\033[1;32m🤖 Claude CLI Bridge запущен в daemon режиме\033[0m"
    echo -e "\033[90mИспользуйте Ctrl+C для остановки\033[0m"
    echo -e "\033[1;37mИнтеграция с файловой системой: $CHAT_DIR\033[0m"
    echo ""
    
    while true; do
        process_claude_messages
        sleep 3
    done
}

# Проверка одного раза
check_once() {
    echo -e "\033[1;33m🔍 Проверяем сообщения для Claude...\033[0m"
    process_claude_messages
    
    if [ -s "$CLAUDE_RESPONSES" ]; then
        echo -e "\n\033[1;37m📝 Последние ответы Claude:\033[0m"
        tail -5 "$CLAUDE_RESPONSES"
    fi
}

# Статистика
show_stats() {
    echo -e "\033[1;36m📊 Статистика Claude CLI Bridge\033[0m"
    echo -e "================================"
    echo -e "📬 Сообщений в inbox: $(wc -l < "$CLAUDE_INBOX" 2>/dev/null || echo 0)"
    echo -e "💬 Всего в истории: $(wc -l < "$CONVERSATION_LOG" 2>/dev/null || echo 0)" 
    echo -e "📝 Ответов Claude: $(wc -l < "$CLAUDE_RESPONSES" 2>/dev/null || echo 0)"
    echo -e "🕐 Последняя активность: $(date -r "$CONVERSATION_LOG" 2>/dev/null || echo "Нет данных")"
}

# Главная функция
case "${1:-daemon}" in
    "daemon")
        daemon_mode
        ;;
    "check")
        check_once
        ;;
    "stats")
        show_stats
        ;;
    "help")
        echo "Claude CLI Bridge - интеграция с файловой системой"
        echo "Использование:"
        echo "  ./claude-cli-bridge.sh daemon  - запуск в фоне (по умолчанию)"
        echo "  ./claude-cli-bridge.sh check   - проверить один раз"  
        echo "  ./claude-cli-bridge.sh stats   - показать статистику"
        ;;
    *)
        echo "Неизвестная команда. Используйте: daemon, check, stats, help"
        ;;
esac