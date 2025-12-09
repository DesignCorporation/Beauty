import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Globe,
  Layers,
  Server,
  Database,
  ShieldCheck,
  Lock,
  Share2,
  GitBranch,
  Activity,
  ArrowRight,
  Cloud,
  Monitor,
  Image as ImageIcon
} from 'lucide-react';

const monorepoStructure = ` /root/beauty-platform
├── apps/
│   ├── landing-page (6000)
│   ├── salon-crm (6001)
│   ├── admin-panel (6002)
│   └── client-booking (6003)
├── services/
│   ├── api-gateway (6020)
│   ├── auth-service (6021)
│   ├── crm-api (6022)
│   ├── mcp-server (6025)
│   ├── images-api (6026)
│   └── backup-service (6027)
├── core/
│   └── database (Prisma + tenant isolation)
├── deployment/auto-restore
├── logs/
└── packages/ui (shared Shadcn components)`;

const networkMap = `443  nginx ingress
  ├─ /api/*                → API Gateway (6020)
  ├─ /auth/*, /mfa/*       → Auth Service (6021)
  ├─ /backup/*             → Backup Service (6027)
  └─ static assets         → Respective frontend apps

Direct access
  • test-crm.beauty.*      → salon-crm (6001)
  • test-admin.beauty.*    → admin-panel (6002)
  • client.beauty.*        → client-booking (6003)

Internal ports
  • PostgreSQL             → 6100
  • Smart Auto-Restore API → 6020 (/api/auto-restore/*)
  • Health monitor         → logs/health-monitor.log`;

export const ArchitectureSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-6 h-6 text-indigo-600" />
          Архитектура Beauty Platform
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <p>
          Платформа построена на монорепозитории с микросервисным ядром и строгой мультитенантной моделью. Ниже —
          актуальная карта компонентов, потоков и правил, подтверждённая кодовой базой на 19.09.2025.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <h3 className="flex items-center gap-2 font-semibold text-indigo-900 text-sm">
              <Layers className="w-4 h-4" /> Monorepo
            </h3>
            <p className="mt-2 text-xs text-indigo-800">
              Единый репозиторий управляет всеми фронтендами и сервисами, что упрощает ревью, стандарты и DevOps.
            </p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <h3 className="flex items-center gap-2 font-semibold text-indigo-900 text-sm">
              <Server className="w-4 h-4" /> Микросервисы
            </h3>
            <p className="mt-2 text-xs text-indigo-800">
              API Gateway оркестрирует пять бэкендов; каждый сервис покрыт авто-восстановлением и health-check.
            </p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <h3 className="flex items-center gap-2 font-semibold text-indigo-900 text-sm">
              <Lock className="w-4 h-4" /> Tenant Isolation
            </h3>
            <p className="mt-2 text-xs text-indigo-800">
              Вся работа с БД идёт через <code>tenantPrisma(tenantId)</code>, токены — только в httpOnly cookies, никаких cross-tenant операций.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="w-5 h-5 text-blue-600" /> Слои платформы
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm text-gray-700">
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-gray-900">
              <Activity className="w-4 h-4 text-blue-500" /> Интерфейсы (apps/)
            </h4>
            <ul className="list-disc pl-6 mt-1 space-y-1">
              <li><strong>landing-page</strong> (6000) — публичный маркетинг.</li>
              <li><strong>salon-crm</strong> (6001) — операционное ядро для салонов.</li>
              <li><strong>admin-panel</strong> (6002) — документация, мониторинг, настройки.</li>
              <li><strong>client-booking</strong> (6003) — портал записи клиентов.</li>
            </ul>
          </div>
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-gray-900">
              <Server className="w-4 h-4 text-emerald-500" /> Сервисы (services/)
            </h4>
            <ul className="list-disc pl-6 mt-1 space-y-1">
              <li><strong>api-gateway</strong> (6020) — единая точка входа + маршрутизация.</li>
              <li><strong>auth-service</strong> (6021) — JWT, MFA, cookie-доступ.</li>
              <li><strong>crm-api</strong> (6022) — доменная логика CRM.</li>
              <li><strong>mcp-server</strong> (6025) — AI контекст и документация.</li>
              <li><strong>images-api</strong> (6026) — визуальная коммуникация.</li>
              <li><strong>backup-service</strong> (6027) — резервное копирование.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="w-5 h-5 text-green-600" /> Данные и безопасность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-gray-900">
              <ShieldCheck className="w-4 h-4 text-green-500" /> PostgreSQL
            </h4>
            <ul className="list-disc pl-6 mt-1 space-y-1">
              <li><strong>beauty_platform_new</strong> — операционные данные, 7 ролей, строгие foreign keys.</li>
              <li><strong>beauty_audit</strong> — аудит действий пользователей и систем.</li>
              <li>Все запросы идут через <code>core/database</code> с tenant-aware Prisma.</li>
            </ul>
          </div>
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-gray-900">
              <Lock className="w-4 h-4 text-purple-500" /> Auth политика
            </h4>
            <ul className="list-disc pl-6 mt-1 space-y-1">
              <li>Access Token — 15 мин, Refresh Token — 7 дней (оба httpOnly, secure).</li>
              <li>CSRF: заголовок <code>X-CSRF-Token</code> + double-submit cookie.</li>
              <li>MFA: TOTP + backup codes, обязательна для ролей выше SALON_OWNER.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="w-5 h-5 text-sky-600" /> Сетевая карта
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>Все внешние запросы приходят через nginx (443) и далее маршрутизируются на соответствующие сервисы и фронтенды.</p>
          <pre className="bg-slate-900 text-muted-foreground/30 p-4 rounded-md text-xs overflow-x-auto">
            <code>{networkMap}</code>
          </pre>
          <p>
            Auto-Restore (см. раздел) обслуживает backend-порты, health-monitor логирует состояние в <code>logs/health-monitor.log</code> и триггерит восстановление через API Gateway.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="w-5 h-5 text-orange-600" /> Monorepo blueprint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>Структура репозитория и основные каталоги, требующие синхронизации документации и DevOps:</p>
          <pre className="bg-slate-900 text-muted-foreground/30 p-4 rounded-md text-xs overflow-x-auto">
            <code>{monorepoStructure}</code>
          </pre>
          <p>
            Внутренние пакеты (например, <code>packages/ui</code>) переиспользуются всеми фронтендами. Скрипты авто-восстановления и деплоя проживают в <code>deployment/auto-restore</code>.
          </p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5 text-emerald-600" /> Статус сервисов
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <h4 className="font-semibold text-emerald-900">Готово к продакшену</h4>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-emerald-800">
            <li>Landing Page (6000)</li>
            <li>Salon CRM (6001)</li>
            <li>Admin Panel (6002)</li>
            <li>Client Portal (6003)</li>
            <li>API Gateway (6020)</li>
            <li>Auth Service (6021)</li>
            <li>CRM API (6022)</li>
            <li>MCP Server (6025)</li>
            <li>Images API (6026)</li>
            <li>Backup Service (6027)</li>
          </ul>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="font-semibold text-yellow-900">В работе</h4>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-yellow-800">
            <li>Документация (синхронизация всех секций)</li>
            <li>CRM Beta финализация и UX-тесты</li>
            <li>Public Websites (новый лендинг)</li>
          </ul>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="font-semibold text-gray-900">План</h4>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-800">
            <li>Notification Service</li>
            <li>Payment Service</li>
            <li>Analytics Dashboard</li>
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowRight className="w-5 h-5 text-purple-600" /> Поток запроса
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>Клиентский интерфейс</strong> (Landing/CRM/Admin/Client) инициирует запрос с httpOnly cookie.</li>
          <li><strong>API Gateway</strong> (6020) проверяет токены, применяет rate limit, делегирует в нужный сервис.</li>
          <li><strong>Микросервис</strong> (Auth/CRM/Images/Backup/MCP) выполняет доменную логику и работает с <code>tenantPrisma</code>.</li>
          <li><strong>PostgreSQL</strong> фиксирует данные, триггеры аудита отправляют события в <code>beauty_audit</code>. Ответ возвращается через Gateway.</li>
        </ol>
        <p>Детали по маршрутам и безопасности см. в разделах <a className="underline" href="/documentation/api-gateway">API Gateway</a>,
          <a className="underline ml-1" href="/documentation/auth">Auth</a> и
          <a className="underline ml-1" href="/documentation/security">Security</a>.</p>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="w-5 h-5 text-blue-600" /> CRM & Scheduling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <ul className="list-disc pl-6 space-y-1">
            <li>Drag-and-drop календарь с конфликтами и напоминаниями.</li>
            <li>История клиентов, предпочтения, программы лояльности.</li>
            <li>Автоматические уведомления и подтверждения записей.</li>
          </ul>
          <p className="text-xs text-gray-500">
            См. <a className="underline" href="/documentation/crm-development">CRM Development</a> и <a className="underline" href="/documentation/api">API</a>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-emerald-600" /> Безопасность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <ul className="list-disc pl-6 space-y-1">
            <li>MFA + trusted devices для критичных ролей.</li>
            <li>Tenant isolation enforced во всех сервисах.</li>
            <li>Полное логирование ключевых операций и авто-restore алертов.</li>
          </ul>
          <p className="text-xs text-gray-500">
            Подробно в разделах <a className="underline" href="/documentation/security">Security</a> и <a className="underline" href="/documentation/auto-restore">Auto-Restore</a>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="w-5 h-5 text-orange-600" /> Инфраструктура
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <ul className="list-disc pl-6 space-y-1">
            <li>Smart Auto-Restore v3.2: мастер-оркестратор, health-monitor, circuit breaker.</li>
            <li>Ежедневные бэкапы + автоматическое обслуживание каждые 6 часов.</li>
            <li>Мониторинг Telegram/webhook/email через <code>alert-system.sh</code>.</li>
          </ul>
          <p className="text-xs text-gray-500">
            См. <a className="underline" href="/documentation/devops">DevOps</a> и <a className="underline" href="/documentation/auto-restore">Auto-Restore</a>.
          </p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageIcon className="w-5 h-5 text-purple-600" /> Visual Communication (Images API)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <p>Images API (порт 6026) обеспечивает работу галереи и поддержку визуальных ассетов для Claude/Gemini.</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Optimisation: Sharp.js, автосжатие до 1092px, JPEG 90% + превью 300px.</li>
          <li>Функциональность: загрузка, переименование, alt-теги, batch операции, zoom/crop.</li>
          <li>UI: React drag-and-drop, полноэкранный просмотр, доступ по адресу <a className="underline" href="/images">/images</a>.</li>
        </ul>
        <p className="text-xs text-gray-500">
          Для деталей см. <a className="underline" href="/documentation/system-integration">System Integration</a> и <a className="underline" href="/documentation/frontend">Frontend</a>.
        </p>
      </CardContent>
    </Card>
  </div>
);
