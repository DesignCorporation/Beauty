import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui'
import { Activity, ListChecks, Terminal, Workflow } from 'lucide-react'

const orchestratorApi = `// Orchestrator REST API (services/api-gateway/src/routes/orchestrator.ts)
GET  /api/orchestrator/status-all                 // агрегированный статус + warmup/circuit info
GET  /api/orchestrator/registry                   // статическая информация о сервисах
POST /api/orchestrator/services/:id/actions       // body: { action: start|stop|restart|resetCircuit }
GET  /api/orchestrator/services/:id/logs?lines=200// stdout/stderr последних N строк`

const cliCommands = `# CLI инструменты (./scripts)
./orchestrator-status.sh             # человекочитаемый статус всех сервисов
./orchestrator-status.sh --services  # список ID для API/CLI
./start-orchestrator.sh status       # проверка dev-процесса
./start-orchestrator.sh restart      # мягкая перезагрузка (stop + start)

# Логи
less +F logs/orchestrator/dev.log
less +F logs/orchestrator/dev.log | rg "[error]"`

export const OrchestratorSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-emerald-600" />
            Node.js Orchestrator (05.10.2025)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Production-ready процесс-менеджер</strong>, полностью заменивший legacy auto-restore систему.
            Управляет всеми микросервисами через единый реестр (<code>core/service-registry</code>) и предоставляет
            REST API / CLI для админки.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 mt-2">
            <p className="text-emerald-800 font-medium">✅ Статус: Стабильная версия v1.1.0</p>
            <ul className="list-disc pl-6 mt-2 text-emerald-700 space-y-1">
              <li>TypeScript strict mode compilation - все ошибки исправлены</li>
              <li>Production build pipeline - полностью функционален</li>
              <li>PATH environment - корректная конфигурация для pnpm</li>
              <li>Health checks - работают на порту 6030</li>
            </ul>
          </div>
          <p className="mt-3">
            <strong>Основные возможности:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Автозапуск критичных сервисов с зависимостями (dependency graph)</li>
            <li>Warmup проверки + Circuit Breaker pattern для устойчивости</li>
            <li>Автоматическая очистка портов перед стартом сервисов</li>
            <li>Унифицированная среда запуска (<code>pnpm build && pnpm start</code>)</li>
            <li>Real-time события транслируются в админку через REST API</li>
            <li>Graceful shutdown с корректной остановкой всех процессов</li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Workflow className="w-5 h-5 text-indigo-600" />
              REST API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>Все конечные точки проксируются через API Gateway.</p>
            <pre className="bg-slate-900 text-muted-foreground/30 p-4 rounded-md text-xs overflow-x-auto">
              <code>{orchestratorApi}</code>
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Terminal className="w-5 h-5 text-gray-700" />
              CLI Playbook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>Утилиты для on-call: состояние и перезапуск без ручного поиска процессов.</p>
            <pre className="bg-slate-900 text-muted-foreground/30 p-4 rounded-md text-xs overflow-x-auto">
              <code>{cliCommands}</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="w-5 h-5 text-teal-600" />
            Интеграция с админкой
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <ul className="list-disc pl-6 space-y-1">
            <li>Страница «Services Monitoring» использует новые эндпоинты для статуса, логов и действий.</li>
            <li>Вместо smart-restore кнопки <em>Start/Stop/Restart/Reset circuit</em> работают через оркестратор.</li>
            <li>Все сервисы описываются в <code>core/service-registry</code>; добавление нового сервиса = одно изменение.</li>
            <li>Legacy <code>/api/auto-restore/*</code> и скрипты <code>deployment/auto-restore</code> удалены.</li>
          </ul>
          <p className="text-sm text-gray-600">
            Для ручного вмешательства используйте CLI или прямые вызовы <code>/api/orchestrator/services/:id/actions</code>.
          </p>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
            <Activity className="w-5 h-5 text-blue-600" />
            Последние технические исправления (05.10.2025)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-900">
          <p><strong>Все критические ошибки TypeScript устранены:</strong></p>
          <div className="space-y-2 pl-4">
            <div>
              <p className="font-medium">✅ tsconfig.json - rootDir конфликты</p>
              <p className="text-xs text-blue-700">Исправлен путь импорта service-registry, добавлены корректные include paths</p>
            </div>
            <div>
              <p className="font-medium">✅ execa v7 API обновление</p>
              <p className="text-xs text-blue-700">Заменен execa.sync на execaSync для совместимости с новой версией</p>
            </div>
            <div>
              <p className="font-medium">✅ Zod schema валидация</p>
              <p className="text-xs text-blue-700">Все default() значения приведены к строковому типу согласно спецификации</p>
            </div>
            <div>
              <p className="font-medium">✅ TypeScript strict mode</p>
              <p className="text-xs text-blue-700">Добавлены return statements, убраны неиспользуемые параметры и импорты</p>
            </div>
            <div>
              <p className="font-medium">✅ PATH environment для nohup</p>
              <p className="text-xs text-blue-700">Экспорт PATH в start-orchestrator.sh для корректной работы pnpm в фоновом режиме</p>
            </div>
          </div>
          <div className="bg-white rounded-md p-3 mt-3">
            <p className="font-medium text-green-800">🎯 Результат: Production-ready система</p>
            <ul className="list-disc pl-6 mt-2 text-xs text-green-700 space-y-1">
              <li>Build проходит без ошибок и предупреждений</li>
              <li>Все сервисы запускаются и останавливаются корректно</li>
              <li>Health endpoint /health отвечает стабильно на :6030</li>
              <li>Логи не содержат EPIPE ошибок</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OrchestratorSection
