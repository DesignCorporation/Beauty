import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageContainer
} from '@beauty-platform/ui'
import {
  ArrowRight,
  Award,
  Building2,
  Calendar,
  Gift,
  Sparkles,
  Star,
  TrendingUp
} from 'lucide-react'
import ClientLayout from '../components/ClientLayout'
import { useDashboardStats } from '../hooks/useDashboardStats'

const LOYALTY_BADGES: Record<
  string,
  { className: string; translationKey: `common.loyaltyTiers.${'bronze' | 'silver' | 'gold' | 'platinum'}` }
> = {
  BRONZE: {
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
    translationKey: 'common.loyaltyTiers.bronze'
  },
  SILVER: {
    className: 'bg-slate-200 text-slate-800 dark:bg-slate-500/10 dark:text-slate-100',
    translationKey: 'common.loyaltyTiers.silver'
  },
  GOLD: {
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200',
    translationKey: 'common.loyaltyTiers.gold'
  },
  PLATINUM: {
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-500/10 dark:text-violet-100',
    translationKey: 'common.loyaltyTiers.platinum'
  }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { stats, isLoading, error, refetch } = useDashboardStats()
  const { t } = useTranslation()

  const metrics = useMemo(
    () => [
      {
        id: 'salons',
        label: t('pages.dashboard.metrics.salons'),
        value: stats?.totalSalons ?? 0,
        icon: Building2,
        accent: 'bg-primary/10 text-primary'
      },
      {
        id: 'points',
        label: t('pages.dashboard.metrics.points'),
        value: stats?.totalLoyaltyPoints ?? 0,
        icon: Award,
        accent: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-100'
      },
      {
        id: 'visits',
        label: t('pages.dashboard.metrics.visits'),
        value: stats?.totalVisits ?? 0,
        icon: Calendar,
        accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-100'
      },
      {
        id: 'spent',
        label: t('pages.dashboard.metrics.spent'),
        value: stats?.totalSpent ?? 0,
        icon: TrendingUp,
        accent: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-100',
        formatter: (val: number) =>
          new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(val || 0)
      }
    ],
    [stats?.totalLoyaltyPoints, stats?.totalSalons, stats?.totalSpent, stats?.totalVisits, t]
  )

  if (isLoading) {
    return (
      <ClientLayout>
        <PageContainer
          variant="standard"
          maxWidth="full"
          className="flex min-h-[420px] items-center justify-center"
        >
          <div className="space-y-3 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/70 border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {t('pages.dashboard.loading', { defaultValue: 'Loading your data...' })}
            </p>
          </div>
        </PageContainer>
      </ClientLayout>
    )
  }

  if (error) {
    return (
      <ClientLayout>
        <PageContainer variant="standard" maxWidth="full">
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">{t('pages.dashboard.error')}</CardTitle>
              <CardDescription>{error.message}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline" onClick={() => refetch()}>
                {t('pages.dashboard.retry', { defaultValue: 'Try again' })}
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </ClientLayout>
    )
  }

  const primarySalon = stats?.salons?.find(salon => salon.isPrimary)
  const hasSalons = (stats?.totalSalons ?? 0) > 0

  return (
    <ClientLayout>
      <PageContainer variant="standard" maxWidth="full" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map(metric => {
            const Icon = metric.icon
            const formattedValue =
              typeof metric.value === 'number' && metric.formatter
                ? metric.formatter(metric.value)
                : metric.value
            return (
              <Card key={metric.id} className="border-border/60">
                <CardContent className="flex items-center justify-between gap-4 p-6">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="text-3xl font-semibold text-foreground">{formattedValue}</p>
                  </div>
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${metric.accent}`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t('pages.dashboard.upcomingAppointments.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.upcomingAppointments ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t('pages.dashboard.upcomingAppointments.youHave', {
                        count: stats.upcomingAppointments
                      })}
                    </p>
                    <Button variant="outline" size="sm" disabled className="gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('pages.dashboard.upcomingAppointments.bookButton')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <Calendar className="h-12 w-12 text-primary/40" />
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">
                        {t('pages.dashboard.upcomingAppointments.noAppointments')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {hasSalons
                          ? t('pages.dashboard.upcomingAppointments.chooseAndBook')
                          : t('pages.dashboard.upcomingAppointments.chooseFirst')}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" disabled className="gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('pages.dashboard.upcomingAppointments.bookButton')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {primarySalon ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5 text-warning" />
                    {t('pages.dashboard.primarySalon.title')}
                  </CardTitle>
                  <Badge className={LOYALTY_BADGES[primarySalon.loyaltyTier]?.className}>
                    {t(LOYALTY_BADGES[primarySalon.loyaltyTier]?.translationKey ?? 'common.loyaltyTiers.bronze')}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{primarySalon.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('pages.dashboard.primarySalon.points', {
                        defaultValue: 'bonus points',
                        count: primarySalon.loyaltyPoints
                      })}
                      : {primarySalon.loyaltyPoints}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/my-salons')}
                    className="gap-2"
                  >
                    {t('pages.dashboard.primarySalon.details')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('pages.dashboard.recentActivity.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{t('pages.dashboard.recentActivity.afterFirst')}</p>
                <p>
                  {t('pages.dashboard.recentActivity.totalVisits', {
                    count: stats?.totalVisits ?? 0,
                    salons: stats?.totalSalons ?? 0
                  })}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 self-start px-0"
                  onClick={() => navigate('/my-salons')}
                >
                  {t('pages.dashboard.recentActivity.viewAll')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('pages.dashboard.loyaltySummary.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                  <p className="text-sm font-medium text-primary">
                    {t('pages.dashboard.loyaltySummary.totalPoints')}
                  </p>
                  <p className="text-2xl font-semibold text-primary">
                    {stats?.totalLoyaltyPoints ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('pages.dashboard.loyaltySummary.info')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('pages.dashboard.loyaltySummary.usage')}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 px-0 text-primary"
                    onClick={() => navigate('/loyalty')}
                  >
                    {t('pages.dashboard.loyaltySummary.learnMore')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('pages.dashboard.quickActions.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/my-salons')}>
                  <Building2 className="h-4 w-4 text-primary" />
                  {t('pages.dashboard.quickActions.mySalons')}
                </Button>
                <Button variant="outline" className="justify-start gap-2" disabled>
                  <Gift className="h-4 w-4 text-primary" />
                  {t('pages.dashboard.quickActions.addSalon')}
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => navigate('/appointments')}
                >
                  <Calendar className="h-4 w-4 text-primary" />
                  {t('pages.dashboard.quickActions.myAppointments')}
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => navigate('/loyalty')}
                >
                  <Award className="h-4 w-4 text-primary" />
                  {t('pages.dashboard.quickActions.loyaltyProgram')}
                </Button>
                <Button variant="outline" className="justify-start gap-2" disabled>
                  <Gift className="h-4 w-4 text-primary" />
                  {t('pages.dashboard.quickActions.inviteFriend')}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-secondary/10 border-secondary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-secondary-foreground">
                  <Gift className="h-5 w-5" />
                  {t('pages.dashboard.referralCta.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-secondary-foreground/80">
                <p>{t('pages.dashboard.referralCta.description')}</p>
                <Badge variant="secondary">{t('pages.dashboard.referralCta.comingSoon')}</Badge>
              </CardContent>
            </Card>
          </section>
        </div>
      </PageContainer>
    </ClientLayout>
  )
}
