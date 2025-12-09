#!/bin/bash

# Claude Keep-Alive System
# Отправляет "привет" каждые 5 часов: 7:00, 12:00, 17:00, 22:00

LOG_FILE="/root/beauty-platform/logs/claude-keepalive.log"
CLAUDE_API_URL="https://api.anthropic.com/v1/messages"
CLAUDE_API_KEY="YOUR_CLAUDE_API_KEY_HERE"  # Замените на реальный ключ

# Функция отправки сообщения Claude
send_hello_to_claude() {
    local current_time=$(date '+%H:%M %d.%m.%Y')
    local message="🕐 Привет! Время: $current_time. Сессия активна, продолжаем работать над Beauty Platform! 🚀"
    
    echo "[$(date)] Отправляем keep-alive сообщение Claude..." | tee -a "$LOG_FILE"
    
    # Отправка через Claude API (если настроен)
    if [ "$CLAUDE_API_KEY" != "YOUR_CLAUDE_API_KEY_HERE" ]; then
        curl -s -X POST "$CLAUDE_API_URL" \
            -H "Content-Type: application/json" \
            -H "x-api-key: $CLAUDE_API_KEY" \
            -H "anthropic-version: 2023-06-01" \
            -d "{
                \"model\": \"claude-3-sonnet-20240229\",
                \"max_tokens\": 100,
                \"messages\": [{
                    \"role\": \"user\",
                    \"content\": \"$message\"
                }]
            }" | tee -a "$LOG_FILE"
    fi
    
    # Локальное логирование для VS Code
    echo "[$current_time] 🤖 Claude Keep-Alive: Сессия обновлена!" >> /root/claude-session.log
    
    echo "[$(date)] Keep-alive отправлен!" | tee -a "$LOG_FILE"
}

# Основная логика
current_hour=$(date '+%H')

case $current_hour in
    07) send_hello_to_claude ;;
    12) send_hello_to_claude ;;
    17) send_hello_to_claude ;;
    22) send_hello_to_claude ;;
    *) echo "[$(date)] Не время для keep-alive (текущий час: $current_hour)" >> "$LOG_FILE" ;;
esac