import type { DashboardNotificationsData } from '../../../hooks/useDashboardOverview'
import { CatalystCard } from '../../../components/ui/CatalystCard'

interface NotificationsWidgetProps {
  data?: DashboardNotificationsData | null
  loading?: boolean
}

export function NotificationsWidget({ data, loading }: NotificationsWidgetProps): JSX.Element {
  const sent = data?.totalSent ?? 0
  const failed = data?.failed ?? 0

  return (
    <CatalystCard
      title="Уведомления"
      description="Сводка отправок за сегодня"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg border border-border/60 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Отправлено</span>
            <span className="text-2xl font-medium text-foreground mt-1">{loading && !data ? '—' : sent}</span>
          </div>
          <div className="p-3 bg-muted rounded-lg border border-border/60 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ошибки</span>
            <span className={`text-2xl font-medium mt-1 ${failed > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {loading && !data ? '—' : failed}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-border/60">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Последнее уведомление</span>
          {data?.latest ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground line-clamp-1">{data.latest.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(data.latest.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · {new Date(data.latest.createdAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {loading ? 'Загружаем…' : 'Нет уведомлений за сегодня'}
            </p>
          )}
        </div>
      </div>
    </CatalystCard>
  )
}
