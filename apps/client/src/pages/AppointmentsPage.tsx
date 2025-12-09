import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageContainer
} from '@beauty-platform/ui'
import {
  Calendar,
  ChevronRight,
  Clock,
  Filter,
  Info,
  MapPin,
  Scissors,
  User
} from 'lucide-react'
import ClientLayout from '../components/ClientLayout'
import { useClientBookings } from '../hooks/useClientBookings'
import type { Booking } from '../services'

type FilterType = 'all' | 'upcoming' | 'past'

type NormalizedStatus =
  | 'confirmed'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

const STATUS_STYLES: Record<NormalizedStatus, string> = {
  confirmed: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  in_progress: 'bg-info/10 text-info border-info/20',
  completed: 'bg-primary/10 text-primary border-primary/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-muted text-muted-foreground border-muted'
}

const STATUS_TRANSLATION_KEY: Record<NormalizedStatus, string> = {
  confirmed: 'confirmed',
  pending: 'pending',
  in_progress: 'inProgress',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'noShow'
}

const ACTIVE_STATUS_SET = new Set<Booking['status']>(['PENDING', 'CONFIRMED', 'IN_PROGRESS'])

const mapStatus = (status: Booking['status']): NormalizedStatus => {
  switch (status) {
    case 'CONFIRMED':
      return 'confirmed'
    case 'PENDING':
      return 'pending'
    case 'IN_PROGRESS':
      return 'in_progress'
    case 'COMPLETED':
      return 'completed'
    case 'CANCELLED':
      return 'cancelled'
    case 'NO_SHOW':
      return 'no_show'
    default:
      return 'pending'
  }
}

export default function AppointmentsPage() {
  const { t, i18n } = useTranslation()
  const [filter, setFilter] = useState<FilterType>('all')
  const { appointments, isLoading, error, refetch } = useClientBookings()

  const locale = (i18n.language || 'en').split('-')[0]

  const normalizedAppointments = useMemo(() => {
    const formatterDate = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const formatterTime = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit'
    })

    return appointments.map(booking => {
      const status = mapStatus(booking.status)
      const start = new Date(booking.startTime)
      const end = new Date(booking.endTime)
      const startMs = start.getTime()
      const endMs = end.getTime()
      const now = Date.now()
      const isActiveStatus = ACTIVE_STATUS_SET.has(booking.status)
      const isUpcoming = isActiveStatus && startMs >= now

      const service = booking.service
      const durationMinutes = service?.duration ?? Math.max(1, Math.round((endMs - startMs) / 60000))
      const currency = service?.currency ?? booking.salon.currency ?? 'EUR'
      const price = service?.price ?? null
      const staffName = booking.staff?.name || t('pages.appointments.card.staffFallback', { defaultValue: t('common.notAssigned', { defaultValue: 'Не назначен' }) })

      return {
        id: booking.id,
        appointmentNumber: booking.appointmentNumber,
        salonName: booking.salon.name,
        salonAddress: booking.salon.address,
        staffName,
        status,
        statusLabelKey: STATUS_TRANSLATION_KEY[status],
        serviceName: service?.name || t('pages.appointments.card.serviceFallback', { defaultValue: t('common.notAvailable', { defaultValue: 'Услуга' }) }),
        start,
        end,
        startMs,
        isUpcoming,
        dateLabel: formatterDate.format(start),
        timeLabel: formatterTime.format(start),
        durationMinutes,
        price,
        currency,
        notes: booking.notes ?? null
      }
    })
  }, [appointments, locale, t])

  const counts = useMemo(() => {
    const upcoming = normalizedAppointments.filter(appointment => appointment.isUpcoming).length
    const total = normalizedAppointments.length
    return {
      total,
      upcoming,
      past: total - upcoming
    }
  }, [normalizedAppointments])

  const filteredAppointments = useMemo(() => {
    const sorted = [...normalizedAppointments].sort((a, b) => {
      if (a.isUpcoming === b.isUpcoming) {
        return a.isUpcoming ? a.startMs - b.startMs : b.startMs - a.startMs
      }
      return a.isUpcoming ? -1 : 1
    })

    if (filter === 'all') return sorted
    if (filter === 'upcoming') {
      return sorted.filter(appointment => appointment.isUpcoming)
    }
    return sorted.filter(appointment => !appointment.isUpcoming)
  }, [filter, normalizedAppointments])

  const formatPrice = (value: number | null, currency: string) => {
    if (value === null) {
      return t('pages.appointments.card.priceFallback', { defaultValue: '—' })
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(value)
  }

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
              {t('pages.appointments.loading', { defaultValue: 'Загружаем ваши записи...' })}
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
                {t('pages.appointments.errorTitle', { defaultValue: 'Не удалось загрузить записи' })}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline" onClick={() => refetch()}>
                {t('pages.appointments.retry', { defaultValue: 'Повторить' })}
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
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t('pages.appointments.filters.all')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'upcoming', 'past'] as FilterType[]).map(option => (
                <Button
                  key={option}
                  variant={filter === option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(option)}
                  className="gap-2"
                >
                  {t(`pages.appointments.filters.${option}`)}
                  <Badge variant="secondary">
                    {option === 'all'
                      ? counts.total
                      : option === 'upcoming'
                        ? counts.upcoming
                        : counts.past}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {filteredAppointments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Calendar className="h-12 w-12 text-primary/30" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">
                  {filter === 'upcoming'
                    ? t('pages.appointments.empty.noUpcoming')
                    : filter === 'past'
                      ? t('pages.appointments.empty.noPast')
                      : t('pages.appointments.empty.noAppointments')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('pages.appointments.empty.description')}
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                {t('pages.appointments.empty.bookButton')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredAppointments.map(appointment => (
              <Card
                key={appointment.id}
                className={`border-border/60 transition hover:shadow-md ${
                  appointment.isUpcoming ? 'border-primary/30 bg-primary/5' : ''
                }`}
              >
                <CardHeader className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Scissors className="h-5 w-5 text-primary" />
                        {appointment.serviceName}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {t('pages.appointments.card.details')} #{appointment.appointmentNumber}
                      </p>
                    </div>
                    <Badge className={`${STATUS_STYLES[appointment.status]} border`}>
                      {t(`pages.appointments.card.status.${appointment.statusLabelKey}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground/70" />
                      <span className="font-medium text-foreground">{appointment.salonName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4 text-muted-foreground/70" />
                      <span>{appointment.staffName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 text-muted-foreground/70" />
                      <span>{appointment.dateLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 text-muted-foreground/70" />
                      <span>
                        {appointment.timeLabel}{' '}
                        ({appointment.durationMinutes} {t('pages.appointments.card.minutes')})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t('pages.appointments.card.cost')}
                      </p>
                      <p className="text-xl font-semibold text-primary">
                        {formatPrice(appointment.price, appointment.currency)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" disabled>
                      {t('pages.appointments.card.details')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-info/30 bg-info/10">
          <CardContent className="flex gap-3 py-6">
            <Info className="h-5 w-5 text-info" />
            <div className="space-y-1 text-sm text-info-foreground">
              <p className="font-semibold">
                {t('pages.appointments.devBanner.title')}
              </p>
              <p>
                {t('pages.appointments.devBanner.description')}
              </p>
              <p className="text-info-foreground/80">
                {t('pages.appointments.devBanner.features')}
              </p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </ClientLayout>
  )
}
