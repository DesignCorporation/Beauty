import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Code,
  Shield,
  CheckCircle,
  AlertTriangle,
  Terminal,
  ClipboardList,
  BookOpen,
  ShoppingCart,
  Camera,
  Zap,
  BrainCircuit,
  HardDrive,
  type LucideIcon
} from 'lucide-react';

interface Endpoint {
  method: string;
  path: string;
  description: string;
}

interface ServiceCategory {
  title?: string;
  columns?: 1 | 2 | 3;
  endpoints: Endpoint[];
}

interface ServiceCard {
  id: string;
  name: string;
  icon: LucideIcon;
  iconColor: string;
  port: string;
  baseUrl: string;
  description: string;
  docsLink?: string;
  notes?: string[];
  categories: ServiceCategory[];
}

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500',
  POST: 'bg-green-500',
  PUT: 'bg-yellow-500',
  PATCH: 'bg-purple-500',
  DELETE: 'bg-red-500'
};

const EndpointCard: React.FC<Endpoint> = ({ method, path, description }) => (
  <div className="bg-white border border-border rounded-lg p-3 shadow-sm">
    <div className="flex items-center gap-2 mb-1">
      <div className={`${methodColors[method] ?? 'bg-muted0'} text-white px-2 py-0.5 rounded text-xs font-mono uppercase`}>{method}</div>
      <code className="font-mono text-sm text-foreground">{path}</code>
    </div>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
);

const services: ServiceCard[] = [
  {
    id: 'auth',
    name: 'Auth Service',
    icon: Shield,
    iconColor: 'text-emerald-600',
    port: '6021',
    baseUrl: 'https://test-admin.beauty.designcorp.eu/api/auth/*',
    description: 'JWT + httpOnly cookies, MFA (TOTP + backup codes), tenant-aware токены.',
    docsLink: '/documentation/auth',
    notes: [
      'Access token → 15 минут, refresh token → 7 дней.',
      'Обязаны передавать credentials: "include" из фронтендов.',
      'Refresh автоматически обновляет access когда получает 401.'
    ],
    categories: [
      {
        title: 'Core',
        endpoints: [
          { method: 'POST', path: '/api/auth/login', description: 'Аутентификация пользователя (email + пароль).' },
          { method: 'POST', path: '/api/auth/refresh', description: 'Обновление access-токена через refresh cookie.' },
          { method: 'GET', path: '/api/auth/me', description: 'Профиль пользователя + роли + tenant.' },
          { method: 'POST', path: '/api/auth/logout', description: 'Инвалидирует refresh cookie и очищает httpOnly cookies.' }
        ]
      },
      {
        title: 'MFA',
        endpoints: [
          { method: 'POST', path: '/api/auth/mfa/setup', description: 'Генерация TOTP секрета и backup-кодов.' },
          { method: 'POST', path: '/api/auth/mfa/verify', description: 'Подтверждение TOTP/backup кода при входе.' },
          { method: 'POST', path: '/api/auth/mfa/disable', description: 'Отключение MFA (требует действующий backup код).' }
        ]
      }
    ]
  },
  {
    id: 'crm',
    name: 'CRM API',
    icon: ShoppingCart,
    iconColor: 'text-blue-600',
    port: '6022',
    baseUrl: 'https://test-admin.beauty.designcorp.eu/api/crm/*',
    description: 'Мультитенантные CRUD-операции для клиентов, услуг, расписания.',
    docsLink: '/documentation/crm-development',
    notes: [
      'В JWT обязательно присутствуют tenantId и role.',
      'Все ответы пагинированы, запросы принимают query-параметры tenant-aware.',
      'Использует FullCalendar формат для /appointments/calendar.'
    ],
    categories: [
      {
        title: 'Клиенты',
        endpoints: [
          { method: 'GET', path: '/api/crm/clients', description: 'Список клиентов салона (пагинация + фильтры).' },
          { method: 'POST', path: '/api/crm/clients', description: 'Создание клиента, автоматически привязывается к tenant.' },
          { method: 'GET', path: '/api/crm/clients/:id', description: 'Карточка клиента с историей визитов.' },
          { method: 'PUT', path: '/api/crm/clients/:id', description: 'Обновление профиля клиента.' }
        ]
      },
      {
        title: 'Услуги',
        endpoints: [
          { method: 'GET', path: '/api/crm/services', description: 'Каталог услуг салона.' },
          { method: 'POST', path: '/api/crm/services', description: 'Создание новой услуги.' },
          { method: 'PUT', path: '/api/crm/services/:id', description: 'Обновление параметров услуги.' },
          { method: 'DELETE', path: '/api/crm/services/:id', description: 'Удаление услуги.' }
        ]
      },
      {
        title: 'Расписание',
        endpoints: [
          { method: 'GET', path: '/api/crm/appointments', description: 'Записи по времени (start/end фильтры).' },
          { method: 'GET', path: '/api/crm/appointments/calendar', description: 'Формат для FullCalendar (drag & drop).' },
          { method: 'POST', path: '/api/crm/appointments', description: 'Создание записи, проверяет конфликты.' },
          { method: 'PATCH', path: '/api/crm/appointments/:id/status', description: 'Обновление статуса (scheduled → done/cancelled).' }
        ]
      }
    ]
  },
  {
    id: 'images',
    name: 'Images API',
    icon: Camera,
    iconColor: 'text-purple-600',
    port: '6026',
    baseUrl: 'https://test-admin.beauty.designcorp.eu/api/images/*',
    description: 'Оптимизация изображений для галереи и визуальной коммуникации.',
    docsLink: '/documentation/system-integration',
    notes: [
      'Загрузка — multipart/form-data (поле file).',
      'Авто-оптимизация: thumbnails 300px, optimized 1092px.',
      'Файлы хранятся с привязкой к tenant.'
    ],
    categories: [
      {
        endpoints: [
          { method: 'POST', path: '/api/images/upload', description: 'Загрузка нового изображения (возвращает пути всех размеров).' },
          { method: 'GET', path: '/api/images/salon/:salonId', description: 'Галерея изображений конкретного салона.' },
          { method: 'POST', path: '/api/images/associate', description: 'Привязка изображения к услуге/мастеру.' },
          { method: 'DELETE', path: '/api/images/:imageId', description: 'Удаление изображения (очищает все размеры).' }
        ]
      }
    ]
  },
  {
    id: 'auto-restore',
    name: 'Auto-Restore API (Gateway)',
    icon: Zap,
    iconColor: 'text-orange-600',
    port: '6020',
    baseUrl: 'https://test-admin.beauty.designcorp.eu/api/auto-restore/*',
    description: 'Управление Smart Auto-Restore v3.2 через API Gateway.',
    docsLink: '/documentation/auto-restore',
    notes: [
      'Доступно только ролям SUPER_ADMIN/Admin Panel.',
      'Работает поверх smart-restore-manager.sh и health-monitor.',
      'Логи возвращаются в json формате (если запросить конкретный сервис).'
    ],
    categories: [
      {
        title: 'Мониторинг и управление',
        endpoints: [
          { method: 'GET', path: '/api/auto-restore/status', description: 'Сводка по всем отслеживаемым сервисам.' },
          { method: 'POST', path: '/api/auto-restore/restore/:service', description: 'Восстановление конкретного сервиса.' },
          { method: 'POST', path: '/api/auto-restore/restore-all', description: 'Пакетное восстановление упавших сервисов (body.services).' },
          { method: 'GET', path: '/api/auto-restore/logs/:service?', description: 'Последние логи (json/raw) по сервису или всей системе.' },
          { method: 'GET', path: '/api/auto-restore/circuit-breaker-status', description: 'Статус предохранителей для всех сервисов.' },
          { method: 'POST', path: '/api/auto-restore/reset-circuit-breaker/:service', description: 'Ручной сброс предохранителя.' },
          { method: 'GET', path: '/api/auto-restore/alerts', description: 'Список .alert файлов (критические инциденты).' }
        ]
      }
    ]
  },
  {
    id: 'mcp',
    name: 'MCP Server',
    icon: BrainCircuit,
    iconColor: 'text-teal-600',
    port: '6025',
    baseUrl: 'https://test-admin.beauty.designcorp.eu/mcp/*',
    description: 'Model Context Protocol сервер для AI агентов (Claude/Gemini).',
    notes: [
      'Обновляется при изменении документации в админке.',
      'Используется Codex MCP и Task tool для ответов ассистентов.'
    ],
    categories: [
      {
        endpoints: [
          { method: 'GET', path: '/mcp/smart-memory', description: 'Полный контекст проекта (строго обновлённый).' },
          { method: 'GET', path: '/mcp/agent-context/:agent', description: 'Контекст под конкретного агента (backend, devops, docs...).' },
          { method: 'GET', path: '/mcp/search?q=', description: 'Поиск по документации/спецификациям.' },
          { method: 'GET', path: '/mcp/project-state', description: 'Текущий статус проекта и живые обновления.' }
        ]
      }
    ]
  },
  {
    id: 'backup',
    name: 'Backup Service',
    icon: HardDrive,
    iconColor: 'text-muted-foreground',
    port: '6027',
    baseUrl: 'https://test-admin.beauty.designcorp.eu/api/backup/*',
    description: 'Резервное копирование и мониторинг бэкапов.',
    docsLink: '/documentation/devops',
    notes: [
      'Используется Auto-Restore и DevOps для health-check.',
      'Снапшоты хранятся в /root/beauty-platform/deployment/auto-restore/backups.'
    ],
    categories: [
      {
        endpoints: [
          { method: 'GET', path: '/api/backup/status', description: 'Метаданные последнего бэкапа (timestamp, размер).' },
          { method: 'POST', path: '/api/backup/create', description: 'Запуск ручного бэкапа (асинхронно).' }
        ]
      }
    ]
  }
];

const gatewayStats = [
  { label: 'API Gateway', value: 'Порт 6020, префикс /api/*' },
  { label: 'Auth Flow', value: 'JWT httpOnly + MFA' },
  { label: 'Services', value: 'Auth • CRM • Images • Backup • Auto-Restore' },
  { label: 'Docs source', value: 'Admin Panel documentation (26 секций)' }
];

export const ApiSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-6 h-6 text-indigo-600" />
          Справочник по API
        </CardTitle>
        <p className="text-sm text-gray-600">
          Обновлено 19.09.2025. Все внешние запросы идут через API Gateway (порт 6020) и защищены Auth Service.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <p>Используй этот раздел как быстрый навигатор по REST-эндпоинтам. URL вида <code>https://test-admin.beauty.designcorp.eu/api/&lt;service&gt;/...</code> проксируются через gateway, который валидирует JWT, tenant и роль.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {gatewayStats.map((stat) => (
            <div key={stat.label} className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="text-indigo-900 font-semibold text-sm">{stat.value}</div>
              <div className="text-indigo-700 text-xs mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {services.map((service) => {
      const Icon = service.icon;
      return (
        <Card key={service.id} id={`${service.id}-api`}>
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon className={`w-5 h-5 ${service.iconColor}`} />
              {service.name}
              <span className="text-xs font-mono text-gray-500">порт {service.port}</span>
            </CardTitle>
            <p className="text-sm text-gray-600">{service.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="font-mono bg-gray-100 border border-gray-200 px-2 py-1 rounded">{service.baseUrl}</span>
              {service.docsLink && (
                <a className="underline text-indigo-600" href={service.docsLink}>Документация</a>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-700">
            {service.notes && service.notes.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Особенности
                </h4>
                <ul className="list-disc pl-6 space-y-1 text-xs text-gray-700">
                  {service.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {service.categories.map((category, idx) => {
              const gridCols = category.columns === 1
                ? 'md:grid-cols-1'
                : category.columns === 3
                ? 'md:grid-cols-3'
                : 'md:grid-cols-2';
              return (
                <div key={`${service.id}-section-${idx}`} className="space-y-2">
                  {category.title && (
                    <h4 className="font-semibold text-gray-900">{category.title}</h4>
                  )}
                  <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
                    {category.endpoints.map((endpoint) => (
                      <EndpointCard key={`${endpoint.method}-${endpoint.path}`} {...endpoint} />
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      );
    })}

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="w-5 h-5 text-orange-600" />
          Диагностика и логи
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <h4 className="font-semibold text-orange-900 mb-1">Где искать проблемы</h4>
          <ul className="list-disc pl-6 text-orange-800 text-xs space-y-1">
            <li><code>logs/auto-restore/readable.log</code> — состояние сервисов (в том числе API Gateway).</li>
            <li><code>logs/crm-api-auth.log</code> — декодированные JWT (tenant/role) при обращениях к CRM API.</li>
            <li><code>services/api-gateway/src/routes</code> — прокси и middleware, проверка заголовков и ошибок.</li>
          </ul>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" />401 после логина → проверь credentials: "include" и домен cookies.</div>
          <div className="flex gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" />403 от CRM API → роль пользователя не имеет доступа к ресурсу (проверь JWT payload).</div>
          <div className="flex gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" />Timeout от Images API → убедись, что upload идёт с корректным Content-Type.</div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-blue-600" />
          Шпаргалка по интеграции
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ul className="list-disc pl-6 space-y-1">
          <li>Новые фронтенды подключаются через API Gateway и обязаны использовать httpOnly cookies.</li>
          <li>Все сервисы возвращают ошибки в JSON с полями <code>message</code> и <code>code</code> — обрабатывай их централизованно.</li>
          <li>Auto-Restore API доступно из Admin Panel Services Monitoring — ручные вызовы эквивалентны UI-кнопкам.</li>
          <li>MCP API открывает документацию для AI агентов — не забывай про актуальность секций.</li>
        </ul>
        <p className="text-xs text-gray-500">Смотри также <BookOpen className="inline w-4 h-4 align-text-top text-indigo-600" /> <a className="underline" href="/documentation/architecture">Architecture</a> и <a className="underline" href="/documentation/devops">DevOps</a> для контекста.</p>
      </CardContent>
    </Card>
  </div>
);
