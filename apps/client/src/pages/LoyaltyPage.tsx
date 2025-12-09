import { useMemo } from 'react'
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
import { Building2, ChevronRight, Gift, Info, Sparkles, TrendingUp } from 'lucide-react'
import ClientLayout from '../components/ClientLayout'
import { useDashboardStats } from '../hooks/useDashboardStats'

const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const

const TIER_STYLES: Record<(typeof TIER_ORDER)[number], string> = {
  BRONZE: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-100',
  SILVER: 'bg-slate-200 text-slate-800 dark:bg-slate-400/10 dark:text-slate-100',
  GOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-100',
  PLATINUM: 'bg-violet-100 text-violet-800 dark:bg-violet-500/10 dark:text-violet-100'
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(value || 0)

export default function LoyaltyPage() {
  const { stats, isLoading, error, refetch } = useDashboardStats()
  const { t } = useTranslation()

  const loyaltySummary = useMemo(() => {
    const fallbackSalons = [
      {
        id: 'mock-salon-1',
        name: t('pages.loyalty.mockData.salon1.name'),
        loyaltyTier: 'BRONZE',
        loyaltyPoints: 320,
        isPrimary: true
      },
      {
        id: 'mock-salon-2',
        name: t('pages.loyalty.mockData.salon2.name'),
        loyaltyTier: 'SILVER',
        loyaltyPoints: 180,
        isPrimary: false
      }
    ]

    const rawSalons =
      stats?.salons && stats.salons.length > 0
        ? stats.salons
        : fallbackSalons

    const totalPoints =
      stats?.totalLoyaltyPoints ?? rawSalons.reduce((sum, salon) => sum + (salon.loyaltyPoints ?? 0), 0)
    const totalSalons = stats?.totalSalons ?? rawSalons.length

    const highestTier = rawSalons.reduce<(typeof TIER_ORDER)[number]>((currentHighest, salon) => {
      const currentIndex = TIER_ORDER.indexOf(currentHighest)
      const candidateIndex = TIER_ORDER.indexOf(salon.loyaltyTier as (typeof TIER_ORDER)[number])
      return candidateIndex > currentIndex ? (salon.loyaltyTier as (typeof TIER_ORDER)[number]) : currentHighest
    }, 'BRONZE')

    const nextTierIndex = Math.min(TIER_ORDER.indexOf(highestTier) + 1, TIER_ORDER.length - 1)
    const nextTier = TIER_ORDER[nextTierIndex]

    const nextTierThreshold = rawSalons.length
      ? TIER_ORDER.slice(0, nextTierIndex + 1).map(tier => ({
          tier,
          min: tier === 'BRONZE' ? 0 : tier === 'SILVER' ? 1000 : tier === 'GOLD' ? 5000 : 10000,
          max: tier === 'BRONZE' ? 999 : tier === 'SILVER' ? 4999 : tier === 'GOLD' ? 9999 : Infinity
        }))
      : []

    let progress = 100
    let pointsNeeded = 0

    if (nextTier && highestTier !== 'PLATINUM') {
      const currentThreshold = nextTierThreshold.find(item => item.tier === highestTier)
      const targetThreshold = nextTierThreshold.find(item => item.tier === nextTier)
      if (currentThreshold && targetThreshold) {
        const range = targetThreshold.min - currentThreshold.min
        const gained = totalPoints - currentThreshold.min
        progress = Math.min(Math.max((gained / range) * 100, 0), 100)
        pointsNeeded = Math.max(targetThreshold.min - totalPoints, 0)
      }
    }

    return {
      totalPoints,
      totalSalons,
      highestTier,
      progress: Math.round(progress),
      pointsNeeded,
      salons: rawSalons
    }
  }, [stats?.salons, stats?.totalLoyaltyPoints, stats?.totalSalons, t])

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
              {t('pages.loyalty.loading')}
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
              <CardTitle className="text-destructive">{t('pages.loyalty.error')}</CardTitle>
              <CardDescription>{error.message}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline" onClick={() => refetch()}>
                {t('pages.loyalty.retry')}
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </ClientLayout>
    )
  }

  const hasSalons = loyaltySummary.totalSalons > 0
  // Date formatting handled by backend, formatDate utility not currently used

  return (
    <ClientLayout>
      <PageContainer variant="standard" maxWidth="full" className="space-y-6">
        {!hasSalons ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Building2 className="h-14 w-14 text-primary/30" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">
                  {t('pages.loyalty.noSalons.title')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('pages.loyalty.noSalons.description')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t('pages.loyalty.balance.title')}
                </CardTitle>
                <CardDescription>{t('pages.loyalty.balance.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    {t('pages.loyalty.balance.totalPoints')}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-primary">
                    {loyaltySummary.totalPoints}
                  </p>
                </div>
                <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    {t('pages.loyalty.activeSalons.title')}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-foreground">
                    {loyaltySummary.totalSalons}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('pages.loyalty.activeSalons.registered', { count: loyaltySummary.totalSalons })}
                  </p>
                </div>
                <div className="rounded-lg border border-muted p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    {t('pages.loyalty.balance.discountAvailable')}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-success">
                    {formatCurrency(loyaltySummary.totalPoints * 0.01)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('pages.loyalty.balance.info')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  {t('pages.loyalty.balance.currentLevel')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={TIER_STYLES[loyaltySummary.highestTier]}>
                    {t(`common.loyaltyTiers.${loyaltySummary.highestTier.toLowerCase()}`)}
                  </Badge>
                  {loyaltySummary.pointsNeeded > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t('pages.loyalty.balance.pointsNeeded', { count: loyaltySummary.pointsNeeded })}
                    </span>
                  )}
                </div>
                {loyaltySummary.progress < 100 && (
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${loyaltySummary.progress}%` }}
                      />
                    </div>
                    <p className="text-right text-xs text-muted-foreground">
                      {t('pages.loyalty.balance.progress', {
                        percent: loyaltySummary.progress,
                        tier: t(`common.loyaltyTiers.${TIER_ORDER[TIER_ORDER.indexOf(loyaltySummary.highestTier) + 1]?.toLowerCase() ?? 'platinum'}`)
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  {t('pages.loyalty.pointsBySalons.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loyaltySummary.salons.map(salon => {
                  const tier = salon.loyaltyTier as (typeof TIER_ORDER)[number]
                  return (
                    <div
                      key={salon.id}
                      className="flex items-center justify-between rounded-lg border border-dashed border-muted p-4"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{salon.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge className={TIER_STYLES[tier]}>
                            {t(`common.loyaltyTiers.${tier.toLowerCase()}`)}
                          </Badge>
                          {salon.isPrimary ? (
                            <span className="text-xs text-muted-foreground">
                              {t('pages.loyalty.pointsBySalons.primarySalon')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-lg font-semibold text-primary">
                        {salon.loyaltyPoints} {t('pages.loyalty.pointsBySalons.points')}
                      </p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-success" />
                    {t('pages.loyalty.howToEarn.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {['step1', 'step2', 'step3'].map(step => (
                    <div key={step} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-sm font-semibold text-success">
                        {['step1', 'step2', 'step3'].indexOf(step) + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {t(`pages.loyalty.howToEarn.${step}.title`)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t(`pages.loyalty.howToEarn.${step}.description`)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Gift className="h-5 w-5 text-primary" />
                    {t('pages.loyalty.howToUse.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {['step1', 'step2', 'step3'].map(step => (
                    <div key={step} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {['step1', 'step2', 'step3'].indexOf(step) + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {t(`pages.loyalty.howToUse.${step}.title`)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t(`pages.loyalty.howToUse.${step}.description`)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-info" />
                  {t('pages.loyalty.tiers.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {TIER_ORDER.map(tier => {
                  const isCurrent = tier === loyaltySummary.highestTier
                  return (
                    <div
                      key={tier}
                      className={`rounded-lg border p-4 ${
                        isCurrent ? 'border-primary/40 bg-primary/5' : 'border-muted bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge className={TIER_STYLES[tier]}>
                          {t(`common.loyaltyTiers.${tier.toLowerCase()}`)}
                        </Badge>
                        {isCurrent ? <ChevronRight className="h-4 w-4 text-primary" /> : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t('pages.loyalty.tiers.range', {
                          min: tier === 'BRONZE' ? 0 : tier === 'SILVER' ? 1000 : tier === 'GOLD' ? 5000 : 10000,
                          max: tier === 'PLATINUM' ? '∞' : tier === 'GOLD' ? 9999 : tier === 'SILVER' ? 4999 : 999
                        })}
                      </p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </>
        )}
      </PageContainer>
    </ClientLayout>
  )
}
