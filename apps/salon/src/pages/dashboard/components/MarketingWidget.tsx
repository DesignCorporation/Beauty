import type { DashboardMarketingData } from '../../../hooks/useDashboardOverview'
import { CatalystCard } from '../../../components/ui/CatalystCard'
import { Megaphone } from 'lucide-react'

interface MarketingWidgetProps {
  data?: DashboardMarketingData | null
  loading?: boolean
}

export function MarketingWidget({ data, loading }: MarketingWidgetProps): JSX.Element {
  const lastCampaign = data?.lastCampaign
  const upcomingCount = data?.upcomingCampaigns?.length ?? 0

  return (
    <CatalystCard
      title="Маркетинг"
      description="Рассылки и кампании"
    >
      <div className="space-y-6">
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Последняя рассылка</span>
          {lastCampaign ? (
            <div className="flex gap-3 items-start">
              <div className="flex-none p-2 rounded-md bg-primary/10 text-primary">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{lastCampaign.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Отправлено {new Date(lastCampaign.sentAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              {loading ? 'Получаем статистику…' : 'Кампаний пока не было'}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-sm text-foreground">Планируемые кампании</span>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground ring-1 ring-inset ring-border/60">
            {upcomingCount}
          </span>
        </div>
      </div>
    </CatalystCard>
  )
}
