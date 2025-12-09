import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, Button, PageContainer, SidebarTrigger } from '@beauty-platform/ui';
import { Download, TrendingUp, TrendingDown, Users, Calendar, DollarSign, Loader2, BarChart3 } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { formatPrice } from '../currency';
import { PageHeader } from '../components/layout/PageHeader';

export default function AnalyticsPage(): JSX.Element {
  const { t } = useTranslation();
  const { metrics, loading, error } = useAnalytics();

  if (error) {
    return (
      <PageContainer variant="full-width" className="bg-background min-h-screen">
        <div className="mx-auto max-w-[1440px] px-14 py-10">
          <Card className="rounded-none border-0 border-t border-error/40 bg-error/5 shadow-none">
            <CardContent className="pt-6">
              <p className="text-error">{error}</p>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  if (loading || !metrics) {
    return (
      <PageContainer variant="full-width" className="bg-background min-h-screen">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-10">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('navigation.analytics', 'Аналитика')}</span>
              </div>
            </div>
          }
          actions={
            <Button disabled={loading} className="bg-card shadow-none border border-border text-foreground hover:bg-muted">
              <Download className="w-4 h-4 mr-2" />
              {t('analytics.exportReport')}
            </Button>
          }
        />

        {/* Ключевые метрики */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardContent className="p-4 space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {t('analytics.metrics.revenueMonth')}
              </p>
              <div className="text-2xl font-medium text-foreground">{formatPrice(metrics.revenueThisMonth, metrics.currency)}</div>
              <div className={`flex items-center text-sm ${metrics.revenueGrowth >= 0 ? 'text-success' : 'text-error'}`}>
                {metrics.revenueGrowth >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(metrics.revenueGrowth).toFixed(1)}% {t('analytics.labels.vsLastMonth')}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardContent className="p-4 space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('analytics.metrics.appointmentsMonth')}
              </p>
              <div className="text-2xl font-medium text-foreground">{metrics.appointmentsThisMonth}</div>
              <div className={`flex items-center text-sm ${metrics.appointmentsGrowth >= 0 ? 'text-success' : 'text-error'}`}>
                {metrics.appointmentsGrowth >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(metrics.appointmentsGrowth).toFixed(1)}% {t('analytics.labels.vsLastMonth')}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardContent className="p-4 space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('analytics.metrics.newClients')}
              </p>
              <div className="text-2xl font-medium text-foreground">{metrics.newClientsThisMonth}</div>
              <div className="flex items-center text-sm text-muted-foreground">
                {metrics.newClientsThisMonth > 0 ? t('analytics.labels.newClientsPresent', 'Новые клиенты есть') : t('analytics.labels.noData')}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardContent className="p-4 space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t('analytics.metrics.averageBill')}
              </p>
              <div className="text-2xl font-medium text-foreground">{formatPrice(metrics.averageBill, metrics.currency)}</div>
              <div className="flex items-center text-sm text-muted-foreground">
                {metrics.appointmentsThisMonth > 0 ? `${metrics.appointmentsThisMonth} ${t('analytics.labels.records')}` : t('analytics.labels.noData')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Графики и диаграммы */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* График выручки */}
          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground">{t('analytics.charts.revenueByDay')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/40">
                <p className="text-muted-foreground">{t('analytics.labels.noData')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Популярные услуги */}
          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground">{t('analytics.charts.popularServices')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.popularServices.length > 0 ? (
                  metrics.popularServices.map((service, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{service.serviceName}</span>
                          <span className="text-sm text-muted-foreground">{service.count}</span>
                        </div>
                        <div className="w-full bg-muted h-2">
                          <div
                            className="bg-info h-2"
                            style={{ width: `${service.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('analytics.labels.noData')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Загрузка мастеров */}
        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">{t('analytics.charts.staffLoad')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.staffMetrics.length > 0 ? (
                metrics.staffMetrics.map((master, index) => (
                  <div key={index} className="border border-border/70 bg-card p-4">
                    <h4 className="font-medium text-foreground mb-3">{master.staffName}</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{t('analytics.labels.workload')}</span>
                          <span>{master.workload.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-muted h-2">
                          <div
                            className="bg-success h-2"
                            style={{ width: `${master.workload}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t('analytics.labels.revenue')}:</span>
                        <span className="font-medium text-foreground">{formatPrice(master.revenue, metrics.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t('analytics.labels.appointments')}:</span>
                        <span className="font-medium text-foreground">{master.appointments}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center col-span-3 py-4">{t('analytics.labels.noData')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Периоды сравнения */}
        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">{t('analytics.comparison.periodComparison')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-1">
                <div className="text-lg font-medium text-info">{t('analytics.comparison.thisMonth')}</div>
                <div className="text-sm text-muted-foreground mt-1">{formatPrice(metrics.revenueThisMonth, metrics.currency)} • {metrics.appointmentsThisMonth} {t('analytics.labels.records')}</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-medium text-muted-foreground">{t('analytics.comparison.lastMonth')}</div>
                <div className="text-sm text-muted-foreground mt-1">{formatPrice(metrics.revenueLastMonth, metrics.currency)} • {metrics.appointmentsLastMonth} {t('analytics.labels.records')}</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-medium text-success">{t('analytics.comparison.growth')}</div>
                <div className="text-sm text-success mt-1">+{formatPrice(metrics.revenueThisMonth - metrics.revenueLastMonth, metrics.currency)} • +{metrics.appointmentsThisMonth - metrics.appointmentsLastMonth} {t('analytics.labels.records')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
