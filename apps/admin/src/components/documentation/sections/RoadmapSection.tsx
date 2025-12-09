import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui'
import { Target, CheckCircle, Rocket, ClipboardList } from 'lucide-react'

interface Stat {
  label: string
  value: string
}

const roadmapStats: Stat[] = [
  { label: 'Бета готовность', value: '≈90%' },
  { label: 'Сервисы в проде', value: '9 backend · 4 frontend' },
  { label: 'Auto-Restore', value: 'v3.2 · 30с health-check' },
  { label: 'Документация', value: '26 секций · MCP sync' }
]

const completed = [
  'Монорепо + @beauty-platform/ui и единый дизайн',
  'Auth Service (JWT, MFA, CSRF) и API Gateway',
  'Salon CRM, Client Booking, Admin Panel, Landing',
  'PostgreSQL 16 + audit база, tenant isolation',
  'Auto-Restore v3.2, monitoring, Telegram/webhook/email alerts',
  'SSL, nginx reverse proxy, автоматические бэкапы'
]

const inProgress = [
  'Подготовка beta-onboarding: скрипты, материалы, фидбек-процесс',
  'Финальный UX-полиш CRM и клиентского портала',
  'Документационная синхронизация Admin Panel → MCP',
  'Наблюдение за alerts и circuit breaker статусами через Services Monitoring'
]

const planned = [
  'Notification Service (6023): email/SMS/внутренние уведомления',
  'Payment Service (6024) и подписки салонов',
  'Public salon sites генератор (6004)',
  'Продвинутые отчёты и analytics'
]

export const RoadmapSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-6 h-6 text-indigo-600" />
          Beauty Platform Roadmap
        </CardTitle>
        <p className="text-sm text-gray-600">Обновлено 19.09.2025. Система в продакшене, акцент на beta onboarding и поддержку.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-700">
        {roadmapStats.map((stat) => (
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
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          Завершено
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-gray-700">
        <ul className="list-disc pl-5 text-xs text-emerald-700 space-y-1">
          {completed.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="w-5 h-5 text-blue-600" />
          Сейчас в работе
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-gray-700">
        <ul className="list-disc pl-5 text-xs text-blue-700 space-y-1">
          {inProgress.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-amber-600" />
          Планируется
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-gray-700">
        <ul className="list-disc pl-5 text-xs text-amber-700 space-y-1">
          {planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  </div>
)
