import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Shield,
  KeyRound,
  Cable,
  Lock,
  Activity,
  AlertTriangle,
  Terminal,
  Users,
  ClipboardList,
  BookOpen
} from 'lucide-react';

const overviewStats = [
  { label: 'Порт', value: '6021' },
  { label: 'Access TTL', value: '15 минут' },
  { label: 'Refresh TTL', value: '7 дней' },
  { label: 'База', value: 'beauty_platform_new' }
];

const authCookies = [
  { name: 'beauty_access_token', ttl: '15 минут', secure: true, httpOnly: true },
  { name: 'beauty_refresh_token', ttl: '7 дней', secure: true, httpOnly: true }
];

const criticalRules = [
  'Сервис запускаем в prod-режиме (`pnpm build && pnpm start`) — orchestrator следит за dist-процессом.',
  'Только httpOnly cookies. Запрещены localStorage/sessionStorage токены.',
  'Каждый запрос к БД выполняется через tenantPrisma(tenantId).',
  'Все фронты отправляют запросы с credentials: "include".',
  'Сторонние интеграции проходят через API Gateway (6020).',
  'MFA обязательно для ролей SUPER_ADMIN и SALON_OWNER.'
];

const apiEndpoints = [
  { method: 'POST', path: '/auth/login', note: 'email + password → access/refresh' },
  { method: 'POST', path: '/auth/refresh', note: 'обновление access токена' },
  { method: 'GET', path: '/auth/me', note: 'профиль и роли пользователя' },
  { method: 'POST', path: '/auth/logout', note: 'инвалидирует refresh cookie' },
  { method: 'POST', path: '/auth/mfa/setup', note: 'генерация секретного ключа' },
  { method: 'POST', path: '/auth/mfa/verify', note: 'подтверждение TOTP' },
  { method: 'POST', path: '/auth/mfa/disable', note: 'отключение MFA с backup кодом' }
];

const integrationChecklist = [
  'NGINX: location /auth/ → proxy_pass http://127.0.0.1:6021; ставим до catch-all.',
  'API Gateway: маршрут /api/auth/* проксирует в Auth Service.',
  'Фронт: использовать fetch/axios с credentials: "include".',
  'CSR приложения должны обрабатывать 401 → автоматический refresh.',
  'MFA страницы подключают компоненты MFAVerificationPage и MfaVerifyForm из admin-panel.'
];

const troubleshooting = [
  '401 после логина: проверь, что домен совпадает и cookies не блокируются (запросы идут через gateway).',
  'Missing enableTracing: убедись, что все Prisma пакеты = 5.22.0 и перегенерируй `npx prisma generate`.',
  'MFA не активируется: проверь наличие MFA_MASTER_KEY в окружении сервиса.',
  'Refresh не обновляет токен: убедись, что запрос идёт через API Gateway и credentials включены.',
  'Сервис не поднимается: проверь `core/service-registry` и статус orchestrator (`curl http://localhost:6030/orchestrator/services/auth-service/status`).'
];

export const AuthSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-600" />
          Аутентификация и авторизация
        </CardTitle>
        <p className="text-sm text-gray-600">
          Обновлено 29.09.2025. Auth Service запускается через orchestrator (`pnpm build && pnpm start`), JWT через httpOnly cookies, MFA (TOTP + backup codes), строгая tenant изоляция.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <div className="text-emerald-900 font-semibold text-sm">{stat.value}</div>
              <div className="text-emerald-700 text-xs mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
        <p>
          Архитектура: nginx (443) → API Gateway (6020) → Auth Service (6021). Все downstream сервисы доверяют токенам из Auth Service и дополнительно проверяют tenant и роль.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="w-5 h-5 text-blue-600" />
          Токены и cookies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc pl-6 space-y-1">
          <li>Авторизация выполняется через два httpOnly cookies. Secure=true, SameSite=Lax.</li>
          <li>Refresh cookie обновляет access токен автоматически. В случае 401 фронт вызывает <code>/auth/refresh</code> и повторяет запрос.</li>
          <li>Logout очищает оба cookies и делает refresh токен недействительным в базе.</li>
        </ul>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {authCookies.map((cookie) => (
            <div key={cookie.name} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="font-mono text-xs text-gray-600">{cookie.name}</div>
              <div className="text-sm text-gray-800 mt-2">TTL: {cookie.ttl}</div>
              <div className="text-xs text-gray-600 mt-1">Secure: {cookie.secure ? 'да' : 'нет'} • httpOnly: {cookie.httpOnly ? 'да' : 'нет'}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cable className="w-5 h-5 text-purple-600" />
          API Surface
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {apiEndpoints.map((endpoint) => (
            <div key={endpoint.path} className="bg-slate-900 text-muted-foreground/30 rounded-lg p-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="uppercase text-emerald-300">{endpoint.method}</span>
                <span>{endpoint.path}</span>
              </div>
              <div className="text-muted-foreground/60 mt-2">{endpoint.note}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">Все маршруты доступны через API Gateway: <code>https://test-admin.beauty.designcorp.eu/api/auth/*</code>.</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="w-5 h-5 text-indigo-600" />
          MFA и доступ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc pl-6 space-y-1">
          <li>Секрет TOTP хранится в окружении Auth Service (<code>MFA_MASTER_KEY</code>). При setup генерируется уникальный ключ на пользователя.</li>
          <li>SUPER_ADMIN и SALON_OWNER обязаны активировать MFA. Остальные роли могут подключать по желанию.</li>
          <li>Backup-коды создаются автоматически и выдаются пользователю при настройке.</li>
          <li>Фронт использует компоненты <code>MFAVerificationPage</code> и <code>MfaVerifyForm</code> для second-factor.</li>
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5 text-emerald-600" />
          Критические правила
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        {criticalRules.map((rule) => (
          <div key={rule} className="flex gap-2">
            <span className="text-emerald-500 mt-1">•</span>
            <span>{rule}</span>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-blue-600" />
          Интеграция нового клиента/приложения
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        {integrationChecklist.map((item) => (
          <div key={item} className="flex gap-2">
            <span className="mt-1 text-blue-500">•</span>
            <span>{item}</span>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="w-5 h-5 text-orange-600" />
          Logs & troubleshooting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <h4 className="font-semibold text-orange-900 mb-1">Где смотреть</h4>
          <ul className="list-disc pl-6 text-orange-800 text-xs space-y-1">
            <li><code>logs/crm-api-auth.log</code> — расшифрованные JWT и tenant контекст.</li>
            <li><code>services/auth-service/src/middleware</code> — валидация токенов на уровне Gateway.</li>
            <li><code>services/api-gateway/src/routes/auth.ts</code> — прокси маршруты к Auth Service.</li>
          </ul>
        </div>
        <div className="space-y-2">
          {troubleshooting.map((tip) => (
            <div key={tip} className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-purple-600" />
          Кто использует Auth Service
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ul className="list-disc pl-6 space-y-1">
          <li>Все фронтенд приложения (landing, salon-crm, admin-panel, client-booking).</li>
          <li>API Gateway — проверяет роль и tenant перед проксированием в микросервисы.</li>
          <li>Auto-Restore и DevOps скрипты для health-check (port 6021 /health).</li>
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
          Дополнительные материалы
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ul className="list-disc pl-6 space-y-1">
          <li><a className="underline" href="/documentation/security">Security Section</a> — расширенные политики.</li>
          <li><a className="underline" href="/documentation/api-gateway">API Gateway</a> — маршруты и middleware.</li>
          <li><code>services/auth-service/src/routes</code> — реализация всех endpoint.</li>
          <li><code>apps/admin-panel/src/pages/AuthPage.tsx</code> — пример интеграции на фронте.</li>
        </ul>
      </CardContent>
    </Card>
  </div>
);
