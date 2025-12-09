import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  PageContainer
} from '@beauty-platform/ui'
import {
  Building2,
  Loader2,
  Save,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  DollarSign,
  Languages,
  Scissors,
  RefreshCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '../contexts/AuthContext'
import { useWorkingHours, type WorkingHours } from '../hooks/useWorkingHours'
import WorkingHoursEditor from '../components/schedule/WorkingHoursEditor'
import { CRMApiService } from '../services/crmApiNew'
import { PageHeader } from '../components/layout/PageHeader'
import { SidebarTrigger } from '@beauty-platform/ui'

interface SalonData {
  id: string
  slug: string
  name: string
  description?: string
  email?: string
  phone?: string
  website?: string
  country?: string
  city?: string
  address?: string
  postalCode?: string
  currency: string
  language: string
  timezone: string
  salonType: string
  logoUrl?: string
  salonNumber?: string | null
}

const CURRENCIES = [
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'PLN', label: 'PLN (zł)' },
  { value: 'GBP', label: 'GBP (£)' }
]

const LANGUAGES = [
  { value: 'RU', label: 'Русский' },
  { value: 'PL', label: 'Polski' },
  { value: 'EN', label: 'English' },
  { value: 'UA', label: 'Українська' }
]

const SALON_TYPES = [
  { value: 'HAIR', label: 'salonSettings.types.hair' },
  { value: 'BEAUTY', label: 'salonSettings.types.beauty' },
  { value: 'NAILS', label: 'salonSettings.types.nails' },
  { value: 'SPA', label: 'salonSettings.types.spa' },
  { value: 'MIXED', label: 'salonSettings.types.mixed' }
]

const TIMEZONES = [
  { value: 'Europe/Warsaw', label: 'Europe/Warsaw (GMT+1/+2)' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (GMT+3)' },
  { value: 'Europe/London', label: 'Europe/London (GMT+0/+1)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (GMT+1/+2)' },
  { value: 'Europe/Kiev', label: 'Europe/Kiev (GMT+2/+3)' }
]

export default function SalonSettingsPage(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenantId } = useTenant()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [salonData, setSalonData] = useState<SalonData | null>(null)
  const {
    workingHours,
    loading: workingHoursLoading,
    error: workingHoursError,
    refetch: refetchWorkingHours
  } = useWorkingHours()
  const [editedHours, setEditedHours] = useState<WorkingHours[]>(workingHours)
  const [savingSchedule, setSavingSchedule] = useState(false)

  useEffect(() => {
    if (!tenantId) {
      toast.error(t('salonSettings.errors.noTenant', 'Салон не выбран'))
      void navigate('/dashboard')
      return
    }

    const fetchSalonData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/crm/settings', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (!response.ok || !data?.success) {
          const message = data?.error || `HTTP ${response.status}`
          throw new Error(message)
        }

        setSalonData(data.settings)
      } catch (error: unknown) {
        console.error('Failed to fetch salon data:', error)
        toast.error(
          t('salonSettings.errors.loadFailed', 'Не удалось загрузить данные салона')
        )
      } finally {
        setLoading(false)
      }
    }

    void fetchSalonData()
  }, [tenantId, navigate, t])

  useEffect(() => {
    setEditedHours(workingHours)
  }, [workingHours])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!salonData) return

    try {
      setSaving(true)

      const response = await fetch('/api/crm/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(salonData)
      })

      const data = await response.json()

      if (!response.ok || !data?.success) {
        const message = data?.error || `HTTP ${response.status}`
        throw new Error(message)
      }

      setSalonData(prev => prev ? { ...prev, ...data.settings } : data.settings)
      toast.success(
        t('salonSettings.success.saved', 'Настройки салона сохранены'),
        {
          description: t(
            'salonSettings.success.savedDescription',
            'Изменения успешно применены'
          )
        }
      )
    } catch (error: unknown) {
      console.error('Failed to save salon settings:', error)
      const errorMessage = error instanceof Error ? error.message : t('salonSettings.errors.tryAgain', 'Попробуйте снова')
      toast.error(
        t('salonSettings.errors.saveFailed', 'Не удалось сохранить настройки'),
        {
          description: errorMessage
        }
      )
    } finally {
      setSaving(false)
    }
  }
  const handleChange = (field: keyof SalonData, value: string) => {
    if (!salonData) return
    setSalonData({ ...salonData, [field]: value })
  }

  const scheduleDirty = useMemo(() => {
    return JSON.stringify(editedHours) !== JSON.stringify(workingHours)
  }, [editedHours, workingHours])

  const handleWorkingHoursChange = (next: WorkingHours[]) => {
    setEditedHours(next)
  }

  const handleResetWorkingHours = () => {
    setEditedHours(workingHours)
    toast.info(t('salonSettings.schedule.resetToast', 'Изменения графика отменены'))
  }

  const handleSaveWorkingHours = async () => {
    if (!scheduleDirty) return

    try {
      setSavingSchedule(true)
      await CRMApiService.updateSalonWorkingHours(
        editedHours.map(({ dayOfWeek, startTime, endTime, isWorkingDay }) => ({
          dayOfWeek,
          startTime,
          endTime,
          isWorkingDay
        }))
      )
      toast.success(t('salonSettings.schedule.success', 'Рабочие часы обновлены'))
      await refetchWorkingHours()
    } catch (error: unknown) {
      console.error('Failed to save working hours:', error)
      const errorMessage = error instanceof Error ? error.message : undefined
      toast.error(
        t('salonSettings.schedule.error', 'Не удалось сохранить рабочие часы'),
        { description: errorMessage }
      )
    } finally {
      setSavingSchedule(false)
    }
  }

  if (loading) {
    return (
      <PageContainer variant="standard" maxWidth="4xl">
        <div className="flex h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t('salonSettings.loading', 'Загрузка настроек салона...')}
            </p>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (!salonData) {
    return (
      <PageContainer variant="standard" maxWidth="4xl">
        <div className="flex h-[400px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {t('salonSettings.errors.noData', 'Данные салона не найдены')}
          </p>
        </div>
      </PageContainer>
    )
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
                <Building2 className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('salonSettings.title', 'Настройки салона')}</span>
              </div>
            </div>
          }
        />
        <p className="text-sm text-muted-foreground">
          {t('salonSettings.subtitle', 'Управление информацией и параметрами салона')}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3 items-start">
            {/* Колонка 1: Основная информация + Контактная информация */}
            <div className="space-y-6">
              <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Building2 className="h-5 w-5 text-primary" />
                    {t('salonSettings.sections.basic', 'Основная информация')}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {t(
                      'salonSettings.sections.basicDescription',
                      'Название и описание вашего салона'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {t('salonSettings.fields.name', 'Название салона')} *
                    </Label>
                    <Input
                      id="name"
                      value={salonData.name}
                      onChange={e => handleChange('name', e.target.value)}
                      placeholder={t('salonSettings.placeholders.name', 'Мой салон красоты')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      {t('salonSettings.fields.description', 'Описание')}
                    </Label>
                    <Textarea
                      id="description"
                      value={salonData.description || ''}
                      onChange={e => handleChange('description', e.target.value)}
                      placeholder={t(
                        'salonSettings.placeholders.description',
                        'Краткое описание вашего салона'
                      )}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salonType">
                      {t('salonSettings.fields.type', 'Тип салона')}
                    </Label>
                    <Select
                      value={salonData.salonType}
                      onValueChange={value => handleChange('salonType', value)}
                    >
                      <SelectTrigger id="salonType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SALON_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {t(type.label, type.value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Phone className="h-5 w-5 text-primary" />
                    {t('salonSettings.sections.contact', 'Контактная информация')}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {t(
                      'salonSettings.sections.contactDescription',
                      'Как клиенты могут с вами связаться'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t('salonSettings.fields.email', 'Email')}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={salonData.email || ''}
                        onChange={e => handleChange('email', e.target.value)}
                        placeholder="salon@example.com"
                        className="rounded-none border-0 border-b border-border bg-transparent"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {t('salonSettings.fields.phone', 'Телефон')}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={salonData.phone || ''}
                        onChange={e => handleChange('phone', e.target.value)}
                        placeholder="+48 123 456 789"
                        className="rounded-none border-0 border-b border-border bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t('salonSettings.fields.website', 'Веб-сайт')}
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      value={salonData.website || ''}
                      onChange={e => handleChange('website', e.target.value)}
                      placeholder="https://salon.example.com"
                      className="rounded-none border-0 border-b border-border bg-transparent"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <MapPin className="h-5 w-5 text-primary" />
                    {t('salonSettings.sections.address', 'Адрес')}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {t('salonSettings.sections.addressDescription', 'Где находится ваш салон')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="country">
                        {t('salonSettings.fields.country', 'Страна')}
                      </Label>
                      <Input
                        id="country"
                        value={salonData.country || ''}
                        onChange={e => handleChange('country', e.target.value)}
                        placeholder={t('salonSettings.placeholders.country', 'Польша')}
                        className="rounded-none border-0 border-b border-border bg-transparent"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">{t('salonSettings.fields.city', 'Город')}</Label>
                      <Input
                        id="city"
                        value={salonData.city || ''}
                        onChange={e => handleChange('city', e.target.value)}
                        placeholder={t('salonSettings.placeholders.city', 'Варшава')}
                        className="rounded-none border-0 border-b border-border bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">
                      {t('salonSettings.fields.address', 'Улица и номер дома')}
                    </Label>
                    <Input
                      id="address"
                      value={salonData.address || ''}
                      onChange={e => handleChange('address', e.target.value)}
                      placeholder={t('salonSettings.placeholders.address', 'ул. Примерная, 123')}
                      className="rounded-none border-0 border-b border-border bg-transparent"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">
                      {t('salonSettings.fields.postalCode', 'Почтовый индекс')}
                    </Label>
                    <Input
                      id="postalCode"
                      value={salonData.postalCode || ''}
                      onChange={e => handleChange('postalCode', e.target.value)}
                      placeholder="00-001"
                      className="rounded-none border-0 border-b border-border bg-transparent"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Колонка 2: Системные настройки */}
            <div className="space-y-6">
              <Card className="rounded-none border-0 border-t border-border bg-card shadow-none h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Scissors className="h-5 w-5 text-primary" />
                    {t('salonSettings.sections.system', 'Системные настройки')}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {t(
                      'salonSettings.sections.systemDescription',
                      'Валюта, язык и часовой пояс'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-1">
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {t('salonSettings.fields.currency', 'Валюта')}
                      </Label>
                      <Select
                        value={salonData.currency}
                        onValueChange={value => handleChange('currency', value)}
                      >
                        <SelectTrigger id="currency" className="rounded-none border border-border bg-card shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(curr => (
                            <SelectItem key={curr.value} value={curr.value}>
                              {curr.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language" className="flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        {t('salonSettings.fields.language', 'Язык')}
                      </Label>
                      <Select
                        value={salonData.language}
                        onValueChange={value => handleChange('language', value)}
                      >
                        <SelectTrigger id="language" className="rounded-none border border-border bg-card shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t('salonSettings.fields.timezone', 'Часовой пояс')}
                      </Label>
                      <Select
                        value={salonData.timezone}
                        onValueChange={value => handleChange('timezone', value)}
                      >
                        <SelectTrigger id="timezone" className="rounded-none border border-border bg-card shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map(tz => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Колонка 3: Рабочие часы */}
            <div className="space-y-6">
              <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Clock className="h-5 w-5 text-primary" />
                    {t('salonSettings.schedule.title', 'Рабочие часы салона')}
                  </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t(
                'salonSettings.schedule.subtitle',
                'Эти часы используют календарь, панель и клиентский портал.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workingHoursError && (
              <p className="text-sm text-error" role="alert" aria-live="polite">
                {workingHoursError}
              </p>
            )}
            <WorkingHoursEditor
              value={editedHours}
              onChange={(next) => handleWorkingHoursChange(next)}
              disabled={workingHoursLoading || savingSchedule}
              timezone={salonData.timezone}
              idPrefix="salon-hours"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                'salonSettings.schedule.help',
                'После сохранения график обновится для всех мастеров и новых записей.'
              )}
            </p>
          </CardContent>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30">
            <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {scheduleDirty
                ? t('salonSettings.schedule.unsaved', 'Есть несохранённые изменения')
                : t('salonSettings.schedule.synced', 'График синхронизирован')}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={!scheduleDirty || savingSchedule}
                onClick={() => void handleResetWorkingHours()}
                className="min-h-[44px]"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('salonSettings.schedule.reset', 'Сбросить')}
              </Button>
              <Button
                type="button"
                disabled={!scheduleDirty || savingSchedule}
                onClick={() => void handleSaveWorkingHours()}
                className="min-h-[44px]"
              >
                {savingSchedule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('salonSettings.schedule.save', 'Сохранить график')}
              </Button>
            </div>
                </CardContent>
              </Card>
            </div>
          </div>

        {/* Кнопки действий */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigate('/settings')}
            disabled={saving}
            className="min-h-[44px]"
          >
            {t('salonSettings.actions.cancel', 'Отмена')}
          </Button>
          <Button type="submit" disabled={saving} className="gap-2 min-h-[44px]">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('salonSettings.actions.saving', 'Сохранение...')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t('salonSettings.actions.save', 'Сохранить изменения')}
              </>
            )}
          </Button>
        </div>
      </form>
      </div>
    </PageContainer>
  )
}
