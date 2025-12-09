#!/bin/bash

# Live AI Chat Monitor для VS Code Terminal
# Отслеживание разговоров между Claude и Gemini в реальном времени

echo "👀 AI Chat Live Monitor - Beauty Platform"
echo "========================================"
echo "Нажмите Ctrl+C для выхода"
echo ""

LOG_FILE="/root/beauty-platform/logs/ai-conversation.json"
CHAT_LOG="/root/beauty-platform/logs/ai-chat.log"

# Создаем файлы если их нет
touch "$LOG_FILE"
touch "$CHAT_LOG"

# Функция красивого отображения JSON
display_last_message() {
    if [ -s "$LOG_FILE" ]; then
        echo "📊 Последнее сообщение:"
        tail -1 "$LOG_FILE" | jq -r '
        "🕒 \(.timestamp // "unknown")
🤖 \(.sender // "unknown"): 
💬 \(.message // "no message")[0:200]...
📝 Ответ: \(.response // "no response")[0:200]..."
        ' 2>/dev/null || echo "Ожидаем первое сообщение..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi
}

# Мониторинг в реальном времени
echo "🔄 Запускаем мониторинг..."

while true; do
    clear
    echo "👀 AI Chat Live Monitor - $(date '+%H:%M:%S')"
    echo "========================================"
    
    # Статистика
    if [ -s "$LOG_FILE" ]; then
        TOTAL_MESSAGES=$(jq length "$LOG_FILE" 2>/dev/null || echo "0")
        CLAUDE_MESSAGES=$(jq '[.[] | select(.sender == "Claude")] | length' "$LOG_FILE" 2>/dev/null || echo "0")
        GEMINI_MESSAGES=$(jq '[.[] | select(.sender == "Gemini")] | length' "$LOG_FILE" 2>/dev/null || echo "0")
        
        echo "📈 Статистика:"
        echo "   Всего сообщений: $TOTAL_MESSAGES"
        echo "   Claude: $CLAUDE_MESSAGES | Gemini: $GEMINI_MESSAGES"
        echo ""
    fi
    
    # Последние 3 сообщения
    echo "💬 Последние сообщения:"
    if [ -s "$LOG_FILE" ]; then
        jq -r '.[-3:] | .[] | 
        "[\(.timestamp[11:19])] 🤖 \(.sender):
💬 \(.message[0:150])...
📝 ➜ \(.response[0:150])...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"' "$LOG_FILE" 2>/dev/null || echo "Ожидаем сообщения..."
    else
        echo "Ожидаем первое сообщение..."
    fi
    
    echo ""
    echo "🎯 Команды:"
    echo "   Ctrl+C - выход"
    echo "   В другом терминале: /root/beauty-platform/scripts/start-ai-chat.sh"
    
    sleep 3
done