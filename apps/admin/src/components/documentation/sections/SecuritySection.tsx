import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Shield,
  Database,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Terminal,
  KeyRound
} from 'lucide-react';

const securityStats = [
  { label: 'Access token TTL', value: '15 минут' },
  { label: 'Refresh token TTL', value: '7 дней' },
  { label: 'Rate limit', value: '1000 req / 15 мин' },
  { label: 'MFA coverage', value: 'SUPER_ADMIN + SALON_OWNER (обязательно)' }
];

const authControls = [
  'JWT в httpOnly cookies, SameSite=Lax, Secure=true.',
  'Refresh cookie автоматически обновляет access токен при 401.',
  'CSRF защита: двойные токены (cookie + header).',
  'Helmet CSP + security headers включены для Gateway.',
  'Rate limiting: 1000 запросов за 15 минут на IP.',
  'Password policy: минимальный уровень сложности enforced на фронтах.'
];

const isolationRules = [
  'Все обращения к БД через tenantPrisma(tenantId).',
  'Разделение баз: beauty_platform_new (операции) + beauty_audit (аудит).',
  'Никаких cross-tenant операций; forbidden на уровне API и сервисов.',
  'Audit trail ведётся для ключевых действий (логин, MFA, restore).'
];

const complianceItems = [
  'OWASP Top 10 2024 — основные угрозы покрыты (XSS, CSRF, SSRF и др).',
  'GDPR: персональные данные доступны только своему salonId, есть право на удаление.',
  'SOC2 best practices: логирование, мониторинг, контроль доступа.',
  'Zero-trust: каждый запрос проверяет JWT и роль, даже во внутренних сервисах.'
];

const doRules = [
  'Использовать tenantPrisma(tenantId) в каждом сервисе.',
  'Всегда работать с токенами через httpOnly cookies, credentials: "include".',
  'Документировать изменения в секциях Admin Panel и MCP.',
  'Проверять implemented security hooks перед деплоем.',
  'Использовать готовые guard/middleware из сервисов (auth, gateway).' 
];

const dontRules = [
  'Не хранить токены в localStorage/sessionStorage.',
  'Не обращаться напрямую к БД без tenant контекста.',
  'Не прокидывать bypass-ключи, тестовые токены в прод.',
  'Не изменять порты/route без обновления Gateway и документации.',
  'Не отдавать чувствительные логи/данные пользователям/агентам.'
];

const troubleshooting = [
  '401 при правильных кредах → убедись, что запросы идут через gateway с credentials include.',
  'MFA не работает → проверь MFA_MASTER_KEY и /auth/mfa/setup flow.',
  'Cross-tenant подозрение → смотри logs/crm-api-auth.log и audit таблицу.',
  'Проблемы с cookies → домен, HTTPS и SameSite совпадают ли с фронтом.',
  'Rate limit срабатывает → увеличь лимит для trusted IP через API_GATEWAY_CONFIG.'
];

const logsAndCommands = `# Проверка токенов
curl -I https://test-admin.beauty.designcorp.eu/api/auth/me

# Просмотр логов авторизации
cat logs/crm-api-auth.log | tail -20

# Проверка MFA статистики
curl https://test-admin.beauty.designcorp.eu/api/auth/mfa/stats`;

export const SecuritySection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-600" />
          Enterprise Security Overview
        </CardTitle>
        <p className="text-sm text-gray-600">
          Обновлено 19.09.2025. Zero-trust, мультитенантность и строгие правила безопасной разработки.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-700">
        {securityStats.map((stat) => (
          <div key={stat.label} className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-red-900 font-semibold text-sm">{stat.value}</div>
            <div className="text-red-700 text-xs mt-1 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="w-5 h-5 text-emerald-600" />
          Auth & доступ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h4 className="font-semibold text-emerald-900 mb-2">Контроли</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-emerald-700">
            {authControls.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="w-5 h-5 text-blue-600" />
          Data isolation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Tenant правила</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-blue-700">
            {isolationRules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-purple-600" />
          Compliance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-2">Стандарты</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-purple-700">
            {complianceItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-blue-500" />
          Правила
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
          <h4 className="font-semibold text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Нельзя
          </h4>
          <ul className="list-disc pl-5 text-xs text-red-700 space-y-1">
            {dontRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-4 space-y-1">
          <h4 className="font-semibold text-green-900 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Обязательно
          </h4>
          <ul className="list-disc pl-5 text-xs text-green-700 space-y-1">
            {doRules.map((rule) => (
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
          <pre className="bg-white rounded p-2 text-xs">{logsAndCommands}</pre>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          {troubleshooting.map((tip) => (
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
