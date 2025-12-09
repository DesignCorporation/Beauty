import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { DashboardKpiData } from '../../../hooks/useDashboardOverview'

interface KpiRowProps {
  data?: DashboardKpiData | null
  loading?: boolean
}

const formatNumber = (value?: number, fallback = '—') => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }
  return value.toLocaleString('ru-RU')
}

const formatCurrency = (value?: number, currency?: string) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }

  return `${value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })} ${currency ?? ''}`.trim()
}

export function KpiRow({ data, loading }: KpiRowProps): JSX.Element {
  const { t } = useTranslation()
  const averageOrder =
    data && data.appointmentsToday > 0
      ? data.revenueToday / data.appointmentsToday
      : null

  const cards = [
    {
      key: 'revenue',
      label: t('dashboard.metrics.todayRevenue', 'Выручка сегодня'),
      value: formatCurrency(data?.revenueToday, data?.currency),
      delta: data?.revenueChangePct ?? null,
      helper: t('dashboard.metrics.lastWeekDelta', 'по сравнению с прошлой неделей')
    },
    {
      key: 'average',
      label: t('dashboard.metrics.averageOrder', 'Средний чек'),
      value: formatCurrency(averageOrder ?? undefined, data?.currency),
      delta: null,
      helper: t('dashboard.metrics.averageOrderHelper', 'расчет по текущим записям')
    },
    {
      key: 'appointments',
      label: t('dashboard.metrics.appointmentsToday', 'Записей сегодня'),
      value: formatNumber(data?.appointmentsToday),
      delta: null,
      helper: t('dashboard.metrics.calendarHelper', 'по календарю')
    },
    {
      key: 'newClients',
      label: t('dashboard.metrics.newClientsWeek', 'Новые клиенты (7 дней)'),
      value: formatNumber(data?.newClients7d),
      delta: null,
      helper: t('dashboard.metrics.clientsHelper', 'рост клиентской базы')
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ key, label, value, delta, helper }) => (
        <div
          key={key}
          className="border-t border-border pt-4 px-4"
        >
          <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-medium text-foreground tracking-tight mb-2">
            {loading && !data ? '—' : value}
          </p>
          {typeof delta === 'number' ? (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center text-xs font-medium ${
                  delta >= 0
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {delta >= 0 ? (
                  <>
                    <TrendingUp className="mr-1 h-3.5 w-3.5" />+{Math.abs(delta).toFixed(1)}%
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-1 h-3.5 w-3.5" />-{Math.abs(delta).toFixed(1)}%
                  </>
                )}
              </span>
              <span className="text-xs text-muted-foreground/70">{helper}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/70">{helper}</span>
          )}
        </div>
      ))}
    </div>
  )
}
