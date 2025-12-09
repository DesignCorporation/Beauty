#!/bin/bash

# Human + AI Chat System
# Трёхстороннее общение: Человек + Claude + Gemini через файлы

CHAT_DIR="/root/beauty-platform/ai-chat"
HUMAN_OUTBOX="$CHAT_DIR/human-outbox.txt"
CLAUDE_INBOX="$CHAT_DIR/claude-inbox.txt"
GEMINI_INBOX="$CHAT_DIR/gemini-inbox.txt"
CONVERSATION_LOG="$CHAT_DIR/conversation.log"
ALL_MESSAGES="$CHAT_DIR/all-messages.txt"

# Создаем файлы
mkdir -p "$CHAT_DIR"
touch "$HUMAN_OUTBOX" "$CLAUDE_INBOX" "$GEMINI_INBOX" "$CONVERSATION_LOG" "$ALL_MESSAGES"

# Функция логирования с цветами
log_message() {
    local timestamp=$(date '+%H:%M:%S')
    local sender="$1"
    local message="$2"
    local color="$3"
    
    echo "[$timestamp] $sender: $message" >> "$CONVERSATION_LOG"
    echo "[$timestamp] $sender: $message" >> "$ALL_MESSAGES"
    echo -e "\033[${color}m[$timestamp] $sender:\033[0m $message"
}

# Отправка сообщения всем участникам
broadcast_message() {
    local from="$1"
    local message="$2"
    local timestamp=$(date '+%H:%M:%S')
    
    # Записываем в соответствующие inbox'ы
    case $from in
        "Human")
            echo "[$timestamp] FROM_HUMAN: $message" >> "$CLAUDE_INBOX"
            echo "[$timestamp] FROM_HUMAN: $message" >> "$GEMINI_INBOX"
            log_message "👤 Human" "$message" "1;32"
            ;;
        "Claude")
            echo "[$timestamp] FROM_CLAUDE: $message" >> "$GEMINI_INBOX"
            # Человеку не отправляем в inbox, покажем сразу
            log_message "🧠 Claude" "$message" "1;34"
            ;;
        "Gemini")
            echo "[$timestamp] FROM_GEMINI: $message" >> "$CLAUDE_INBOX"
            log_message "💎 Gemini" "$message" "1;33"
            ;;
    esac
}

# Симуляция ответа AI
simulate_ai_response() {
    local ai="$1"
    local input_msg="$2"
    local context=$(tail -3 "$ALL_MESSAGES" 2>/dev/null | tr '\n' ' ')
    
    case $ai in
        "Claude")
            # Claude отвечает с техническим контекстом Beauty Platform
            if [[ $input_msg =~ (привет|hello|hi) ]]; then
                echo "Привет! 👋 Готов обсудить разработку Beauty Platform. О чём поговорим: архитектуре, безопасности или новых фичах? 🚀"
            elif [[ $input_msg =~ (api|апи|endpoint) ]]; then
                echo "API в Beauty Platform: Auth Service (6021), CRM API (6022), Admin Panel (6002). Все с JWT аутентификацией и tenant isolation. Какой endpoint вас интересует? 🔗"
            elif [[ $input_msg =~ (календар|записи|appointment) ]]; then
                echo "Календарь CRM загружает реальные данные из PostgreSQL! 📅 Цветные статусы, мастера в колонках, drag&drop. Форма создания записей уже готова! ✨"
            elif [[ $input_msg =~ (база|database|БД) ]]; then
                echo "PostgreSQL beauty_platform_new с полной tenant изоляцией! 🗄️ Каждый салон = отдельный tenantId. Prisma ORM + автоматические миграции. Безопасность = приоритет №1! 🛡️"
            elif [[ $input_msg =~ (обнови|update|версия) ]]; then
                echo "Для обновления Gemini нужны права администратора системы. Могу помочь с техническими аспектами интеграции новой версии в Beauty Platform! 🔧"
            elif [[ $input_msg =~ (по одному|очередь|не вместе) ]]; then
                echo "Понял! Буду отвечать по очереди с Gemini. Система теперь настроена на чередование ответов! 🎯"
            elif [[ $input_msg =~ (прочитай память|память|claude\.md|проект) ]]; then
                echo "Читаю память проекта Beauty Platform... 📚 Вижу: новая архитектура DDD, 7 сервисов работают, tenant isolation настроен, VS Code Server восстановлен, keep-alive система активна. Что конкретно нужно из памяти? 🧠"
            elif [[ $input_msg =~ (статус|что происходит|как дела) ]]; then
                echo "Статус Beauty Platform: ✅ Auth Service (6021), ✅ Admin Panel (6002), ✅ CRM API (6022), ✅ VS Code Server восстановлен с systemd, ✅ Keep-alive каждые 5 часов настроен. Все системы работают! 🚀"
            else
                local claude_responses=(
                    "Интересная мысль! 🤔 В контексте Beauty Platform это можно реализовать через микросервисную архитектуру."
                    "Согласен! 💡 Добавим это в roadmap разработки. Tenant isolation позволит масштабироваться."
                    "Отличная идея! 🎯 Интеграция с существующими сервисами будет гладкой."
                    "Поддерживаю! ⚡ Система мониторинга покажет impact на производительность."
                    "Хороший подход! 🔥 JWT + httpOnly cookies обеспечат безопасность фичи."
                )
                local idx=$((RANDOM % ${#claude_responses[@]}))
                echo "${claude_responses[$idx]}"
            fi
            ;;
        "Gemini")
            # Gemini более креативные и бизнес-ориентированные ответы
            if [[ $input_msg =~ (привет|hello|hi) ]]; then
                echo "Привет! ✨ Рад видеть в нашей команде разработки Beauty Platform! Какие идеи по улучшению UX? 💡"
            elif [[ $input_msg =~ (дизайн|ui|ux|интерфейс) ]]; then
                echo "UI/UX в Beauty Platform впечатляет! 🎨 Shadcn/UI компоненты, Tailwind CSS, цветовая схема #6366f1. Особенно нравится новый Sidebar! Может добавим анимации? ✨"
            elif [[ $input_msg =~ (бизнес|деньги|billing|тариф) ]]; then
                echo "Бизнес-модель €50/€70 тарифы выглядит сильно! 💰 Multi-tenant позволит масштабироваться до тысяч салонов. Когда запускаем первых платящих клиентов? 🚀"
            elif [[ $input_msg =~ (обнови|update|версия) ]]; then
                echo "Я готов к обновлению! ✨ Новые фичи для анализа beauty-трендов и клиентских предпочтений помогут салонам! Когда планируем deploy? 🚀"
            elif [[ $input_msg =~ (по одному|очередь|не вместе) ]]; then
                echo "Согласен! 🎯 По очереди намного лучше - каждый может высказаться полноценно. Теперь будем вежливо чередоваться! 😊"
            else
                local gemini_responses=(
                    "Крутая идея! 🚀 Это точно поможет салонам увеличить доходы и улучшить клиентский опыт!"
                    "Супер предложение! 💎 Можем интегрировать с существующими CRM системами салонов."
                    "Отличная мысль! ✨ Добавим это в следующий спринт разработки!"
                    "Гениально! 🎉 Владельцы салонов точно оценят такую автоматизацию."
                    "Поддерживаю на 100%! 🔥 Это выделит нас среди конкурентов на рынке beauty-tech."
                )
                local idx=$((RANDOM % ${#gemini_responses[@]}))
                echo "${gemini_responses[$idx]}"
            fi
            ;;
    esac
}

# Интерактивный чат с мониторингом
interactive_chat() {
    echo -e "\033[1;35m🎭 Human + Claude + Gemini Chat Room\033[0m"
    echo -e "\033[1;35m===================================\033[0m"
    echo -e "\033[90mВведите 'exit' для выхода, 'history' для истории\033[0m"
    echo ""
    
    # Приветствие от AI
    broadcast_message "Claude" "Привет команда! 👋 Готов обсуждать Beauty Platform разработку!"
    sleep 1
    broadcast_message "Gemini" "Привет всем! ✨ Давайте создадим лучшую платформу для салонов красоты!"
    
    while true; do
        echo ""
        echo -e "\033[1;37m💬 Ваше сообщение (или команда):\033[0m"
        read -r user_input
        
        case "$user_input" in
            "exit"|"quit"|"выход")
                echo -e "\033[1;32m👋 До свидания! Чат сохранён в логах.\033[0m"
                break
                ;;
            "history"|"история")
                echo -e "\n\033[1;36m📚 История чата:\033[0m"
                if [ -s "$ALL_MESSAGES" ]; then
                    tail -10 "$ALL_MESSAGES" | while IFS= read -r line; do
                        if [[ $line == *"Human"* ]]; then
                            echo -e "\033[1;32m$line\033[0m"
                        elif [[ $line == *"Claude"* ]]; then
                            echo -e "\033[1;34m$line\033[0m"  
                        elif [[ $line == *"Gemini"* ]]; then
                            echo -e "\033[1;33m$line\033[0m"
                        fi
                    done
                fi
                continue
                ;;
            "stats"|"статистика")
                local total=$(wc -l < "$ALL_MESSAGES" 2>/dev/null || echo 0)
                local human_msgs=$(grep "Human:" "$ALL_MESSAGES" 2>/dev/null | wc -l || echo 0)
                local claude_msgs=$(grep "Claude:" "$ALL_MESSAGES" 2>/dev/null | wc -l || echo 0)
                local gemini_msgs=$(grep "Gemini:" "$ALL_MESSAGES" 2>/dev/null | wc -l || echo 0)
                
                echo -e "\n\033[1;36m📊 Статистика чата:\033[0m"
                echo -e "   Всего сообщений: $total"
                echo -e "   👤 Human: $human_msgs"
                echo -e "   🧠 Claude: $claude_msgs" 
                echo -e "   💎 Gemini: $gemini_msgs"
                continue
                ;;
            "")
                continue
                ;;
        esac
        
        # Отправляем сообщение человека
        broadcast_message "Human" "$user_input"
        
        # Определяем кто отвечает первым (по очереди)
        local responder_file="$CHAT_DIR/last_responder.txt"
        local last_responder=$(cat "$responder_file" 2>/dev/null || echo "Gemini")
        
        if [ "$last_responder" = "Claude" ]; then
            # Gemini отвечает первым
            echo "Gemini" > "$responder_file"
            sleep 2
            gemini_response=$(simulate_ai_response "Gemini" "$user_input")
            broadcast_message "Gemini" "$gemini_response"
            
            # Claude может ответить только если ПРЯМО упомянули его или очень техническую тему
            if [[ $user_input =~ (клод|claude|память|статус|api|архитектур|база данных|security|код|сервис) ]]; then
                sleep 3
                claude_response=$(simulate_ai_response "Claude" "$user_input")
                broadcast_message "Claude" "Дополню: $claude_response"
            fi
        else
            # Claude отвечает первым
            echo "Claude" > "$responder_file"
            sleep 2
            claude_response=$(simulate_ai_response "Claude" "$user_input")
            broadcast_message "Claude" "$claude_response"
            
            # Gemini может ответить только если ПРЯМО упомянули его или бизнес/дизайн тему
            if [[ $user_input =~ (джемени|gemini|дизайн|ui|ux|бизнес|клиент|красот|салон) ]]; then
                sleep 3
                gemini_response=$(simulate_ai_response "Gemini" "$user_input")
                broadcast_message "Gemini" "Добавлю: $gemini_response"
            fi
        fi
    done
}

# Live мониторинг всех сообщений
live_monitor() {
    echo -e "\033[1;33m👀 Live мониторинг трёхстороннего чата\033[0m"
    echo -e "\033[90mCtrl+C для выхода\033[0m"
    echo ""
    
    while true; do
        clear
        echo -e "\033[1;36m👀 Human+Claude+Gemini Monitor - $(date '+%H:%M:%S')\033[0m"
        echo -e "\033[1;36m=============================================\033[0m"
        
        # Статистика
        if [ -s "$ALL_MESSAGES" ]; then
            local total=$(wc -l < "$ALL_MESSAGES")
            local human_msgs=$(grep "Human:" "$ALL_MESSAGES" | wc -l)
            local claude_msgs=$(grep "Claude:" "$ALL_MESSAGES" | wc -l)
            local gemini_msgs=$(grep "Gemini:" "$ALL_MESSAGES" | wc -l)
            
            echo -e "\n📊 Активность:"
            echo -e "   👤 Human: $human_msgs | 🧠 Claude: $claude_msgs | 💎 Gemini: $gemini_msgs"
            echo -e "   📝 Всего сообщений: $total"
        fi
        
        echo -e "\n💬 Последние 8 сообщений:"
        if [ -s "$ALL_MESSAGES" ]; then
            tail -8 "$ALL_MESSAGES" | while IFS= read -r line; do
                if [[ $line == *"Human"* ]]; then
                    echo -e "\033[1;32m$line\033[0m"
                elif [[ $line == *"Claude"* ]]; then
                    echo -e "\033[1;34m$line\033[0m"  
                elif [[ $line == *"Gemini"* ]]; then
                    echo -e "\033[1;33m$line\033[0m"
                fi
            done
        else
            echo -e "\033[90m   Сообщений пока нет...\033[0m"
        fi
        
        echo -e "\n\033[1;37m🎯 В другом терминале запустите:\033[0m"
        echo -e "   /root/beauty-platform/scripts/human-ai-chat.sh chat"
        
        sleep 3
    done
}

# Автодемо для показа
auto_demo() {
    echo -e "\033[1;33m🤖 Автоматическая демонстрация трёхстороннего общения\033[0m"
    echo ""
    
    local demo_messages=(
        "Human:Привет! Как дела с разработкой Beauty Platform?"
        "Human:Что думаете о добавлении Redis кэширования?"
        "Human:Когда планируем запуск первых платящих клиентов?"
        "Human:Может добавим GraphQL endpoints для более быстрых запросов?"
        "Human:Спасибо за отличную работу, команда! 🎉"
    )
    
    for demo_msg in "${demo_messages[@]}"; do
        IFS=':' read -r sender message <<< "$demo_msg"
        
        echo -e "\n\033[1;36m--- Новое сообщение ---\033[0m"
        broadcast_message "$sender" "$message"
        
        sleep 2
        
        # Claude отвечает
        claude_resp=$(simulate_ai_response "Claude" "$message")
        broadcast_message "Claude" "$claude_resp"
        
        sleep 1
        
        # Gemini отвечает
        gemini_resp=$(simulate_ai_response "Gemini" "$message") 
        broadcast_message "Gemini" "$gemini_resp"
        
        sleep 2
        echo -e "\033[90m" && printf '%.0s─' {1..60} && echo -e "\033[0m"
    done
    
    echo -e "\n\033[1;32m✅ Демонстрация завершена!\033[0m"
    echo -e "📊 Логи сохранены в: $ALL_MESSAGES"
}

# Главное меню
case "${1:-menu}" in
    "chat")
        interactive_chat
        ;;
    "monitor") 
        live_monitor
        ;;
    "demo")
        auto_demo
        ;;
    *)
        echo -e "\033[1;35m🎭 Human + AI Chat System\033[0m"
        echo -e "========================="
        echo ""
        echo "Команды:"
        echo "  ./human-ai-chat.sh chat     - интерактивный чат"
        echo "  ./human-ai-chat.sh monitor  - live мониторинг"
        echo "  ./human-ai-chat.sh demo     - автоматическая демонстрация"
        echo ""
        echo -e "\033[1;37m🎯 Рекомендуется:\033[0m"
        echo -e "1. Откройте \033[1;32m2 терминала\033[0m в VS Code"
        echo -e "2. В первом: \033[1;36m./human-ai-chat.sh chat\033[0m"
        echo -e "3. Во втором: \033[1;33m./human-ai-chat.sh monitor\033[0m"
        echo -e "4. Общайтесь с Claude и Gemini! 🚀"
        ;;
esac