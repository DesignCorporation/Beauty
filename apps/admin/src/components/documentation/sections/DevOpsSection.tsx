import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Settings,
  Server,
  Globe,
  Zap,
  ClipboardList,
  Terminal,
  Monitor,
  HardDrive
} from 'lucide-react';

interface Stat {
  label: string;
  value: string;
}

interface ServiceGroup {
  title: string;
  items: string[];
  color: string;
}

interface NginxRule {
  domain: string;
  target: string;
}

const quickStats: Stat[] = [
  { label: 'Прод сервер', value: '135.181.156.117' },
  { label: 'Сервисы', value: '9 microservices + 4 frontends' },
  { label: 'API Gateway', value: 'порт 6020, nginx фронт' },
  { label: 'Auto-Restore', value: 'v3.2, проверки каждые 30 сек' }
];

const serviceGroups: ServiceGroup[] = [
  {
    title: 'Backend',
    items: ['API Gateway 6020', 'Auth Service 6021', 'CRM API 6022', 'Images API 6026', 'Backup Service 6027', 'MCP Server 6025'],
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  {
    title: 'Frontend',
    items: ['Landing Page 6004', 'Salon CRM 6001', 'Admin Panel 6002', 'Client Booking 6003'],
    color: 'bg-indigo-50 border-indigo-200 text-indigo-800'
  },
  {
    title: 'Infrastructure',
    items: ['PostgreSQL 16 (6100)', 'Auto-Restore scripts', 'Health monitor + alerts', 'Nginx reverse proxy'],
    color: 'bg-emerald-50 border-emerald-200 text-emerald-800'
  }
];

const autoRestoreCommands = `# Статус сервисов
./smart-restore-manager.sh status

# Восстановить CRM
./smart-restore-manager.sh restore crm-api

# Mass restore
./smart-restore-manager.sh restore-all

# Circuit breakers
./smart-restore-manager.sh circuit-breaker-status
./smart-restore-manager.sh reset-circuit-breaker auth-service`;

const autoRestoreNotes = [
  'Health-monitor проверяет сервисы каждые 30 секунд (HTTP + порты).',
  'Circuit breaker — максимум 3 попытки за 60 минут, затем alert + ручной reset.',
  'Логи: logs/auto-restore/ (JSON + readable).',
  'UI: Admin Panel → Services Monitoring (управление reboot/auto-restore).',
  'Alerts: Telegram, webhook, email через alert-system.sh.'
];

const deploymentSteps = [
  { step: '1. Подготовка', cmd: 'git pull origin main\npnpm install\npnpm build', note: 'Собрать фронты/сервисы, обновить зависимости.' },
  { step: '2. Миграции', cmd: 'npx prisma migrate deploy\nnpx prisma generate', note: 'Обновить БД и Prisma Client.' },
  { step: '3. Перезапуск', cmd: './deployment/auto-restore/smart-restore-manager.sh restore-all', note: 'Восстановить сервисы через auto-restore (без PM2).' },
  { step: '4. Проверка', cmd: './deployment/auto-restore/smart-restore-manager.sh status\ncurl https://test-admin.beauty.designcorp.eu/api/health', note: 'Контроль статуса и health-check вручную.' }
];

const nginxRules: NginxRule[] = [
  { domain: 'test-admin.beauty.designcorp.eu', target: 'proxy_pass http://127.0.0.1:6002;' },
  { domain: 'test-crm.beauty.designcorp.eu', target: 'proxy_pass http://127.0.0.1:6001;' },
  { domain: 'client.beauty.designcorp.eu', target: 'proxy_pass http://127.0.0.1:6003;' },
  { domain: 'api.beauty.designcorp.eu', target: 'proxy_pass http://127.0.0.1:6020;' }
];

const monitoringTips = [
  'Health: curl https://test-admin.beauty.designcorp.eu/api/health',
  'Auto-Restore: curl https://test-admin.beauty.designcorp.eu/api/auto-restore/status',
  'System metrics: curl https://test-admin.beauty.designcorp.eu/api/system/metrics',
  'Logs: tail -f logs/auto-restore/readable.log',
  'Telegram alerts: проверять канал (настроен).' 
];

const troubleshootingTips = [
  'Сервис не стартует → проверить node_modules, порт, circuit breaker, restore-*.log.',
  '403/401 → убедиться, что gateway добавляет credentials, см. logs/crm-api-auth.log.',
  'Auto-Restore idle → проверить, запущены ли master-orchestrator и health-monitor.',
  'Nginx 502 → сервис на порту не поднялся; смотреть smart-restore logs.',
  'Бэкапы отсутствуют → проверить deployment/auto-restore/backup-system.sh и logs/backup-system.log.'
];

const backupInfo = [
  'Авто-бэкапы каждые 30 минут (cron).',
  'Файлы в deployment/auto-restore/backups + красивые логи.',
  'Команда вручную: ./deployment/auto-restore/backup-system.sh',
  'Стратегия восстановления описана в Auto-Restore разделе.'
];

const logsAndCommands = `# Проверка auto-restore
./deployment/auto-restore/smart-restore-manager.sh status

# Проверка nginx конфигурации
sudo nginx -t

# Просмотр логов health
cat logs/health-monitor.log | tail -50`;

export const DevOpsSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          DevOps & Infrastructure Overview
        </CardTitle>
        <p className="text-sm text-gray-600">
          Обновлено 19.09.2025. Без PM2: auto-restore v3.2, nginx reverse proxy, PostgreSQL 16 и health мониторинг.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-700">
        {quickStats.map((stat) => (
          <div key={stat.label} className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="text-indigo-900 font-semibold text-sm">{stat.value}</div>
            <div className="text-indigo-700 text-xs mt-1 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Server className="w-5 h-5 text-blue-600" />
          Контур сервисов
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm text-gray-700">
        {serviceGroups.map((group) => (
          <div key={group.title} className={`${group.color} rounded-lg border p-4 space-y-1`}>
            <h4 className="font-semibold text-gray-900">{group.title}</h4>
            <ul className="list-disc pl-5 text-xs">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-emerald-600" />
          Auto-Restore v3.2
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-gray-700">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h4 className="font-semibold text-emerald-900 mb-2">Команды</h4>
          <pre className="bg-white rounded p-2 text-xs">{autoRestoreCommands}</pre>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h4 className="font-semibold text-emerald-900 mb-2">Примечания</h4>
          <ul className="list-disc pl-5 text-xs text-emerald-700 space-y-1">
            {autoRestoreNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-green-600" />
          Deployment workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {deploymentSteps.map((step) => (
            <div key={step.step} className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-green-800">
                <span className="font-semibold">{step.step}</span>
              </div>
              <p className="text-xs text-gray-700">{step.note}</p>
              <pre className="bg-white rounded p-2 text-xs">{step.cmd}</pre>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex itemsіть gap-2 text-lg">
          <Globe className="w-5 h-5 text-purple-600" />
          Nginx маршруты
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
        {nginxRules.map((rule) => (
          <div key={rule.domain} className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1">
            <h4 className="font-semibold text-purple-900">{rule.domain}</h4>
            <pre className="bg-white rounded p-2 text-xs">{rule.target}</pre>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Monitor className="w-5 h-5 text-blue-600" />
          Мониторинг & логи
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
          <h4 className="font-semibold text-blue-900">Быстрые проверки</h4>
          <ul className="list-disc pl-5 text-xs text-blue-700">
            {monitoringTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
          <h4 className="font-semibold text-orange-900">Типовые проблемы</h4>
          <ul className="list-disc pl-5 text-xs text-orange-700">
            {troubleshootingTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardDrive className="w-5 h-5 text-amber-600" />
          Backup информация
        </CardTitle>
      </CardHeader>
      <CardContent className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
        <ul className="list-disc pl-5 text-xs text-amber-700 space-y-1">
          {backupInfo.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="w-5 h-5 text-gray-600" />
          Полезные команды
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <pre className="bg-gray-50 border border-gray-200 rounded p-2 text-xs">{logsAndCommands}</pre>
      </CardContent>
    </Card>
  </div>
);
