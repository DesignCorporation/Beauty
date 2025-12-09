import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui';
import {
  ClipboardList,
  Monitor,
  Zap,
  Shield,
  BookOpen,
  CheckCircle,
  type LucideIcon
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  status: 'done' | 'todo';
}

interface ChecklistGroup {
  title: string;
  icon: LucideIcon;
  items: ChecklistItem[];
  description?: string;
}

const dailyOps: ChecklistGroup = {
  title: 'Ежедневные операции',
  icon: Monitor,
  items: [
    { id: 'daily-1', text: 'Проверить auto-restore статус и circuit breakers (./smart-restore-manager.sh status)', status: 'todo' },
    { id: 'daily-2', text: 'Просмотреть alerts (Telegram/webhook/email) и logs/auto-restore/readable.log', status: 'todo' },
    { id: 'daily-3', text: 'curl https://test-admin.beauty.designcorp.eu/api/health — убедиться, что gateway отвечает 200', status: 'todo' },
    { id: 'daily-4', text: 'Проверить Services Monitoring: красные сервисы → restore/reset', status: 'todo' },
    { id: 'daily-5', text: 'Обновить MCP /mcp/project-state (должен показывать текущие версии)', status: 'todo' }
  ]
};

const preDeploy: ChecklistGroup = {
  title: 'Перед деплоем',
  icon: Zap,
  items: [
    { id: 'deploy-1', text: 'git pull · pnpm install · pnpm build (фронты/сервисы)', status: 'todo' },
    { id: 'deploy-2', text: 'npx prisma migrate deploy · npx prisma generate', status: 'todo' },
    { id: 'deploy-3', text: './deployment/auto-restore/smart-restore-manager.sh restore-all и повторная проверка status', status: 'todo' },
    { id: 'deploy-4', text: 'curl /api/health и /api/auto-restore/status после деплоя', status: 'todo' },
    { id: 'deploy-5', text: 'Обновить соответствующие секции документации и MCP (Quick Start / DevOps / Security)', status: 'todo' }
  ]
};

const security: ChecklistGroup = {
  title: 'Security & политика',
  icon: Shield,
  items: [
    { id: 'sec-1', text: 'Токены только в httpOnly cookies. Проверить, что фронты используют credentials: "include".', status: 'todo' },
    { id: 'sec-2', text: 'tenantPrisma(tenantId) в каждом сервисе — беглый аудит новых PR или изменений.', status: 'todo' },
    { id: 'sec-3', text: 'MFA для SUPER_ADMIN/SALON_OWNER активна (проверить /api/auth/mfa/stats).', status: 'todo' },
    { id: 'sec-4', text: 'Не менять порты/маршруты без обновления API Gateway + документации.', status: 'todo' },
    { id: 'sec-5', text: 'Логи не должны содержать чувствительные данные — audit при подозрении.', status: 'todo' }
  ]
};

const docs: ChecklistGroup = {
  title: 'Документация и MCP',
  icon: BookOpen,
  items: [
    { id: 'doc-1', text: 'Фиксировать изменения в соответствующих секциях Admin Panel и MCP (обновить timestamp).', status: 'todo' },
    { id: 'doc-2', text: 'При добавлении функционала → обновить Quick Start / Overview / Roadmap.', status: 'todo' },
    { id: 'doc-3', text: 'Следить, чтобы Roadmap отражал актуальные задачи.', status: 'todo' },
    { id: 'doc-4', text: 'Синхронизировать Codex.md и CLAUDE.md, если менялись процессы.', status: 'todo' }
  ]
};

const cleanupDone: ChecklistGroup = {
  title: 'Архив завершённых задач (основные активности 2025)',
  icon: CheckCircle,
  description: 'Для справки: главные milestones закрыты.',
  items: [
    { id: 'done-1', text: 'Monorepo + UI kit · Auth Service · CRM/Client/Admin · Images API', status: 'done' },
    { id: 'done-2', text: 'Auto-Restore v3.2 · Health monitor · Alerts (Telegram/webhook/email)', status: 'done' },
    { id: 'done-3', text: 'PostgreSQL 16 + audit · tenantPrisma() everywhere · CSRF/MFA', status: 'done' },
    { id: 'done-4', text: 'Документация синхронизирована в Admin Panel + MCP', status: 'done' }
  ]
};

const groups: ChecklistGroup[] = [cleanupDone, dailyOps, preDeploy, security, docs];

export const ChecklistSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-indigo-600" />
          Operational Checklist
        </CardTitle>
        <p className="text-sm text-gray-600">
          Единый чеклист: ежедневная эксплуатация, деплой, security-проверки и документирование изменений.
        </p>
      </CardHeader>
    </Card>

    {groups.map(({ title, icon: Icon, items, description }) => (
      <Card key={title}>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="w-5 h-5 text-indigo-600" />
            {title}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {items.filter((item) => item.status === 'done').length} / {items.length}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          {description && <p className="text-xs text-gray-500">{description}</p>}
          <ul className="list-disc pl-5 text-xs space-y-1">
            {items.map((item) => (
              <li key={item.id} className={item.status === 'done' ? 'text-emerald-700' : 'text-gray-700'}>
                {item.text}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    ))}
  </div>
)
