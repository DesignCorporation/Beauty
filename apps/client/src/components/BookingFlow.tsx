import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PageContainer,
  Textarea
} from '@beauty-platform/ui'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  NotebookPen,
  User,
  Wallet
} from 'lucide-react'
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { toast } from 'sonner'
import ClientLayout from '../components/ClientLayout'
import { useAuth } from '../hooks/useAuth'
import {
  clientApi,
  sdkClient,
  type AvailabilitySlot,
  type CreateAppointmentRequest
} from '../services'
import { useBeautyWebSocket } from '@beauty-platform/client-sdk'

type PaymentSelection = 'CARD' | 'CASH'

const SLOT_INTERVAL_MINUTES = 30
const BUSINESS_START_HOUR = 8
const BUSINESS_END_HOUR = 20
const BOOKING_SLOT_BUFFER_MINUTES = 15

const initialStripePublishableKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '').trim()

const formatCurrency = (amount: number | undefined, currency = 'EUR') => {
  if (!amount) return '--'
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(amount)
}

const addMinutes = (time: string, minutes?: number): string => {
  if (!minutes || minutes <= 0) return time
  const [hoursString = '00', minutesString = '00'] = time.split(':')
  const hours = Number.parseInt(hoursString, 10)
  const mins = Number.parseInt(minutesString, 10)
  const date = new Date()
  date.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(mins) ? mins : 0, 0, 0)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toTimeString().slice(0, 5)
}

const getToday = () => {
  const iso = new Date().toISOString()
  const [datePart] = iso.split('T')
  return datePart ?? iso
}

const buildTimeSlots = () => {
  const slots: string[] = []
  for (let hour = BUSINESS_START_HOUR; hour <= BUSINESS_END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
      if (hour === BUSINESS_END_HOUR && minute > 0) break
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    }
  }
  return slots
}

interface BookingFormProps {
  clientSecret: string | null
  setClientSecret: (secret: string | null) => void
  stripeEnabled: boolean
  stripeLoading: boolean
  stripeConfigError: boolean
}

interface BookingFormState {
  serviceId: string
  staffId: string
  date: string
  startTime: string
  endTime: string
  notes: string
}

function BookingForm({ clientSecret, setClientSecret, stripeEnabled, stripeLoading, stripeConfigError }: BookingFormProps) {
  const navigate = useNavigate()
  const { salonId } = useParams<{ salonId: string }>()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { user } = useAuth()
  const stripe = useStripe()
  const elements = useElements()

  const preselectedServiceId = searchParams.get('serviceId') ?? ''

  // Initialize formState early to avoid hoisting issues
  const [formState, setFormState] = useState<BookingFormState>({
    serviceId: '',
    staffId: '',
    date: getToday(),
    startTime: '',
    endTime: '',
    notes: ''
  })

  const servicesQueryEnabled = Boolean(salonId)
  const {
    data: services = [],
    isLoading: servicesLoading,
    error: servicesErrorRaw
  } = useQuery({
    queryKey: ['booking', 'services', salonId],
    queryFn: () => clientApi.getServices(salonId as string),
    enabled: servicesQueryEnabled,
    staleTime: 5 * 60 * 1000
  })
  const servicesError = servicesErrorRaw
    ? servicesErrorRaw instanceof Error
      ? servicesErrorRaw.message || t('pages.booking.messages.loadingServices')
      : t('pages.booking.messages.loadingServices')
    : null

  const staffQueryEnabled = Boolean(salonId)
  const {
    data: staff = [],
    isLoading: staffLoading,
    error: staffErrorRaw
  } = useQuery({
    queryKey: ['booking', 'staff', salonId, formState.serviceId],
    queryFn: () => clientApi.getStaff(salonId as string, formState.serviceId || undefined),
    enabled: staffQueryEnabled,
    staleTime: 5 * 60 * 1000
  })
  const staffError = staffErrorRaw
    ? staffErrorRaw instanceof Error
      ? staffErrorRaw.message || t('pages.booking.messages.loadingStaff')
      : t('pages.booking.messages.loadingStaff')
    : null

  const [formError, setFormError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isInitializingPayment, setIsInitializingPayment] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState<PaymentSelection>('CASH')
  const [paymentRecordId, setPaymentRecordId] = useState<string | null>(null)

  useEffect(() => {
    if ((!stripeEnabled || stripeConfigError) && paymentMethod === 'CARD') {
      setPaymentMethod('CASH')
    }
  }, [stripeEnabled, stripeConfigError, paymentMethod])

  // Moved after availability query definition

  const selectedService = useMemo(
    () => services.find(service => service.id === formState.serviceId) ?? null,
    [services, formState.serviceId]
  )

  const availabilityQueryEnabled =
    Boolean(
      salonId &&
      formState.staffId &&
      formState.date &&
      selectedService &&
      (selectedService.duration ?? 0) > 0
    )
  const {
    data: availability = [],
    isFetching: availabilityLoading,
    error: availabilityErrorRaw
  } = useQuery<AvailabilitySlot[]>({
    queryKey: [
      'booking',
      'availability',
      salonId,
      formState.staffId,
      formState.date,
      selectedService?.duration
    ],
    queryFn: () =>
      clientApi.getAvailability({
        tenantId: salonId as string,
        staffId: formState.staffId || '',
        date: (formState.date || getToday()) as string,
        durationMinutes: selectedService?.duration ?? 0,
        bufferMinutes: BOOKING_SLOT_BUFFER_MINUTES
      }),
    enabled: availabilityQueryEnabled,
    staleTime: 60 * 1000
  })
  const availabilityError = availabilityErrorRaw
    ? availabilityErrorRaw instanceof Error
      ? availabilityErrorRaw.message || t('pages.booking.messages.availabilityError', { defaultValue: 'Не удалось загрузить доступные слоты' })
      : t('pages.booking.messages.availabilityError', { defaultValue: 'Не удалось загрузить доступные слоты' })
    : null

  const availableSlots = useMemo(() => availability.filter(slot => slot.available), [availability])

  const timeOptions = useMemo(() => {
    if (!availabilityQueryEnabled) {
      return buildTimeSlots()
    }

    if (availability.length === 0 || availableSlots.length === 0) {
      return []
    }

    return availableSlots.map(slot => slot.time)
  }, [availability, availabilityQueryEnabled, availableSlots])

  const amountMinorUnits = useMemo(() => Math.max(0, Math.round((selectedService?.price ?? 0) * 100)), [selectedService?.price])
  const paymentCurrency = (selectedService?.currency || 'PLN').toUpperCase()
  const cardOptionDisabled = !stripeEnabled || stripeLoading || stripeConfigError

  const appliedInitialService = useRef(false)
  const appliedInitialStaff = useRef(false)

  const stripeBaseUrlRef = useRef(clientApi.getGatewayBaseUrl() || '/api')
  const cardInitStatusRef = useRef<'idle' | 'pending' | 'done' | 'failed'>('idle')

  const resetMessages = () => {
    setFormError(null)
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  useEffect(() => {
    if (!services.length || appliedInitialService.current) return
    const initialId =
      (preselectedServiceId && services.some(service => service.id === preselectedServiceId)
        ? preselectedServiceId
        : services[0]?.id) ?? ''
    if (initialId) {
      setFormState(prev => ({ ...prev, serviceId: initialId }))
    }
    appliedInitialService.current = true
  }, [services, preselectedServiceId])

  useEffect(() => {
    if (!staff.length || appliedInitialStaff.current) return
    setFormState(prev => ({ ...prev, staffId: staff[0]?.id ?? '' }))
    appliedInitialStaff.current = true
  }, [staff])

  useEffect(() => {
    if (!formState.serviceId || !formState.startTime || !selectedService) return
    const computedEndTime = addMinutes(formState.startTime, selectedService.duration)
    if (computedEndTime !== formState.endTime) {
      setFormState(prev => ({ ...prev, endTime: computedEndTime }))
    }
  }, [formState.startTime, formState.serviceId, selectedService?.duration, formState.endTime])

  useEffect(() => {
    if (!selectedService) {
      return
    }

    if (timeOptions.length === 0) {
      if (formState.startTime) {
        setFormState(prev => ({ ...prev, startTime: '' }))
      }
      return
    }

    if (!formState.startTime || !timeOptions.includes(formState.startTime)) {
      const firstSlot = timeOptions[0]
      if (firstSlot) {
        setFormState(prev => ({ ...prev, startTime: firstSlot }))
      }
    }
  }, [timeOptions, selectedService, formState.startTime])

  useEffect(() => {
    cardInitStatusRef.current = 'idle'
  }, [salonId, formState.serviceId, paymentMethod, selectedService?.id, amountMinorUnits])

  useEffect(() => {
    setClientSecret(null)
    setPaymentRecordId(null)
  }, [formState.serviceId, setClientSecret])

  const prepareCardPayment = useCallback(async () => {
    if (!stripeEnabled || !salonId || !selectedService || amountMinorUnits <= 0) {
      return false
    }

    setIsInitializingPayment(true)
    setSubmitError(null)

    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)

      const payment = await sdkClient.request<any>(`${stripeBaseUrlRef.current}/payments/intents`, {
        method: 'POST',
        data: {
          amount: amountMinorUnits,
          currency: paymentCurrency,
          provider: 'stripe',
          customerId: user?.id || user?.email || 'client',
          description: `Appointment payment for service ${selectedService.name}`
        },
        headers: {
          'x-tenant-id': salonId,
          'Idempotency-Key': idempotencyKey
        },
        skipCsrf: true,
        retry: 0
      })
      const paymentData = payment?.id ? payment : payment?.data
      if (!paymentData?.providerData?.clientSecret) {
        throw new Error('Payment provider did not return client secret')
      }

      setClientSecret(paymentData.providerData.clientSecret)
      setPaymentRecordId(paymentData.id)
      cardInitStatusRef.current = 'done'
      return true
    } catch (error) {
      console.error('Failed to initialize card payment:', error)
      const message = (error instanceof Error ? error.message : null) || t('pages.booking.messages.paymentIntentError', { defaultValue: 'Не удалось подготовить оплату. Попробуйте позже.' })
      setSubmitError(message)
      toast.error(message)
      cardInitStatusRef.current = 'failed'
      setPaymentMethod(prev => (prev === 'CARD' ? 'CASH' : prev))
      return false
    } finally {
      setIsInitializingPayment(false)
    }
  }, [amountMinorUnits, paymentCurrency, salonId, selectedService, stripeEnabled, t, user?.email, user?.id, setClientSecret])

  useEffect(() => {
    if (paymentMethod === 'CARD' && stripeEnabled && !stripeLoading && !stripeConfigError && selectedService && !clientSecret && !isInitializingPayment) {
      if (cardInitStatusRef.current === 'pending' || cardInitStatusRef.current === 'done') {
        return
      }
      cardInitStatusRef.current = 'pending'
      void prepareCardPayment()
    }
    // prepareCardPayment не в dependencies чтобы избегать повторных вызовов
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, stripeEnabled, stripeLoading, stripeConfigError, selectedService, clientSecret, isInitializingPayment])

  const selectedSlot = availability.find(slot => slot.time === formState.startTime) ?? null
  const selectedSlotReasonKey = selectedSlot?.reasonKey
  const hasConflict =
    availabilityQueryEnabled && !availabilityLoading && selectedSlot ? !selectedSlot.available : false
  const conflictMessage = selectedSlotReasonKey
    ? t(selectedSlotReasonKey)
    : t('pages.booking.messages.conflict')

  const validateForm = () => {
    if (!formState.serviceId) {
      setFormError(t('pages.booking.messages.validation.service'))
      return false
    }
    if (!formState.staffId) {
      setFormError(t('pages.booking.messages.validation.staff'))
      return false
    }
    if (!formState.date) {
      setFormError(t('pages.booking.messages.validation.date'))
      return false
    }
    if (!formState.startTime) {
      setFormError(t('pages.booking.messages.validation.time'))
      return false
    }
    if (!salonId) {
      setFormError(t('pages.booking.messages.validation.tenant'))
      return false
    }
    if (!selectedService) {
      setFormError(t('pages.booking.messages.validation.service'))
      return false
    }
    return true
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetMessages()

    if (!validateForm()) return

    if (hasConflict) {
      setFormError(t('pages.booking.messages.conflict'))
      return
    }

    if (amountMinorUnits <= 0) {
      setFormError(t('pages.booking.messages.invalidPrice', { defaultValue: 'Selected service has no price configured.' }))
      return
    }

    setIsSubmitting(true)
    try {
      let paymentPayload: CreateAppointmentRequest['payment']

      if (paymentMethod === 'CARD') {
        if (!stripeEnabled) {
          setSubmitError(t('pages.booking.payment.cardUnavailable') ?? 'Card payments are temporarily unavailable')
          return
        }

        if (!clientSecret || !paymentRecordId) {
          const prepared = await prepareCardPayment()
          if (!prepared) {
            return
          }
        }

        if (!stripe || !elements || !clientSecret || !paymentRecordId) {
          setSubmitError(t('pages.booking.messages.paymentIntentError'))
          return
        }

        setIsProcessingPayment(true)
        const billingName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || 'Client'
        const billingDetails: {
          name: string
          email?: string
        } = {
          name: billingName
        }

        if (user?.email) {
          billingDetails.email = user.email
        }

        const confirmation = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            billing_details: billingDetails
          } as any
        })
        setIsProcessingPayment(false)

        if (confirmation.error) {
          const message = confirmation.error.message || t('pages.booking.messages.paymentFailed', { defaultValue: 'Не удалось провести оплату.' })
          setSubmitError(message)
          toast.error(message)
          return
        }

        if (confirmation.paymentIntent?.status !== 'succeeded') {
          const message = t('pages.booking.messages.paymentIncomplete', { defaultValue: 'Оплата не была завершена. Попробуйте снова.' })
          setSubmitError(message)
          toast.error(message)
          return
        }

        try {
          await sdkClient.request(`${stripeBaseUrlRef.current}/payments/${paymentRecordId ?? ''}`, {
            method: 'PATCH',
            data: { status: 'SUCCEEDED', paymentMethod: 'CARD' },
            headers: {
              'x-tenant-id': salonId || ''
            },
            skipCsrf: true,
            retry: 0
          })
        } catch (patchError) {
          const message =
            patchError instanceof Error
              ? patchError.message
              : t('pages.booking.messages.paymentFailed', { defaultValue: 'Не удалось подтвердить оплату.' })
          setSubmitError(message)
          toast.error(message)
          return
        }

        paymentPayload = {
          method: 'CARD',
          amount: amountMinorUnits,
          currency: paymentCurrency,
          ...(paymentRecordId ? { paymentId: paymentRecordId } : {})
        }
      } else {
        paymentPayload = {
          method: 'CASH',
          amount: amountMinorUnits,
          currency: paymentCurrency
        }
      }

      const validDate: string = formState.date ?? getToday()
      const validStartTime: string = formState.startTime ?? '08:00'
      const validEndTime: string = formState.endTime ?? validStartTime
      const notes = formState.notes?.trim()
      const clientData = buildClientData()
      const payload: CreateAppointmentRequest = {
        clientEmail: validatedClientEmail(),
        serviceId: formState.serviceId || '',
        staffId: formState.staffId || '',
        startAt: toUtcISOString(validDate, validStartTime),
        endAt: toUtcISOString(validDate, validEndTime),
        ...(clientData ? { clientData } : {}),
        ...(notes ? { notes } : {}),
        payment: paymentPayload
      }

      const appointment = await clientApi.createAppointment(salonId || '', payload)
      setSubmitSuccess(t('pages.booking.messages.success'))
      toast.success(t('pages.booking.messages.success'))
      setClientSecret(null)
      setPaymentRecordId(null)
      const appointmentId = (appointment as { id?: string }).id
      setTimeout(() => {
        if (appointmentId) {
          navigate(`/appointments/${appointmentId}`)
        } else {
          navigate('/appointments')
        }
      }, 1500)
    } catch (error) {
      console.error('Failed to create appointment:', error)
      const message =
        error instanceof Error ? error.message : t('pages.booking.messages.errorGeneric')
      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
      setIsProcessingPayment(false)
    }
  }

  const validatedClientEmail = () => {
    if (user?.email) return user.email
    return searchParams.get('email') || ''
  }

  const buildClientData = (): CreateAppointmentRequest['clientData'] => {
    if (user?.email) {
      return undefined
    }
    const firstName = user?.firstName?.trim() || 'Client'
    const lastName = user?.lastName?.trim() || 'Portal'
    const phone = user?.phone?.trim()

    const data: CreateAppointmentRequest['clientData'] = {
      firstName,
      lastName,
      ...(phone ? { phone } : {})
    }

    return data
  }

  const toUtcISOString = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString()

  return (
    <ClientLayout>
      <PageContainer variant="standard" maxWidth="4xl" className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            {t('pages.booking.back')}
          </Button>
          <Badge variant="secondary" className="gap-2">
            <Calendar className="h-4 w-4" />
            {t('pages.booking.title')}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-foreground">
              {t('pages.booking.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('pages.booking.subtitle')}</p>
          </CardHeader>
          <CardContent>
            {formError ? (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>{t('pages.booking.alerts.validationTitle')}</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            {submitError ? (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>{t('pages.booking.alerts.errorTitle')}</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}

            {submitSuccess ? (
              <Alert className="mb-6 border-success/40 bg-success/10 text-success">
                <AlertTitle className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('pages.booking.alerts.successTitle')}
                </AlertTitle>
                <AlertDescription>{submitSuccess}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-8" onSubmit={handleSubmit}>
              <section className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  {t('pages.booking.sections.client.title')}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('pages.booking.sections.client.description')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="client-name">{t('pages.booking.labels.name')}</Label>
                    <Input
                      id="client-name"
                      value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || validatedClientEmail()}
                      readOnly
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="client-email">{t('pages.booking.labels.email')}</Label>
                    <Input id="client-email" value={validatedClientEmail()} readOnly />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="client-phone">{t('pages.booking.labels.phone')}</Label>
                    <Input id="client-phone" value={user?.phone ?? ''} readOnly />
                  </div>
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-foreground">
                      {t('pages.booking.sections.service.title')}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('pages.booking.sections.service.description')}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {servicesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('pages.booking.messages.loadingServices')}
                      </div>
                    ) : null}
                    {servicesError ? (
                      <Alert variant="destructive">
                        <AlertTitle>{t('pages.booking.alerts.errorTitle')}</AlertTitle>
                        <AlertDescription>{servicesError}</AlertDescription>
                      </Alert>
                    ) : null}
                    <div className="space-y-1">
                      <Label htmlFor="service">{t('pages.booking.labels.selectService')}</Label>
                      <select
                        id="service"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={formState.serviceId}
                        onChange={event => setFormState(prev => ({ ...prev, serviceId: event.target.value }))}
                        disabled={servicesLoading || !services.length}
                      >
                        <option value="">{t('pages.booking.placeholders.service')}</option>
                        {services.map(service => (
                          <option key={service.id} value={service.id}>
                            {service.name} • {formatCurrency(service.price, service.currency || 'PLN')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedService ? (
                      <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
                        {t('pages.booking.helpers.duration', {
                          duration: selectedService.duration
                        })}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-foreground">
                      {t('pages.booking.sections.staff.title')}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('pages.booking.sections.staff.description')}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {staffLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('pages.booking.messages.loadingStaff')}
                      </div>
                    ) : null}
                    {staffError ? (
                      <Alert variant="destructive">
                        <AlertTitle>{t('pages.booking.alerts.errorTitle')}</AlertTitle>
                        <AlertDescription>{staffError}</AlertDescription>
                      </Alert>
                    ) : null}
                    <div className="space-y-1">
                      <Label htmlFor="staff">{t('pages.booking.labels.selectStaff')}</Label>
                      <select
                        id="staff"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={formState.staffId}
                        onChange={event => setFormState(prev => ({ ...prev, staffId: event.target.value }))}
                        disabled={staffLoading || !staff.length}
                      >
                        <option value="">{t('pages.booking.placeholders.staff')}</option>
                        {staff.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.firstName} {member.lastName}
                            {member.role ? ` — ${member.role}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {t('pages.booking.sections.schedule.title')}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('pages.booking.sections.schedule.description')}
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="appointment-date">{t('pages.booking.labels.date')}</Label>
                    <Input
                      id="appointment-date"
                      type="date"
                      min={getToday()}
                      value={formState.date}
                      onChange={event => setFormState(prev => ({ ...prev, date: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="start-time">{t('pages.booking.labels.startTime')}</Label>
                    <select
                      id="start-time"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={formState.startTime}
                      onChange={event => setFormState(prev => ({ ...prev, startTime: event.target.value }))}
                      disabled={!selectedService}
                      required
                    >
                      <option value="">{t('pages.booking.placeholders.startTime')}</option>
                      {timeOptions.map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-time">{t('pages.booking.labels.endTime')}</Label>
                    <Input id="end-time" value={formState.endTime} readOnly />
                  </div>
                </div>

                {availabilityLoading ? (
                  <Alert className="border-info/30 bg-info/10 text-info">
                    <AlertTitle>{t('pages.booking.messages.availabilityLoading')}</AlertTitle>
                  </Alert>
                ) : null}

                {availabilityError ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t('pages.booking.alerts.errorTitle')}</AlertTitle>
                    <AlertDescription>{availabilityError}</AlertDescription>
                  </Alert>
                ) : null}

                {!availabilityLoading && availabilityQueryEnabled && (availability.length === 0 || availableSlots.length === 0) ? (
                  <Alert>
                    <AlertTitle>{t('pages.booking.messages.noSlotsTitle')}</AlertTitle>
                    <AlertDescription>{t('pages.booking.messages.noSlots')}</AlertDescription>
                  </Alert>
                ) : null}

                {hasConflict ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t('pages.booking.messages.slotUnavailableTitle')}</AlertTitle>
                    <AlertDescription>{conflictMessage}</AlertDescription>
                  </Alert>
                ) : null}
              </section>

              <section className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  {t('pages.booking.sections.payment.title')}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('pages.booking.sections.payment.description')}
                </p>

                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="payment-method"
                      value="CASH"
                      checked={paymentMethod === 'CASH'}
                      onChange={() => setPaymentMethod('CASH')}
                    />
                    <span>{t('pages.booking.payment.methods.cash')}</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-opacity ${cardOptionDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value="CARD"
                      checked={paymentMethod === 'CARD'}
                      onChange={() => setPaymentMethod('CARD')}
                      disabled={cardOptionDisabled}
                    />
                    <span>{t('pages.booking.payment.methods.card')}</span>
                  </label>
                </div>

                {stripeLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('pages.booking.payment.status.preparing')}
                  </div>
                ) : null}

                {!stripeLoading && cardOptionDisabled ? (
                  <Alert variant={stripeConfigError ? 'destructive' : 'default'}>
                    <AlertDescription>{t('pages.booking.payment.cardUnavailable')}</AlertDescription>
                  </Alert>
                ) : null}

                {paymentMethod === 'CARD' && stripeEnabled && !stripeLoading && !stripeConfigError ? (
                  <div className="space-y-3">
                    {isInitializingPayment ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('pages.booking.payment.status.preparing')}
                      </div>
                    ) : null}
                    {clientSecret ? (
                      <div className="rounded-lg border border-border/60 bg-background p-4">
                        <PaymentElement options={{ layout: 'tabs' }} />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-lg border border-border/60 bg-background p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{t('pages.booking.payment.summary.service')}</span>
                    <span className="font-semibold text-foreground">
                      {selectedService ? formatCurrency(selectedService.price, paymentCurrency) : '--'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-base font-semibold">
                    <span>{t('pages.booking.payment.summary.total')}</span>
                    <span>{selectedService ? formatCurrency(selectedService.price, paymentCurrency) : '--'}</span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <Label htmlFor="notes">{t('pages.booking.sections.notes.title')}</Label>
                <Textarea
                  id="notes"
                  placeholder={t('pages.booking.sections.notes.placeholder')}
                  value={formState.notes}
                  onChange={event => setFormState(prev => ({ ...prev, notes: event.target.value }))}
                />
              </section>

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                  {t('pages.booking.buttons.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting || isProcessingPayment || servicesLoading || staffLoading}>
                  {isSubmitting || isProcessingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {paymentMethod === 'CARD' ? t('pages.booking.payment.status.processing') : t('pages.booking.buttons.submitting')}
                    </>
                  ) : (
                    <>
                      <NotebookPen className="mr-2 h-4 w-4" />
                      {t('pages.booking.buttons.submit')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageContainer>
    </ClientLayout>
  )
}

const resolveBrowserApiBaseUrl = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }
  const maybeValue = (window as unknown as Record<string, unknown>).__API_BASE_URL
  return typeof maybeValue === 'string' ? maybeValue : undefined
}

const stripeBaseUrlRef2 = { current: resolveBrowserApiBaseUrl() ?? '/api' }

export default function BookingPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripeKey, setStripeKey] = useState<string>(initialStripePublishableKey)
  const [stripeConfigLoading, setStripeConfigLoading] = useState(false)
  const [stripeConfigError, setStripeConfigError] = useState(false)

  useEffect(() => {
    if (stripeKey) return

    let isMounted = true

    const loadConfig = async () => {
      try {
        setStripeConfigLoading(true)
        setStripeConfigError(false)

        const payload = await sdkClient.request(`${stripeBaseUrlRef2.current}/payments/config`, {
          method: 'GET',
          skipCsrf: true,
          retry: 0
        }).catch(() => ({} as any))
        const fetchedKey =
          payload?.data?.stripe?.publishableKey ??
          payload?.data?.publishable_key ??
          payload?.stripe?.publishableKey ??
          payload?.publishableKey ??
          ''

        if (isMounted) {
          if (typeof fetchedKey === 'string' && fetchedKey.trim().length > 0) {
            setStripeKey(fetchedKey.trim())
          } else {
            setStripeConfigError(true)
          }
        }
      } catch (error) {
        console.error('[BookingPage] Failed to load payment config:', error)
        if (isMounted) {
          setStripeConfigError(true)
        }
      } finally {
        if (isMounted) {
          setStripeConfigLoading(false)
        }
      }
    }

    void loadConfig()

    return () => {
      isMounted = false
    }
  }, [stripeKey])

  const stripePromise = useMemo<Promise<Stripe | null> | null>(() => (stripeKey ? loadStripe(stripeKey) : null), [stripeKey])
  const elementsOptions = useMemo<StripeElementsOptions | undefined>(
    () => (clientSecret ? { clientSecret } : undefined),
    [clientSecret]
  )
  const stripeEnabled = Boolean(stripeKey) && !stripeConfigError
  const stripeLoading = !stripeKey && stripeConfigLoading
  const elementsKey = useMemo(() => `${stripeKey || 'no-stripe'}::${clientSecret || 'no-secret'}`, [stripeKey, clientSecret])
  const { socket: notificationSocket, isConnected: wsConnected } = useBeautyWebSocket({
    wsUrl:
      (import.meta.env.VITE_NOTIFICATION_WS_URL as string | undefined) ||
      (typeof window !== 'undefined' ? window.location.origin : undefined),
    wsPath: (import.meta.env.VITE_NOTIFICATION_WS_PATH as string | undefined) || '/api/socket.io'
  })

  useEffect(() => {
    if (!notificationSocket) return
    const onNotification = (payload: unknown) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[BookingFlow] notification:new', payload)
      }
    }
    notificationSocket.on('notification:new', onNotification)
    return () => {
      notificationSocket.off('notification:new', onNotification)
    }
  }, [notificationSocket])

  const bookingForm = (
    <BookingForm
      clientSecret={clientSecret}
      setClientSecret={setClientSecret}
      stripeEnabled={stripeEnabled}
      stripeLoading={stripeLoading}
      stripeConfigError={stripeConfigError}
    />
  )

  return (
    <Elements
      stripe={stripePromise}
      key={elementsKey}
      {...(elementsOptions ? { options: elementsOptions } : {})}
    >
      {bookingForm}
    </Elements>
  )
}
