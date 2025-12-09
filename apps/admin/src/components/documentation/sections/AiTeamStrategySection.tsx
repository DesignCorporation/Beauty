import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { Users, BrainCircuit, ShieldCheck } from 'lucide-react';

export const AiTeamStrategySection: React.FC = () => (
  <div className="space-y-6">
    <h1 className="text-4xl font-bold">🤖 AI Team Strategy</h1>
    <p className="text-lg text-gray-600">Принципы работы и распределение ролей в команде AI-агентов.</p>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          Роли Агентов
        </CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2 p-4 border rounded-lg">
          <h3 className="font-semibold text-xl">Gemini (Project Lead & Architect)</h3>
          <p className="text-gray-700">Отвечает за высокоуровневое планирование, архитектуру, аудиты и стратегические решения. Ставит задачи для других агентов.</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Анализ системы и документации.</li>
            <li>Создание и ведение планов-чеклистов.</li>
            <li>Контроль качества и соответствия архитектуре.</li>
            <li>Основной интерфейс для взаимодействия с пользователем-человеком.</li>
          </ul>
        </div>
        <div className="space-y-2 p-4 border rounded-lg">
          <h3 className="font-semibold text-xl">Claude (Technical Specialist)</h3>
          <p className="text-gray-700">Сильный технический исполнитель. Отвечает за реализацию конкретных, четко поставленных задач.</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Написание кода по задачам (Backend, Frontend).</li>
            <li>Работа с базами данных, DevOps, безопасность.</li>
            <li>Рефакторинг и оптимизация производительности.</li>
            <li>Предпочитает задачи с тегами [STRICT] и [INITIATIVE_OK].</li>
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6" />
          Процесс Работы
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold">1. Постановка Задачи</h4>
          <p className="text-sm">Пользователь ставит высокоуровневую задачу Gemini.</p>
        </div>
        <div>
          <h4 className="font-semibold">2. Аудит и Планирование</h4>
          <p className="text-sm">Gemini проводит аудит, декомпозирует задачу и создает детальный план-чеклист.</p>
        </div>
        <div>
          <h4 className="font-semibold">3. Делегирование</h4>
          <p className="text-sm">Gemini ставит конкретные технические подзадачи для Claude.</p>
        </div>
        <div>
          <h4 className="font-semibold">4. Исполнение и Верификация</h4>
          <p className="text-sm">Claude выполняет задачу. Gemini проверяет результат на соответствие общему плану и архитектуре.</p>
        </div>
      </CardContent>
    </Card>

    <Card className="border-red-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <ShieldCheck className="w-6 h-6" />
          Ключевые Правила (Запреты)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>🚫 **ЗАПРЕТ:** Claude не должен принимать стратегических решений или вносить изменения, не предусмотренные планом от Gemini.</p>
        <p>🚫 **ЗАПРЕТ:** Любые изменения в системе должны начинаться с аудита и планирования, а не с написания кода.</p>
        <p>🚫 **ЗАПРЕТ:** Использование устаревших технологий (например, **PM2**) строго запрещено. Все агенты должны работать в рамках актуальной архитектуры.</p>
      </CardContent>
    </Card>

  </div>
);