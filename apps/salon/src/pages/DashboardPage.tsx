import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  PageContainer,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  SidebarTrigger
} from '@beauty-platform/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Loader2, AlertCircle, LayoutDashboard } from 'lucide-react'
import { useCurrency } from '../currency'
import { useTenant } from '../contexts/AuthContext'
import { KpiRow } from './dashboard/components/KpiRow'
import { UpcomingAppointments } from './dashboard/components/UpcomingAppointments'
import { ClientsWidget } from './dashboard/components/ClientsWidget'
import { StaffWidget } from './dashboard/components/StaffWidget'
import { FinanceWidget } from './dashboard/components/FinanceWidget'
import { NotificationsWidget } from './dashboard/components/NotificationsWidget'
import { MarketingWidget } from './dashboard/components/MarketingWidget'
import { TechStatusWidget } from './dashboard/components/TechStatusWidget'
import { useDashboardOverview } from '../hooks/useDashboardOverview'
import { PageHeader } from '../components/layout/PageHeader'

export default function DashboardPage(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenants } = useTenant()
  useCurrency()
  const { data: overview, isLoading, error, refetch } = useDashboardOverview()
  const [periodFilter, setPeriodFilter] = useState('last_week')

  if (!tenants.length) {
    return (
      <PageContainer variant="standard">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-foreground">
            {t('dashboard.emptyState.title', 'Создайте свой первый салон')}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {t(
              'dashboard.emptyState.subtitle',
              'Вы вошли в систему как клиент Beauty Platform. Заполните мастер регистрации, чтобы получить доступ ко всем возможностям CRM.'
            )}
          </p>

          <Card className="mt-8 w-full max-w-2xl border-dashed border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg text-primary">
                {t('dashboard.emptyState.stepsTitle', 'Что будет дальше?')}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {t(
                  'dashboard.emptyState.stepsSubtitle',
                  'Наш мастер поможет настроить салон, услуги и команду за несколько минут.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-left text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">
                  1
                </Badge>
                <div>
                  <p className="font-medium text-foreground">
                    {t('dashboard.emptyState.steps.owners', 'Укажите данные владельца и подтвердите пароль')}
                  </p>
                  <p>{t('dashboard.emptyState.steps.ownersDescription', 'Email берётся из вашего аккаунта и останется неизменным.')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">
                  2
                </Badge>
                <div>
                  <p className="font-medium text-foreground">
                    {t('dashboard.emptyState.steps.salon', 'Опишите салон и выберите услуги')}
                  </p>
                  <p>{t('dashboard.emptyState.steps.salonDescription', 'Мы подберём категории и пресеты по выбранным направлениям.')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">
                  3
                </Badge>
                <div>
                  <p className="font-medium text-foreground">
                    {t('dashboard.emptyState.steps.finish', 'Получите доступ к полной версии CRM')}
                  </p>
                  <p>{t('dashboard.emptyState.steps.finishDescription', 'После завершения мастер автоматически перенаправит вас на панель управления.')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="mt-8"
            onClick={() => void navigate('/onboarding/create-salon')}
          >
            {t('dashboard.emptyState.cta', 'Создать салон')}
          </Button>
        </div>
      </PageContainer>
    )
  }

  if (isLoading && !overview) {
    return (
      <PageContainer variant="full-width" className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </PageContainer>
    )
  }

  if (error && !overview) {
    return (
      <PageContainer variant="standard" className="max-w-4xl">
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <CardTitle>Не удалось загрузить дашборд</CardTitle>
              <CardDescription>{error}</CardDescription>
            </div>
            <Button onClick={() => void refetch()}>Попробовать снова</Button>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-10">
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>Не удалось обновить данные: {error}</span>
            <Button size="sm" variant="destructive" onClick={() => void refetch()}>
              Повторить
            </Button>
          </div>
        )}

        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('navigation.dashboard', 'Главная панель')}</span>
              </div>
            </div>
          }
          actions={
            <>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-40 bg-card shadow-none border-border text-foreground rounded-md hover:bg-muted">
                  <SelectValue placeholder="Последняя неделя" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t('dashboard.filters.today', 'Сегодня')}</SelectItem>
                  <SelectItem value="last_week">{t('dashboard.filters.lastWeek', 'Прошлая неделя')}</SelectItem>
                  <SelectItem value="last_month">{t('dashboard.filters.lastMonth', 'Прошлый месяц')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="bg-card shadow-none border-border text-foreground hover:bg-muted rounded-md" onClick={() => void refetch()}>
                {t('dashboard.refresh', 'Обновить')}
              </Button>
            </>
          }
        />

        <KpiRow data={overview?.kpis} loading={isLoading} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <UpcomingAppointments
            appointments={overview?.appointments.upcoming ?? []}
            loading={isLoading}
          />
          <ClientsWidget data={overview?.clients} loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <FinanceWidget data={overview?.finance} loading={isLoading} currency={overview?.kpis.currency} />
          <NotificationsWidget data={overview?.notifications} loading={isLoading} />
          <MarketingWidget data={overview?.marketing} loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <TechStatusWidget />
          <StaffWidget data={overview?.staff} loading={isLoading} />
        </div>
      </div>
    </PageContainer>
  )
}
