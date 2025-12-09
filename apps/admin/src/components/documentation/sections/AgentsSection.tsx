import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Bot,
  Server,
  Users,
  Shield,
  ClipboardList,
  Terminal,
  AlertTriangle,
  Search,
  CheckCircle
} from 'lucide-react';

interface Stat {
  label: string;
  value: string;
}

interface AgentRole {
  name: string;
  focus: string;
  details: string[];
}

interface Endpoint {
  method: string;
  path: string;
  description: string;
}

const quickStats: Stat[] = [
  { label: 'MCP порт', value: '6025' },
  { label: 'Контексты', value: 'backend • frontend • devops • docs' },
  { label: 'Док секции', value: '26 из Admin Panel' },
  { label: 'Обновление', value: 'каждые 5 минут' }
];

const agentRoles: AgentRole[] = [
  {
    name: 'backend-dev',
    focus: 'Node.js · Express · Prisma · tenant isolation',
    details: ['Использует разделы Auth, API Gateway, CRM API.', 'Контролирует tenantPrisma() в примерах кода.', 'В ответе обязан соблюдать security правила.']
  },
  {
    name: 'frontend-dev',
    focus: 'React 18 · TypeScript · Shadcn/UI · Tailwind',
    details: ['Берёт контекст из Frontend, Styling, Auth.', 'Всегда рекомендует httpOnly + credentials include.', 'Поддерживает @beauty-platform/ui паттерны.']
  },
  {
    name: 'devops-engineer',
    focus: 'nginx · Auto-Restore · мониторинг · PostgreSQL',
    details: ['Использует DevOps, Auto-Restore, Monitoring.', 'Имеет доступ к health/metrics и smart restore API.', 'Может управлять master-orchestrator через MCP.']
  },
  {
    name: 'database-analyst',
    focus: 'PostgreSQL · Prisma schema · мультитенантность',
    details: ['Ссылается на Database/Architecture секции.', 'Проверяет ролей/прав пользователей.', 'Рекомендует миграции через DOCUMENTATION/Migration.']
  },
  {
    name: 'product-manager',
    focus: 'Roadmap · бизнес-фичи · документация',
    details: ['Читает Business, Roadmap, Checklist.', 'Синхронизирует задачи с DOCUMENTATION_SYNC_PLAN.md.', 'Следит за приоритетами CRM Beta.']
  },
  {
    name: 'ui-designer',
    focus: 'Design system · компоненты · UX',
    details: ['Использует Frontend, Styling, UI snippets.', 'Рекомендует изменения через @beauty-platform/ui.', 'Следит за соответствием бренду.']
  }
];

const mcpEndpoints: Endpoint[] = [
  { method: 'GET', path: '/mcp/smart-memory', description: 'Полный контекст проекта (обновляется автоматически).' },
  { method: 'GET', path: '/mcp/agent-context/:agent', description: 'Специализированный контекст для выбранного агента.' },
  { method: 'GET', path: '/mcp/search?q=', description: 'Поиск по документации Admin Panel + отчётам.' },
  { method: 'GET', path: '/mcp/project-state', description: 'Актуальный статус: сервисы, версии, приоритеты.' },
  { method: 'GET', path: '/mcp/checklist', description: 'Чек-лист задач и синхронизации документации.' },
  { method: 'GET', path: '/mcp/critical-rules', description: 'Security/architecture правила, обязательные для агентов.' }
];

const rulesDont = [
  'Не генерировать код без проверки tenant isolation и security.',
  'Не ссылаться на legacy /docs, если инфа уже в Admin Panel.',
  'Не менять порты/пути без обновления MCP и документации.',
  'Не игнорировать httpOnly токены и auth-паттерны.'
];

const rulesDo = [
  'Всегда запрашивать специализированный контекст перед ответом.',
  'Сверять факты с актуальными секциями Admin Panel.',
  'Использовать MCP search для уточнения деталей.',
  'Фиксировать изменения в Codex.md и CLAUDE.md после работы.'
];

const troubleshootingTips = [
  'Контекст устарел → перегенерируй через curl /mcp/smart-memory и убедись, что Admin Panel обновлена.',
  'Ответ не точен → уточни запрос через /mcp/search с конкретными ключевыми словами.',
  'Нет доступа к сервисам → проверь /mcp/project-state, Auto-Restore API и логи health-monitor.',
  'Agent контекст пуст → убедись, что имя агента корректно (backend-dev, frontend-dev и т.д.).'
];

export const AgentsSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-indigo-600" />
          AI Agents & MCP Integration
        </CardTitle>
        <p className="text-sm text-gray-600">
          Обновлено 19.09.2025. MCP Server агрегирует 26 секций документации и выдаёт специализированные контексты для Claude/Gemini агентов.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickStats.map((stat) => (
            <div key={stat.label} className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="text-indigo-900 font-semibold text-sm">{stat.value}</div>
              <div className="text-indigo-700 text-xs mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
        <p>Поток данных: Admin Panel → MCP парсер → специализированные контексты → агенты в Codex/Claude. Все обновления выполняются автоматически, но зависят от актуальности секций документации.</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Server className="w-5 h-5 text-green-600" />
          Архитектура MCP
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
          <h4 className="font-semibold text-green-900">Документация</h4>
          <ul className="list-disc pl-5 text-xs text-green-800 space-y-1">
            <li>26 TSX секций в Admin Panel (`/documentation`).</li>
            <li>Включены Architecture, Auth, API, DevOps и др.</li>
            <li>Обновления сразу попадают в MCP.</li>
          </ul>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-1">
          <h4 className="font-semibold text-purple-900">MCP Server</h4>
          <ul className="list-disc pl-5 text-xs text-purple-800 space-y-1">
            <li>Парсит секции каждые 5 минут.</li>
            <li>8 REST endpoint’ов, JSON ответы.</li>
            <li>Интеграция с Codex CLI и Task tool.</li>
          </ul>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-1">
          <h4 className="font-semibold text-orange-900">AI Агенты</h4>
          <ul className="list-disc pl-5 text-xs text-orange-800 space-y-1">
            <li>Claude + Gemini используют специализированные контексты.</li>
            <li>Понимают архитектуру, безопасность, процессы.</li>
            <li>Выполняют задачи по чеклистам и приоритетам.</li>
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-blue-600" />
          Специализированные агенты
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
        {agentRoles.map((agent) => (
          <div key={agent.name} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-blue-800">
              <span className="font-semibold">{agent.name}</span>
              <span>{agent.focus}</span>
            </div>
            <ul className="list-disc pl-5 text-xs text-blue-700 space-y-1">
              {agent.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="w-5 h-5 text-purple-600" />
          MCP API
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
        {mcpEndpoints.map((endpoint) => (
          <div key={endpoint.path} className="bg-white border border-border rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-500 text-white px-2 py-0.5 rounded text-xs font-mono uppercase">{endpoint.method}</span>
              <code className="font-mono text-xs text-foreground">{endpoint.path}</code>
            </div>
            <p className="text-xs text-muted-foreground">{endpoint.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-emerald-600" />
          Workflow агента
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <ol className="space-y-3">
          <li>
            <strong className="text-emerald-800">1. Получить контекст</strong>
            <pre className="bg-white border border-emerald-200 rounded p-2 text-xs mt-1">curl "http://localhost:6025/mcp/agent-context/backend-dev"</pre>
          </li>
          <li>
            <strong className="text-emerald-800">2. Уточнить детали</strong>
            <pre className="bg-white border border-emerald-200 rounded p-2 text-xs mt-1">curl "http://localhost:6025/mcp/search?q=tenant+isolation&agent=backend-dev"</pre>
          </li>
          <li>
            <strong className="text-emerald-800">3. Выполнить задачу</strong>
            <p className="text-xs text-gray-600">Использовать существующие паттерны, соблюдать security и tenant изоляцию.</p>
          </li>
          <li>
            <strong className="text-emerald-800">4. Проверить и зафиксировать</strong>
            <p className="text-xs text-gray-600">Результат проверяется, изменения фиксируются в документации/логах.</p>
          </li>
        </ol>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-red-500" />
          Правила
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
          <h4 className="font-semibold text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Запрещено
          </h4>
          <ul className="list-disc pl-5 text-xs text-red-700 space-y-1">
            {rulesDont.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-4 space-y-1">
          <h4 className="font-semibold text-green-900 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Обязательно
          </h4>
          <ul className="list-disc pl-5 text-xs text-green-700 space-y-1">
            {rulesDo.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="w-5 h-5 text-orange-600" />
          Диагностика
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <h4 className="font-semibold text-orange-900 mb-1">Полезные команды</h4>
          <pre className="bg-white rounded p-2 text-xs">{`# Проверка здоровья MCP
curl http://localhost:6025/health

# Просмотр последнего контента
curl http://localhost:6025/mcp/smart-memory | jq '.updatedAt'

# Проверка статуса проекта
curl http://localhost:6025/mcp/project-state`}</pre>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          {troubleshootingTips.map((tip) => (
            <div key={tip} className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);
