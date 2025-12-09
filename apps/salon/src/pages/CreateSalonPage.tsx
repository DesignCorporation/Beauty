import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  PageContainer,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Checkbox,
  Badge
} from '@beauty-platform/ui'
import {
  ArrowLeft,
  CheckCircle2,
  Globe,
  Loader2,
  MapPin,
  PawPrint,
  Scissors,
  Sparkles,
  Syringe,
  Waves,
  ShieldCheck,
  Minus,
  Plus,
  Info
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  detectUserCountry,
  getAllCountries,
  CountryInfo,
  COUNTRIES,
  formatPhoneWithCountryCode
} from '../utils/country-detection'
import { useAuthContext } from '../contexts/AuthContext'
import apiClient from '../utils/api-client'
import { sdkClient } from '../services/sdkClient'
import { getStoredLanguagePreference } from '../i18n/preferences'

type SalonTypeOption = {
  id: string
  salonType: string
  label: string
  description: string
  icon?: string | null
  defaultCategories: number
  defaultServices: number
}

type ServicePreset = {
  key: string
  selectionKey: string
  name: string
  price: number
  duration: number
  default: boolean
  categoryName: string
  subcategoryName: string
}

type ServicePresetCategory = {
  id: string
  name: string
  icon: string | null
  services: ServicePreset[]
}

type OwnerSalonResponse = {
  success: boolean
  message?: string
  error?: string
  code?: string
  data?: {
    salon?: { name?: string | null }
    redirectUrl?: string
  }
}

type TeamSizeOption = 'solo' | 'small' | 'medium' | 'large'

type PlanType = 'starter' | 'team' | 'business' | 'enterprise'

type Currency = 'PLN' | 'EUR' | 'USD' | 'UAH'

type Language = 'en' | 'pl' | 'ua' | 'ru'

const BASE_SALON_PRICE_PLN = 50
const STAFF_MEMBER_PRICE_PLN = 25
const VAT_PERCENTAGE_PL = 23
const STAFF_SEATS_MIN = 0
const STAFF_SEATS_MAX = 50

const mapStaffSeatsToTeamSize = (count: number): TeamSizeOption => {
  if (count <= 0) return 'solo'
  if (count <= 4) return 'small'
  if (count <= 15) return 'medium'
  return 'large'
}

const clampStaffSeats = (value: number) => {
  if (Number.isNaN(value)) return STAFF_SEATS_MIN
  return Math.max(STAFF_SEATS_MIN, Math.min(STAFF_SEATS_MAX, value))
}

const normalizeVatNumber = (input: string): string => input.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

const isValidVatNumber = (input: string): boolean => {
  const normalized = normalizeVatNumber(input)
  if (!normalized) return false
  return /^\d{10}$/.test(normalized) || /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(normalized)
}

const formatAddressLine = (street: string, building: string, apartment: string): string | undefined => {
  const streetValue = street.trim()
  const buildingValue = building.trim()
  const apartmentValue = apartment.trim()

  if (!streetValue && !buildingValue) {
    return undefined
  }

  let line = streetValue
  if (buildingValue) {
    line = line ? `${line} ${buildingValue}` : buildingValue
    if (apartmentValue) {
      line = `${line}/${apartmentValue}`
    }
  }

  return line || undefined
}

const prefixedWebsiteUrl = (input: string): string | null => {
  const trimmed = input.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const isValidUrl = (value: string): boolean => {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

type BusinessType =
  | 'salon'
  | 'mobile'
  | 'home'
  | 'online'
  | 'hair_salon'
  | 'nail_salon'
  | 'massage_spa'
  | 'barbershop'
  | 'pet_grooming'
  | 'wellness'
  | 'cosmetology'
  | 'brow_lash'
  | 'custom'

interface CreateSalonFormState {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  phone: string
  language: Language
  salonName: string
  website: string
  country: string
  currency: Currency
  salonStreet: string
  salonBuildingNumber: string
  salonApartmentNumber: string
  salonCity: string
  salonPostalCode: string
  teamSize: TeamSizeOption
  staffSeats: number
  planType: PlanType
  trialPeriod: boolean
  businessType: BusinessType
  salonType: string
  serviceCategories: string[]
  selectedServiceKeys: string[]
  billingCompanyName: string
  billingVatId: string
  billingUseSalonAddress: boolean
  billingAddressStreet: string
  billingAddressBuildingNumber: string
  billingAddressApartmentNumber: string
  billingAddressCity: string
  billingAddressPostalCode: string
  billingCountry: string
  acceptTerms: boolean
  subscribeNewsletter: boolean
}

type FormErrors = Partial<Record<keyof CreateSalonFormState | 'salonTypes', string>>

const SALON_TYPE_ICON_MAP: Record<string, LucideIcon> = {
  HAIR_SALON: Scissors,
  BARBERSHOP: Scissors,
  NAIL_SALON: Sparkles,
  MASSAGE_SPA: Waves,
  PET_GROOMING: PawPrint,
  WELLNESS_CENTER: Sparkles,
  BEAUTY_CLINIC: Syringe,
  BROW_LASH_STUDIO: Sparkles,
  CUSTOM: Sparkles,
  MIXED: Sparkles
}

const BUSINESS_TYPE_BY_SALON_TYPE: Record<string, BusinessType> = {
  HAIR_SALON: 'hair_salon',
  BARBERSHOP: 'barbershop',
  NAIL_SALON: 'nail_salon',
  MASSAGE_SPA: 'massage_spa',
  PET_GROOMING: 'pet_grooming',
  WELLNESS_CENTER: 'wellness',
  BEAUTY_CLINIC: 'cosmetology',
  BROW_LASH_STUDIO: 'brow_lash'
}

const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  return b.every(item => setA.has(item))
}

const CreateSalonPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, refetch, refreshAuth } = useAuthContext()
  const hasAccountPassword = user?.hasPassword ?? true
  const requiresPasswordSetup = !hasAccountPassword

  const [form, setForm] = useState<CreateSalonFormState>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    password: '',
    confirmPassword: '',
    phone: user?.phone ?? '',
    language: (i18n.language as Language) || 'en',
    salonName: '',
    website: '',
    country: 'PL',
    currency: 'PLN',
    salonStreet: '',
    salonBuildingNumber: '',
    salonApartmentNumber: '',
    salonCity: '',
    salonPostalCode: '',
    teamSize: 'solo',
    staffSeats: 0,
    planType: 'starter',
    trialPeriod: true,
    businessType: 'custom',
    salonType: '',
    serviceCategories: [],
    selectedServiceKeys: [],
    billingCompanyName: '',
    billingVatId: '',
    billingUseSalonAddress: true,
    billingAddressStreet: '',
    billingAddressBuildingNumber: '',
    billingAddressApartmentNumber: '',
    billingAddressCity: '',
    billingAddressPostalCode: '',
    billingCountry: 'PL',
    acceptTerms: false,
    subscribeNewsletter: true
  })

  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null)
  const [salonTypes, setSalonTypes] = useState<SalonTypeOption[]>([])
  const [salonTypesLoading, setSalonTypesLoading] = useState<boolean>(false)
  const [salonTypesError, setSalonTypesError] = useState<string | null>(null)
  const [selectedSalonTypes, setSelectedSalonTypes] = useState<string[]>([])
  const [selectedServiceKeys, setSelectedServiceKeys] = useState<string[]>([])
  const [presetCache, setPresetCache] = useState<Record<string, ServicePresetCategory[]>>({})
  const [presetLoadingState, setPresetLoadingState] = useState<Record<string, boolean>>({})
  const [presetErrors, setPresetErrors] = useState<Record<string, string | null>>({})
  const selectionKeyMap = useMemo(() => {
    const map = new Map<string, string>()
    Object.values(presetCache).forEach(categories => {
      categories?.forEach(category => {
        category.services.forEach(service => {
          map.set(service.selectionKey, service.key)
        })
      })
    })
    return map
  }, [presetCache])
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const pendingDefaultsRef = useRef<Set<string>>(new Set())

  const countries = useMemo(() => getAllCountries(), [])
  const plnFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    []
  )
  const staffCost = useMemo(() => form.staffSeats * STAFF_MEMBER_PRICE_PLN, [form.staffSeats])
  const totalCost = useMemo(() => BASE_SALON_PRICE_PLN + staffCost, [staffCost])
  const totalCostWithVat = useMemo(
    () => totalCost * (1 + VAT_PERCENTAGE_PL / 100),
    [totalCost]
  )

  const handleFormUpdate = useCallback(
    (patch: Partial<CreateSalonFormState>) => {
      setForm(prev => ({ ...prev, ...patch }))
    },
    []
  )

  const handleStaffSeatsChange = useCallback(
    (nextValue: number) => {
      const clamped = clampStaffSeats(nextValue)
      handleFormUpdate({
        staffSeats: clamped,
        teamSize: mapStaffSeatsToTeamSize(clamped)
      })
    },
    [handleFormUpdate]
  )

  useEffect(() => {
    let isMounted = true
    const detect = async () => {
      try {
        const info = await detectUserCountry()
        const storedLanguage = getStoredLanguagePreference()
        const shouldSyncLanguage = !storedLanguage
        if (!isMounted) return
        setCountryInfo(info)
        const nextPatch: Partial<CreateSalonFormState> = {
          country: info.code,
          currency: info.currency,
          phone: form.phone ? form.phone : `${info.phoneCode} `
        }
        nextPatch.billingCountry = info.code

        if (shouldSyncLanguage) {
          nextPatch.language = info.language
        }

        handleFormUpdate(nextPatch)

        if (shouldSyncLanguage) {
          void i18n.changeLanguage(info.language)
        }
      } catch (error) {
        console.warn('Failed to auto-detect country for onboarding:', error)
      }
    }
    void detect()
    return () => {
      isMounted = false
    }
  }, [handleFormUpdate, i18n, form.phone])

  useEffect(() => {
    const loadSalonTypes = async () => {
      setSalonTypesLoading(true)
      setSalonTypesError(null)
      try {
        const payload = await sdkClient.get<{ salonTypes: SalonTypeOption[] }>('/salon-types')
        setSalonTypes(payload.salonTypes ?? [])
      } catch (error) {
        console.error('CreateSalon: failed to load salon types', error)
        setSalonTypesError(t('createSalon.errors.salonTypes', 'Не удалось загрузить направления салона'))
      } finally {
        setSalonTypesLoading(false)
      }
    }
    void loadSalonTypes()
  }, [t])

  const fetchPreset = useCallback(
    async (typeId: string) => {
      setPresetLoadingState(prev => ({ ...prev, [typeId]: true }))
      setPresetErrors(prev => ({ ...prev, [typeId]: null }))
      try {
        const payload = await sdkClient.get<{ categories: ServicePresetCategory[] }>(`/crm/service-presets/${encodeURIComponent(typeId)}`)
        const categories: ServicePresetCategory[] = payload.categories ?? []

        setPresetCache(prev => ({ ...prev, [typeId]: categories }))

        if (pendingDefaultsRef.current.has(typeId)) {
          setSelectedServiceKeys(prevKeys => {
            const next = new Set(prevKeys)
            categories.forEach(category => {
              category.services.forEach(service => {
                if (service.default) {
                  next.add(service.selectionKey)
                }
              })
            })
            return Array.from(next)
          })
          pendingDefaultsRef.current.delete(typeId)
        }
      } catch (error) {
        console.error('CreateSalon: failed to load service presets', error)
        setPresetErrors(prev => ({
          ...prev,
          [typeId]: t('createSalon.errors.servicePresets', 'Не удалось загрузить список услуг')
        }))
      } finally {
        setPresetLoadingState(prev => ({ ...prev, [typeId]: false }))
      }
    },
    [t]
  )

  useEffect(() => {
    selectedSalonTypes.forEach(typeId => {
      if (!presetCache[typeId] && !presetLoadingState[typeId]) {
        void fetchPreset(typeId)
      }
    })
  }, [selectedSalonTypes, presetCache, presetLoadingState, fetchPreset])

  useEffect(() => {
    const primaryTypeId =
      selectedSalonTypes.length === 1 ? selectedSalonTypes[0] ?? null : null

    const nextSalonType =
      selectedSalonTypes.length === 0 ? '' : primaryTypeId ?? 'CUSTOM'

    const businessType =
      primaryTypeId ? BUSINESS_TYPE_BY_SALON_TYPE[primaryTypeId] ?? 'custom' : 'custom'

    setForm(prev => {
      if (prev.salonType === nextSalonType && prev.businessType === businessType) {
        return prev
      }
      return { ...prev, salonType: nextSalonType, businessType }
    })
  }, [selectedSalonTypes])

  useEffect(() => {
    if (!selectedSalonTypes.length) {
      if (selectedServiceKeys.length) {
        setSelectedServiceKeys([])
      }
      setForm(prev => {
        if (!prev.serviceCategories.length && !prev.selectedServiceKeys.length) {
          return prev
        }
        return {
          ...prev,
          serviceCategories: [] as string[],
          selectedServiceKeys: [] as string[]
        }
      })
      return
    }

    const selectedKeysSet = new Set(selectedServiceKeys)
    const categoriesSet = new Set<string>()

    selectedSalonTypes.forEach(typeId => {
      const categories = presetCache[typeId]
      if (!categories) return
      categories.forEach(category => {
        const hasSelectedService = category.services.some(service => selectedKeysSet.has(service.selectionKey))
        if (hasSelectedService) {
          categoriesSet.add(category.name)
        }
      })
    })

    const nextCategories = Array.from(categoriesSet)

    setForm(prev => {
      const needsUpdate =
        !arraysEqual(prev.serviceCategories, nextCategories) ||
        !arraysEqual(prev.selectedServiceKeys, selectedServiceKeys)

      if (!needsUpdate) return prev
      return {
        ...prev,
        serviceCategories: nextCategories,
        selectedServiceKeys
      }
    })
  }, [selectedServiceKeys, selectedSalonTypes, presetCache])

  const combinedCategoryBlocks = useMemo(() => {
    return selectedSalonTypes
      .map(typeId => ({
        typeId,
        type: salonTypes.find(option => option.id === typeId),
        categories: presetCache[typeId] ?? []
      }))
      .filter(item => item.categories.length > 0)
  }, [selectedSalonTypes, salonTypes, presetCache])

  const handleToggleSalonType = (typeId: string) => {
    setErrors(prev => {
      const { salonTypes: _salonTypes, ...rest } = prev
      return rest
    })
    setSelectedSalonTypes(prev => {
      if (prev.includes(typeId)) {
        const next = prev.filter(id => id !== typeId)
        setSelectedServiceKeys(prevKeys => {
          const nextKeys = new Set(prevKeys)
          const categories = presetCache[typeId] ?? []
          categories.forEach(category => {
            category.services.forEach(service => {
              nextKeys.delete(service.selectionKey)
            })
          })
          return Array.from(nextKeys)
        })
        if (next.length === 0) {
          pendingDefaultsRef.current.clear()
        } else {
          pendingDefaultsRef.current.delete(typeId)
        }
        return next
      }
      pendingDefaultsRef.current.add(typeId)
      return [...prev, typeId]
    })
  }

  const handleToggleService = (selectionKey: string) => {
    setSelectedServiceKeys(prev => {
      if (prev.includes(selectionKey)) {
        return prev.filter(key => key !== selectionKey)
      }
      return [...prev, selectionKey]
    })
  }

  const validate = (): boolean => {
    const nextErrors: FormErrors = {}

    if (form.website.trim()) {
      const normalizedWebsite = prefixedWebsiteUrl(form.website)
      if (!normalizedWebsite || !isValidUrl(normalizedWebsite)) {
        nextErrors.website = t(
          'createSalon.validation.website',
          'Введите корректный URL (например, https://example.com)'
        )
      }
    }

    if (!form.salonStreet.trim()) {
      nextErrors.salonStreet = t('createSalon.validation.salonStreet', 'Укажите улицу салона')
    }
    if (!form.salonBuildingNumber.trim()) {
      nextErrors.salonBuildingNumber = t('createSalon.validation.salonBuildingNumber', 'Укажите номер здания')
    }
    if (!form.salonPostalCode.trim()) {
      nextErrors.salonPostalCode = t('createSalon.validation.salonPostalCode', 'Укажите почтовый код')
    }
    if (!form.salonCity.trim()) {
      nextErrors.salonCity = t('createSalon.validation.salonCity', 'Укажите город салона')
    }

    if (!form.billingCompanyName.trim()) {
      nextErrors.billingCompanyName = t(
        'createSalon.validation.billingCompanyName',
        'Название компании для фактур обязательно'
      )
    }

    if (!form.billingVatId.trim()) {
      nextErrors.billingVatId = t('createSalon.validation.billingVatId', 'Укажите NIP/VAT компании')
    } else if (!isValidVatNumber(form.billingVatId)) {
      nextErrors.billingVatId = t(
        'createSalon.validation.billingVatIdFormat',
        'Некорректный формат NIP/VAT. Пример: 1234567890 или PL1234567890'
      )
    }

    if (!form.billingUseSalonAddress) {
      if (!form.billingAddressStreet.trim()) {
        nextErrors.billingAddressStreet = t(
          'createSalon.validation.billingStreet',
          'Введите улицу для адреса фактур'
        )
      }
      if (!form.billingAddressBuildingNumber.trim()) {
        nextErrors.billingAddressBuildingNumber = t(
          'createSalon.validation.billingBuildingNumber',
          'Введите номер здания для фактур'
        )
      }
      if (!form.billingAddressPostalCode.trim()) {
        nextErrors.billingAddressPostalCode = t(
          'createSalon.validation.billingPostalCode',
          'Введите почтовый код для фактур'
        )
      }
      if (!form.billingAddressCity.trim()) {
        nextErrors.billingAddressCity = t(
          'createSalon.validation.billingCity',
          'Введите город для фактур'
        )
      }
      if (!form.billingCountry.trim()) {
        nextErrors.billingCountry = t(
          'createSalon.validation.billingCountry',
          'Выберите страну для адреса фактур'
        )
      }
    }

    if (!form.firstName.trim()) {
      nextErrors.firstName = t('registration.validation.firstNameRequired', 'Имя обязательно')
    }
    if (!form.lastName.trim()) {
      nextErrors.lastName = t('registration.validation.lastNameRequired', 'Фамилия обязательна')
    }
    if (!form.phone.trim()) {
      nextErrors.phone = t('registration.validation.phoneRequired', 'Телефон обязателен')
    }
    if (requiresPasswordSetup) {
      if (!form.password.trim()) {
        nextErrors.password =
          t('createSalon.validation.newPassword', 'Придумайте пароль для аккаунта (минимум 8 символов)')
      } else if (form.password.length < 8) {
        nextErrors.password =
          t('createSalon.validation.passwordLength', 'Пароль должен содержать минимум 8 символов')
      }

      if (!form.confirmPassword.trim()) {
        nextErrors.confirmPassword = t('createSalon.validation.confirmPassword', 'Подтвердите пароль')
      } else if (form.confirmPassword !== form.password) {
        nextErrors.confirmPassword = t('createSalon.validation.confirmPasswordMismatch', 'Пароли не совпадают')
      }
    } else if (!form.password.trim()) {
      nextErrors.password =
        t('createSalon.validation.password', 'Введите пароль от вашего аккаунта')
    }
    if (!form.salonName.trim()) {
      nextErrors.salonName = t('registration.validation.salonNameRequired', 'Название салона обязательно')
    }
    if (!selectedSalonTypes.length) {
      nextErrors.salonTypes = t('createSalon.validation.salonTypes', 'Выберите хотя бы одно направление')
    }
    if (!form.acceptTerms) {
      nextErrors.acceptTerms = t('registration.validation.termsRequired', 'Необходимо принять условия использования')
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) {
      toast.error(t('createSalon.notifications.validationError', 'Проверьте форму и исправьте ошибки'))
      return
    }

    setIsSubmitting(true)

    try {
      const normalizedVatId = normalizeVatNumber(form.billingVatId)
      const normalizedWebsite = prefixedWebsiteUrl(form.website)
      const salonAddressLine = formatAddressLine(
        form.salonStreet,
        form.salonBuildingNumber,
        form.salonApartmentNumber
      )
      const billingAddressLine = formatAddressLine(
        form.billingAddressStreet,
        form.billingAddressBuildingNumber,
        form.billingAddressApartmentNumber
      )
      const billingCountryValue = form.billingUseSalonAddress ? form.country : form.billingCountry
      const billingAddress = form.billingUseSalonAddress
        ? {
            street: salonAddressLine ?? '',
            city: form.salonCity.trim(),
            postalCode: form.salonPostalCode.trim(),
            country: billingCountryValue
          }
        : {
            street: billingAddressLine ?? '',
            city: form.billingAddressCity.trim(),
            postalCode: form.billingAddressPostalCode.trim(),
            country: billingCountryValue
          }

      const activeSelectionKeys = selectedServiceKeys.length ? selectedServiceKeys : form.selectedServiceKeys
      const normalizedServiceKeys = Array.from(
        new Set(
          activeSelectionKeys
            .map(key => {
              const mapped = selectionKeyMap.get(key)
              if (!mapped) {
                console.warn('CreateSalon: service selection key not found in presets', key)
              }
              return (mapped ?? key)?.trim()
            })
            .filter((value): value is string => Boolean(value))
        )
      )

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email,
        password: form.password,
        phone: countryInfo ? formatPhoneWithCountryCode(form.phone, countryInfo) : form.phone,
        language: form.language,
        salonName: form.salonName.trim(),
        website: normalizedWebsite ?? '',
        businessType: form.businessType,
        salonType: form.salonType || 'CUSTOM',
        country: form.country,
        currency: form.currency,
        staffSeats: form.staffSeats,
        address: {
          street: salonAddressLine ?? '',
          city: form.salonCity.trim(),
          postalCode: form.salonPostalCode.trim(),
          country: form.country
        },
        serviceCategories: form.serviceCategories,
        selectedServiceKeys: normalizedServiceKeys,
        selectedSalonTypes,
        customServices: [],
        teamSize: form.teamSize,
        planType: form.planType,
        trialPeriod: form.trialPeriod,
        estimatedMonthlyNetPricePln: totalCost,
        acceptTerms: true,
        subscribeNewsletter: form.subscribeNewsletter,
        billing: {
          companyName: form.billingCompanyName.trim(),
          vatId: normalizedVatId,
          useSalonAddress: form.billingUseSalonAddress,
          address: billingAddress
        }
      }

      const response = await apiClient.post<OwnerSalonResponse>('/auth/owner/salons', payload)

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to create salon')
      }

      toast.success(
        t('registration.activation.successAuthenticated', 'Салон успешно создан'),
        {
          description: response?.data?.salon?.name ?? undefined,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        }
      )

      // Обновляем токены, чтобы подхватить tenantId в клеймах
      try {
        await refreshAuth()
      } catch (refreshError) {
        console.warn('CreateSalon: refreshAuth failed after creation', refreshError)
      }

      // Запускаем триал подписки (не блокирует онбординг при ошибке)
      try {
        await sdkClient.post('/payments/subscriptions/start-trial', {
          staffSeats: form.staffSeats || 0,
          plan: 'BASIC'
        })
      } catch (trialError) {
        console.warn('CreateSalon: start-trial failed (non-blocking)', trialError)
      }

      await refetch(true, true)
      void navigate('/dashboard', { replace: true })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('createSalon.notifications.genericError', 'Не удалось создать салон')
      toast.error(message)
      console.error('CreateSalon: failed to submit form', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedKeysSet = useMemo(() => new Set(selectedServiceKeys), [selectedServiceKeys])

  const handleCountryChange = (code: string) => {
    const info = COUNTRIES[code] ?? null
    const storedLanguage = getStoredLanguagePreference()
    const shouldSyncLanguage = !storedLanguage
    setCountryInfo(info)
    const nextPatch: Partial<CreateSalonFormState> = {
      country: code,
      currency: info?.currency ?? form.currency
    }
    if (form.billingUseSalonAddress) {
      nextPatch.billingCountry = code
    }

    if (info?.language && shouldSyncLanguage) {
      nextPatch.language = info.language
    }

    handleFormUpdate(nextPatch)

    if (info && shouldSyncLanguage) {
      void i18n.changeLanguage(info.language)
    }
  }

  return (
    <PageContainer variant="full-width" className="min-h-screen bg-muted/40 py-10">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" onClick={() => void navigate('/dashboard')} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t('createSalon.actions.back', 'Вернуться на дашборд')}
          </Button>
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            {t('createSalon.badge', 'Новый мастер регистрации')}
          </Badge>
        </div>

        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            {t('createSalon.title', 'Создайте салон за пару минут')}
          </h1>
          <p className="text-muted-foreground">
            {t(
              'createSalon.subtitle',
              'Мы используем данные вашего аккаунта клиента. Добавьте информацию о салоне и выберите направления — система подготовит готовые услуги и категории.'
            )}
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('createSalon.sections.owner.title', 'Владелец салона')}</CardTitle>
                <CardDescription>
                  {t('createSalon.sections.owner.subtitle', 'Эти данные обновят ваш профиль и будут отображаться в CRM.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="firstName">{t('registration.owner.firstName', 'Имя')}</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={event => handleFormUpdate({ firstName: event.target.value })}
                    className={errors.firstName ? 'border-destructive' : undefined}
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-destructive">{errors.firstName}</p>}
                </div>

                <div>
                  <Label htmlFor="lastName">{t('registration.owner.lastName', 'Фамилия')}</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={event => handleFormUpdate({ lastName: event.target.value })}
                    className={errors.lastName ? 'border-destructive' : undefined}
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-destructive">{errors.lastName}</p>}
                </div>

                <div>
                  <Label htmlFor="email">{t('registration.owner.email', 'Email')}</Label>
                  <Input id="email" value={form.email} readOnly className="bg-muted" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      'registration.owner.emailNoteAuthenticated',
                      'Email привязан к вашему аккаунту и не может быть изменён'
                    )}
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">{t('registration.owner.phone', 'Телефон')}</Label>
                  <Input
                    id="phone"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={event => handleFormUpdate({ phone: event.target.value })}
                    className={errors.phone ? 'border-destructive' : undefined}
                  />
                  {errors.phone && <p className="mt-1 text-sm text-destructive">{errors.phone}</p>}
                </div>

                {requiresPasswordSetup ? (
                  <>
                    <div>
                      <Label htmlFor="password">{t('createSalon.fields.newPassword', 'Создайте пароль для аккаунта')}</Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={event => handleFormUpdate({ password: event.target.value })}
                        className={errors.password ? 'border-destructive' : undefined}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(
                          'createSalon.hints.newPassword',
                          'Пароль понадобится для входа и подтверждения действий. Минимум 8 символов.'
                        )}
                      </p>
                      {errors.password && (
                        <p className="mt-1 text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">{t('createSalon.fields.confirmPassword', 'Подтвердите пароль')}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        value={form.confirmPassword}
                        onChange={event => handleFormUpdate({ confirmPassword: event.target.value })}
                        className={errors.confirmPassword ? 'border-destructive' : undefined}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(
                          'createSalon.hints.confirmPassword',
                          'Повторите пароль, чтобы исключить опечатки.'
                        )}
                      </p>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-destructive">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div>
                    <Label htmlFor="password">{t('createSalon.fields.accountPassword', 'Пароль аккаунта')}</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={form.password}
                      onChange={event => handleFormUpdate({ password: event.target.value })}
                      className={errors.password ? 'border-destructive' : undefined}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(
                        'createSalon.hints.password',
                        'Введите текущий пароль, чтобы подтвердить создание салона.'
                      )}
                    </p>
                    {errors.password && (
                      <p className="mt-1 text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('createSalon.sections.salon.title', 'Информация о салоне')}</CardTitle>
                <CardDescription>
                  {t(
                    'createSalon.sections.salon.subtitle',
                    'Название и страна помогут нам настроить валюту и локализацию тарифов.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="salonName">{t('registration.salon.name', 'Название салона')}</Label>
                  <Input
                    id="salonName"
                    value={form.salonName}
                    onChange={event => handleFormUpdate({ salonName: event.target.value })}
                    className={errors.salonName ? 'border-destructive' : undefined}
                  />
                  {errors.salonName && <p className="mt-1 text-sm text-destructive">{errors.salonName}</p>}
                </div>

                <div>
                  <Label htmlFor="website">{t('registration.salon.website', 'Сайт или Instagram')}</Label>
                  <Input
                    id="website"
                    placeholder="https://..."
                    value={form.website}
                    onChange={event => handleFormUpdate({ website: event.target.value })}
                    className={errors.website ? 'border-destructive' : undefined}
                  />
                  {errors.website && <p className="mt-1 text-sm text-destructive">{errors.website}</p>}
                </div>

                <hr className="my-4 border-border" />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="country" className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {t('createSalon.fields.country', 'Страна')}
                    </Label>
                    <select
                      id="country"
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={form.country}
                      onChange={event => handleCountryChange(event.target.value)}
                    >
                      {countries.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="currency" className="flex items-center gap-1">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      {t('createSalon.fields.currency', 'Валюта')}
                    </Label>
                    <select
                      id="currency"
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={form.currency ?? 'PLN'}
                      onChange={event => handleFormUpdate({ currency: event.target.value as Currency })}
                    >
                      <option value="EUR">EUR</option>
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="UAH">UAH</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div>
                      <Label className="font-semibold">{t('createSalon.pricing.title', 'Подписка и команда')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          'createSalon.pricing.subtitle',
                          'Базовый салон + сотрудники. Оплата только после бесплатного периода.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>{t('createSalon.pricing.staffCountLabel', 'Сотрудники')}</Label>
                        <Badge variant="secondary" className="text-xs font-semibold uppercase">
                          {t('createSalon.pricing.trialBadge', '7 дней бесплатно')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          'createSalon.pricing.staffCountHint',
                          '0 — работаю сам. Каждый сотрудник +25 PLN нетто в месяц.'
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => void handleStaffSeatsChange(form.staffSeats - 1)}
                            disabled={form.staffSeats <= STAFF_SEATS_MIN}
                            aria-label={t('createSalon.pricing.decreaseStaff', 'Уменьшить количество сотрудников')}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="min-w-[60px] text-center text-2xl font-semibold text-foreground">
                            {form.staffSeats}
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => void handleStaffSeatsChange(form.staffSeats + 1)}
                            disabled={form.staffSeats >= STAFF_SEATS_MAX}
                            aria-label={t('createSalon.pricing.increaseStaff', 'Увеличить количество сотрудников')}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {form.staffSeats === 0
                            ? t('createSalon.pricing.staffSoloLabel', 'Владелец работает сам (SOLO)')
                            : t('createSalon.pricing.staffValueLabel', {
                                count: form.staffSeats
                              })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-background p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t('createSalon.pricing.baseLabel', 'Подписка на салон')}
                        </span>
                        <span className="font-medium text-foreground">
                          {plnFormatter.format(BASE_SALON_PRICE_PLN)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t('createSalon.pricing.staffLabel', 'Сотрудники')}
                        </span>
                        <span className="font-medium text-foreground">
                          {plnFormatter.format(staffCost)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/70 pt-3 text-sm font-semibold text-foreground">
                        <span>{t('createSalon.pricing.totalLabel', 'Сумма после trial')}</span>
                        <span>{plnFormatter.format(totalCost)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {t('createSalon.pricing.totalWithVatLabel', 'Итого с VAT (23%)')}
                        </span>
                        <span className="font-medium text-foreground">
                          {plnFormatter.format(totalCostWithVat)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('createSalon.pricing.vatNotice', 'Цены нетто. VAT 23% добавится при оплате в Stripe.')}
                      </p>
                    </div>

                    <div className="rounded-lg border border-muted/60 bg-background/80 p-3 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p>{t('createSalon.pricing.trialDescription', 'Мы напомним об оплате за 3 дня до конца триала.')}</p>
                          <p className="mt-1">
                            {t(
                              'createSalon.pricing.staffInfo',
                              'Добавляйте сотрудников позже в разделе «Команда» — стоимость обновится автоматически.'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('createSalon.sections.address.title', 'Адрес салона')}</CardTitle>
                <CardDescription>
                  {t(
                    'createSalon.sections.address.subtitle',
                    'Эти данные будут отображаться в клиентских страницах и на карте. Заполните фактическое местоположение салона.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="salonStreet">{t('createSalon.fields.street', 'Улица')}</Label>
                  <Input
                    id="salonStreet"
                    autoComplete="address-line1"
                    value={form.salonStreet}
                    onChange={event => handleFormUpdate({ salonStreet: event.target.value })}
                    className={errors.salonStreet ? 'border-destructive' : undefined}
                  />
                  {errors.salonStreet && <p className="mt-1 text-sm text-destructive">{errors.salonStreet}</p>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="salonBuildingNumber">
                      {t('createSalon.fields.buildingNumber', 'Номер дома/корпуса')}
                    </Label>
                    <Input
                      id="salonBuildingNumber"
                      autoComplete="address-line2"
                      value={form.salonBuildingNumber}
                      onChange={event => handleFormUpdate({ salonBuildingNumber: event.target.value })}
                      className={errors.salonBuildingNumber ? 'border-destructive' : undefined}
                    />
                    {errors.salonBuildingNumber && (
                      <p className="mt-1 text-sm text-destructive">{errors.salonBuildingNumber}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="salonApartmentNumber">
                      {t('createSalon.fields.apartmentNumber', 'Офис/помещение (необязательно)')}
                    </Label>
                    <Input
                      id="salonApartmentNumber"
                      value={form.salonApartmentNumber}
                      onChange={event => handleFormUpdate({ salonApartmentNumber: event.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="salonPostalCode">{t('createSalon.fields.postalCode', 'Почтовый код')}</Label>
                    <Input
                      id="salonPostalCode"
                      autoComplete="postal-code"
                      value={form.salonPostalCode}
                      onChange={event => handleFormUpdate({ salonPostalCode: event.target.value })}
                      className={errors.salonPostalCode ? 'border-destructive' : undefined}
                    />
                    {errors.salonPostalCode && (
                      <p className="mt-1 text-sm text-destructive">{errors.salonPostalCode}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="salonCity">{t('createSalon.fields.city', 'Город')}</Label>
                    <Input
                      id="salonCity"
                      autoComplete="address-level2"
                      value={form.salonCity}
                      onChange={event => handleFormUpdate({ salonCity: event.target.value })}
                      className={errors.salonCity ? 'border-destructive' : undefined}
                    />
                    {errors.salonCity && <p className="mt-1 text-sm text-destructive">{errors.salonCity}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'createSalon.sections.address.hint',
                    'Эти данные будут использоваться на картах и в клиентах. При необходимости их можно изменить позже в настройках салона.'
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('createSalon.sections.billing.title', 'Информация для фактур')}</CardTitle>
                <CardDescription>
                  {t(
                    'createSalon.sections.billing.subtitle',
                    'Название компании и NIP/VAT нужны для автоматической генерации счетов и передачи данных в платежный сервис.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="billingCompanyName">
                    {t('createSalon.fields.billingCompanyName', 'Название компании')}
                  </Label>
                  <Input
                    id="billingCompanyName"
                    autoComplete="organization"
                    value={form.billingCompanyName}
                    onChange={event => handleFormUpdate({ billingCompanyName: event.target.value })}
                    className={errors.billingCompanyName ? 'border-destructive' : undefined}
                  />
                  {errors.billingCompanyName && (
                    <p className="mt-1 text-sm text-destructive">{errors.billingCompanyName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="billingVatId">{t('createSalon.fields.billingVatId', 'NIP / VAT')}</Label>
                  <Input
                    id="billingVatId"
                    autoComplete="tax-id"
                    value={form.billingVatId}
                    onChange={event => handleFormUpdate({ billingVatId: event.target.value })}
                    className={errors.billingVatId ? 'border-destructive' : undefined}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      'createSalon.sections.billing.vatHint',
                      'Введите 10 цифр польского NIP или европейский формат (например, PL1234567890).'
                    )}
                  </p>
                  {errors.billingVatId && <p className="mt-1 text-sm text-destructive">{errors.billingVatId}</p>}
                </div>

                <label className="flex items-start gap-3 rounded-md border border-border/60 px-4 py-3">
                  <Checkbox
                    checked={form.billingUseSalonAddress}
                    onCheckedChange={checked => handleFormUpdate({ billingUseSalonAddress: Boolean(checked) })}
                  />
                  <span className="text-sm text-foreground">
                    {t(
                      'createSalon.sections.billing.useSalonAddress',
                      'Использовать адрес салона для фактур'
                    )}
                  </span>
                </label>

                {!form.billingUseSalonAddress && (
                  <div className="space-y-4 rounded-md border border-border/60 bg-muted/20 p-4">
                    <div>
                      <Label htmlFor="billingAddressStreet">
                        {t('createSalon.fields.billingStreet', 'Улица (юридический адрес)')}
                      </Label>
                      <Input
                        id="billingAddressStreet"
                        value={form.billingAddressStreet}
                        onChange={event => handleFormUpdate({ billingAddressStreet: event.target.value })}
                        className={errors.billingAddressStreet ? 'border-destructive' : undefined}
                      />
                      {errors.billingAddressStreet && (
                        <p className="mt-1 text-sm text-destructive">{errors.billingAddressStreet}</p>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="billingAddressBuildingNumber">
                          {t('createSalon.fields.billingBuildingNumber', 'Номер дома/корпуса')}
                        </Label>
                        <Input
                          id="billingAddressBuildingNumber"
                          value={form.billingAddressBuildingNumber}
                          onChange={event => handleFormUpdate({ billingAddressBuildingNumber: event.target.value })}
                          className={errors.billingAddressBuildingNumber ? 'border-destructive' : undefined}
                        />
                        {errors.billingAddressBuildingNumber && (
                          <p className="mt-1 text-sm text-destructive">{errors.billingAddressBuildingNumber}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="billingAddressApartmentNumber">
                          {t('createSalon.fields.billingApartmentNumber', 'Офис/помещение (необязательно)')}
                        </Label>
                        <Input
                          id="billingAddressApartmentNumber"
                          value={form.billingAddressApartmentNumber}
                          onChange={event =>
                            handleFormUpdate({ billingAddressApartmentNumber: event.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="billingAddressPostalCode">
                          {t('createSalon.fields.billingPostalCode', 'Почтовый код')}
                        </Label>
                        <Input
                          id="billingAddressPostalCode"
                          value={form.billingAddressPostalCode}
                          onChange={event => handleFormUpdate({ billingAddressPostalCode: event.target.value })}
                          className={errors.billingAddressPostalCode ? 'border-destructive' : undefined}
                        />
                        {errors.billingAddressPostalCode && (
                          <p className="mt-1 text-sm text-destructive">{errors.billingAddressPostalCode}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="billingAddressCity">
                          {t('createSalon.fields.billingCity', 'Город')}
                        </Label>
                        <Input
                          id="billingAddressCity"
                          value={form.billingAddressCity}
                          onChange={event => handleFormUpdate({ billingAddressCity: event.target.value })}
                          className={errors.billingAddressCity ? 'border-destructive' : undefined}
                        />
                        {errors.billingAddressCity && (
                          <p className="mt-1 text-sm text-destructive">{errors.billingAddressCity}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="billingCountry" className="flex items-center gap-1">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {t('createSalon.fields.billingCountry', 'Страна регистрации')}
                      </Label>
                      <select
                        id="billingCountry"
                        className={`mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ${errors.billingCountry ? 'border-destructive' : ''}`}
                        value={form.billingCountry}
                        onChange={event => handleFormUpdate({ billingCountry: event.target.value })}
                      >
                        {countries.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.name}
                          </option>
                        ))}
                      </select>
                      {errors.billingCountry && (
                        <p className="mt-1 text-sm text-destructive">{errors.billingCountry}</p>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {t(
                    'createSalon.sections.billing.notice',
                    'Фактурные данные передаются в платежный сервис и сохраняются в настройках салона.'
                  )}
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="border-border/70">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>{t('createSalon.sections.services.title', 'Выберите направления услуг')}</CardTitle>
                  <CardDescription>
                    {t(
                      'createSalon.sections.services.subtitle',
                      'Можно выбрать несколько направлений — мы подготовим категории и шаблоны услуг для каждого.'
                    )}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="border border-border/80 text-xs font-medium">
                  {t('createSalon.sections.services.counter', {
                    defaultValue: '{{count}} услуг выбрано',
                    count: selectedServiceKeys.length
                  })}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {salonTypesLoading && (
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('createSalon.loading.salonTypes', 'Загружаем направления...')}
                  </div>
                )}

                {salonTypesError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {salonTypesError}
                  </div>
                )}

                {!salonTypesLoading && (
                  <div className="grid gap-3 md:grid-cols-3">
                    {salonTypes.map(option => {
                      const isActive = selectedSalonTypes.includes(option.id)
                      const Icon = SALON_TYPE_ICON_MAP[option.salonType] ?? Sparkles
                      const translationId = option?.salonType ? option.salonType.toLowerCase() : ''
                      const translatedTitle =
                        translationId.length > 0
                          ? t(`createSalon.salonTypes.${translationId}.title`, option.label)
                          : option.label
                      const translatedDescription =
                        translationId.length > 0
                          ? t(`createSalon.salonTypes.${translationId}.description`, option.description ?? '')
                          : option.description
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => void handleToggleSalonType(option.id)}
                          className={`flex h-full flex-col rounded-lg border p-4 text-left transition ${
                            isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="mt-3 text-base font-semibold text-foreground">{translatedTitle}</span>
                          <span className="mt-1 text-xs text-muted-foreground">{translatedDescription}</span>
                          <span className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                            {t('createSalon.sections.services.defaults', {
                              defaultValue: '{{categories}} категорий, {{services}} услуг',
                              categories: option.defaultCategories,
                              services: option.defaultServices
                            })}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {errors.salonTypes && (
                  <p className="text-sm text-destructive">{errors.salonTypes}</p>
                )}

                {combinedCategoryBlocks.length > 0 && (
                  <div className="space-y-6">
                    {combinedCategoryBlocks.map(block => (
                      <div key={block.typeId} className="rounded-lg border border-border/60">
                        <div className="flex items-center justify-between border-b border-border/70 bg-muted/50 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{block.type?.label ?? block.typeId}</p>
                            <p className="text-xs text-muted-foreground">
                              {t(
                                'createSalon.sections.services.typeSubtitle',
                                'Отметьте услуги, с которых хотите начать работу'
                              )}
                            </p>
                          </div>
                          {presetLoadingState[block.typeId] && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>

                        {presetErrors[block.typeId] ? (
                          <div className="px-4 py-3 text-sm text-destructive">{presetErrors[block.typeId]}</div>
                        ) : (
                          <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                            {block.categories.map(category => (
                              <div key={`${block.typeId}::${category.id}`} className="rounded-md border border-border/60 p-3">
                                <p className="text-sm font-semibold text-foreground">{category.name}</p>
                                <div className="mt-2 space-y-2">
                                  {category.services.map(service => (
                                    <label
                                      key={service.selectionKey}
                                      className="flex items-start gap-2 rounded-md border border-transparent px-2 py-2 text-sm hover:border-primary/30"
                                    >
                                      <Checkbox
                                        checked={selectedKeysSet.has(service.selectionKey)}
                                        onCheckedChange={() => void handleToggleService(service.selectionKey)}
                                      />
                                      <span>
                                        <span className="font-medium text-foreground">{service.name}</span>
                                        <span className="block text-xs text-muted-foreground">
                                          {t('createSalon.sections.services.serviceMeta', {
                                            defaultValue: '{{duration}} мин · {{price}} ₴',
                                            duration: service.duration,
                                            price: service.price
                                          })}
                                        </span>
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

           <section>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t('createSalon.sections.confirm.title', 'Подтверждение')}</CardTitle>
                <CardDescription>
                  {t(
                    'createSalon.sections.confirm.subtitle',
                    'Ознакомьтесь с условиями и подтвердите создание новой инфраструктуры.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/40 px-4 py-3">
                  <Checkbox
                    checked={form.acceptTerms}
                    onCheckedChange={checked => handleFormUpdate({ acceptTerms: Boolean(checked) })}
                  />
                  <span className="text-sm text-foreground">
                    {t(
                      'registration.activation.acceptTerms',
                      'Я принимаю условия использования и политику конфиденциальности'
                    )}
                  </span>
                </label>
                {errors.acceptTerms && <p className="text-sm text-destructive">{errors.acceptTerms}</p>}

                <label className="flex items-start gap-3 rounded-md border border-border/60 px-4 py-3">
                  <Checkbox
                    checked={form.subscribeNewsletter}
                    onCheckedChange={checked => handleFormUpdate({ subscribeNewsletter: Boolean(checked) })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {t(
                      'registration.activation.subscribe',
                      'Подписаться на новости о новых функциях и обновлениях'
                    )}
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  {t(
                    'createSalon.sections.confirm.notice',
                    'После отправки мы автоматически создадим категории, услуги и персональный доступ. Это займёт не больше минуты.'
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-4 sm:flex-row">
            <div className="text-sm text-muted-foreground">
              {t('createSalon.summary', {
                defaultValue: 'Направлений: {{types}}, услуг: {{services}}',
                types: selectedSalonTypes.length,
                services: selectedServiceKeys.length
              })}
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => void navigate('/dashboard')}>
                {t('createSalon.actions.cancel', 'Отмена')}
              </Button>
              <Button type="submit" disabled={isSubmitting || salonTypesLoading || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('createSalon.actions.creating', 'Создаём...')}
                  </>
                ) : (
                  t('createSalon.actions.create', 'Создать салон')
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </PageContainer>
  )
}

export default CreateSalonPage
