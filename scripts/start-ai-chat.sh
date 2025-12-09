#!/bin/bash

# AI Chat Starter для VS Code Terminal
# Быстрый запуск общения между Claude и Gemini

echo "🤖 AI Chat Bridge - Beauty Platform"
echo "================================="

# Проверка Python зависимостей
echo "📦 Проверяем зависимости..."

# Установка необходимых пакетов если их нет
pip3 install -q requests google-generativeai

# Создание директории для логов
mkdir -p /root/beauty-platform/logs

# Установка переменных окружения (если не установлены)
export CLAUDE_API_KEY="${CLAUDE_API_KEY:-your-claude-key-here}"
export GEMINI_API_KEY="${GEMINI_API_KEY:-your-gemini-key-here}"

echo "🚀 Запускаем общение AI..."
echo "Тема: ${1:-'Beauty Platform development'}"
echo ""

# Запуск основного скрипта
python3 /root/beauty-platform/scripts/ai-chat-bridge.py "$@"

echo ""
echo "📱 Для просмотра истории разговоров:"
echo "cat /root/beauty-platform/logs/ai-conversation.json | jq ."
echo ""
echo "📊 Логи системы:"
echo "tail -f /root/beauty-platform/logs/ai-chat.log"