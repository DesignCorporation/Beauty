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
  Award,
  Building2,
  Calendar,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Star,
  Sparkles
} from 'lucide-react'
import ClientLayout from '../components/ClientLayout'
import { useMySalons } from '../hooks/useMySalons'

type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

const LOYALTY_BADGES: Record<
  LoyaltyTier,
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

const isLoyaltyTier = (value: string): value is LoyaltyTier =>
  ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].includes(value as LoyaltyTier)

const resolveBadgeConfig = (
  tier?: string | null
): { className: string; translationKey: `common.loyaltyTiers.${'bronze' | 'silver' | 'gold' | 'platinum'}` } => {
  if (tier && isLoyaltyTier(tier)) {
    return LOYALTY_BADGES[tier]
  }
  return LOYALTY_BADGES.BRONZE
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount || 0)

const formatDate = (value?: string, options: Intl.DateTimeFormatOptions = {}) => {
  if (!value) return null
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  }).format(new Date(value))
}

export default function MySalonsPage() {
  const { salons, isLoading, error, refetch } = useMySalons()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const hasSalons = (salons?.length ?? 0) > 0

  const summary = useMemo(
    () => ({
      totalPoints: salons?.reduce((acc, salon) => acc + salon.loyaltyPoints, 0) ?? 0,
      totalVisits: salons?.reduce((acc, salon) => acc + salon.visitCount, 0) ?? 0,
      totalSpent: salons?.reduce((acc, salon) => acc + salon.totalSpent, 0) ?? 0
    }),
    [salons]
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
              {t('pages.mySalons.loading', { defaultValue: 'Loading your salons...' })}
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
              <CardTitle className="text-destructive">
                {t('pages.mySalons.error', { defaultValue: 'Failed to load salons' })}
              </CardTitle>
              <CardDescription>{error.message}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline" onClick={() => refetch()}>
                {t('pages.mySalons.retry', { defaultValue: 'Try again' })}
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      <PageContainer variant="standard" maxWidth="full" className="space-y-6">
        {hasSalons ? (
          <>
            <div className="flex justify-end">
              <Button variant="outline" className="gap-2" onClick={() => navigate('/add-salon')}>
                <Sparkles className="h-4 w-4" />
                {t('pages.mySalons.actions.addSalon')}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('pages.dashboard.loyaltySummary.title')}
                </CardTitle>
                <CardDescription>
                  {t('pages.dashboard.loyaltySummary.info')}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    {t('pages.dashboard.loyaltySummary.totalPoints')}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-primary">{summary.totalPoints}</p>
                </div>
                <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    {t('pages.dashboard.metrics.visits')}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{summary.totalVisits}</p>
                </div>
                <div className="rounded-lg border border-muted p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    {t('pages.dashboard.metrics.spent')}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {formatCurrency(summary.totalSpent)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {salons?.map(salon => {
                const badgeConfig = resolveBadgeConfig(salon.loyaltyTier)
                return (
                  <Card key={salon.id} className="border-border/60 transition hover:shadow-md">
                    <CardHeader className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="h-5 w-5 text-primary" />
                            {salon.salonName}
                          </CardTitle>
                          {salon.isPrimary ? (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Star className="h-3 w-3 text-primary" />
                              {t('pages.dashboard.primarySalon.title')}
                            </Badge>
                          ) : null}
                        </div>
                        <Badge className={`${badgeConfig.className}`}>
                          {t(badgeConfig.translationKey)}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="grid gap-3 rounded-lg border border-dashed border-muted p-4 sm:grid-cols-3">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-2xl font-semibold text-primary">
                            <Award className="h-5 w-5" />
                            {salon.loyaltyPoints}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t('pages.mySalons.salonCard.stats.points')}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-2xl font-semibold text-foreground">
                            <Calendar className="h-5 w-5" />
                            {salon.visitCount}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t('pages.mySalons.salonCard.stats.visits')}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-2xl font-semibold text-foreground">
                            {formatCurrency(salon.totalSpent)}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t('pages.mySalons.salonCard.stats.spent')}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        {salon.salonAddress ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary/70" />
                            {salon.salonAddress}
                          </div>
                        ) : null}
                        {salon.salonPhone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary/70" />
                            {salon.salonPhone}
                          </div>
                        ) : null}
                        {salon.salonEmail ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary/70" />
                            {salon.salonEmail}
                          </div>
                        ) : null}
                      </div>

                      {salon.lastVisitAt ? (
                        <div className="rounded-md border border-muted bg-muted/40 p-3 text-sm text-muted-foreground">
                          {t('pages.mySalons.salonCard.lastVisit')}{' '}
                          <span className="font-medium text-foreground">
                            {formatDate(salon.lastVisitAt)}
                          </span>
                        </div>
                      ) : null}

                      {salon.salonNotes ? (
                        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                          <span className="font-medium">
                            {t('pages.mySalons.salonCard.salonNotes')}
                          </span>{' '}
                          {salon.salonNotes}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2">
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => navigate(`/salons/${salon.salonId}/booking`)}
                        >
                          <Calendar className="h-4 w-4" />
                          {t('pages.mySalons.salonCard.bookButton')}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            navigate(`/salons/${salon.salonId}`, { state: { salon } })
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {t('pages.mySalons.salonCard.clientSince')} {formatDate(salon.joinedSalonAt, { month: 'long', year: 'numeric' })}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Building2 className="h-16 w-16 text-primary/30" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {t('pages.mySalons.noSalons.title')}
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  {t('pages.mySalons.noSalons.description')}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => navigate('/add-salon')}
                >
                  <Sparkles className="h-4 w-4" />
                  {t('pages.mySalons.noSalons.addButton')}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t('pages.mySalons.noSalons.helper')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </ClientLayout>
  )
}
