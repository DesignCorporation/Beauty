import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@beauty-platform/ui'
import { AlertCircle, Camera, CheckCircle, Globe, Loader2, Phone, ShieldCheck, Trash2, Upload, User } from 'lucide-react'
import ClientLayout from '../components/ClientLayout'
import { useAuth } from '../hooks/useAuth'
import { clientApi } from '../services'
import type { UpdateClientProfilePayload } from '../services/api'

const GENDER_OPTIONS = [
  { value: 'NONE' as const, labelKey: 'pages.profile.gender.options.unspecified' },
  { value: 'FEMALE' as const, labelKey: 'pages.profile.gender.options.female' },
  { value: 'MALE' as const, labelKey: 'pages.profile.gender.options.male' },
  { value: 'OTHER' as const, labelKey: 'pages.profile.gender.options.other' },
  { value: 'PREFER_NOT_TO_SAY' as const, labelKey: 'pages.profile.gender.options.preferNot' }
] as const

const LANGUAGE_OPTIONS = [
  { value: 'RU' as const, labelKey: 'pages.profile.language.options.RU' },
  { value: 'EN' as const, labelKey: 'pages.profile.language.options.EN' },
  { value: 'PL' as const, labelKey: 'pages.profile.language.options.PL' },
  { value: 'UA' as const, labelKey: 'pages.profile.language.options.UA' }
] as const

const SOURCE_LABEL_KEYS: Record<string, string> = {
  GOOGLE_OAUTH: 'pages.profile.account.sourceLabels.google',
  WALK_IN: 'pages.profile.account.sourceLabels.walkIn',
  REFERRAL: 'pages.profile.account.sourceLabels.referral',
  INSTAGRAM: 'pages.profile.account.sourceLabels.instagram',
  FACEBOOK: 'pages.profile.account.sourceLabels.facebook',
  WEBSITE: 'pages.profile.account.sourceLabels.website',
  OTHER: 'pages.profile.account.sourceLabels.other'
}

type GenderValue = (typeof GENDER_OPTIONS)[number]['value']
type LanguageValue = (typeof LANGUAGE_OPTIONS)[number]['value']

interface ProfileFormState {
  firstName: string
  lastName: string
  phone: string
  birthdate: string
  gender: GenderValue
  preferredLanguage: LanguageValue
  marketingConsent: boolean
}

const formatDateForInput = (value?: string | null): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { user, isLoading, refreshProfile } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar ?? null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarRemoving, setAvatarRemoving] = useState(false)
  const [avatarFeedback, setAvatarFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024

  const initialState = useMemo<ProfileFormState>(() => {
    const defaultLanguage: LanguageValue = 'RU'
    const defaultGender: GenderValue = 'NONE'

    if (!user) {
      return {
        firstName: '',
        lastName: '',
        phone: '',
        birthdate: '',
        gender: defaultGender,
        preferredLanguage: defaultLanguage,
        marketingConsent: false
      }
    }

    const language = LANGUAGE_OPTIONS.some(option => option.value === user.preferredLanguage)
      ? (user.preferredLanguage as LanguageValue)
      : defaultLanguage
    const gender = user.gender && GENDER_OPTIONS.some(option => option.value === user.gender)
      ? (user.gender as GenderValue)
      : defaultGender

    return {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      birthdate: formatDateForInput(user.birthdate),
      gender,
      preferredLanguage: language,
      marketingConsent: Boolean(user.marketingConsent)
    }
  }, [user])

  const [formState, setFormState] = useState<ProfileFormState>(initialState)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    setFormState(initialState)
  }, [initialState])

  useEffect(() => {
    if (!feedback || feedback.type !== 'success') return

    const timer = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    setAvatarUrl(user?.avatar ?? null)
  }, [user?.avatar])

  useEffect(() => {
    if (!avatarFeedback) return
    const timer = window.setTimeout(() => setAvatarFeedback(null), 4000)
    return () => window.clearTimeout(timer)
  }, [avatarFeedback])

  const isDirty = useMemo(
    () => JSON.stringify(formState) !== JSON.stringify(initialState),
    [formState, initialState]
  )

  const formatDate = (value?: string | null) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat(i18n.language || 'en', { dateStyle: 'medium' }).format(date)
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat(i18n.language || 'en', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  }

  const handleAvatarInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      void handleAvatarUpload(file)
    }
    event.target.value = ''
  }

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) {
      setAvatarFeedback({
        type: 'error',
        message: t('pages.profile.avatar.errors.noUser')
      })
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setAvatarFeedback({
        type: 'error',
        message: t('pages.profile.avatar.errors.type')
      })
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarFeedback({
        type: 'error',
        message: t('pages.profile.avatar.errors.size')
      })
      return
    }

    setAvatarFeedback(null)
    setAvatarUploading(true)

    try {
      const uploadResponse = await clientApi.uploadClientAvatar(file, user.id)
      const uploadedImage = uploadResponse.images?.[0]

      if (!uploadedImage?.url) {
        throw new Error(uploadResponse.error || uploadResponse.message || 'Upload failed')
      }

      const payloadResult = buildProfilePayload({ avatar: uploadedImage.url })
      if (!payloadResult.ok) {
        throw new Error(t('pages.profile.validation.namesRequired'))
      }

      await clientApi.updateClientProfile(payloadResult.payload)
      const refreshed = await refreshProfile()
      setAvatarUrl(refreshed?.avatar ?? uploadedImage.url)

      setAvatarFeedback({
        type: 'success',
        message: t('pages.profile.avatar.feedback.success')
      })
    } catch (error: any) {
      console.error('Avatar upload failed', error)
      setAvatarFeedback({
        type: 'error',
        message: error?.message || t('pages.profile.avatar.errors.generic')
      })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleAvatarRemove = async () => {
    if (!user?.id) {
      setAvatarFeedback({
        type: 'error',
        message: t('pages.profile.avatar.errors.noUser')
      })
      return
    }

    setAvatarFeedback(null)
    setAvatarRemoving(true)

    try {
      const payloadResult = buildProfilePayload({ avatar: null })
      if (!payloadResult.ok) {
        throw new Error(t('pages.profile.validation.namesRequired'))
      }

      await clientApi.updateClientProfile(payloadResult.payload)
      const refreshed = await refreshProfile()
      setAvatarUrl(refreshed?.avatar ?? null)

      setAvatarFeedback({
        type: 'success',
        message: t('pages.profile.avatar.feedback.removed')
      })
    } catch (error: any) {
      console.error('Avatar remove failed', error)
      setAvatarFeedback({
        type: 'error',
        message: error?.message || t('pages.profile.avatar.errors.generic')
      })
    } finally {
      setAvatarRemoving(false)
    }
  }

  const formattedJoinedAt = formatDate(user?.joinedPortalAt)
  const formattedPhoneVerifiedAt = formatDateTime(user?.phoneVerifiedAt)
  const sourceLabel = user?.source
    ? t(SOURCE_LABEL_KEYS[user.source] ?? SOURCE_LABEL_KEYS.OTHER as any)
    : t('pages.profile.account.notAvailable')

  const buildProfilePayload = (
    overrides: Partial<UpdateClientProfilePayload> = {}
  ): { ok: true; payload: UpdateClientProfilePayload } | { ok: false } => {
    const resolvedFirstName =
      formState.firstName.trim() ||
      initialState.firstName.trim() ||
      user?.firstName?.trim() ||
      ''
    const resolvedLastName =
      formState.lastName.trim() ||
      initialState.lastName.trim() ||
      user?.lastName?.trim() ||
      ''

    if (!resolvedFirstName || !resolvedLastName) {
      return { ok: false }
    }

    const basePayload: UpdateClientProfilePayload = {
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      phone: formState.phone.trim() ? formState.phone.trim() : null,
      birthdate: formState.birthdate ? formState.birthdate : null,
      gender: formState.gender === 'NONE' ? null : formState.gender,
      preferredLanguage: formState.preferredLanguage,
      marketingConsent: formState.marketingConsent
    }

    return {
      ok: true,
      payload: {
        ...basePayload,
        ...overrides
      }
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    const payloadResult = buildProfilePayload()
    if (!payloadResult.ok) {
      setFeedback({
        type: 'error',
        message: t('pages.profile.validation.namesRequired')
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await clientApi.updateClientProfile(payloadResult.payload)
      if (!response.success) {
        throw new Error(response.error || 'Failed to update profile')
      }

      await refreshProfile()

      setFeedback({
        type: 'success',
        message: t('pages.profile.feedback.success')
      })
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message: error?.message || t('pages.profile.feedback.error')
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !user) {
    return (
      <ClientLayout>
        <div className="mx-auto flex min-h-[360px] max-w-3xl items-center justify-center px-4">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/60 border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {t('pages.profile.loading', { defaultValue: 'Загружаем профиль...' })}
            </p>
          </div>
        </div>
      </ClientLayout>
    )
  }

  const phoneStatusBadge = user.phoneVerified ? (
    <Badge variant="secondary" className="flex items-center gap-1 border-success/30 bg-success/10 text-success">
      <CheckCircle className="h-3 w-3" />
      {t('pages.profile.status.phoneVerified')}
    </Badge>
  ) : (
    <Badge variant="outline" className="flex items-center gap-1 border-warning/40 text-warning">
      <AlertCircle className="h-3 w-3" />
      {t('pages.profile.status.phoneNotVerified')}
    </Badge>
  )

  return (
    <ClientLayout>
      <div className="mx-auto max-w-full px-4 py-8 space-y-6">
        {feedback ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Camera className="h-5 w-5 text-primary" />
                {t('pages.profile.avatar.title')}
              </CardTitle>
              <CardDescription>{t('pages.profile.avatar.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-muted bg-muted">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={t('pages.profile.avatar.title')}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-background/70 p-6 text-center">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleAvatarInputChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t('pages.profile.avatar.hint')}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      <Button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="gap-2"
                      >
                        {avatarUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('pages.profile.avatar.uploading')}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            {avatarUrl
                              ? t('pages.profile.avatar.change')
                              : t('pages.profile.avatar.upload')}
                          </>
                        )}
                      </Button>
                      {avatarUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void handleAvatarRemove()}
                          disabled={avatarRemoving}
                          className="gap-2"
                        >
                          {avatarRemoving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t('pages.profile.avatar.removing')}
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              {t('pages.profile.avatar.remove')}
                            </>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {avatarFeedback ? (
                    <div
                      className={`rounded-md border px-4 py-3 text-sm ${
                        avatarFeedback.type === 'success'
                          ? 'border-success/40 bg-success/10 text-success'
                          : 'border-destructive/40 bg-destructive/10 text-destructive'
                      }`}
                    >
                      {avatarFeedback.message}
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="h-5 w-5 text-primary" />
                {t('pages.profile.sections.personal.title')}
              </CardTitle>
              <CardDescription>
                {t('pages.profile.sections.personal.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('pages.profile.fields.firstName')}</Label>
                  <Input
                    id="firstName"
                    value={formState.firstName}
                    onChange={event => setFormState(prev => ({ ...prev, firstName: event.target.value }))}
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('pages.profile.fields.lastName')}</Label>
                  <Input
                    id="lastName"
                    value={formState.lastName}
                    onChange={event => setFormState(prev => ({ ...prev, lastName: event.target.value }))}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="birthdate">{t('pages.profile.fields.birthdate')}</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    value={formState.birthdate}
                    onChange={event => setFormState(prev => ({ ...prev, birthdate: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">{t('pages.profile.fields.gender')}</Label>
                  <Select
                    value={formState.gender}
                    onValueChange={value => setFormState(prev => ({ ...prev, gender: value as GenderValue }))}
                  >
                    <SelectTrigger id="gender" className="bg-background">
                      <SelectValue placeholder={t('pages.profile.gender.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map(option => (
                        <SelectItem key={option.value || 'none'} value={option.value}>
                          {t(option.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Phone className="h-5 w-5 text-primary" />
                {t('pages.profile.sections.contact.title')}
              </CardTitle>
              <CardDescription>
                {t('pages.profile.sections.contact.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('pages.profile.fields.email')}</Label>
                <Input id="email" type="email" value={user.email} disabled readOnly className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('pages.profile.fields.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formState.phone}
                  onChange={event => setFormState(prev => ({ ...prev, phone: event.target.value }))}
                  placeholder={t('pages.profile.fields.phonePlaceholder')}
                  autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">
                  {t('pages.profile.fields.phoneHint')}
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-md border border-muted bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {phoneStatusBadge}
                    {user.phoneVerified && formattedPhoneVerifiedAt ? (
                      <span className="text-muted-foreground">
                        {t('pages.profile.status.phoneVerifiedAt', { date: formattedPhoneVerifiedAt })}
                      </span>
                    ) : null}
                  </div>
                  {!user.phoneVerified ? (
                    <p className="text-xs text-warning">
                      {t('pages.profile.status.phoneNotVerifiedHint')}
                    </p>
                  ) : null}
                </div>
                <Button
                  asChild
                  variant={user.phoneVerified ? 'outline' : 'secondary'}
                  size="sm"
                  className="sm:shrink-0"
                >
                  <Link to="/complete-profile" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {user.phoneVerified
                      ? t('pages.profile.actions.updatePhone')
                      : t('pages.profile.actions.verifyPhone')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Globe className="h-5 w-5 text-primary" />
                {t('pages.profile.sections.preferences.title')}
              </CardTitle>
              <CardDescription>
                {t('pages.profile.sections.preferences.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">{t('pages.profile.fields.language')}</Label>
                <Select
                  value={formState.preferredLanguage}
                  onValueChange={value =>
                    setFormState(prev => ({ ...prev, preferredLanguage: value as LanguageValue }))
                  }
                >
                  <SelectTrigger id="language" className="bg-background">
                    <SelectValue placeholder={t('pages.profile.language.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border border-muted bg-muted/30 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t('pages.profile.fields.marketingConsent')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('pages.profile.fields.marketingConsentDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={formState.marketingConsent}
                    onCheckedChange={checked =>
                      setFormState(prev => ({ ...prev, marketingConsent: checked }))
                    }
                    aria-label={t('pages.profile.fields.marketingConsent')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t('pages.profile.account.title')}
              </CardTitle>
              <CardDescription>
                {t('pages.profile.account.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t('pages.profile.account.joined')}</dt>
                  <dd className="font-medium text-foreground">
                    {formattedJoinedAt || t('pages.profile.account.notAvailable')}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t('pages.profile.account.source')}</dt>
                  <dd className="font-medium text-foreground">
                    {user?.source ? sourceLabel : t('pages.profile.account.notAvailable')}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="flex justify-end md:col-span-2">
            <Button type="submit" disabled={isSaving || !isDirty} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('pages.profile.actions.saving')}
                </>
              ) : (
                t('pages.profile.actions.save')
              )}
            </Button>
          </div>
        </form>
      </div>
    </ClientLayout>
  )
}
