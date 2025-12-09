import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui'
import {
  Calendar,
  Database,
  CheckCircle2,
  Clock,
  Users,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Layers
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type IssueStatus = 'done' | 'wip' | 'next'

interface StatusItem {
  issue: string
  title: string
  summary: string
  status: IssueStatus
  updated: string
}

interface HighlightBlock {
  title: string
  icon: LucideIcon
  items: string[]
}

const statusLabel: Record<IssueStatus, string> = {
  done: 'Готово',
  wip: 'В работе',
  next: 'Далее'
}

const statusBadgeClass: Record<IssueStatus, string> = {
  done: 'bg-green-50 text-green-700 border-green-200',
  wip: 'bg-amber-50 text-amber-700 border-amber-200',
  next: 'bg-slate-50 text-slate-700 border-slate-200'
}

const statusIcon: Record<IssueStatus, LucideIcon> = {
  done: CheckCircle2,
  wip: Clock,
  next: Lightbulb
}

const statusItems: StatusItem[] = [
  {
    issue: '#73',
    title: 'Prisma Schema & Seed',
    summary: '3 модели расписаний + каскадные удаления и timezone-aware хранение',
    status: 'done',
    updated: '10.11.2025'
  },
  {
    issue: '#74',
    title: 'Schedule API + Slots',
    summary: '7 REST endpoints, enum SlotUnavailabilityReason и полноценный расчет слотов',
    status: 'done',
    updated: '10.11.2025'
  },
  {
    issue: '#75',
    title: 'UI: Working Hours',
    summary: 'Редактор графика салона на странице настроек + hook useWorkingHours',
    status: 'wip',
    updated: '11.11.2025'
  },
  {
    issue: '#76',
    title: 'UI: Staff Schedules',
    summary: 'Профиль мастера с overrides, исключениями и синком с CRM API',
    status: 'wip',
    updated: '11.11.2025'
  },
  {
    issue: '#77',
    title: 'Calendar & Portal Sync',
    summary: 'Интеграция available-slots в календарь и клиентский портал',
    status: 'next',
    updated: 'Planned'
  }
]

const backendHighlights: HighlightBlock[] = [
  {
    title: 'Issue #73 — Prisma схема расписаний',
    icon: Database,
    items: [
      'Модели SalonWorkingHour, StaffWorkingHour, StaffScheduleException + enum ScheduleExceptionType в core/database/prisma/schema.prisma',
      'Seed с недельным шаблоном и отпуском мастера (core/database/prisma/seed.ts) → моментальный демо-набор данных',
      'TypeScript контракты и хелперы в apps/salon-crm/src/types/schedule.ts синхронизированы с Prisma',
      'Все запросы проходят через tenantPrisma(tenantId) и наследуют каскадные удаления (Tenant/User wipe → чистое расписание)'
    ]
  },
  {
    title: 'Issue #74 — CRM Schedule API',
    icon: Layers,
    items: [
      '7 endpoints в services/crm-api/src/routes/schedule.ts: GET/PUT working-hours, GET/PUT staff schedule, POST/DELETE exceptions, GET available-slots',
      'Расчет слотов через date-fns-tz с 15-минутной сеткой, буфером и возвратом local+UTC времени',
      'SlotUnavailabilityReason + getSlotUnavailabilityMessage покрывают все причины недоступности и уже импортируются фронтом',
      'Smoke: pnpm --filter @beauty-platform/crm-api build и salon-crm build проходят без ошибок после добавления API'
    ]
  }
]

const uiBlocks: HighlightBlock[] = [
  {
    title: 'Issue #75 — Редактор рабочих часов салона',
    icon: Calendar,
    items: [
      'Компонент apps/salon-crm/src/components/schedule/WorkingHoursEditor.tsx с переключателями рабочих дней, шагом 15 минут и подсказкой часового пояса',
      'Хук useWorkingHours + CRMApiService.get/updateSalonWorkingHours обеспечивают загрузку/сохранение и fallback на дефолтный шаблон',
      'Настройки салона (SalonSettingsPage) сравнивают editedHours с серверным состоянием, показывают toasts и используют httpOnly cookies (credentials: include)',
      'Нужно дособрать UX (bulk-редактирование, гайдовое состояние ошибок) и покрыть Vitest юнит-тестами для нормализации времени'
    ]
  },
  {
    title: 'Issue #76 — Планирование персонала',
    icon: Users,
    items: [
      'StaffProfilePage открывает вкладку «Schedule»: WorkingHoursEditor для overrides, кнопки Reset/Save и прогресс-индикаторы',
      'CRMApiService.get/updateStaffSchedule + useStaffSchedules обеспечивают загрузку расписаний всей команды для календаря и модалки записи',
      'Исключения (DAY_OFF, SICK_LEAVE, CUSTOM_HOURS) создаются и удаляются через CRMApiService.create/deleteStaffScheduleException; форма валидирует диапазоны дат',
      'Следующий шаг — визуализация исключений прямо в календаре и локализация подсказок на PL/EN'
    ]
  }
]

const nextSteps = [
  'Issue #77: подключить GET /api/crm/schedule/available-slots к CalendarGrid и AppointmentModal (уже используют useStaffSchedules) + передать SlotUnavailabilityReason в UI подсказки',
  'Client Portal: заменить локальный расчет слотов на CRM API (apps/client-portal) и добавить аудит запросов в orchestrator',
  'Набор тестов: e2e сценарий «мастер в отпуске» + unit для getWorkingHoursRange / isStaffAvailable (Vitest)',
  'Документация: обновить docs/sections/crm/schedule-models.md (раздел API status) и добавить UI скриншоты в MCP project-state'
]

export const CrmDevelopmentSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex flex-col gap-1">
            <span className="text-sm uppercase tracking-wide text-indigo-600">Week 45 · CRM Features</span>
            📅 Schedule Management — аналитика спринта
          </CardTitle>
          <p className="text-sm text-slate-600">
            Фокус: довести пакет Issues #73–#77 до состояния production ready. Backend закрыт, UI и календарь переходят в стадию полировки.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statusItems.map(item => {
            const Icon = statusIcon[item.status]
            return (
              <div key={item.issue} className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{item.issue}</span>
                  <Badge variant="outline" className={`${statusBadgeClass[item.status]} font-medium`}>
                    {statusLabel[item.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-indigo-600" />
                  <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                </div>
                <p className="text-sm text-slate-600">{item.summary}</p>
                <p className="text-xs text-slate-400">Обновлено: {item.updated}</p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border border-green-200 bg-green-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Database className="w-5 h-5" />
            Backend готов — Issues #73 & #74
          </CardTitle>
          <p className="text-sm text-green-800">
            Prisma, seed, типы и API синхронизированы между core, crm-api и salon-crm.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {backendHighlights.map(block => {
            const IconComponent = block.icon
            return (
              <div key={block.title} className="rounded-lg border border-green-200 bg-white/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <IconComponent className="w-5 h-5 text-green-600" />
                  {block.title}
                </div>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {block.items.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            UI прогресс — Issues #75 & #76
          </CardTitle>
          <p className="text-sm text-slate-600">
            Редакторы графиков уже подключены к реальному API и используют httpOnly токены; осталось улучшить UX и покрыть тестами.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {uiBlocks.map(block => {
            const IconComponent = block.icon
            return (
              <div key={block.title} className="rounded-lg border border-slate-200 p-4 bg-white/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <IconComponent className="w-5 h-5 text-indigo-600" />
                  {block.title}
                </div>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                {block.items.map(item => (
                  <li key={item}>{item}</li>
                ))}
                </ul>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border border-blue-200 bg-blue-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Calendar className="w-5 h-5" />
            Issue #77 — Календарь и available-slots
          </CardTitle>
          <p className="text-sm text-blue-800">
            Фронт уже использует useStaffSchedules внутри CalendarGrid и AppointmentModal — осталось подключить новый endpoint и отобразить причины недоступности.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li>hooks/useAvailableSlots.ts и CRMApiService.getAvailableSlots готовы принимать {`{ date, staffId, serviceDurationMinutes, bufferMinutes }`}.</li>
            <li>CalendarGrid умеет показывать серые дни, если салон закрыт, но пока не визуализирует SlotUnavailabilityReason — нужно добавить тултипы.</li>
            <li>AppointmentModal уже фильтрует мастеров через isStaffAvailable; после подключения available-slots можно показывать точное окно и предупреждения.</li>
            <li>Client Portal (apps/client-portal) ждет тот же endpoint, чтобы отказаться от локальных моков.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Риски и следующие шаги
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">Основной риск</p>
            <p>UI уже опирается на реальные данные, поэтому любые breaking changes в crm-api требуют одновременного обновления hooks/useWorkingHours и useStaffSchedules. Тримминг таймзон должен проходить через Context7 перед правками.</p>
          </div>
          <div className="rounded-md border border-slate-200 p-4 bg-white/80">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Что делаем дальше
            </div>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              {nextSteps.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
