import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Network,
  Shield,
  Zap,
  Activity,
  Layers,
  ClipboardList,
  Monitor,
  Terminal,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  type LucideIcon
} from 'lucide-react';

type RouteStatus = 'active' | 'planned';

interface GatewayStat {
  label: string;
  value: string;
}

interface RouteItem {
  path: string;
  target: string;
  status: RouteStatus;
}

interface FeatureGroup {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  points: string[];
}

interface EndpointItem {
  method: string;
  path: string;
  description: string;
}

const gatewayStats: GatewayStat[] = [
  { label: 'Порт', value: '6020' },
  { label: 'Входная точка', value: 'https://test-admin.beauty.designcorp.eu/api/*' },
  { label: 'Rate limit', value: '1000 req / 15 мин' },
  { label: 'Security stack', value: 'Helmet + CORS + JWT' }
];

const routes: RouteItem[] = [
  { path: '/api/auth/*', target: 'Auth Service (6021)', status: 'active' },
  { path: '/api/crm/*', target: 'CRM API (6022)', status: 'active' },
  { path: '/api/images/*', target: 'Images API (6026)', status: 'active' },
  { path: '/api/mcp/*', target: 'MCP Server (6025)', status: 'active' },
  { path: '/api/backup/*', target: 'Backup Service (6027)', status: 'active' },
  { path: '/api/context/*', target: 'Context7 MCP (6024)', status: 'active' },
  { path: '/api/auto-restore/*', target: 'Auto-Restore API (Gateway)', status: 'active' },
  { path: '/api/notifications/*', target: 'Notification Service', status: 'planned' },
  { path: '/api/payments/*', target: 'Payment Service', status: 'planned' }
];

const featureGroups: FeatureGroup[] = [
  {
    title: 'Безопасность',
    icon: Shield,
    iconColor: 'text-emerald-600',
    points: [
      'Helmet CSP + security headers включены.',
      'CORS whitelist: admin, CRM, client, localhost (6001-6003).',
      'Все запросы проверяют JWT и tenant перед прокси.',
      'Rate limit: 1000 запросов на IP / 15 минут.'
    ]
  },
  {
    title: 'Производительность',
    icon: Zap,
    iconColor: 'text-orange-600',
    points: [
      'Compression включен для всех ответов.',
      'Перенаправление cookie/headers без переписывания доменов.',
      'Индивидуальные таймауты: CRM/Auth 30s, Images 60s.',
      'Поддержка повторных попыток (до 3) для критичных сервисов.'
    ]
  },
  {
    title: 'Мониторинг',
    icon: Activity,
    iconColor: 'text-blue-600',
    points: [
      'HealthChecker проверяет сервисы и блокирует unhealthy.',
      'Метрики Prometheus на /metrics (подключена middleware).',
      'Логирование запросов (morgan) + X-Request-ID.',
      'Telegram-алерты через alerts/TelegramAlert при ошибках.'
    ]
  }
];

const systemEndpoints: EndpointItem[] = [
  { method: 'GET', path: '/health', description: 'Liveness: проверка готовности gateway + сервисов.' },
  { method: 'GET', path: '/ready', description: 'Readiness probe (используется Health Monitor).' },
  { method: 'GET', path: '/metrics', description: 'Прометеевские метрики: latency, status codes, totals.' },
  { method: 'GET', path: '/info', description: 'Имя, версия, uptime и список проксируемых сервисов.' },
  { method: 'GET', path: '/api/system/metrics', description: 'Расширенные метрики (uptime, memory, статус сервисов).' },
  { method: 'POST', path: '/api/system/restart-service', description: 'Рестарт сервисов через PM2 (только whitelisted порты).' },
  { method: 'POST', path: '/api/monitoring/auto-restore/toggle', description: 'Управление master-orchestrator (старт/стоп).' },
  { method: 'GET', path: '/api/monitoring/auto-restore/status', description: 'Live статус master/health процессов и логи.' }
];

const integrationChecklist = [
  'Добавить nginx rule: location /api/ -> proxy_pass http://127.0.0.1:6020;',
  'Все фронтенды обязаны отправлять запросы с credentials: "include".',
  'Фронт при 401 вызывает /api/auth/refresh и повторяет запрос.',
  'Service-to-service интеграции идут через Gateway — прямой доступ запрещён.',
  'Регистрация новых маршрутов проходит через services/api-gateway/src/config/services.ts.'
];

const troubleshootingTips = [
  'Получаем 503? Проверить /health и health-лог: возможно сервис в circuit breaker.',
  'Cookie пропали после прокси? Убедись, что домен/https настроены и credentials включены.',
  'Повторяющиеся 401: смотреть logs/crm-api-auth.log и JWT payload на наличие tenantId.',
  'Проблемы с Images API: убедись, что buffer body не включён (см. proxy middleware).'
];

const plannedHint = 'Planned маршруты зарезервированы: прокси появится после включения сервисов.';

const RouteRow: React.FC<RouteItem> = ({ path, target, status }) => (
  <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded border ${status === 'active' ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
    <code className={`font-mono text-sm ${status === 'active' ? 'text-emerald-700' : 'text-gray-500'}`}>{path}</code>
    <span className="text-sm text-gray-700">{target}</span>
    <span className={`text-xs font-semibold uppercase tracking-wide ${status === 'active' ? 'text-emerald-600' : 'text-gray-500'}`}>
      {status === 'active' ? 'Работает' : 'Планируется'}
    </span>
  </div>
);

const EndpointBadge: React.FC<EndpointItem> = ({ method, path, description }) => (
  <div className="bg-white border border-border rounded-lg p-3 shadow-sm">
    <div className="flex items-center gap-2 mb-1">
      <span className={`${methodColors(method)} text-white px-2 py-0.5 rounded text-xs font-mono uppercase`}>{method}</span>
      <code className="font-mono text-sm text-foreground">{path}</code>
    </div>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
);

function methodColors(method: string) {
  switch (method) {
    case 'GET':
      return 'bg-blue-500';
    case 'POST':
      return 'bg-green-500';
    case 'PUT':
      return 'bg-yellow-500';
    case 'PATCH':
      return 'bg-purple-500';
    case 'DELETE':
      return 'bg-red-500';
    default:
      return 'bg-muted0';
  }
}

export const ApiGatewaySection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-6 h-6 text-blue-600" />
          API Gateway — единая точка входа
        </CardTitle>
        <p className="text-sm text-gray-600">
          Обновлено 19.09.2025. Gateway принимает весь внешне- и внутренний трафик, применяет security middleware и маршрутизирует в микросервисы.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <p>Физический сервер: <code>0.0.0.0:6020</code>. В production работает за nginx, в локальной разработке доступен напрямую. Передаёт httpOnly cookies без переписывания домена, добавляет <code>X-Request-ID</code> и <code>X-Forwarded-*</code> заголовки для трассировки.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {gatewayStats.map((stat) => (
            <div key={stat.label} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-blue-900 font-semibold text-sm">{stat.value}</div>
              <div className="text-blue-700 text-xs mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="w-5 h-5 text-indigo-600" />
          Таблица маршрутизации
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <div className="bg-white border border-gray-200 rounded-lg divide-y">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <span>Path</span>
            <span>Target</span>
            <span>Status</span>
          </div>
          {routes.map((route) => (
            <RouteRow key={route.path} {...route} />
          ))}
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />{plannedHint}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-emerald-600" />
          Middleware и возможности
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
        {featureGroups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.title} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Icon className={`w-5 h-5 ${group.iconColor}`} />
                {group.title}
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                {group.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Monitor className="w-5 h-5 text-blue-600" />
          Системные endpoints
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
        {systemEndpoints.map((endpoint) => (
          <EndpointBadge key={`${endpoint.method}-${endpoint.path}`} {...endpoint} />
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-sky-600" />
          Интеграция и эксплуатация
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ul className="list-disc pl-6 space-y-1">
          {integrationChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" /> Для контекста см. <a className="underline" href="/documentation/architecture">Architecture</a> и <a className="underline" href="/documentation/auth">Auth</a>.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="w-5 h-5 text-orange-600" />
          Диагностика и логи
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <h4 className="font-semibold text-orange-900 mb-1">Где смотреть</h4>
          <ul className="list-disc pl-6 text-orange-800 text-xs space-y-1">
            <li><code>logs/auto-restore/readable.log</code> — статус gateway и сервисов.</li>
            <li><code>pm2 logs api-gateway</code> — runtime логирование и ошибки прокси.</li>
            <li><code>services/api-gateway/src/routes</code> — proxy, monitoring и system middleware.</li>
          </ul>
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
