import { Progress } from '@beauty-platform/ui'
import type { DashboardFinanceData } from '../../../hooks/useDashboardOverview'
import { CatalystCard } from '../../../components/ui/CatalystCard'

interface FinanceWidgetProps {
  data?: DashboardFinanceData | null
  currency?: string
  loading?: boolean
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

export function FinanceWidget({ data, loading, currency }: FinanceWidgetProps): JSX.Element {
  const categories = data?.categories ?? []

  return (
    <CatalystCard
      title="Финансы"
      description="Доход по категориям услуг за 30 дней"
    >
      <div className="space-y-6">
        {categories.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center bg-muted rounded-lg border border-dashed border-border/60">
            {loading ? 'Загружаем данные…' : 'Нет данных за этот период'}
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category: { name: string; revenue: number; percentage: number }) => (
              <div key={category.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">{category.name}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(category.revenue, currency)}
                  </span>
                </div>
                <Progress value={category.percentage} className="h-2 bg-muted" />
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Выручка (30 дней)</span>
            <span className="font-medium text-foreground">{formatCurrency(data?.totalRevenue30d, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Средний чек</span>
            <span className="font-medium text-foreground">{formatCurrency(data?.averageCheck, currency)}</span>
          </div>
        </div>
      </div>
    </CatalystCard>
  )
}
