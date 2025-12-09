import { Progress } from '@beauty-platform/ui'
import type { DashboardStaffData } from '../../../hooks/useDashboardOverview'
import { CatalystCard } from '../../../components/ui/CatalystCard'

interface StaffWidgetProps {
  data?: DashboardStaffData | null
  loading?: boolean
}

export function StaffWidget({ data, loading }: StaffWidgetProps): JSX.Element {
  const workload = data?.workload ?? []
  const topPerformer = data?.topPerformer

  return (
    <CatalystCard
      title="Сотрудники"
      description="Загруженность сегодня и ТОП‑мастер"
    >
      <div className="space-y-6">
        {workload.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {loading ? 'Считаем занятость команды…' : 'Нет записей для расчёта загрузки'}
          </p>
        ) : (
          <div className="space-y-4">
            {workload.map((entry: { staffId: string; name: string; utilization: number; appointments: number }) => (
              <div key={entry.staffId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{entry.name}</span>
                  <span className="text-muted-foreground">
                    {entry.utilization}% · {entry.appointments} записей
                  </span>
                </div>
                <Progress value={entry.utilization} className="h-2 bg-muted" />
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-border/60">
          {topPerformer ? (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  ТОП‑мастер (30 дней)
                </p>
                <p className="mt-1 text-base font-medium text-foreground">
                  {topPerformer.name}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {topPerformer.clients} клиентов ·{' '}
                  <span className="font-medium text-foreground">
                    {topPerformer.revenue.toLocaleString('ru-RU')} PLN
                  </span>
                </p>
              </div>
              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                Лидер продаж
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {loading ? 'Подбираем статистику…' : 'Недостаточно данных по выручке сотрудников'}
            </p>
          )}
        </div>
      </div>
    </CatalystCard>
  )
}
