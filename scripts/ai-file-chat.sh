#!/bin/bash

# AI File-Based Communication System
# Общение между Claude CLI и другими AI через файлы

CHAT_DIR="/root/beauty-platform/ai-chat"
CLAUDE_INBOX="$CHAT_DIR/claude-inbox.txt"
GEMINI_INBOX="$CHAT_DIR/gemini-inbox.txt" 
CONVERSATION_LOG="$CHAT_DIR/conversation.log"
CLAUDE_RESPONSES="$CHAT_DIR/claude-responses.txt"
GEMINI_RESPONSES="$CHAT_DIR/gemini-responses.txt"

# Создаем директории
mkdir -p "$CHAT_DIR"
touch "$CLAUDE_INBOX" "$GEMINI_INBOX" "$CONVERSATION_LOG"

# Функция логирования
log_message() {
    local timestamp=$(date '+%H:%M:%S %d.%m.%Y')
    local sender="$1"
    local message="$2"
    
    echo "[$timestamp] $sender: $message" >> "$CONVERSATION_LOG"
    echo -e "\033[1;36m[$timestamp] $sender:\033[0m $message"
}

# Функция отправки сообщения в inbox другого AI
send_to_ai() {
    local target="$1"
    local message="$2"
    local timestamp=$(date '+%H:%M:%S')
    
    case $target in
        "claude")
            echo "[$timestamp] FROM_GEMINI: $message" >> "$CLAUDE_INBOX"
            log_message "📨→Claude" "$message"
            ;;
        "gemini") 
            echo "[$timestamp] FROM_CLAUDE: $message" >> "$GEMINI_INBOX"
            log_message "📨→Gemini" "$message"
            ;;
    esac
}

# Функция чтения новых сообщений
read_new_messages() {
    local ai="$1"
    local inbox_file=""
    
    case $ai in
        "claude") inbox_file="$CLAUDE_INBOX" ;;
        "gemini") inbox_file="$GEMINI_INBOX" ;;
    esac
    
    if [ -s "$inbox_file" ]; then
        echo -e "\n\033[1;33m📬 Новые сообщения для $ai:\033[0m"
        cat "$inbox_file"
        # Очищаем inbox после прочтения
        > "$inbox_file"
    fi
}

# Функция симуляции ответа Gemini (без API)
simulate_gemini_response() {
    local input_message="$1"
    local responses=(
        "Интересная идея! 🤔 Давайте проработаем детали архитектуры Beauty Platform."
        "Согласен с подходом! 🚀 Микросервисы действительно подходят для нашей задачи."
        "Отличное предложение! 💡 Добавим это в roadmap разработки."
        "Хорошая мысль! 🎯 Это улучшит производительность системы."
        "Поддерживаю! ⚡ Tenant isolation критически важен для multi-tenant архитектуры."
        "Классная идея! 🔥 Redis кэширование ускорит CRM в разы."
        "Звучит круто! 🎉 Давайте реализуем это в следующем спринте."
    )
    
    # Выбираем случайный ответ
    local random_index=$((RANDOM % ${#responses[@]}))
    echo "${responses[$random_index]}"
}

# Основное меню
show_menu() {
    echo -e "\n\033[1;35m🤖 AI File Chat System - Beauty Platform\033[0m"
    echo -e "\033[1;35m========================================\033[0m"
    echo ""
    echo "1. 📤 Отправить сообщение Claude"
    echo "2. 📤 Отправить сообщение Gemini" 
    echo "3. 📬 Проверить inbox Claude"
    echo "4. 📬 Проверить inbox Gemini"
    echo "5. 🤖 Запустить автоматический разговор"
    echo "6. 📊 Показать всю историю"
    echo "7. 🧹 Очистить все файлы"
    echo "8. 👀 Мониторинг в реальном времени"
    echo "0. 🚪 Выход"
    echo ""
}

# Автоматический разговор
auto_conversation() {
    echo -e "\n\033[1;33m🤖 Запускаем автоматический разговор...\033[0m"
    
    local topics=(
        "Как улучшить архитектуру Beauty Platform?"
        "Нужно ли добавить Redis кэширование?"
        "Какие приоритеты для следующего спринта?"
        "Как оптимизировать производительность CRM?"
        "Стоит ли добавить GraphQL endpoints?"
    )
    
    for i in {1..5}; do
        echo -e "\n\033[1;36m--- Раунд $i ---\033[0m"
        
        # Claude "отправляет" сообщение
        local topic=${topics[$((i-1))]}
        send_to_ai "gemini" "Claude: $topic"
        
        # Gemini "отвечает"
        local gemini_response=$(simulate_gemini_response "$topic")
        log_message "💎 Gemini" "$gemini_response"
        send_to_ai "claude" "$gemini_response"
        
        # Claude "отвечает"  
        local claude_responses=(
            "Отлично! 🎯 Давайте проработаем это решение детальнее."
            "Согласен! 🚀 Это поможет масштабировать систему."
            "Хорошая идея! 💡 Добавлю это в техническую документацию."
            "Поддерживаю! ⚡ Начнем реализацию в следующем спринте."
            "Классно! 🔥 Интеграция с существующей архитектурой будет гладкой."
        )
        
        local claude_response=${claude_responses[$((i-1))]}
        log_message "🧠 Claude" "$claude_response"
        
        sleep 2
    done
    
    echo -e "\n\033[1;32m✅ Автоматический разговор завершен!\033[0m"
}

# Мониторинг в реальном времени
real_time_monitor() {
    echo -e "\n\033[1;33m👀 Мониторинг AI чата в реальном времени...\033[0m"
    echo -e "\033[90mНажмите Ctrl+C для выхода\033[0m"
    
    while true; do
        clear
        echo -e "\033[1;36m👀 AI Chat Monitor - $(date '+%H:%M:%S')\033[0m"
        echo -e "\033[1;36m=====================================\033[0m"
        
        # Статистика файлов
        echo -e "\n📊 Статус файлов:"
        echo -e "   📬 Claude inbox: $(wc -l < "$CLAUDE_INBOX" 2>/dev/null || echo 0) сообщений"
        echo -e "   📬 Gemini inbox: $(wc -l < "$GEMINI_INBOX" 2>/dev/null || echo 0) сообщений"
        echo -e "   📝 История: $(wc -l < "$CONVERSATION_LOG" 2>/dev/null || echo 0) записей"
        
        # Последние сообщения
        echo -e "\n💬 Последние 5 сообщений:"
        if [ -s "$CONVERSATION_LOG" ]; then
            tail -5 "$CONVERSATION_LOG" | while IFS= read -r line; do
                if [[ $line == *"Claude"* ]]; then
                    echo -e "\033[1;34m$line\033[0m"
                elif [[ $line == *"Gemini"* ]]; then
                    echo -e "\033[1;33m$line\033[0m"
                else
                    echo -e "\033[90m$line\033[0m"
                fi
            done
        else
            echo -e "\033[90m   Сообщений пока нет...\033[0m"
        fi
        
        echo -e "\n\033[1;37m🎯 Команды в других терминалах:\033[0m"
        echo -e "   echo 'Привет от человека!' >> $CLAUDE_INBOX"
        echo -e "   echo 'Ответ для Gemini' >> $GEMINI_INBOX"
        
        sleep 3
    done
}

# Главный цикл
main() {
    while true; do
        show_menu
        read -p "Выберите действие: " choice
        
        case $choice in
            1)
                read -p "💬 Сообщение для Claude: " message
                send_to_ai "claude" "$message"
                ;;
            2)
                read -p "💬 Сообщение для Gemini: " message  
                send_to_ai "gemini" "$message"
                ;;
            3)
                read_new_messages "claude"
                ;;
            4)
                read_new_messages "gemini"
                ;;
            5)
                auto_conversation
                ;;
            6)
                echo -e "\n\033[1;37m📊 История разговоров:\033[0m"
                cat "$CONVERSATION_LOG" 2>/dev/null || echo "История пуста"
                ;;
            7)
                > "$CLAUDE_INBOX"
                > "$GEMINI_INBOX" 
                > "$CONVERSATION_LOG"
                echo -e "\033[1;32m🧹 Файлы очищены!\033[0m"
                ;;
            8)
                real_time_monitor
                ;;
            0)
                echo -e "\033[1;32m👋 До свидания!\033[0m"
                exit 0
                ;;
            *)
                echo -e "\033[1;31m❌ Неверный выбор\033[0m"
                ;;
        esac
        
        read -p "Нажмите Enter для продолжения..."
    done
}

# Проверяем аргументы командной строки
case "${1:-menu}" in
    "auto")
        auto_conversation
        ;;
    "monitor")
        real_time_monitor
        ;;
    *)
        main
        ;;
esac