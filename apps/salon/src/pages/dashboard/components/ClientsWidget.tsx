import { Progress } from '@beauty-platform/ui'
import type { DashboardClientsData } from '../../../hooks/useDashboardOverview'
import { CatalystCard } from '../../../components/ui/CatalystCard'
import { Cake } from 'lucide-react'

interface ClientsWidgetProps {
  data?: DashboardClientsData | null
  loading?: boolean
}

export function ClientsWidget({ data, loading }: ClientsWidgetProps): JSX.Element {
  const birthdays = data?.birthdaysToday ?? []
  const vipClients = data?.vipClients ?? []
  const retention = data?.retention30d ?? 0

  return (
    <CatalystCard
      title="Клиенты"
      description="Дни рождения, VIP и возвращаемость"
    >
      <div className="divide-y divide-border/60">
        <div className="pb-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Cake className="w-4 h-4 text-primary" />
            Дни рождения сегодня
          </div>
          {loading && birthdays.length === 0 && (
            <div className="text-sm text-muted-foreground">Проверяем список…</div>
          )}
          {!loading && birthdays.length === 0 && (
            <div className="text-sm text-muted-foreground">Сегодня именинников нет</div>
          )}
          {birthdays.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {birthdays.map((entry: { id: string; name: string }) => (
                <span key={entry.id} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                  {entry.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="py-4 space-y-3">
          <div className="text-sm font-medium text-foreground">VIP клиенты (ТОП-5)</div>
          {loading && vipClients.length === 0 && (
            <div className="text-sm text-muted-foreground">Загружаем данные…</div>
          )}
          {!loading && vipClients.length === 0 && (
            <div className="text-sm text-muted-foreground">Недостаточно данных по выручке</div>
          )}
          <div className="space-y-2">
            {vipClients.map((client: { id: string; name: string; revenue: number }, i: number) => (
              <div key={client.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">{i + 1}</span>
                  <span className="text-foreground">{client.name}</span>
                </div>
                <span className="font-medium text-foreground">
                  {client.revenue.toLocaleString('ru-RU', { minimumFractionDigits: 0 })} PLN
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Возвращаемость клиентов</span>
            <span className="text-muted-foreground">{loading ? '...' : `${retention}%`}</span>
          </div>
          <Progress value={retention} className="h-2 bg-muted" />
          <div className="text-xs text-muted-foreground/70">
            Расчет за последние 90 дней
          </div>
        </div>
      </div>
    </CatalystCard>
  )
}
