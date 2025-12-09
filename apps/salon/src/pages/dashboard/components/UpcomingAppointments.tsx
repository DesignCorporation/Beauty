import type { DashboardAppointment } from '../../../hooks/useDashboardOverview'
import { CatalystCard } from '../../../components/ui/CatalystCard'

interface UpcomingAppointmentsProps {
  appointments: DashboardAppointment[]
  loading?: boolean
}

const statusColorMap: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  NO_SHOW: 'bg-zinc-100 text-zinc-700 ring-zinc-500/20',
  COMPLETED: 'bg-zinc-50 text-zinc-700 ring-zinc-600/20'
}

const statusLabelMap: Record<string, string> = {
  CONFIRMED: 'Подтверждена',
  IN_PROGRESS: 'Выполняется',
  PENDING: 'Ожидает',
  CANCELLED: 'Отменена',
  NO_SHOW: 'Не явился',
  COMPLETED: 'Завершена'
};

const formatTime = (value: string) => {
  try {
    return new Date(value).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return value
  }
}

const formatDate = (value: string) => {
  try {
    const date = new Date(value);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    }
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    })
  } catch {
    return value
  }
}

export function UpcomingAppointments({ appointments, loading }: UpcomingAppointmentsProps): JSX.Element {
  const hasData = appointments.length > 0

  return (
    <CatalystCard
      title="Ближайшие записи"
      description="Следующие 5 визитов"
      noPadding
    >
      {loading && !hasData && (
        <div className="p-6 text-sm text-zinc-500">Загружаем расписание…</div>
      )}

      {!loading && !hasData && (
        <div className="p-6 text-sm text-muted-foreground text-center">Нет запланированных записей</div>
      )}

      {hasData && (
        <ul className="divide-y divide-border/60">
          {appointments.map((appointment) => (
            <li key={appointment.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/40">
              <div className="flex gap-4">
                <div className="flex-none w-12 h-12 rounded-full bg-muted ring-1 ring-border/60 flex items-center justify-center flex-col">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase leading-none">{formatDate(appointment.startTime).split(' ')[1] || 'СЕГ'}</span>
                  <span className="text-sm font-medium text-foreground leading-none mt-0.5">{new Date(appointment.startTime).getDate()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{appointment.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {formatTime(appointment.startTime)} · {appointment.serviceName}
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColorMap[appointment.status] ?? 'bg-muted text-foreground ring-border/50'}`}>
                {statusLabelMap[appointment.status] ?? appointment.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </CatalystCard>
  )
}
