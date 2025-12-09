import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PageContainer,
} from '@beauty-platform/ui'
import { ArrowLeft, Mail, Phone, Shield, DollarSign, Award, Calendar, Copy, Trash2, Loader2, RefreshCcw } from 'lucide-react'
import { format } from 'date-fns'
import { useStaff, StaffMember } from '../hooks/useStaff'
import { useToast } from '../contexts/ToastContext'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../currency'
import WorkingHoursEditor from '../components/schedule/WorkingHoursEditor'
import { useWorkingHours, type WorkingHours } from '../hooks/useWorkingHours'
import { ScheduleExceptionType, type StaffScheduleException } from '../types/schedule'
import { CRMApiService } from '../services/crmApiNew'
import { useStaffSchedules } from '../hooks/useStaffSchedules'
import { useAuthContext } from '../contexts/AuthContext'
import { useServices } from '../hooks/useServices'
import type { Service } from '../types/services'
import { SPECIALIZATION_CATEGORY_MAPPING, getRelevantCategories } from '../constants/specializationServiceMapping'

type StaffFormData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  color: string
  spokenLanguages: string[]
  canSeeFinances: boolean
  bio: string
  notes: string
  isBookable: boolean
  specializations: string[]
}

type StaffMemberWithExtras = StaffMember & {
  bio?: string
  specialties?: string
  notes?: string
  specializations?: string[]
  servicesAvailable?: Array<{ serviceId: string }>
}

const STAFF_COLORS = [
  { labelKey: 'indigo', value: '#6366f1' },
  { labelKey: 'violet', value: '#8b5cf6' },
  { labelKey: 'pink', value: '#ec4899' },
  { labelKey: 'coral', value: '#fb7185' },
  { labelKey: 'amber', value: '#f59e0b' },
  { labelKey: 'emerald', value: '#10b981' },
  { labelKey: 'teal', value: '#06b6d4' },
  { labelKey: 'slate', value: '#64748b' },
] as const

const LANGUAGE_OPTIONS = [
  { code: 'pl', flag: '🇵🇱' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'ru', flag: '🇷🇺' },
  { code: 'ua', flag: '🇺🇦' },
] as const

const SPECIALIZATION_OPTIONS = [
  { value: 'BARBER', label: 'Барбер' },
  { value: 'STYLIST', label: 'Стилист' },
  { value: 'NAIL_MASTER', label: 'Мастер маникюра' },
  { value: 'COLORIST', label: 'Колорист' },
  { value: 'GROOMER', label: 'Груммер' },
  { value: 'MAKEUP_ARTIST', label: 'Визажист' },
  { value: 'MASSAGE_THERAPIST', label: 'Массажист' },
  { value: 'AESTHETIC_SPECIALIST', label: 'Эстетолог' },
  { value: 'PIERCER', label: 'Пирсер' },
  { value: 'TATTOO_ARTIST', label: 'Татуировщик' },
] as const

const DEFAULT_EXCEPTION_FORM = {
  type: ScheduleExceptionType.DAY_OFF,
  startDate: '',
  endDate: '',
  customStartTime: '09:00',
  customEndTime: '18:00',
  isWorkingDay: true,
  reason: ''
}

export default function StaffProfilePage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { staff, refetch } = useStaff({ bookableOnly: false })
  const { showToast } = useToast()
  const { t } = useTranslation()
  const { formatPrice, supportedCurrencies, currency, changeCurrency } = useCurrency()
  const { workingHours: salonWorkingHours } = useWorkingHours()
  const { refetch: refetchTeamSchedules } = useStaffSchedules()
  const { user } = useAuthContext()
  const {
    services: salonServices,
    loading: servicesLoading,
    formatServicePrice: formatSalonServicePrice,
    formatServiceDuration: formatSalonServiceDuration,
    refetch: refetchServices
  } = useServices()
  const resolveErrorMessage = (err: unknown): string | undefined => (err instanceof Error ? err.message : undefined)

  const staffMember = useMemo<StaffMemberWithExtras | null>(() => {
    const found = staff.find((item) => item.id === id)
    return found ? (found as StaffMemberWithExtras) : null
  }, [staff, id])

  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'settings'>('overview')
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [formData, setFormData] = useState<StaffFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    color: '#6366f1',
    spokenLanguages: ['pl'],
    canSeeFinances: false,
    bio: '',
    notes: '',
    isBookable: true,
    specializations: [],
  })
  const [staffWorkingHours, setStaffWorkingHours] = useState<WorkingHours[]>(salonWorkingHours)
  const [originalStaffHours, setOriginalStaffHours] = useState<WorkingHours[]>(salonWorkingHours)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [exceptions, setExceptions] = useState<StaffScheduleException[]>([])
  const [exceptionSubmitting, setExceptionSubmitting] = useState(false)
  const [deletingExceptionId, setDeletingExceptionId] = useState<string | null>(null)
  const [exceptionForm, setExceptionForm] = useState(DEFAULT_EXCEPTION_FORM)
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([])
  const [specializationsSaving, setSpecializationsSaving] = useState(false)
  const [languagesSaving, setLanguagesSaving] = useState(false)
  const [serviceMutationId, setServiceMutationId] = useState<string | null>(null)
  const [assignedServicesLoading, setAssignedServicesLoading] = useState(false)

  useEffect(() => {
    if (!staffMember) return

    const apiLanguagesRaw = Array.isArray(staffMember.languages) && staffMember.languages.length
      ? staffMember.languages
      : undefined

    const derivedLanguages =
      apiLanguagesRaw ??
      staffMember.permissions
        ?.filter((perm) => perm.startsWith('lang:'))
        .map((perm) => perm.replace('lang:', '').toLowerCase())

    const normalizedLanguages =
      derivedLanguages && derivedLanguages.length > 0 ? derivedLanguages.map((lang) => lang.toLowerCase()) : ['pl']

    setFormData({
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      email: staffMember.email,
      phone: staffMember.phone || '',
      color: staffMember.color || '#6366f1',
      spokenLanguages: normalizedLanguages,
      canSeeFinances: staffMember.canSeeFinances ?? false,
      bio: staffMember.bio ?? '',
      notes: staffMember.notes ?? '',
      isBookable: staffMember.isBookable ?? true,
      specializations: Array.isArray(staffMember.specializations) ? staffMember.specializations : [],
    })
  }, [staffMember])

  useEffect(() => {
    setAvatarFailed(false)
  }, [staffMember?.avatarUrl])
 
  const scheduleDirty = useMemo(() => {
    return JSON.stringify(staffWorkingHours) !== JSON.stringify(originalStaffHours)
  }, [staffWorkingHours, originalStaffHours])

  const canEditSchedule = useMemo(() => {
    if (!staffMember) return false
    const normalizedRole = (user?.role ?? '').toUpperCase()
    const isSelf = user?.id && staffMember.id && user.id === staffMember.id
    const privilegedRoles = ['SALON_OWNER', 'OWNER', 'MANAGER']
    return Boolean(isSelf || privilegedRoles.includes(normalizedRole))
  }, [staffMember, user])

  const normalizeStaffHours = useCallback(
    (records?: { id?: string; dayOfWeek: number; startTime: string; endTime: string; isWorkingDay: boolean }[]): WorkingHours[] => {
      if (!records?.length) {
        return salonWorkingHours.map(item => ({ ...item }))
      }

      return records.map(record => ({
        id: record.id ?? `staff-${record.dayOfWeek}`,
        dayOfWeek: record.dayOfWeek,
        startTime: record.startTime,
        endTime: record.endTime,
        isWorkingDay: record.isWorkingDay
      }))
    },
    [salonWorkingHours]
  )

  const loadStaffSchedule = useCallback(async () => {
    if (!staffMember?.id) return

    try {
      setScheduleLoading(true)
      const data = await CRMApiService.getStaffSchedule(staffMember.id)
      const normalized = normalizeStaffHours(data.workingHours)
      setStaffWorkingHours(normalized)
      setOriginalStaffHours(normalized)
      setExceptions(data.exceptions ?? [])
    } catch (error: unknown) {
      console.error('Failed to load staff schedule:', error)
      showToast({
        title: t('team.profile.scheduleEditor.loadError', 'Не удалось загрузить расписание'),
        description: resolveErrorMessage(error),
        variant: 'destructive'
      })
    } finally {
      setScheduleLoading(false)
    }
  }, [staffMember?.id, normalizeStaffHours, showToast, t])

  useEffect(() => {
    if (staffMember?.id) {
      void loadStaffSchedule()
    }
  }, [staffMember?.id, loadStaffSchedule])

  const loadAssignedServices = useCallback(async () => {
    if (!staffMember?.id) return
    try {
      setAssignedServicesLoading(true)
      const response = await CRMApiService.getStaffServices(staffMember.id)
      if (response.success) {
        setAssignedServiceIds(response.services.map((mapping) => mapping.serviceId))
      }
    } catch (error) {
      console.error('Failed to load staff services:', error)
    } finally {
      setAssignedServicesLoading(false)
    }
  }, [staffMember?.id])

  useEffect(() => {
    void loadAssignedServices()
  }, [loadAssignedServices])

  const relevantServiceCategories = useMemo(
    () => getRelevantCategories(formData.specializations),
    [formData.specializations]
  )

  const serviceLookup = useMemo(() => {
    const map = new Map<string, Service>()
    salonServices.forEach((service) => {
      map.set(service.id, service)
    })
    return map
  }, [salonServices])

  const categorizedServices = useMemo(() => {
    if (!salonServices || salonServices.length === 0) {
      return []
    }

    const categoryMap = new Map<string, { name: string; services: Service[] }>()

    salonServices.forEach((service) => {
      const categoryName = service.category?.name || 'Другие услуги'
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { name: categoryName, services: [] })
      }
      categoryMap.get(categoryName)!.services.push(service)
    })

    let categories = Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    if (relevantServiceCategories.length > 0) {
      const categorySet = new Set(relevantServiceCategories)
      categories = categories.filter((category) => categorySet.has(category.name))
    }

    return categories
  }, [salonServices, relevantServiceCategories])

  if (!staffMember) {
    return (
      <PageContainer variant="full-width" className="min-h-screen bg-muted p-6">
        <div className="mx-auto flex max-w-full items-center justify-center rounded-2xl bg-card p-12 shadow-sm">
          <div className="space-y-3 text-center">
            <div className="text-lg font-medium text-foreground">{t('team.profile.notFoundTitle')}</div>
            <p className="text-muted-foreground">{t('team.profile.notFoundSubtitle')}</p>
            <Button onClick={() => void navigate('/team')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('team.profile.backToTeam')}
            </Button>
          </div>
        </div>
      </PageContainer>
    )
  }

  const fullName = `${staffMember.firstName} ${staffMember.lastName}`.trim()
  const initials = `${staffMember.firstName?.charAt(0) ?? ''}${staffMember.lastName?.charAt(0) ?? ''}`.toUpperCase() || '??'
  const resolvedAvatarUrl = staffMember.avatarUrl ?? null
  const accentColor = formData.color
  const createdAt = staffMember.createdAt ? new Date(staffMember.createdAt) : null
  const tenure = createdAt ? Math.max(0, Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))) : null

  const saveLanguages = async (previous: string[], next: string[]) => {
    if (!staffMember?.id) return
    setLanguagesSaving(true)
    try {
      await CRMApiService.updateStaffMember(staffMember.id, { languages: next.map((lang) => lang.toUpperCase()) })
      await refetch()
      showToast({
        title: t('team.profile.languagesSaved', 'Языки обновлены'),
        variant: 'success'
      })
    } catch (error) {
      console.error('Failed to update languages:', error)
      showToast({
        title: t('team.profile.languagesError', 'Не удалось обновить языки'),
        variant: 'destructive'
      })
      setFormData((prev) => ({ ...prev, spokenLanguages: previous }))
    } finally {
      setLanguagesSaving(false)
    }
  }

  const handleLanguageToggle = (code: string) => {
    setFormData((prev) => {
      const previous = prev.spokenLanguages
      const next = previous.includes(code)
        ? previous.filter((lang) => lang !== code)
        : [...previous, code]
      void saveLanguages(previous, next)
      return {
        ...prev,
        spokenLanguages: next
      }
    })
  }

  const saveSpecializations = async (previous: string[], next: string[]) => {
    if (!staffMember?.id) return
    setSpecializationsSaving(true)
    try {
      await CRMApiService.updateStaffMember(staffMember.id, { specializations: next })
      await refetch()
      showToast({
        title: t('team.profile.specializationsSaved', 'Специализации обновлены'),
        variant: 'success'
      })
    } catch (error) {
      console.error('Failed to update specializations:', error)
      showToast({
        title: t('team.profile.specializationsError', 'Не удалось обновить специализации'),
        variant: 'destructive'
      })
      setFormData((prev) => ({ ...prev, specializations: previous }))
    } finally {
      setSpecializationsSaving(false)
    }
  }

  const handleSpecializationToggle = (value: string) => {
    setFormData((prev) => {
      const previous = prev.specializations
      const next = previous.includes(value)
        ? previous.filter((spec) => spec !== value)
        : [...previous, value]
      void saveSpecializations(previous, next)
      return {
        ...prev,
        specializations: next
      }
    })
  }

  const handleServiceToggle = async (serviceId: string, nextChecked: boolean) => {
    if (!staffMember?.id) return
    const previous = [...assignedServiceIds]

    setAssignedServiceIds((prev) => {
      if (nextChecked) {
        return prev.includes(serviceId) ? prev : [...prev, serviceId]
      }
      return prev.filter((id) => id !== serviceId)
    })

    setServiceMutationId(serviceId)
    try {
      if (nextChecked) {
        await CRMApiService.assignServiceToStaff(staffMember.id, serviceId)
        showToast({
          title: t('team.profile.services.assigned', 'Услуга добавлена'),
          variant: 'success'
        })
      } else {
        await CRMApiService.removeServiceFromStaff(staffMember.id, serviceId)
        showToast({
          title: t('team.profile.services.removed', 'Услуга удалена'),
          variant: 'success'
        })
      }
      await refetch()
      await refetchServices()
      await loadAssignedServices()
    } catch (error) {
      console.error('Failed to update staff services:', error)
      setAssignedServiceIds(previous)
      showToast({
        title: t('team.profile.services.error', 'Не удалось обновить услуги'),
        variant: 'destructive'
      })
    } finally {
      setServiceMutationId(null)
    }
  }

  const metrics = {
    avgTicket: formatPrice(65 + (staffMember.priority ?? 1) * 12, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    monthlyRevenue: formatPrice(5200 + (staffMember.priority ?? 1) * 320, { maximumFractionDigits: 0 }),
    satisfaction: `${88 + Math.min(10, (staffMember.priority ?? 1) * 2)}%`,
  }

  const resetExceptionForm = () => setExceptionForm(DEFAULT_EXCEPTION_FORM)

  const handleBookableToggle = async (nextValue: boolean) => {
    if (!staffMember?.id) return
    try {
      await CRMApiService.updateStaffMember(staffMember.id, { isBookable: nextValue })
      setFormData((prev) => ({ ...prev, isBookable: nextValue }))
      await refetch()
      showToast({
        title: t('team.profile.bookableSaved', 'Настройки записи обновлены'),
        variant: 'success'
      })
    } catch (error) {
      console.error('Failed to update bookable flag:', error)
      showToast({
        title: t('team.profile.bookableError', 'Не удалось обновить доступность для записи'),
        variant: 'destructive'
      })
    }
  }

  const handleExceptionFieldChange = (field: keyof typeof DEFAULT_EXCEPTION_FORM, value: string | boolean) => {
    setExceptionForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCreateException = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!staffMember) return
    if (!exceptionForm.startDate || !exceptionForm.endDate) {
      showToast({
        title: t('team.profile.scheduleEditor.exceptions.validation', 'Выберите даты исключения'),
        variant: 'destructive'
      })
      return
    }

    const isCustom = exceptionForm.type === ScheduleExceptionType.CUSTOM_HOURS
    if (isCustom && (!exceptionForm.customStartTime || !exceptionForm.customEndTime)) {
      showToast({
        title: t('team.profile.scheduleEditor.exceptions.customValidation', 'Укажите время для кастомных часов'),
        variant: 'destructive'
      })
      return
    }

    try {
      setExceptionSubmitting(true)
      await CRMApiService.createStaffScheduleException(staffMember.id, {
        type: exceptionForm.type,
        startDate: new Date(`${exceptionForm.startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${exceptionForm.endDate}T23:59:59`).toISOString(),
        reason: exceptionForm.reason || null,
        customStartTime: isCustom ? exceptionForm.customStartTime : null,
        customEndTime: isCustom ? exceptionForm.customEndTime : null,
        isWorkingDay: isCustom ? exceptionForm.isWorkingDay : undefined
      })
      showToast({
        title: t('team.profile.scheduleEditor.exceptions.added', 'Исключение добавлено'),
        variant: 'success'
      })
      resetExceptionForm()
      await loadStaffSchedule()
      await refetchTeamSchedules()
    } catch (error: unknown) {
      console.error('Failed to create exception:', error)
      showToast({
        title: t('team.profile.scheduleEditor.exceptions.error', 'Не удалось создать исключение'),
        description: resolveErrorMessage(error),
        variant: 'destructive'
      })
    } finally {
      setExceptionSubmitting(false)
    }
  }

  const handleDeleteException = async (exceptionId: string) => {
    if (!staffMember) return
    try {
      setDeletingExceptionId(exceptionId)
      await CRMApiService.deleteStaffScheduleException(staffMember.id, exceptionId)
      showToast({
        title: t('team.profile.scheduleEditor.exceptions.removed', 'Исключение удалено'),
        variant: 'success'
      })
      await loadStaffSchedule()
      await refetchTeamSchedules()
    } catch (error: unknown) {
      console.error('Failed to delete exception:', error)
      showToast({
        title: t('team.profile.scheduleEditor.exceptions.removeError', 'Не удалось удалить исключение'),
        description: resolveErrorMessage(error),
        variant: 'destructive'
      })
    } finally {
      setDeletingExceptionId(null)
    }
  }

  const handleStaffWorkingHoursChange = (next: WorkingHours[]) => {
    setStaffWorkingHours(next)
  }

  const handleCopySalonHours = () => {
    setStaffWorkingHours(salonWorkingHours.map(item => ({ ...item })))
  }

  const handleSaveStaffSchedule = async () => {
    if (!staffMember || !scheduleDirty) return
    try {
      setScheduleSaving(true)
      await CRMApiService.updateStaffSchedule(
        staffMember.id,
        staffWorkingHours.map(({ dayOfWeek, startTime, endTime, isWorkingDay }) => ({
          dayOfWeek,
          startTime,
          endTime,
          isWorkingDay
        }))
      )
      showToast({
        title: t('team.profile.scheduleEditor.saveSuccess', 'Расписание обновлено'),
        variant: 'success'
      })
      await loadStaffSchedule()
      await refetchTeamSchedules()
    } catch (error: unknown) {
      console.error('Failed to save staff schedule:', error)
      showToast({
        title: t('team.profile.scheduleEditor.saveError', 'Ошибка при сохранении'),
        description: resolveErrorMessage(error),
        variant: 'destructive'
      })
    } finally {
      setScheduleSaving(false)
    }
  }

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen pb-16">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="text-muted-foreground px-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('team.profile.back')}
          </Button>
        </div>

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
            <div className="relative mx-auto">
              <div
                className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-border"
                style={{ backgroundColor: accentColor }}
              >
                {resolvedAvatarUrl && !avatarFailed ? (
                  <img
                    src={resolvedAvatarUrl}
                    alt={fullName || staffMember.email || 'Staff avatar'}
                    className="h-full w-full object-cover"
                    onError={() => void setAvatarFailed(true)}
                  />
                ) : (
                  <span className="text-2xl font-medium text-white">
                    {initials}
                  </span>
                )}
              </div>
              {staffMember.isActive && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-success" />}
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-2xl font-medium text-foreground">{fullName}</CardTitle>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {t(`team.roles.${staffMember.role}`, staffMember.role)}
                  </Badge>
                  <Badge variant={staffMember.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {t(`team.profile.status.${staffMember.status === 'ACTIVE' ? 'active' : 'inactive'}`)}
                  </Badge>
                </div>
                <CardDescription className="mt-1 text-muted-foreground">
                  {t('team.profile.subtitle')}
                </CardDescription>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="border-0 border-t border-border bg-transparent px-0 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t('team.profile.metrics.avgTicket')}
                  </div>
                  <div className="text-lg font-medium text-foreground">{metrics.avgTicket}</div>
                </div>
                <div className="border-0 border-t border-border bg-transparent px-0 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t('team.profile.metrics.monthlyRevenue')}
                  </div>
                  <div className="text-lg font-medium text-foreground">{metrics.monthlyRevenue}</div>
                </div>
                <div className="border-0 border-t border-border bg-transparent px-0 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t('team.profile.metrics.satisfaction')}
                  </div>
                  <div className="text-lg font-medium text-success">{metrics.satisfaction}</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground/70" />
                  <span>{staffMember.email}</span>
                </div>
                {staffMember.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 text-muted-foreground/70" />
                    <span>{staffMember.phone}</span>
                  </div>
                )}
                {createdAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground/70" />
                    <span>
                      {t('team.profile.joined')} {createdAt.toLocaleDateString()}
                    </span>
                  </div>
                )}
                {tenure !== null && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4 text-muted-foreground/70" />
                    <span>
                      {tenure >= 12
                        ? t('team.profile.tenure.years', { count: Math.floor(tenure / 12) })
                        : t('team.profile.tenure.months', { count: tenure })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="mt-2">
          <TabsList className="grid w-full grid-cols-3 bg-card">
            <TabsTrigger value="overview">{t('team.profile.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="schedule">{t('team.profile.tabs.schedule')}</TabsTrigger>
            <TabsTrigger value="settings">{t('team.profile.tabs.settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-foreground">{t('team.profile.specialties', 'Экспертиза и услуги')}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">Выберите специализацию и опишите дополнительно</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Issue #82: Specialization Select */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Специализации мастера</Label>
                    <div className="space-y-2">
                      {SPECIALIZATION_OPTIONS.map((option) => {
                        const checked = formData.specializations.includes(option.value)
                        const categories = SPECIALIZATION_CATEGORY_MAPPING[option.value] || []
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => void handleSpecializationToggle(option.value)}
                            disabled={specializationsSaving}
                            className={`flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-left transition ${
                              checked ? 'border-primary text-primary bg-primary/5' : 'text-foreground hover:border-primary/40 hover:text-primary'
                            }`}
                          >
                            <div className="mr-4 flex flex-col">
                              <span className="text-sm">{option.label}</span>
                              {categories.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {categories.join(', ')}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-medium">{checked ? t('common.active') : t('common.inactive')}</span>
                          </button>
                        )
                      })}
                    </div>
                    {!formData.specializations.length && (
                      <p className="text-xs text-muted-foreground">
                        Выберите хотя бы одну специализацию, чтобы видеть рекомендуемые услуги.
                      </p>
                    )}
                  </div>

                  {/* Bio textarea */}
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm font-medium">О специалисте</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(event) => setFormData((prev) => ({ ...prev, bio: event.target.value }))}
                      placeholder={t('team.profile.bioPlaceholder')}
                      className="min-h-[120px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 2 */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-foreground">Доступные услуги</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Выбирайте услуги, которые выполняет мастер. Перечень зависит от выбранных специализаций.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assignedServiceIds.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Выбранные услуги</div>
                      <div className="flex flex-wrap gap-2">
                        {assignedServiceIds.map((serviceId) => {
                          const service = serviceLookup.get(serviceId)
                          return (
                            <Badge key={serviceId} variant="secondary">
                              {service?.name ?? serviceId}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {servicesLoading || assignedServicesLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : categorizedServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {formData.specializations.length === 0
                        ? 'Выберите специализации, чтобы увидеть рекомендуемые услуги.'
                        : 'Нет услуг, соответствующих выбранным специализациям.'}
                    </p>
                  ) : (
                    categorizedServices.map((category) => (
                      <div key={category.name} className="space-y-3">
                        <div className="text-sm font-medium text-foreground">{category.name}</div>
                        <div className="space-y-2">
                          {category.services.map((service) => {
                            const checked = assignedServiceIds.includes(service.id)
                            const isMutating = serviceMutationId === service.id
                            return (
                              <button
                                key={service.id}
                                type="button"
                                disabled={isMutating}
                                onClick={() => void handleServiceToggle(service.id, !checked)}
                                className={`flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-left transition ${
                                  checked ? 'border-primary text-primary bg-primary/5' : 'text-foreground hover:border-primary/40 hover:text-primary'
                                }`}
                              >
                                <div className="mr-4 flex flex-col">
                                  <span className="text-sm font-medium">{service.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatSalonServiceDuration(service.duration)} · {formatSalonServicePrice(service.price)}
                                  </span>
                                </div>
                                <span className="text-xs font-medium">
                                  {checked ? t('common.active') : t('common.inactive')}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Column 3 stacked */}
              <div className="space-y-6">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-medium text-foreground">{t('team.profile.languagesTitle')}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">{t('team.profile.languagesSubtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {LANGUAGE_OPTIONS.map((language) => {
                      const active = formData.spokenLanguages.includes(language.code)
                      return (
                        <button
                          key={language.code}
                          type="button"
                          onClick={() => void handleLanguageToggle(language.code)}
                          disabled={languagesSaving}
                          className={`flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-left transition ${
                            active ? 'border-primary text-primary bg-primary/5' : 'text-foreground hover:border-primary/40 hover:text-primary'
                          }`}
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <span className="text-lg">{language.flag}</span>
                            {t(`language.languages.${language.code}`)}
                          </span>
                          <span className="text-xs font-medium">
                            {active ? t('common.active') : t('common.inactive')}
                          </span>
                        </button>
                      )
                    })}
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-medium text-foreground">{t('team.profile.accessTitle')}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">{t('team.profile.accessSubtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <button
                      type="button"
                      onClick={() => void handleBookableToggle(!formData.isBookable)}
                      className={`flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-left transition ${
                        formData.isBookable ? 'border-primary text-primary bg-primary/5' : 'text-muted-foreground hover:border-primary/40 hover:text-primary'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground/70" />
                        {t('team.profile.permissions.bookable', 'Доступен для записи')}
                      </span>
                      <span className="text-xs font-medium">{formData.isBookable ? t('common.active') : t('common.inactive')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, canSeeFinances: !prev.canSeeFinances }))}
                      className={`flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-left transition ${
                        formData.canSeeFinances ? 'border-primary text-primary bg-primary/5' : 'text-muted-foreground hover:border-primary/40 hover:text-primary'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-muted-foreground/70" />
                        {t('team.profile.permissions.finances')}
                      </span>
                      <span className="text-xs font-medium">{formData.canSeeFinances ? t('common.active') : t('common.inactive')}</span>
                    </button>
                    <div className="flex items-center justify-between border border-border bg-card px-3 py-2">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4 text-muted-foreground/70" />
                        {t('team.profile.permissions.pricing')}
                      </span>
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {t('team.profile.permissions.availableSoon')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

          </TabsContent>

          <TabsContent value="schedule" className="mt-6 space-y-6">
            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">{t('team.profile.scheduleEditor.title', 'Рабочие часы мастера')}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {t('team.profile.scheduleEditor.subtitle', 'Настройте индивидуальный график или используйте часы салона.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canEditSchedule && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    {t('team.profile.scheduleEditor.readonly', 'Только владелец или сам мастер могут изменять расписание.')}
                  </div>
                )}
                {scheduleLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <WorkingHoursEditor
                    value={staffWorkingHours}
                    onChange={(next) => handleStaffWorkingHoursChange(next)}
                    disabled={!canEditSchedule || scheduleSaving}
                    idPrefix={`staff-hours-${staffMember?.id ?? 'default'}`}
                    timezone={null}
                  />
                )}
              </CardContent>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30">
                <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
                  {scheduleDirty
                    ? t('team.profile.scheduleEditor.unsaved', 'Изменения не сохранены')
                    : t('team.profile.scheduleEditor.synced', 'График синхронизирован')}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopySalonHours()}
                    disabled={!canEditSchedule || scheduleSaving}
                    className="min-h-[44px]"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {t('team.profile.scheduleEditor.copySalon', 'Скопировать часы салона')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void setStaffWorkingHours(originalStaffHours.map(item => ({ ...item })))}
                    disabled={!scheduleDirty || scheduleSaving}
                    className="min-h-[44px]"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t('team.profile.scheduleEditor.reset', 'Сбросить')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSaveStaffSchedule()}
                    disabled={!canEditSchedule || !scheduleDirty || scheduleSaving}
                    className="min-h-[44px]"
                  >
                    {scheduleSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('team.profile.scheduleEditor.save', 'Сохранить график')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base font-medium text-foreground">{t('team.profile.scheduleEditor.exceptions.title', 'Исключения и отпуска')}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {t('team.profile.scheduleEditor.exceptions.subtitle', 'Добавьте отпуск, больничный или кастомные часы.')}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {canEditSchedule && (
                  <form className="space-y-4 border border-dashed border-border p-4" onSubmit={(e) => void handleCreateException(e)}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t('team.profile.scheduleEditor.exceptions.typeLabel', 'Тип исключения')}</Label>
                        <Select
                          value={exceptionForm.type}
                          onValueChange={(value) => handleExceptionFieldChange('type', value as ScheduleExceptionType)}
                        >
                          <SelectTrigger className="rounded-none border border-border bg-card shadow-none">
                            <SelectValue placeholder={t('team.profile.scheduleEditor.exceptions.typePlaceholder', 'Выберите тип')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ScheduleExceptionType.DAY_OFF}>
                              {t('team.profile.scheduleEditor.exceptions.types.dayOff', 'Выходной/отпуск')}
                            </SelectItem>
                            <SelectItem value={ScheduleExceptionType.SICK_LEAVE}>
                              {t('team.profile.scheduleEditor.exceptions.types.sick', 'Больничный')}
                            </SelectItem>
                            <SelectItem value={ScheduleExceptionType.CUSTOM_HOURS}>
                              {t('team.profile.scheduleEditor.exceptions.types.custom', 'Кастомные часы')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('team.profile.scheduleEditor.exceptions.reasonLabel', 'Комментарий')}</Label>
                        <Input
                          value={exceptionForm.reason}
                          onChange={(event) => handleExceptionFieldChange('reason', event.target.value)}
                          placeholder={t('team.profile.scheduleEditor.exceptions.reasonPlaceholder', 'Например, отпуск или обучение')}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t('team.profile.scheduleEditor.exceptions.startDate', 'Дата начала')}</Label>
                        <Input
                          type="date"
                          value={exceptionForm.startDate}
                          onChange={(event) => handleExceptionFieldChange('startDate', event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('team.profile.scheduleEditor.exceptions.endDate', 'Дата окончания')}</Label>
                        <Input
                          type="date"
                          value={exceptionForm.endDate}
                          onChange={(event) => handleExceptionFieldChange('endDate', event.target.value)}
                          required
                        />
                      </div>
                    </div>
                    {exceptionForm.type === ScheduleExceptionType.CUSTOM_HOURS && (
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>{t('team.profile.scheduleEditor.exceptions.customStart', 'Начало')}</Label>
                          <Input
                            type="time"
                            value={exceptionForm.customStartTime}
                            onChange={(event) => handleExceptionFieldChange('customStartTime', event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('team.profile.scheduleEditor.exceptions.customEnd', 'Окончание')}</Label>
                          <Input
                            type="time"
                            value={exceptionForm.customEndTime}
                            onChange={(event) => handleExceptionFieldChange('customEndTime', event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('team.profile.scheduleEditor.exceptions.isWorkingDay', 'Рабочий день')}</Label>
                          <div className="flex items-center border border-border px-3 py-2">
                            <Switch
                              checked={exceptionForm.isWorkingDay}
                              onCheckedChange={(checked) => handleExceptionFieldChange('isWorkingDay', checked)}
                            />
                            <span className="ml-2 text-sm text-muted-foreground">
                              {exceptionForm.isWorkingDay
                                ? t('team.profile.scheduleEditor.exceptions.customWorking', 'Работает по кастомным часам')
                                : t('team.profile.scheduleEditor.exceptions.customOff', 'Занят, но без записей')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          resetExceptionForm()
                        }}
                      >
                        {t('common.cancel', 'Отмена')}
                      </Button>
                      <Button type="submit" disabled={exceptionSubmitting}>
                        {exceptionSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('team.profile.scheduleEditor.exceptions.save', 'Сохранить исключение')}
                      </Button>
                    </div>
                  </form>
                )}

                {exceptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('team.profile.scheduleEditor.exceptions.empty', 'Пока нет исключений')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {exceptions.map((exception) => (
                      <div key={exception.id} className="flex flex-col gap-2 rounded-lg border border-border/70 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {t(`team.profile.scheduleEditor.exceptions.types.${exception.type.toLowerCase()}`, exception.type)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(exception.startDate), 'dd MMM yyyy')} — {format(new Date(exception.endDate), 'dd MMM yyyy')}
                          </p>
                          {exception.customStartTime && exception.customEndTime && (
                            <p className="text-xs text-muted-foreground">
                              {exception.customStartTime} – {exception.customEndTime}
                            </p>
                          )}
                          {exception.reason && (
                            <p className="text-xs text-muted-foreground">{exception.reason}</p>
                          )}
                        </div>
                        {canEditSchedule && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="self-start md:self-auto"
                            onClick={() => void handleDeleteException(exception.id)}
                            disabled={deletingExceptionId === exception.id}
                          >
                            {deletingExceptionId === exception.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">{t('team.profile.notesTitle')}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">{t('team.profile.notesSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder={t('team.profile.notesPlaceholder')}
                  className="min-h-[120px]"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">{t('team.profile.appearanceTitle')}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">{t('team.profile.appearanceSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>{t('team.profile.colorLabel')}</Label>
                <div className="flex flex-wrap gap-2">
                  {STAFF_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`h-10 w-10 rounded-full border-2 ${formData.color === color.value ? 'border-primary' : 'border-transparent'}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData((prev) => ({ ...prev, color: color.value }))}
                      aria-label={t(`team.profile.colorOptions.${color.labelKey}`)}
                    />
                  ))}
                </div>
                <Input
                  value={formData.color}
                  onChange={(event) => setFormData((prev) => ({ ...prev, color: event.target.value }))}
                />
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">{t('team.profile.currencyTitle')}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">{t('team.profile.currencySubtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Select value={currency} onValueChange={changeCurrency}>
                  <SelectTrigger className="w-full rounded-none border border-border bg-card shadow-none sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedCurrencies.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.flag} {item.code} — {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {t('team.profile.currencyHint')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  )
}
