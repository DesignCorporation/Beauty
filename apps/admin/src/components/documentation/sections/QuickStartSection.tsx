import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Rocket,
  ListChecks,
  Users,
  MonitorCheck,
  ShieldAlert,
  Target,
  HelpCircle,
  CheckCircle
} from 'lucide-react';

const quickStats = [
  { label: 'Время', value: '10 минут' },
  { label: 'Покрытие', value: '90% контекста' },
  { label: 'Экономия', value: '~270 минут' }
];

const roleBlocks = [
  {
    title: 'Backend',
    color: 'border-red-200 bg-red-50 text-red-800',
    points: [
      'Auth Service (6021) + CRM API (6022)',
      'Только tenantPrisma(tenantId)',
      'БД: beauty_platform_new + beauty_audit'
    ]
  },
  {
    title: 'Frontend',
    color: 'border-blue-200 bg-blue-50 text-blue-800',
    points: [
      'Порты: 6000–6003',
      '@beauty-platform/ui + Shadcn',
      'Auth: httpOnly cookies, без localStorage'
    ]
  },
  {
    title: 'DevOps',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    points: [
      'Прод: 135.181.156.117',
      'Stack: pnpm + nginx + PostgreSQL (6100)',
      'Auto-Restore v3.2 мониторит 6000–6027'
    ]
  },
  {
    title: 'Data / Product',
    color: 'border-amber-200 bg-amber-50 text-amber-800',
    points: [
      'Tenant isolation по salonId',
      'Migration plan → documentation/migration',
      'MCP выдаёт актуальные спецификации'
    ]
  }
];

const priorities = [
  'Синхронизация документации: админка ↔ файлы',
  'Актуальная MCP память для Claude/Gemini',
  'CRM Beta — финишные доработки календаря и клиентского потока',
  'Client & Service Management — UX полировка'
];

const donts = [
  'Не игнорируй tenant isolation и httpOnly токены',
  'Не используйте прямые prisma.* вызовы',
  'Не трать время на legacy-доки без запроса Task tool',
  'Не переписывай готовые решения из старого репо'
];

const dos = [
  'Всегда сверяйся с интерактивной документацией (админка)',
  'Используй Task tool для точечных поисков по архиву',
  'Проверяй существующие реализации перед разработкой',
  'Фиксируй изменения в CLAUDE.md + Codex.md'
];

export const QuickStartSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-6 h-6 text-emerald-600" />
          Быстрый старт Beauty Platform
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <p>Набор шагов, который даёт рабочий контекст за 10 минут. Сосредотачиваемся на том, <strong>где искать</strong> информацию, а не на перечитывании всего проекта.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickStats.map(stat => (
            <div key={stat.label} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <div className="text-emerald-900 font-semibold text-sm">{stat.value}</div>
              <div className="text-emerald-700 text-xs mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="w-5 h-5 text-blue-600" />
          Чек-лист входа (по порядку)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">1. Базовый контекст (2 минуты)</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><code>CLAUDE.md</code> — свежее состояние, роли и правила.</li>
            <li><code>Codex.md</code> — заметки для Codex CLI (портовка правил).</li>
            <li>Понимаем свою роль: backend, frontend, devops, data/product.</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">2. Интерактивная документация (3 минуты)</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li>Админка → <code>/documentation</code> — основной источник правды.</li>
            <li>Минимальный маршрут: Overview → Архитектура → Раздел по вашей роли.</li>
            <li>Секции отмечены датой обновления; зелёные — синхронизированы.</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">3. Проверка по роли (2 минуты)</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li>Открой блок «Что важно по ролям» ниже и отметь свою колонку.</li>
            <li>Перейди в профильные секции документации (Architecture, DevOps, CRM Development и т.д.).</li>
            <li>Зафиксируй ключевые ограничения: порты, сервисы, требования по безопасности.</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">4. Инструменты знаний (2 минуты)</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>MCP (services/mcp-server)</strong> — выдаёт актуальное состояние секций и API.</li>
            <li><strong>Task tool</strong> — точечный поиск в legacy-dokumentacji (пример: «найди решения для MFA»).</li>
            <li><strong>Logs</strong>: <code>logs/auto-restore/readable.log</code>, <code>logs/health-monitor.log</code>, <code>logs/crm-api-auth.log</code>.</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">5. Финальный просмотр (1 минута)</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li>Проверь активные таски в <code>DOCUMENTATION_SYNC_PLAN.md</code> и Roadmap.</li>
            <li>Убедись, что знаешь, где лежат Auto-Restore и DevOps скрипты.</li>
            <li>Сверь приоритеты ниже и переходи к задачам.</li>
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-purple-600" />
          Что важно по ролям
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
        {roleBlocks.map(role => (
          <div key={role.title} className={`rounded-lg border p-3 ${role.color}`}>
            <h5 className="font-semibold text-sm mb-2">{role.title}</h5>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              {role.points.map(point => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Чего избегать
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-red-700">
          {donts.map(item => (
            <div key={item} className="flex gap-2">
              <span className="mt-1">•</span>
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MonitorCheck className="w-5 h-5 text-emerald-600" />
            Что делать
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-emerald-700">
          {dos.map(item => (
            <div key={item} className="flex gap-2">
              <span className="mt-1">•</span>
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-orange-600" />
          Текущие приоритеты
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        {priorities.map(priority => (
          <div key={priority} className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{priority}</span>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          Если застрял
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ol className="list-decimal pl-6 space-y-1">
          <li>Проверить соответствующий раздел в админке (актуальный источник).</li>
          <li>Сформулировать запрос в Task tool или MCP с конкретной целью.</li>
          <li>Смотреть боевые логи: <code>logs/auto-restore/readable.log</code>, <code>logs/health-monitor.log</code>, <code>logs/crm-api-auth.log</code>.</li>
          <li>Свериться с CLAUDE.md — вероятно, ответ там уже зафиксирован.</li>
        </ol>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          Готов к работе
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <p>Если ты знаешь, где искать архитектурные схемы, как получить доступ к MCP/Task tool, и понимаешь приоритеты — onboarding завершён.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          {quickStats.map(stat => (
            <div key={stat.label} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-emerald-900 font-semibold text-sm">{stat.value}</div>
              <div className="text-emerald-700 text-xs mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-emerald-700 italic text-center">Главное — знать навигацию. Все решения уже описаны, нужно только дотянуться.</p>
      </CardContent>
    </Card>
  </div>
);
