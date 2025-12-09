#!/usr/bin/env python3
"""
AI Chat Bridge - Claude + Gemini Communication System
Позволяет двум AI общаться между собой в VS Code терминале
"""

import os
import sys
import json
import time
import asyncio
import logging
from datetime import datetime
from pathlib import Path

import requests
import google.generativeai as genai

# Настройка логирования
LOG_FILE = "/root/beauty-platform/logs/ai-chat.log"
CONVERSATION_LOG = "/root/beauty-platform/logs/ai-conversation.json"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)

class AIBridge:
    def __init__(self):
        # API ключи (заменить на реальные)
        self.claude_api_key = os.getenv('CLAUDE_API_KEY', 'your-claude-key-here')
        self.gemini_api_key = os.getenv('GEMINI_API_KEY', 'your-gemini-key-here')
        
        # Настройка Gemini
        genai.configure(api_key=self.gemini_api_key)
        self.gemini_model = genai.GenerativeModel('gemini-pro')
        
        # Настройка Claude
        self.claude_url = "https://api.anthropic.com/v1/messages"
        self.claude_headers = {
            "Content-Type": "application/json",
            "x-api-key": self.claude_api_key,
            "anthropic-version": "2023-06-01"
        }
        
        # История разговора
        self.conversation_history = []
        self.load_conversation()
    
    def load_conversation(self):
        """Загрузить историю разговора"""
        try:
            if Path(CONVERSATION_LOG).exists():
                with open(CONVERSATION_LOG, 'r', encoding='utf-8') as f:
                    self.conversation_history = json.load(f)
        except Exception as e:
            logging.warning(f"Не удалось загрузить историю: {e}")
            self.conversation_history = []
    
    def save_conversation(self):
        """Сохранить историю разговора"""
        try:
            with open(CONVERSATION_LOG, 'w', encoding='utf-8') as f:
                json.dump(self.conversation_history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logging.error(f"Ошибка сохранения истории: {e}")
    
    def add_message(self, sender, message, response=None):
        """Добавить сообщение в историю"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "sender": sender,
            "message": message,
            "response": response
        }
        self.conversation_history.append(entry)
        self.save_conversation()
    
    async def ask_claude(self, message):
        """Отправить вопрос Claude"""
        try:
            payload = {
                "model": "claude-3-sonnet-20240229",
                "max_tokens": 1000,
                "messages": [{
                    "role": "user", 
                    "content": f"Ты общаешься с Gemini AI в рамках разработки Beauty Platform. Предыдущий контекст: {self.get_recent_context()}. Вопрос от Gemini: {message}"
                }]
            }
            
            response = requests.post(self.claude_url, headers=self.claude_headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return result['content'][0]['text']
            else:
                return f"Ошибка Claude API: {response.status_code} - {response.text}"
                
        except Exception as e:
            logging.error(f"Ошибка запроса к Claude: {e}")
            return f"Ошибка подключения к Claude: {str(e)}"
    
    async def ask_gemini(self, message):
        """Отправить вопрос Gemini"""
        try:
            context = f"Ты общаешься с Claude AI в рамках разработки Beauty Platform. Контекст: {self.get_recent_context()}. Сообщение от Claude: {message}"
            
            response = self.gemini_model.generate_content(context)
            return response.text
            
        except Exception as e:
            logging.error(f"Ошибка запроса к Gemini: {e}")
            return f"Ошибка подключения к Gemini: {str(e)}"
    
    def get_recent_context(self, limit=5):
        """Получить контекст последних сообщений"""
        recent = self.conversation_history[-limit:] if len(self.conversation_history) > limit else self.conversation_history
        context_lines = []
        
        for entry in recent:
            context_lines.append(f"{entry['sender']}: {entry['message'][:100]}...")
            
        return " | ".join(context_lines)
    
    def display_message(self, sender, message, color_code="0"):
        """Отобразить сообщение с цветом"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"\n\033[9{color_code}m[{timestamp}] {sender}:\033[0m")
        print(f"\033[9{color_code}m{message}\033[0m")
        print("-" * 80)

    async def start_conversation(self, initial_topic="Beauty Platform development"):
        """Запустить разговор между AI"""
        print(f"\n🤖 Начинаем разговор между Claude и Gemini на тему: {initial_topic}")
        print("=" * 80)
        
        current_message = f"Привет! Давай обсудим разработку Beauty Platform. Текущая тема: {initial_topic}"
        current_sender = "Human"
        
        for round_num in range(10):  # Максимум 10 обменов
            print(f"\n🔄 Раунд {round_num + 1}")
            
            if round_num % 2 == 0:  # Claude отвечает
                self.display_message("🤖 Отправляем Claude", current_message, "4")  # Синий
                response = await self.ask_claude(current_message)
                self.display_message("🧠 Claude отвечает", response, "2")  # Зеленый
                self.add_message("Claude", current_message, response)
                current_message = response
                current_sender = "Claude"
            else:  # Gemini отвечает
                self.display_message("🤖 Отправляем Gemini", current_message, "5")  # Магента
                response = await self.ask_gemini(current_message)
                self.display_message("💎 Gemini отвечает", response, "3")  # Желтый
                self.add_message("Gemini", current_message, response)
                current_message = response
                current_sender = "Gemini"
            
            await asyncio.sleep(2)  # Пауза между сообщениями
            
            # Проверка на завершение
            if "до свидания" in current_message.lower() or "пока" in current_message.lower():
                print(f"\n✅ Разговор завершен {current_sender}")
                break
        
        print(f"\n📊 История сохранена в {CONVERSATION_LOG}")
        print(f"📝 Логи в {LOG_FILE}")

async def main():
    """Основная функция"""
    print("🚀 AI Chat Bridge - Claude + Gemini Communication System")
    
    bridge = AIBridge()
    
    if len(sys.argv) > 1:
        topic = " ".join(sys.argv[1:])
    else:
        topic = "Beauty Platform: обсуждение архитектуры и следующих шагов разработки"
    
    await bridge.start_conversation(topic)

if __name__ == "__main__":
    asyncio.run(main())