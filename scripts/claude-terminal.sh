#!/bin/bash

# Claude Terminal - отдельный терминал для Claude с межAI коммуникацией
# Работает как обычный Claude, но может отправлять сообщения Gemini

CHAT_DIR="/root/beauty-platform/ai-chat"
CLAUDE_OUTBOX="$CHAT_DIR/claude-outbox.txt"
GEMINI_INBOX="$CHAT_DIR/gemini-inbox.txt"
GEMINI_OUTBOX="$CHAT_DIR/gemini-outbox.txt"
CLAUDE_INBOX="$CHAT_DIR/claude-inbox.txt"

# Создаем файлы
mkdir -p "$CHAT_DIR"
touch "$CLAUDE_OUTBOX" "$GEMINI_INBOX" "$GEMINI_OUTBOX" "$CLAUDE_INBOX"

echo -e "\033[1;34m🧠 Claude Terminal - Beauty Platform AI Assistant\033[0m"
echo -e "\033[1;34m================================================\033[0m"
echo -e "\033[90mДоступные команды:\033[0m"
echo -e "  \033[1;32msend gemini <сообщение>\033[0m  - отправить сообщение Gemini"
echo -e "  \033[1;32mcheck messages\033[0m            - проверить новые сообщения от Gemini"
echo -e "  \033[1;32mshow chat\033[0m                 - показать историю общения с Gemini"
echo -e "  \033[1;32mclear chat\033[0m                - очистить историю"
echo -e "  \033[1;32mexit\033[0m                      - выход"
echo ""

# Функция отправки сообщения Gemini
send_to_gemini() {
    local message="$*"
    local timestamp=$(date '+%H:%M:%S')
    
    echo "[$timestamp] Claude: $message" >> "$CLAUDE_OUTBOX"
    echo "[$timestamp] FROM_CLAUDE: $message" >> "$GEMINI_INBOX"
    
    echo -e "\033[1;32m📨 Сообщение отправлено Gemini:\033[0m $message"
    echo -e "\033[90m   (Gemini увидит это в своём терминале)\033[0m"
}

# Функция проверки новых сообщений от Gemini
check_messages() {
    if [ -s "$CLAUDE_INBOX" ]; then
        echo -e "\033[1;33m📬 Новые сообщения от Gemini:\033[0m"
        echo -e "\033[1;33m" && cat "$CLAUDE_INBOX" && echo -e "\033[0m"
        
        # Копируем в историю
        cat "$CLAUDE_INBOX" >> "$CHAT_DIR/claude-gemini-history.log"
        
        # Очищаем inbox
        > "$CLAUDE_INBOX"
    else
        echo -e "\033[90m📭 Новых сообщений от Gemini нет\033[0m"
    fi
}

# Функция показа истории чата
show_chat_history() {
    local history_file="$CHAT_DIR/claude-gemini-history.log"
    
    if [ -s "$history_file" ]; then
        echo -e "\033[1;37m📚 История общения Claude ↔ Gemini:\033[0m"
        echo -e "\033[90m" && printf '%.0s─' {1..50} && echo -e "\033[0m"
        
        tail -20 "$history_file" | while IFS= read -r line; do
            if [[ $line == *"Claude:"* ]]; then
                echo -e "\033[1;34m$line\033[0m"
            elif [[ $line == *"Gemini:"* ]]; then
                echo -e "\033[1;33m$line\033[0m"
            else
                echo -e "\033[90m$line\033[0m"
            fi
        done
        
        echo -e "\033[90m" && printf '%.0s─' {1..50} && echo -e "\033[0m"
    else
        echo -e "\033[90m📄 История общения с Gemini пуста\033[0m"
    fi
}

# Автоматический показ новых сообщений от Gemini
auto_show_messages() {
    while true; do
        sleep 2
        if [ -s "$CLAUDE_INBOX" ]; then
            # Показываем сообщения сразу
            echo -e "\n\033[1;33m📬 НОВОЕ СООБЩЕНИЕ ОТ GEMINI:\033[0m"
            echo -e "\033[1;33m" && cat "$CLAUDE_INBOX" && echo -e "\033[0m"
            
            # Копируем в историю
            cat "$CLAUDE_INBOX" >> "$CHAT_DIR/claude-gemini-history.log"
            
            # Очищаем inbox
            > "$CLAUDE_INBOX"
            
            # Показываем приглашение заново
            echo -e -n "\033[1;34mclaude>\033[0m "
        fi
    done &
}

# Запускаем автоматический показ сообщений  
auto_show_messages

# Основной цикл Claude терминала
echo -e "\033[1;34m🧠 Claude готов к работе! Обычные вопросы и команды межAI общения поддерживаются.\033[0m"
echo ""

while true; do
    echo -e -n "\033[1;34mclaude>\033[0m "
    read -r user_input
    
    # Обработка команд межAI общения
    if [[ $user_input == "send gemini "* ]]; then
        message=${user_input#"send gemini "}
        send_to_gemini "$message"
        
    elif [[ $user_input == "check messages" ]]; then
        check_messages
        
    elif [[ $user_input == "show chat" ]]; then
        show_chat_history
        
    elif [[ $user_input == "clear chat" ]]; then
        > "$CHAT_DIR/claude-gemini-history.log"
        echo -e "\033[1;32m🧹 История чата очищена\033[0m"
        
    elif [[ $user_input == "exit" ]]; then
        echo -e "\033[1;32m👋 До свидания!\033[0m"
        # Убиваем фоновый процесс автопроверки
        jobs -p | xargs -r kill
        exit 0
        
    elif [[ $user_input == "" ]]; then
        continue
        
    else
        # Обычные вопросы к Claude (симуляция)
        echo -e "\033[1;34m🧠 Claude:\033[0m"
        
        # Симуляция ответов Claude с контекстом Beauty Platform
        if [[ $user_input =~ (привет|hello|hi) ]]; then
            echo "Привет! 👋 Я Claude, готов помочь с Beauty Platform. Также могу общаться с Gemini через команду 'send gemini <сообщение>'. О чём поговорим?"
            
        elif [[ $user_input =~ (память|проект|статус) ]]; then
            echo "📚 Beauty Platform состояние: новая DDD архитектура, 7 сервисов работают (Auth 6021, Admin 6002, CRM 6022), tenant isolation настроен, VS Code Server восстановлен с systemd, keep-alive система каждые 5 часов активна. Все системы стабильны! 🚀"
            
        elif [[ $user_input =~ (api|архитектур|микросервис) ]]; then
            echo "🔗 API архитектура Beauty Platform: Auth Service (6021) с JWT, CRM API (6022) с tenant isolation, Admin Panel (6002). Все с security middleware, rate limiting, CORS protection. PostgreSQL beauty_platform_new с полной изоляцией салонов."
            
        elif [[ $user_input =~ (джемени|gemini|общение) ]]; then
            echo "💬 Для общения с Gemini используйте команду: 'send gemini <ваше сообщение>'. Gemini получит сообщение в своём терминале. Проверить ответы: 'check messages'. История: 'show chat'."
            
        elif [[ $user_input =~ (help|помощь|команды) ]]; then
            echo "🎯 Доступные команды:"
            echo "• send gemini <текст> - отправить сообщение Gemini"  
            echo "• check messages - проверить ответы от Gemini"
            echo "• show chat - показать историю общения"
            echo "• clear chat - очистить историю"
            echo "• Любые обычные вопросы по Beauty Platform"
            
        else
            # Обычные ответы Claude
            local responses=(
                "Интересный вопрос! 🤔 В контексте Beauty Platform можно реализовать через микросервисную архитектуру с tenant isolation."
                "Отличная идея! 💡 Добавим это в roadmap. Система мониторинга покажет impact на производительность."
                "Согласен! 🎯 JWT + httpOnly cookies обеспечат безопасность. Интеграция будет гладкой."
                "Поддерживаю! ⚡ Tenant isolation позволит масштабироваться. Можем обсудить с Gemini через 'send gemini'."
            )
            local idx=$((RANDOM % ${#responses[@]}))
            echo "${responses[$idx]}"
        fi
        echo ""
    fi
done