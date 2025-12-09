import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Rocket,
  Layers,
  BookOpen,
  ClipboardList,
  Monitor,
  Terminal
} from 'lucide-react';

interface Stat {
  label: string;
  value: string;
}

interface DocLink {
  title: string;
  description: string;
  href: string;
}

const stats: Stat[] = [
  { label: 'Сервисы', value: '9 backend + 4 фронта' },
  { label: 'API Gateway', value: '6020 (nginx фронт)' },
  { label: 'Auto-Restore', value: 'v3.2 · health-check 30с' },
  { label: 'Документация', value: '26 секций · MCP sync' }
];

const docLinks: DocLink[] = [
  {
    title: 'Quick Start',
    description: '10‑минутный чек-лист, роли и инструменты',
    href: '/documentation/quick-start'
  },
  {
    title: 'Architecture',
    description: 'Монорепо, сервисы, маршрутизация и данные',
    href: '/documentation/architecture'
  },
  {
    title: 'Auth & Security',
    description: 'httpOnly, MFA, tenant isolation и правила',
    href: '/documentation/auth'
  },
  {
    title: 'API Catalog',
    description: 'Proxy маршруты Gateway + эндпоинты сервисов',
    href: '/documentation/api'
  },
  {
    title: 'Frontend Guide',
    description: 'UI-kit, auth integration, styling и сниппеты',
    href: '/documentation/frontend'
  },
  {
    title: 'DevOps & Monitoring',
    description: 'Auto-restore, деплой, nginx и бэкапы',
    href: '/documentation/devops'
  }
];

const systemMap = {
  backend: ['API Gateway 6020', 'Auth 6021', 'CRM API 6022', 'Images 6026', 'Backup 6027', 'MCP 6025'],
  frontend: ['Landing 6000', 'Salon CRM 6001', 'Admin Panel 6002', 'Client Booking 6003'],
  infrastructure: ['PostgreSQL 16 (6100)', 'Auto-Restore scripts', 'Monitoring + alerts', 'NGINX reverse proxy']
};

const operations = [
  'Auto-Restore и health-monitor запущены (контроль каждые 30 секунд).',
  'Telegram / webhook / email оповещения включены.',
  'Бэкапы создаются каждые 30 минут (deployment/auto-restore/backup-system.sh).',
  'MCP Server синхронизирует документацию для AI агентов (порт 6025).'
];

const nextSteps = [
  'Поддерживать синхронизацию секций Admin Panel → MCP.',
  'Готовиться к beta: финальный UX-полиш CRM и Client Booking.',
  'Отслеживать alerts и circuit breaker статусы через Services Monitoring.',
  'Фиксировать инфраструктурные изменения в DevOps и Security секциях.'
];

export const OverviewSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-6 h-6 text-indigo-600" />
          Beauty Platform — обзор
        </CardTitle>
        <p className="text-sm text-gray-600">
          Платформа салонного бизнеса: монорепозиторий, мультитенантная архитектура, auto-restore инфраструктура и единая документация в Admin Panel.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-700">
        {stats.map((stat) => (
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
          <Layers className="w-5 h-5 text-blue-600" />
          Системная карта
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
          <h4 className="font-semibold text-gray-900">Backend</h4>
          <ul className="list-disc pl-5 text-xs">
            {systemMap.backend.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-1">
          <h4 className="font-semibold text-gray-900">Frontend</h4>
          <ul className="list-disc pl-5 text-xs">
            {systemMap.frontend.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-1">
          <h4 className="font-semibold text-gray-900">Инфраструктура</h4>
          <ul className="list-disc pl-5 text-xs">
            {systemMap.infrastructure.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5 text-purple-600" />
          Документация
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
        {docLinks.map((link) => (
          <a key={link.href} href={link.href} className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:border-purple-300 transition">
            <h4 className="font-semibold text-purple-900">{link.title}</h4>
            <p className="text-xs text-purple-700 mt-1">{link.description}</p>
          </a>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Monitor className="w-5 h-5 text-green-600" />
          Операционный статус
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ul className="list-disc pl-5 text-xs text-green-700 space-y-1">
          {operations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-amber-600" />
          Приоритеты / следующие шаги
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ul className="list-disc pl-5 text-xs text-amber-700 space-y-1">
          {nextSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="w-5 h-5 text-gray-600" />
          Полезные точки входа
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="font-semibold text-gray-900">Команды статуса</h4>
          <pre className="bg-white rounded p-2 text-xs whitespace-pre-wrap">curl https://test-admin.beauty.designcorp.eu/api/health
curl https://test-admin.beauty.designcorp.eu/api/auto-restore/status
./deployment/auto-restore/smart-restore-manager.sh status</pre>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="font-semibold text-gray-900">Логи и алерты</h4>
          <pre className="bg-white rounded p-2 text-xs whitespace-pre-wrap">tail -f logs/auto-restore/readable.log
cat logs/health-monitor.log | tail -20
cat logs/alerts.log | tail -20</pre>
        </div>
      </CardContent>
    </Card>
  </div>
);
