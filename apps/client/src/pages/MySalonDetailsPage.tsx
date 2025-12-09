import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import { ArrowLeft, Award, Building2, Calendar, Loader2, Mail, MapPin, Phone } from 'lucide-react'
import ClientLayout from '../components/ClientLayout'
import { useMySalons, type SalonRelation } from '../hooks/useMySalons'
import { clientApi } from '../services'
import { sdkClient } from '../services'

interface SalonServiceSummary {
  id: string
  name: string
  description?: string | null
  duration: number
  price: number
  currency?: string | null
}

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

const formatCurrency = (amount?: number | null, currency = 'EUR') =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(amount ?? 0)

const formatDate = (value?: string | null) => {
  if (!value) return null
  return new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(value)
  )
}

const formatDuration = (minutes: number, t: (key: string, options?: any) => string) =>
  t('pages.salonDetails.services.duration', { duration: minutes })

export default function MySalonDetailsPage() {
  const { salonId } = useParams<{ salonId: string }>()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const locationSalon = (state as { salon?: SalonRelation } | undefined)?.salon
  const { salons, isLoading: salonsLoading, error: salonsError, refetch } = useMySalons()

  const relation = useMemo<SalonRelation | undefined>(() => {
    if (locationSalon && locationSalon.salonId === salonId) {
      return locationSalon
    }
    return salons?.find(candidate => candidate.salonId === salonId)
  }, [locationSalon, salons, salonId])

  const {
    data: services = [],
    isLoading: servicesLoading,
    isError: servicesError
  } = useQuery<SalonServiceSummary[]>({
    queryKey: ['client', 'salon-services', salonId],
    enabled: Boolean(salonId),
    queryFn: async () => {
      if (!salonId) return []
      const payload = await sdkClient.request<{ services?: SalonServiceSummary[] }>(
        `/crm/services?tenantId=${salonId}`,
        {
          headers: {
            'x-tenant-id': salonId
          }
        }
      )
      const services = payload?.services ?? (payload as unknown as SalonServiceSummary[])
      return (Array.isArray(services) ? services : []) as SalonServiceSummary[]
    }
  })

  if (!salonId) {
    return (
      <ClientLayout>
        <PageContainer variant="standard" maxWidth="6xl" className="space-y-6">
          <Card className="border-destructive/40 bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive">
                {t('pages.salonDetails.notFound.title')}
              </CardTitle>
              <CardDescription>{t('pages.salonDetails.notFound.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/my-salons')}>
                {t('pages.salonDetails.back')}
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </ClientLayout>
    )
  }

  if (salonsLoading && !relation) {
    return (
      <ClientLayout>
        <PageContainer
          variant="standard"
          maxWidth="6xl"
          className="flex min-h-[420px] items-center justify-center"
        >
          <div className="space-y-3 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/70 border-t-transparent" />
            <p className="text-sm text-muted-foreground">{t('pages.salonDetails.loading')}</p>
          </div>
        </PageContainer>
      </ClientLayout>
    )
  }

  if (salonsError) {
    return (
      <ClientLayout>
        <PageContainer variant="standard" maxWidth="6xl">
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">
                {t('pages.salonDetails.error.title')}
              </CardTitle>
              <CardDescription>{t('pages.salonDetails.error.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => navigate('/my-salons')}>
                {t('pages.salonDetails.back')}
              </Button>
              <Button onClick={() => refetch()}>{t('common.retry')}</Button>
            </CardContent>
          </Card>
        </PageContainer>
      </ClientLayout>
    )
  }

  if (!relation) {
    return (
      <ClientLayout>
        <PageContainer variant="standard" maxWidth="6xl">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground/50" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {t('pages.salonDetails.notFound.title')}
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  {t('pages.salonDetails.notFound.description')}
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/my-salons')}>
                {t('pages.salonDetails.back')}
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </ClientLayout>
    )
  }

  const badgeConfig = resolveBadgeConfig(relation.loyaltyTier)
  const servicesUnavailable = servicesError

  return (
    <ClientLayout>
      <PageContainer variant="standard" maxWidth="4xl" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" className="w-fit gap-2" onClick={() => navigate('/my-salons')}>
            <ArrowLeft className="h-4 w-4" />
            {t('pages.salonDetails.back')}
          </Button>
          <Button
            className="gap-2"
            onClick={() => navigate(`/salons/${relation.salonId}/booking`)}
            disabled={servicesLoading}
          >
            <Calendar className="h-4 w-4" />
            {t('pages.salonDetails.actions.bookFallback')}
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">{relation.salonName}</CardTitle>
                </div>
                {relation.salonNotes ? (
                  <CardDescription>{relation.salonNotes}</CardDescription>
                ) : null}
              </div>
              <Badge className={badgeConfig.className}>{t(badgeConfig.translationKey)}</Badge>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              {relation.salonAddress ? (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary/70" />
                  {relation.salonAddress}
                </div>
              ) : null}
              {relation.salonPhone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary/70" />
                  {relation.salonPhone}
                </div>
              ) : null}
              {relation.salonEmail ? (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary/70" />
                  {relation.salonEmail}
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-semibold text-primary">
                <Award className="h-5 w-5" />
                {relation.loyaltyPoints ?? 0}
              </div>
              <p className="mt-1 text-xs uppercase text-muted-foreground">
                {t('pages.mySalons.salonCard.stats.points')}
              </p>
            </div>
            <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-semibold text-foreground">
                <Calendar className="h-5 w-5" />
                {relation.visitCount ?? 0}
              </div>
              <p className="mt-1 text-xs uppercase text-muted-foreground">
                {t('pages.mySalons.salonCard.stats.visits')}
              </p>
            </div>
            <div className="rounded-lg border border-muted p-4 text-center">
              <div className="text-2xl font-semibold text-foreground">
                {formatCurrency(relation.totalSpent)}
              </div>
              <p className="mt-1 text-xs uppercase text-muted-foreground">
                {t('pages.mySalons.salonCard.stats.spent')}
              </p>
            </div>
            {relation.lastVisitAt ? (
              <div className="sm:col-span-3 rounded-md border border-muted bg-muted/40 p-3 text-sm text-muted-foreground">
                {t('pages.mySalons.salonCard.lastVisit')}{' '}
                <span className="font-medium text-foreground">{formatDate(relation.lastVisitAt)}</span>
              </div>
            ) : null}
            {relation.joinedSalonAt ? (
              <div className="sm:col-span-3 text-xs text-muted-foreground">
                {t('pages.salonDetails.joinedAt')}{' '}
                <span className="font-medium text-foreground">
                  {formatDate(relation.joinedSalonAt)}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('pages.salonDetails.services.title')}</CardTitle>
            <CardDescription>{t('pages.salonDetails.services.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {servicesLoading ? (
              <div className="md:col-span-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('pages.salonDetails.loading')}
              </div>
            ) : servicesUnavailable ? (
              <div className="md:col-span-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {t('pages.salonDetails.error.description')}
              </div>
            ) : services.length > 0 ? (
              services.map(service => (
                <div
                  key={service.id}
                  className="flex flex-col justify-between rounded-lg border border-border/60 bg-background p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(service.duration, t)}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {formatCurrency(service.price, service.currency ?? 'EUR')}
                      </Badge>
                    </div>
                    {service.description ? (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('pages.salonDetails.services.noDescription')}
                      </p>
                    )}
                  </div>
                  <Button
                    className="mt-4 gap-2"
                    onClick={() =>
                      navigate(`/salons/${relation.salonId}/booking?serviceId=${service.id}`)
                    }
                  >
                    <Calendar className="h-4 w-4" />
                    {t('pages.salonDetails.services.bookAction')}
                  </Button>
                </div>
              ))
            ) : (
              <div className="md:col-span-2 rounded-lg border border-dashed border-muted p-6 text-center text-sm text-muted-foreground">
                {t('pages.salonDetails.services.empty')}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </ClientLayout>
  )
}
