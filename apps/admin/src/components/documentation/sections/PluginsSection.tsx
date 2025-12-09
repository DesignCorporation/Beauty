import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui';
import { Puzzle, Command, Bot, Webhook, CheckCircle, Code, Zap } from 'lucide-react';

export const PluginsSection: React.FC = () => (
  <div className="space-y-6">
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Puzzle className="h-6 w-6" />
          Claude Code Plugins System
        </CardTitle>
        <p className="text-sm text-purple-800">
          Обновлено 10.10.2025. Claude Code v2.0.13 поддерживает plugin system для расширения функциональности через custom commands, agents, hooks и MCP integrations.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-purple-900">
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <h4 className="font-semibold mb-2">🎯 Что такое плагины?</h4>
          <p>
            Плагины - это коллекции slash-команд, специализированных агентов, hooks и MCP серверов, 
            которые устанавливаются одной командой и работают в terminal и VS Code.
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <h4 className="font-semibold mb-2">📦 Установка community плагинов</h4>
          <pre className="bg-purple-100 rounded p-2 mt-2 text-xs">{`# Добавить marketplace
/plugin marketplace add davila7/claude-code-templates
/plugin marketplace add hesreallyhim/awesome-claude-code-agents

# Просмотр доступных плагинов
/plugin

# Установка конкретного плагина
/plugin install security-auditor@davila7`}</pre>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Command className="h-5 w-5 text-indigo-600" />
          Beauty Platform Plugin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-start gap-2 mb-2">
            <Badge className="bg-indigo-600">Локальный плагин</Badge>
            <Badge variant="outline" className="border-indigo-400 text-indigo-700">v1.0.0</Badge>
          </div>
          <p className="text-indigo-900 font-medium mb-2">
            Кастомный плагин для Beauty Platform с автоматизацией разработки, tenant isolation проверками и MCP интеграцией.
          </p>
          <p className="text-xs text-indigo-700">
            <strong>Локация:</strong> <code>.claude-plugin/</code> в корне проекта
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" />
            Доступные команды (6)
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-muted rounded p-3 border border-border">
              <code className="text-indigo-600 font-semibold">/check-tenant-isolation</code>
              <p className="text-xs mt-1">Проверка tenant isolation в database queries</p>
            </div>
            <div className="bg-muted rounded p-3 border border-border">
              <code className="text-indigo-600 font-semibold">/deploy-service</code>
              <p className="text-xs mt-1">Быстрый деплой через orchestrator</p>
            </div>
            <div className="bg-muted rounded p-3 border border-border">
              <code className="text-indigo-600 font-semibold">/sync-docs</code>
              <p className="text-xs mt-1">Синхронизация документации с MCP</p>
            </div>
            <div className="bg-muted rounded p-3 border border-border">
              <code className="text-indigo-600 font-semibold">/backup-db</code>
              <p className="text-xs mt-1">Timestamped PostgreSQL backup</p>
            </div>
            <div className="bg-muted rounded p-3 border border-border">
              <code className="text-indigo-600 font-semibold">/test-auth-flow</code>
              <p className="text-xs mt-1">E2E тестирование аутентификации</p>
            </div>
            <div className="bg-muted rounded p-3 border border-border">
              <code className="text-indigo-600 font-semibold">/check-services</code>
              <p className="text-xs mt-1">Health check всех микросервисов</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-4 w-4 text-green-600" />
            Специализированные агенты (4)
          </h4>
          
          <div className="space-y-2">
            <div className="bg-green-50 rounded p-3 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-green-700 font-semibold">tenant-guardian</code>
                <Badge className="bg-green-600 text-xs">Security</Badge>
              </div>
              <p className="text-xs text-green-800">
                Multi-tenant security specialist. Проверяет tenant isolation, запрещает direct prisma calls.
              </p>
              <pre className="bg-white rounded p-2 mt-2 text-xs text-green-900">{`/agent tenant-guardian "Review services/crm-api/ for violations"`}</pre>
            </div>

            <div className="bg-blue-50 rounded p-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-blue-700 font-semibold">crm-developer</code>
                <Badge className="bg-blue-600 text-xs">CRM Expert</Badge>
              </div>
              <p className="text-xs text-blue-800">
                CRM business logic expert. Знает Appointments, Clients, Services, Staff, Calendar patterns.
              </p>
              <pre className="bg-white rounded p-2 mt-2 text-xs text-blue-900">{`/agent crm-developer "Add loyalty points to client profile"`}</pre>
            </div>

            <div className="bg-amber-50 rounded p-3 border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-amber-700 font-semibold">payment-specialist</code>
                <Badge className="bg-amber-600 text-xs">Payments</Badge>
              </div>
              <p className="text-xs text-amber-800">
                Payment service expert. Stripe/PayPal, webhooks, idempotency, PDF invoices, refunds.
              </p>
              <pre className="bg-white rounded p-2 mt-2 text-xs text-amber-900">{`/agent payment-specialist "Debug Stripe refund webhook"`}</pre>
            </div>

            <div className="bg-purple-50 rounded p-3 border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-purple-700 font-semibold">mcp-integrator</code>
                <Badge className="bg-purple-600 text-xs">MCP</Badge>
              </div>
              <p className="text-xs text-purple-800">
                MCP server integration specialist. Обучает агентов использовать project memory (port 6025).
              </p>
              <pre className="bg-white rounded p-2 mt-2 text-xs text-purple-900">{`/agent mcp-integrator "Show how to query architecture docs"`}</pre>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Webhook className="h-4 w-4 text-rose-600" />
            Hooks
          </h4>
          
          <div className="bg-rose-50 rounded p-3 border border-rose-200">
            <code className="text-rose-700 font-semibold">pre-commit</code>
            <p className="text-xs text-rose-800 mt-1">
              Автоматическая проверка tenant isolation перед каждым git commit. 
              Блокирует commit если найдены direct prisma calls.
            </p>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <Code className="h-4 w-4" />
            MCP Integration
          </h4>
          <p className="text-xs text-purple-800 mb-2">
            Все агенты имеют автоматический доступ к MCP server (http://localhost:6025):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-purple-900">
            <li><code>/mcp/smart-memory</code> - полная память проекта</li>
            <li><code>/mcp/agent-context/{'type'}</code> - контекст для агентов</li>
            <li><code>/mcp/search?q=...</code> - поиск по документации</li>
            <li><code>/mcp/registry</code> - список документов</li>
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          Community Plugins
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-2">Dan Ávila's Templates</h4>
            <Badge variant="outline" className="mb-2">davila7/claude-code-templates</Badge>
            <p className="text-xs mb-2">100+ агентов, команд и настроек для разработки</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Security Auditor</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>React Performance Optimizer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Database Architect</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>MCP: GitHub, PostgreSQL, Stripe, AWS</span>
              </div>
            </div>
            <pre className="bg-muted rounded p-2 mt-2 text-xs">{`/plugin marketplace add davila7/claude-code-templates`}</pre>
          </div>

          <div className="bg-muted rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-2">Seth Hobson's Agents</h4>
            <Badge variant="outline" className="mb-2">hesreallyhim/awesome-claude-code-agents</Badge>
            <p className="text-xs mb-2">80+ специализированных sub-agents</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>Backend TypeScript Architect</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>Python Backend Engineer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>React Coder (React 19)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>Senior Code Reviewer</span>
              </div>
            </div>
            <pre className="bg-muted rounded p-2 mt-2 text-xs">{`/plugin marketplace add hesreallyhim/awesome-claude-code-agents`}</pre>
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <h4 className="font-semibold text-amber-900 mb-2">⚠️ Текущий статус</h4>
          <p className="text-xs text-amber-800">
            Plugin system находится в <strong>public beta</strong>. Beauty Platform плагин создан и задокументирован 
            (<code>.claude-plugin/</code>), но требует дополнительной настройки для активации.
            Community плагины можно устанавливать через <code>/plugin marketplace add</code> команду.
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">📚 Документация</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-blue-800">
            <li>
              <a href="https://docs.claude.com/en/docs/claude-code/plugins" target="_blank" rel="noopener noreferrer" className="underline">
                Official Plugin Docs
              </a>
            </li>
            <li>
              <a href="https://www.anthropic.com/news/claude-code-plugins" target="_blank" rel="noopener noreferrer" className="underline">
                Anthropic Blog: Plugins Announcement
              </a>
            </li>
            <li>
              <strong>Local:</strong> <code>/root/projects/beauty/.claude-plugin/README.md</code>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Recommended Plugins для Beauty Platform</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2 bg-muted rounded p-3 border border-border">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <strong className="text-foreground">Security Auditor</strong>
              <p className="text-xs">Для аудита tenant isolation и security patterns</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-muted rounded p-3 border border-border">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <strong className="text-foreground">Database Architect</strong>
              <p className="text-xs">Для оптимизации Prisma схем и queries</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-muted rounded p-3 border border-border">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <strong className="text-foreground">React Performance Optimizer</strong>
              <p className="text-xs">Для оптимизации CRM performance</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-muted rounded p-3 border border-border">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <strong className="text-foreground">Backend TypeScript Architect</strong>
              <p className="text-xs">Для разработки микросервисов</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);
