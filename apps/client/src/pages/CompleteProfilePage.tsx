import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PageContainer
} from '@beauty-platform/ui'
import { CheckCircle, Loader2, Phone, RefreshCcw, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { usePhoneVerification } from '../hooks/usePhoneVerification'

const COUNTRY_OPTIONS = [
  { code: 'PL', dialCode: '48', labelKey: 'pages.completeProfile.countryOptions.PL' },
  { code: 'GB', dialCode: '44', labelKey: 'pages.completeProfile.countryOptions.GB' },
  { code: 'DE', dialCode: '49', labelKey: 'pages.completeProfile.countryOptions.DE' },
  { code: 'LT', dialCode: '370', labelKey: 'pages.completeProfile.countryOptions.LT' }
] as const

const OTP_LENGTH = 6

const formatInternational = (value: string) => {
  const parsed = parsePhoneNumberFromString(value)
  return parsed?.formatInternational() ?? value
}

const secondsToMinutes = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export default function CompleteProfilePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const { sendOtp, isSending, sendError, confirmOtp, isConfirming, confirmError } = usePhoneVerification()

  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRY_OPTIONS[number]>(COUNTRY_OPTIONS[0])
  const [localPhone, setLocalPhone] = useState('')
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.phoneVerified) {
      navigate('/dashboard', { replace: true })
    }
  }, [user?.phoneVerified, navigate])

  useEffect(() => {
    if (secondsRemaining <= 0) return
    const timer = setInterval(() => {
      setSecondsRemaining(previous => (previous > 0 ? previous - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsRemaining])

  const formattedPhone = useMemo(() => {
    if (!normalizedPhone) return ''
    return formatInternational(normalizedPhone)
  }, [normalizedPhone])

  const buildPhoneNumber = (): string | null => {
    const digits = localPhone.replace(/[^0-9]/g, '')
    if (!digits) return null

    const candidate = `+${selectedCountry.dialCode}${digits}`
    const parsed = parsePhoneNumberFromString(candidate)
    if (!parsed || !parsed.isValid()) return null

    return parsed.number
  }

  const handleSendCode = async () => {
    setValidationError(null)
    setInfoMessage(null)

    const fullNumber = buildPhoneNumber()
    if (!fullNumber) {
      setValidationError(t('pages.completeProfile.errors.invalidPhone'))
      return
    }

    try {
      const response = await sendOtp(fullNumber)
      setNormalizedPhone(fullNumber)
      setAttemptsRemaining(response?.attemptsRemaining ?? null)
      setSecondsRemaining(response?.expiresIn ?? 300)
      setInfoMessage(t('pages.completeProfile.success.codeSent'))
    } catch (error: any) {
      setValidationError(error.message || t('pages.completeProfile.errorGeneric'))
    }
  }

  const handleConfirmCode = async () => {
    setValidationError(null)

    if (!normalizedPhone) {
      setValidationError(t('pages.completeProfile.errors.sendFirst'))
      return
    }

    if (otpCode.trim().length !== OTP_LENGTH) {
      setValidationError(t('pages.completeProfile.errors.invalidCode', { length: OTP_LENGTH }))
      return
    }

    try {
      await confirmOtp({ phone: normalizedPhone, code: otpCode.trim() })
      const refreshed = await refreshProfile()
      if (refreshed?.phoneVerified) {
        navigate('/dashboard', { replace: true })
      } else {
        setInfoMessage(t('pages.completeProfile.success.phoneConfirmed'))
      }
    } catch (error: any) {
      setValidationError(error.message || t('pages.completeProfile.errorGeneric'))
    }
  }

  const allowResend = secondsRemaining === 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted py-12">
      <PageContainer variant="standard" maxWidth="4xl" className="space-y-8 rounded-xl border bg-background/95 shadow-sm backdrop-blur-sm">
        <div className="space-y-3 text-center">
          <Badge variant="outline" className="border-primary/40 text-primary">
            {t('pages.completeProfile.stepBadge')}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t('pages.completeProfile.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('pages.completeProfile.subtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5 text-primary" />
              {t('pages.completeProfile.card.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {infoMessage ? (
              <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                {infoMessage}
              </div>
            ) : null}

            {validationError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {validationError}
              </div>
            ) : null}

            {!validationError && sendError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {sendError.message}
              </div>
            ) : null}

            {!validationError && confirmError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {confirmError.message}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Label htmlFor="country">{t('pages.completeProfile.country')}</Label>
                <select
                  id="country"
                  value={selectedCountry.code}
                  onChange={event => {
                    const option = COUNTRY_OPTIONS.find(entry => entry.code === event.target.value)
                    if (option) setSelectedCountry(option)
                  }}
                  className="mt-1 w-full rounded-md border border-muted bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {COUNTRY_OPTIONS.map(option => (
                    <option key={option.code} value={option.code}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <Label htmlFor="phone">{t('pages.completeProfile.phone.label')}</Label>
                <div className="mt-1 flex rounded-md border border-muted bg-background">
                  <span className="inline-flex items-center rounded-l-md border-r border-muted px-3 text-sm text-muted-foreground">
                    +{selectedCountry.dialCode}
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t('pages.completeProfile.phone.placeholder')}
                    value={localPhone}
                    onChange={event => setLocalPhone(event.target.value)}
                    className="rounded-l-none border-0 focus-visible:ring-0"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('pages.completeProfile.phone.hint')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-muted bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <div>
                {normalizedPhone
                  ? t('pages.completeProfile.currentPhone', { phone: formattedPhone })
                  : t('pages.completeProfile.notConfirmed')}
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={isSending || (!allowResend && normalizedPhone !== null)}
                onClick={handleSendCode}
                className="gap-2 rounded-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('pages.completeProfile.sending')}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    {t('pages.completeProfile.sendCode')}
                  </>
                )}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="otp">{t('pages.completeProfile.otp.label')}</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={event => setOtpCode(event.target.value.replace(/[^\d]/g, ''))}
                  placeholder={t('pages.completeProfile.otp.placeholder')}
                  maxLength={OTP_LENGTH}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('pages.completeProfile.otp.hint', {
                    length: OTP_LENGTH,
                    attempts: attemptsRemaining ?? '∞'
                  })}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t('pages.completeProfile.resend.again')}</Label>
                <div className="flex items-center justify-between rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  <span>
                    {allowResend
                      ? t('pages.completeProfile.resend.again')
                      : t('pages.completeProfile.resend.wait', { time: secondsToMinutes(secondsRemaining) })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled={!allowResend}
                    onClick={handleSendCode}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {t('pages.completeProfile.resend.again')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
              <div>
                {attemptsRemaining !== null
                  ? t('pages.completeProfile.attemptsLeft', { count: attemptsRemaining })
                  : t('pages.completeProfile.unlimitedAttempts')}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleConfirmCode}
                  disabled={isConfirming || !otpCode}
                  className="gap-2"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('pages.completeProfile.confirming')}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      {t('pages.completeProfile.confirm')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {t('pages.completeProfile.help')} support@beauty-platform.com
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  )
}
