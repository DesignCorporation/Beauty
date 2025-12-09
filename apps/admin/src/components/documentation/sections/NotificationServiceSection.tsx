import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  Terminal,
  Filter,
  Send,
  Settings
} from 'lucide-react';

const overviewStats = [
  { label: 'Порт', value: '6028' },
  { label: 'База', value: 'beauty_platform_new' },
  { label: 'SMTP', value: 'nodemailer 7.0.6' },
  { label: 'Статус', value: 'Production Ready' }
];

const notificationTypes = [
  { type: 'EMAIL', icon: Mail, description: 'Email уведомления через SMTP (nodemailer)' },
  { type: 'SMS', icon: MessageSquare, description: 'SMS уведомления (будущая версия)' },
  { type: 'PUSH', icon: Smartphone, description: 'Push notifications (планируется)' },
  { type: 'IN_APP', icon: Bell, description: 'In-app уведомления для CRM' }
];

const criticalRules = [
  'Сервис запускается через orchestrator в prod-режиме (`pnpm build && pnpm start`).',
  'Все запросы к БД только через tenantPrisma(tenantId) для tenant isolation.',
  'Email отправка с graceful fallback: пытается real SMTP, если не настроен - симулирует.',
  'Frontend polling каждые 30 секунд для real-time badge count (оптимизировано).',
  'Toast notifications по приоритетам: URGENT (manual close), HIGH (10s), MEDIUM (5s), LOW (3s).',
  'SMTP credentials в .env: SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM.'
];

const apiEndpoints = [
  { method: 'GET', path: '/api/notifications/me', note: 'Получить уведомления текущего пользователя с фильтрацией' },
  { method: 'POST', path: '/api/notifications/:id/read', note: 'Отметить уведомление как прочитанное' },
  { method: 'DELETE', path: '/api/notifications/:id', note: 'Удалить уведомление' },
  { method: 'GET', path: '/api/notifications/settings/me', note: 'Настройки уведомлений пользователя' },
  { method: 'PUT', path: '/api/notifications/settings/me', note: 'Обновить настройки уведомлений' },
  { method: 'POST', path: '/api/notify/email', note: 'Отправить email уведомление (с вложениями)' }
];

const frontendComponents = [
  {
    name: 'NotificationsPage',
    path: 'apps/salon-crm/src/pages/NotificationsPage.tsx',
    description: 'Полноценная страница уведомлений (417 строк)',
    features: [
      'Фильтры: All / Unread / Important',
      'Type icons: Email/SMS/Push/In-App/Webhook',
      'Status badges: Read/Delivered/Sent/Pending/Failed',
      'Priority colors: Urgent (red), High (orange), Medium (yellow), Low (gray)',
      'Действия: mark as read, delete, mark all as read',
      'Empty states, loading states, error handling с retry'
    ]
  },
  {
    name: 'useNotifications',
    path: 'apps/salon-crm/src/hooks/useNotifications.ts',
    description: 'Hook для работы с уведомлениями',
    features: [
      'Auto-refresh каждые 30 секунд',
      'Real-time unread count для badge',
      'Error handling с graceful degradation',
      'Automatic cleanup on unmount'
    ]
  },
  {
    name: 'useNotificationToast',
    path: 'apps/salon-crm/src/hooks/useNotificationToast.ts',
    description: 'Hook для Toast уведомлений',
    features: [
      'Приоритетная система длительности',
      'showSuccess, showError, showWarning, showInfo',
      'Rich colors и close buttons',
      'Position: bottom-right (Sonner library)'
    ]
  }
];

const integrationChecklist = [
  'API Gateway: маршрут /api/notifications/* и /api/notify/* проксирует в Notification Service.',
  'NGINX: location /notifications/ → proxy_pass http://127.0.0.1:6028; если нужен прямой доступ.',
  'Фронт: использовать fetch с credentials: "include" для JWT аутентификации.',
  'Email setup: заполнить SMTP_PASS в .env для production email отправки.',
  'Toast: Toaster компонент из Sonner добавлен в App.tsx с position="bottom-right".'
];

const emailConfiguration = [
  'SMTP_HOST="smtp.gmail.com" - хост SMTP сервера',
  'SMTP_PORT="587" - порт (587 для TLS, 465 для SSL)',
  'SMTP_SECURE="false" - использовать SSL/TLS (false для STARTTLS)',
  'SMTP_USER="noreply@designcorp.eu" - username для SMTP',
  'SMTP_PASS="" - App Password (нужно заполнить для production)',
  'EMAIL_FROM="Beauty Platform <noreply@designcorp.eu>" - отправитель по умолчанию'
];

const troubleshooting = [
  'Email не отправляются: проверь SMTP_PASS в .env, перезапусти сервис через orchestrator.',
  'Уведомления не отображаются: проверь JWT токен в cookies, credentials: "include" в fetch.',
  'Badge count не обновляется: проверь useNotifications hook, интервал 30 секунд, console для ошибок.',
  'Toast не появляются: проверь Toaster в App.tsx, import { Toaster } from "sonner".',
  '401 ошибки: проверь что JWT_SECRET одинаковый в auth-service и notification-service.',
  'Сервис не стартует: проверь orchestrator status, порт 6028 свободен, build успешен.'
];

const productionChecklist = [
  { item: 'TypeScript типизация полная', status: true },
  { item: 'Error handling везде', status: true },
  { item: 'UX оптимизирован (loading/empty states)', status: true },
  { item: 'Performance: 30-секундный polling', status: true },
  { item: 'Security: httpOnly cookies', status: true },
  { item: 'Build успешен (1.44 MB / 299 KB gzip)', status: true },
  { item: 'SMTP credentials настроены', status: false, note: 'Заполнить SMTP_PASS' },
  { item: 'SMS интеграция', status: false, note: 'Будущая версия' }
];

export const NotificationServiceSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-purple-600" />
          Notification Service - Система уведомлений
        </CardTitle>
        <p className="text-sm text-gray-600">
          Обновлено 13.10.2025 (Issue #29). Production-ready сервис уведомлений с Email SMTP, Toast notifications, полной CRM интеграцией. Критические баги исправлены.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <div className="text-purple-900 font-semibold text-sm">{stat.value}</div>
              <div className="text-purple-700 text-xs mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
        <p>
          Архитектура: API Gateway (6020) → Notification Service (6028) → Nodemailer (SMTP). Frontend: polling каждые 30 секунд для real-time badge, Toast notifications в bottom-right, полноценная страница /notifications с фильтрами.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="w-5 h-5 text-blue-600" />
          Типы уведомлений
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {notificationTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.type} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Icon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">{type.type}</div>
                  <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="w-5 h-5 text-emerald-600" />
          API Endpoints
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-3 font-semibold text-gray-900 bg-gray-50">Method</th>
                <th className="py-2 px-3 font-semibold text-gray-900 bg-gray-50">Endpoint</th>
                <th className="py-2 px-3 font-semibold text-gray-900 bg-gray-50">Description</th>
              </tr>
            </thead>
            <tbody>
              {apiEndpoints.map((ep, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs">
                    <span className={`px-2 py-1 rounded ${ep.method === 'GET' ? 'bg-blue-100 text-blue-800' : ep.method === 'POST' ? 'bg-green-100 text-green-800' : ep.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-800">{ep.path}</td>
                  <td className="py-2 px-3 text-gray-700">{ep.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="w-5 h-5 text-indigo-600" />
          Frontend компоненты
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        {frontendComponents.map((comp) => (
          <div key={comp.name} className="border-l-4 border-indigo-500 pl-4 py-2">
            <div className="font-semibold text-gray-900 mb-1">{comp.name}</div>
            <div className="text-xs text-gray-600 font-mono mb-2">{comp.path}</div>
            <p className="text-gray-700 mb-2">{comp.description}</p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
              {comp.features.map((feature, idx) => (
                <li key={idx}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="w-5 h-5 text-orange-600" />
          Email SMTP конфигурация
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <p>Файл: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">/root/projects/beauty/.env</code></p>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs space-y-1 overflow-x-auto">
          {emailConfiguration.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-900 mb-1">Production Setup</div>
              <p className="text-yellow-800">
                Для включения реальной email отправки: получи App Password от Gmail (или другого провайдера), заполни SMTP_PASS в .env, перезапусти notification-service через orchestrator.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Automatic Email Sending (Phase 2.2) - 100% ЗАВЕРШЕНО
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Обновлено 13.10.2025. Автоматическая отправка email при событиях: booking confirmations, appointment reminders, payment receipts. Критические баги исправлены (notification_settings, appointment reminders job).
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-green-900 mb-2">✅ Booking Confirmations - РЕАЛИЗОВАНО</div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-green-800">
                  <li>Автоматическая отправка email при создании записи (POST /api/appointments)</li>
                  <li>Async отправка (не блокирует API response)</li>
                  <li>Полная информация: номер записи, услуга, мастер, дата, время, стоимость</li>
                  <li>Файл: services/crm-api/src/routes/appointments.ts:367-409</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-green-900 mb-2">✅ Appointment Reminders - РЕАЛИЗОВАНО</div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-green-800">
                  <li>Node-cron scheduled job запускается каждый час ('0 * * * *')</li>
                  <li>Автоматический поиск appointments за 23-25 часов вперед</li>
                  <li>Отправка email напоминаний всем клиентам с upcoming записями</li>
                  <li>Multi-tenant support (сканирует все салоны)</li>
                  <li>Graceful error handling</li>
                  <li>Файл: services/crm-api/src/jobs/appointmentReminders.ts (197 строк)</li>
                  <li>Ручной запуск: POST /debug/run-appointment-reminders</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-green-900 mb-2">✅ Payment Receipts - РЕАЛИЗОВАНО</div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-green-800">
                  <li>Интеграция с Payment Service handleInvoicePaymentSucceeded webhook</li>
                  <li>Автоматическая отправка после успешной оплаты Stripe invoice</li>
                  <li>Email sender utility: services/payment-service/src/utils/paymentEmailSender.ts</li>
                  <li>Профессиональный HTML шаблон с invoice-стилем</li>
                  <li>Async отправка (не блокирует webhook response)</li>
                  <li>Graceful error handling (webhook всегда возвращает 200)</li>
                  <li>Файл: services/payment-service/src/routes/webhooks.ts:331-379</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-blue-900 mb-2">Email Templates System</div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-blue-800">
                  <li>3 профессиональных HTML шаблона (booking, reminder, payment)</li>
                  <li>Responsive design с адаптацией под мобильные устройства</li>
                  <li>Русская локализация с динамическим контентом</li>
                  <li>Локация: services/crm-api/src/templates/ и services/notification-service/src/templates/</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="font-semibold text-gray-900 mb-2">Технические детали:</div>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
              <li>Email sender utility: services/crm-api/src/utils/emailSender.ts (215 строк)</li>
              <li>Dependencies: axios@1.6.2, node-cron@3.0.3, @types/node-cron@3.0.11</li>
              <li>Timezone: Europe/Warsaw (Poland)</li>
              <li>Status filter: только PENDING и CONFIRMED записи для reminders</li>
              <li>Cron job активируется автоматически при старте CRM API</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          Критические исправления 13.10.2025
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Исправлены 2 критические проблемы, блокирующие production deployment. Commit: bc96423.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-900 mb-2">Проблема #1: Endpoint /api/notifications/settings/me возвращал 500 ошибку</div>
              <ul className="list-disc pl-5 space-y-1 text-xs text-red-800">
                <li>Корневая причина #1: Missing tenantId в upsert create block (строка 106 в settings.ts)</li>
                <li>Корневая причина #2: Таблица notification_settings не была создана в БД</li>
                <li>Исправление: Добавлен tenantId + выполнен prisma db push</li>
                <li>Результат: Endpoint работает корректно, настройки уведомлений сохраняются</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-900 mb-2">Проблема #2: Appointment Reminders Job был отключен</div>
              <ul className="list-disc pl-5 space-y-1 text-xs text-red-800">
                <li>Корневая причина #1: Код был закомментирован в server.ts (строки 18, 395-413, 507-516)</li>
                <li>Корневая причина #2: Неправильный импорт prisma в appointmentReminders.ts:9</li>
                <li>Исправление: Раскомментирован код + исправлен импорт на {'import { prisma } from "@beauty-platform/database"'}</li>
                <li>Результат: Cron job ACTIVE, email напоминания отправляются автоматически за 24 часа</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          Production Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        {productionChecklist.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            {item.status ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className={item.status ? 'text-gray-900' : 'text-gray-600'}>{item.item}</span>
              {item.note && <span className="text-xs text-gray-500 ml-2">({item.note})</span>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-gray-600" />
          Integration Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ul className="list-disc pl-6 space-y-2">
          {integrationChecklist.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Критические правила
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ul className="list-disc pl-6 space-y-2">
          {criticalRules.map((rule, idx) => (
            <li key={idx} className="text-gray-800">{rule}</li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="w-5 h-5 text-yellow-600" />
          Troubleshooting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ul className="list-disc pl-6 space-y-2">
          {troubleshooting.map((issue, idx) => (
            <li key={idx} className="text-gray-800">{issue}</li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5 text-indigo-600" />
          Быстрые команды
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="space-y-2">
          <div>
            <div className="font-semibold text-gray-900 mb-1">Проверить статус сервиса:</div>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-xs">
              curl http://localhost:6030/orchestrator/services/notification-service/status
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-1">Получить уведомления (с JWT):</div>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-xs">
              curl -b cookies.txt http://localhost:6020/api/notifications/me
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-1">Отправить тестовый email:</div>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {`curl -X POST http://localhost:6028/api/notify/email \\
  -H "Content-Type: application/json" \\
  -d '{"to":"test@example.com","subject":"Test","html":"<h1>Test</h1>"}'`}
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-1">Перезапустить через orchestrator:</div>
            <div className="bg-gray-900 text-gray-100 rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {`curl -X POST http://localhost:6030/orchestrator/services/notification-service/actions \\
  -H "Content-Type: application/json" \\
  -d '{"action":"restart"}'`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default NotificationServiceSection;