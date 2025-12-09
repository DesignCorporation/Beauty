#!/bin/bash

# AI Communication Monitor - показывает общение Claude и Gemini в реальном времени

CHAT_DIR="/root/beauty-platform/ai-chat"
HISTORY_FILE="$CHAT_DIR/claude-gemini-history.log"

echo -e "\033[1;36m👁️  AI Communication Monitor - Beauty Platform\033[0m"
echo -e "\033[1;36m==============================================\033[0m"
echo -e "\033[90mМониторинг общения между Claude и Gemini в реальном времени\033[0m"
echo -e "\033[90mНажмите Ctrl+C для выхода\033[0m"
echo ""

# Создаем файлы если их нет
mkdir -p "$CHAT_DIR"
touch "$HISTORY_FILE"

while true; do
    clear
    echo -e "\033[1;36m👁️  AI Monitor - $(date '+%H:%M:%S %d.%m.%Y')\033[0m"
    echo -e "\033[1;36m=====================================\033[0m"
    
    # Статус терминалов
    claude_running=$(pgrep -f "claude-terminal.sh" >/dev/null && echo "🟢 ONLINE" || echo "🔴 OFFLINE")
    gemini_running=$(pgrep -f "gemini-terminal.sh" >/dev/null && echo "🟢 ONLINE" || echo "🔴 OFFLINE")
    
    echo -e "\n📊 \033[1;37mСтатус AI терминалов:\033[0m"
    echo -e "   🧠 Claude Terminal:  $claude_running"
    echo -e "   💎 Gemini Terminal: $gemini_running"
    
    # Статистика сообщений
    if [ -s "$HISTORY_FILE" ]; then
        total_messages=$(wc -l < "$HISTORY_FILE")
        claude_messages=$(grep -c "Claude:" "$HISTORY_FILE" 2>/dev/null || echo 0)
        gemini_messages=$(grep -c "Gemini:" "$HISTORY_FILE" 2>/dev/null || echo 0)
        
        echo -e "\n📈 \033[1;37mСтатистика общения:\033[0m"
        echo -e "   📝 Всего сообщений: $total_messages"
        echo -e "   🧠 От Claude: $claude_messages"
        echo -e "   💎 От Gemini: $gemini_messages"
    fi
    
    # Активность файлов
    echo -e "\n📁 \033[1;37mАктивность файлов:\033[0m"
    local claude_inbox_count=$(wc -l < "$CHAT_DIR/claude-inbox.txt" 2>/dev/null || echo 0)
    local gemini_inbox_count=$(wc -l < "$CHAT_DIR/gemini-inbox.txt" 2>/dev/null || echo 0)
    
    echo -e "   📬 Claude Inbox: $claude_inbox_count сообщений"
    echo -e "   📬 Gemini Inbox: $gemini_inbox_count сообщений"
    
    # Последние сообщения
    echo -e "\n💬 \033[1;37mПоследние 8 сообщений:\033[0m"
    if [ -s "$HISTORY_FILE" ]; then
        tail -8 "$HISTORY_FILE" | while IFS= read -r line; do
            if [[ $line == *"Claude:"* ]]; then
                echo -e "\033[1;34m   $line\033[0m"
            elif [[ $line == *"Gemini:"* ]]; then
                echo -e "\033[1;33m   $line\033[0m"
            else
                echo -e "\033[90m   $line\033[0m"
            fi
        done
    else
        echo -e "\033[90m   Сообщений пока нет...\033[0m"
    fi
    
    # Инструкции
    echo -e "\n\033[1;37m🎯 Как использовать:\033[0m"
    echo -e "   \033[1;32mТерминал 1:\033[0m claude"
    echo -e "   \033[1;32mТерминал 2:\033[0m gemini" 
    echo -e "   \033[1;32mТерминал 3:\033[0m ai-monitor (этот)"
    echo ""
    echo -e "\033[1;37m💡 Команды для общения:\033[0m"
    echo -e "   В Claude: \033[1;34msend gemini Привет от Claude!\033[0m"
    echo -e "   В Gemini: \033[1;33msend claude Привет от Gemini!\033[0m"
    
    sleep 3
done