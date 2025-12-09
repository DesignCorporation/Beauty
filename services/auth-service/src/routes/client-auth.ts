// Client Authentication Routes для Beauty Platform
// Специализированные endpoints для портала клиентов

import express from 'express'
import bcrypt from 'bcrypt'
import { Gender, Language } from '@prisma/client'
import { Prisma, prisma, tenantPrisma } from '@beauty-platform/database'
import { generateTokenPair } from '../utils/jwt'
import { getCookieDomain } from '../config/oauthConfig'
import { authenticate } from '../middleware/auth'
import pino from 'pino'
import { getAuthContext } from '../utils/get-auth-context'

import { parsePhoneNumberFromString } from 'libphonenumber-js'
import {
  clientLoginLimiter,
  clientRegisterLimiter,
  clientSmsRequestLimiter,
  clientSmsVerifyLimiter,
  clientJoinSalonLimiter
} from '../middleware/rateLimiters'

const router: express.Router = express.Router()
const logger = pino({ name: 'ClientAuth' })

const ALLOWED_GENDERS = new Set<Gender>(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as Gender[])
const ALLOWED_LANGUAGES = new Set<Language>(['RU', 'EN', 'PL', 'UA'] as Language[])

// Настройки cookies для клиентов
const CLIENT_COOKIE_CONFIG = {
  httpOnly: true,
  secure: true, // ВСЕГДА true когда sameSite='none' - иначе браузер игнорирует!
  sameSite: 'none' as const,
  domain: getCookieDomain(), // Configurable per environment
  path: '/'
}

async function destroyClientSession(req: express.Request, res: express.Response) {
  const refreshToken =
    req.cookies?.beauty_client_refresh_token ||
    req.cookies?.beauty_refresh_token

  if (refreshToken) {
    try {
      await tenantPrisma(null).refreshToken.deleteMany({
        where: { token: refreshToken }
      })
    } catch (error) {
      logger.warn({ error, refreshToken }, 'Failed to delete refresh token during logout')
    }
  }

  const clearCookieConfig = { ...CLIENT_COOKIE_CONFIG, maxAge: 0 }
  res.clearCookie('beauty_client_access_token', clearCookieConfig)
  res.clearCookie('beauty_client_refresh_token', clearCookieConfig)
  res.clearCookie('beauty_access_token', clearCookieConfig)
  res.clearCookie('beauty_refresh_token', clearCookieConfig)
}

// Типы для валидации
interface ClientRegistrationData {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  salonId?: string // Опционально - к какому салону привязывается
}

interface ClientLoginData {
  email: string
  password: string
  salonId?: string
}

/**
 * POST /auth/register-client
 * Регистрация нового клиента в Client Portal
 *
 * ВАЖНО: Создаёт ТОЛЬКО ClientProfile (НЕ User!)
 * Это обеспечивает независимую аутентификацию Client Portal от CRM
 */
router.post('/register-client', clientRegisterLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone }: ClientRegistrationData = req.body

    // Валидация входных данных
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, email and password are required',
        code: 'VALIDATION_ERROR'
      })
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      })
    }

    // Валидация пароля
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      })
    }

    // Нормализация email
    const normalizedEmail = email.toLowerCase().trim()

    // Проверка существования ClientProfile
    const existingProfile = await tenantPrisma(null).clientProfile.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        error: 'Client with this email already exists',
        code: 'CLIENT_EXISTS'
      })
    }

    // Хеширование пароля
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Создание ClientProfile (ТОЛЬКО ClientProfile, БЕЗ User!)
    const clientProfile = await tenantPrisma(null).clientProfile.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword, // NEW: сохраняем хеш пароля
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() || null,
        source: 'WEBSITE', // Регистрация через Client Portal веб-форму
        phoneVerified: false // Требует верификации телефона
      }
    })

    logger.info({
      email: clientProfile.email,
      source: 'WEBSITE',
      action: 'client_profile_registered'
    }, 'New client registered in Client Portal')

    // Генерация JWT tokens для CLIENT (БЕЗ userId - клиенты портала не имеют User record)
    const tokens = await generateTokenPair({
      email: clientProfile.email,
      firstName: clientProfile.firstName,
      lastName: clientProfile.lastName,
      phoneVerified: clientProfile.phoneVerified,
      role: 'CLIENT' // Всегда CLIENT для портала
    })

    // Установка httpOnly cookies для Client Portal
    res.cookie('beauty_client_access_token', tokens.accessToken, {
      ...CLIENT_COOKIE_CONFIG,
      maxAge: 15 * 60 * 1000 // 15 минут
    })

    res.cookie('beauty_client_refresh_token', tokens.refreshToken, {
      ...CLIENT_COOKIE_CONFIG,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    })

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Beauty Platform!',
      user: {
        email: clientProfile.email,
        firstName: clientProfile.firstName,
        lastName: clientProfile.lastName,
        phone: clientProfile.phone,
        phoneVerified: clientProfile.phoneVerified
      }
    })

  } catch (error) {
    logger.error({ error }, 'Client registration failed')
    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /auth/login-client
 * Вход клиента в Client Portal
 *
 * ВАЖНО: Ищет в ClientProfile table (НЕ User!)
 * Это обеспечивает независимую аутентификацию Client Portal от CRM
 */
router.post('/login-client', clientLoginLimiter, async (req, res) => {
  try {
    const { email, password }: ClientLoginData = req.body

    // Валидация входных данных
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      })
    }

    // Нормализация email
    const normalizedEmail = email.toLowerCase().trim()

    // Поиск в ClientProfile (НЕ в User!)
    const clientProfile = await tenantPrisma(null).clientProfile.findUnique({
      where: { email: normalizedEmail }
    })

    // Проверка существования профиля и пароля
    if (!clientProfile || !clientProfile.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Проверка статуса аккаунта
    if (!clientProfile.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is not active. Please contact support.',
        code: 'ACCOUNT_INACTIVE'
      })
    }

    // Проверка пароля
    const passwordValid = await bcrypt.compare(password, clientProfile.password)
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Генерация JWT tokens для CLIENT (БЕЗ userId)
    const tokens = await generateTokenPair({
      email: clientProfile.email,
      firstName: clientProfile.firstName,
      lastName: clientProfile.lastName,
      phoneVerified: clientProfile.phoneVerified,
      role: 'CLIENT' // Всегда CLIENT для портала
    })

    // Установка httpOnly cookies для Client Portal
    res.cookie('beauty_client_access_token', tokens.accessToken, {
      ...CLIENT_COOKIE_CONFIG,
      maxAge: 15 * 60 * 1000 // 15 минут
    })

    res.cookie('beauty_client_refresh_token', tokens.refreshToken, {
      ...CLIENT_COOKIE_CONFIG,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    })

    logger.info({
      email: clientProfile.email,
      phoneVerified: clientProfile.phoneVerified,
      action: 'client_portal_login'
    }, 'Client logged in to Client Portal successfully')

    return res.json({
      success: true,
      message: 'Login successful!',
      user: {
        email: clientProfile.email,
        firstName: clientProfile.firstName,
        lastName: clientProfile.lastName,
        phone: clientProfile.phone,
        phoneVerified: clientProfile.phoneVerified
      }
    })

  } catch (error) {
    logger.error({ error }, 'Client login failed')
    return res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /auth/logout-client
 * Выход клиента из системы
 */
router.post('/logout-client', async (req, res) => {
  try {
    await destroyClientSession(req, res)

    logger.info({ action: 'client_logout' }, 'Client logged out')

    return res.json({
      success: true,
      message: 'Logout successful'
    })

  } catch (error) {
    logger.error({ error }, 'Client logout failed')
    return res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'INTERNAL_ERROR'
    })
  }
})

router.get('/logout-client', async (req, res) => {
  try {
    await destroyClientSession(req, res)

    const redirectUrl =
      typeof req.query.redirect === 'string'
        ? req.query.redirect
        : process.env.CLIENT_PORTAL_URL
          ? `${process.env.CLIENT_PORTAL_URL}/login`
          : '/login'

    logger.info({ action: 'client_logout_redirect', redirectUrl }, 'Client logged out via GET')
    return res.redirect(302, redirectUrl)
  } catch (error) {
    logger.error({ error }, 'Client logout redirect failed')
    return res.status(500).send('Logout failed')
  }
})

/**
 * GET /auth/client/profile
 * Получение профиля клиента (требует аутентификации)
 */
router.get('/client/profile', authenticate, async (req, res) => {
  try {
    const user = (req as any).user

    // ✅ ИСПРАВЛЕНО: Проверка только наличия user (role проверяется JWT middleware)
    // Client Portal JWT tokens содержат role: 'CLIENT' (строка)
    if (!user || !user.email) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Authentication required.',
        code: 'ACCESS_DENIED'
      })
    }

    // ✅ ИСПРАВЛЕНО: Читаем из ClientProfile (email-based), а не User (userId-based)
    // Это поддерживает Google OAuth flow где JWT содержит email без userId
    const clientProfile = await tenantPrisma(null).clientProfile.findUnique({
      where: { email: user.email },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        phoneVerified: true, // ✅ Критично для Client Portal redirect логики
        phoneVerifiedAt: true,
        birthdate: true,
        gender: true,
        avatar: true,
        preferredLanguage: true,
        marketingConsent: true,
        googleId: true,
        joinedPortalAt: true,
        source: true
      } as any
    }) as any

    if (!clientProfile) {
      return res.status(404).json({
        success: false,
        error: 'Client profile not found',
        code: 'NOT_FOUND'
      })
    }

    let profileAvatar = clientProfile.avatar ?? null

    if (!profileAvatar) {
      try {
        const fallbackUser = await tenantPrisma(null).user.findFirst({
          where: {
            email: user.email,
            avatar: { not: null }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        })

        if (fallbackUser?.avatar) {
          profileAvatar = fallbackUser.avatar
          await tenantPrisma(null).clientProfile.update({
            where: { email: user.email },
            data: { avatar: profileAvatar } as any
          })

          logger.info(
            {
              email: user.email,
              source: 'user_avatar_sync'
            },
            'Client avatar synced from salon user profile'
          )
        }
      } catch (syncError) {
        logger.warn(
          {
            email: user.email,
            error: syncError
          },
          'Failed to sync client avatar from user profile'
        )
      }
    }

    // Возвращаем данные с дополнительным полем id (используем email как id для совместимости)
    return res.json({
      success: true,
      data: {
        id: clientProfile.email, // Email служит глобальным ID для клиентов
        ...clientProfile,
        avatar: profileAvatar
      }
    })

  } catch (error) {
    logger.error({ error }, 'Failed to get client profile')
    return res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * PUT /auth/client/profile
 * Обновление профиля клиента
 */
router.put('/client/profile', authenticate, async (req, res) => {
  try {
    const user = (req as any).user
    const {
      firstName,
      lastName,
      phone,
      birthdate,
      gender,
      preferredLanguage,
      marketingConsent,
      avatar
    } = req.body

    // ✅ ИСПРАВЛЕНО: Проверка только наличия user и email
    // Client Portal JWT tokens содержат role: 'CLIENT' (строка)
    if (!user || !user.email) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Authentication required.',
        code: 'ACCESS_DENIED'
      })
    }

    // Валидация данных
    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'First name and last name are required',
        code: 'VALIDATION_ERROR'
      })
    }

    const normalizedFirstName = firstName.trim()
    const normalizedLastName = lastName.trim()
    const normalizedPhone = phone?.trim() || null

    let normalizedBirthdate: Date | null | undefined = undefined
    if (birthdate !== undefined) {
      if (birthdate === null || birthdate === '') {
        normalizedBirthdate = null
      } else {
        const parsedBirthdate = new Date(birthdate)
        if (Number.isNaN(parsedBirthdate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid birthdate format',
            code: 'INVALID_BIRTHDATE'
          })
        }
        normalizedBirthdate = parsedBirthdate
      }
    }

    let normalizedGender: Gender | null | undefined = undefined
    if (gender !== undefined) {
      if (gender === null || gender === '') {
        normalizedGender = null
      } else if (typeof gender === 'string') {
        const upperGender = gender.toUpperCase()
        if (!ALLOWED_GENDERS.has(upperGender as Gender)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid gender value',
            code: 'INVALID_GENDER'
          })
        }
        normalizedGender = upperGender as Gender
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid gender value',
          code: 'INVALID_GENDER'
        })
      }
    }

    let normalizedLanguage: Language | undefined = undefined
    if (preferredLanguage !== undefined) {
      if (typeof preferredLanguage !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid language value',
          code: 'INVALID_LANGUAGE'
        })
      }
      const upperLanguage = preferredLanguage.toUpperCase()
      if (!ALLOWED_LANGUAGES.has(upperLanguage as Language)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid language value',
          code: 'INVALID_LANGUAGE'
        })
      }
      normalizedLanguage = upperLanguage as Language
    }

    let normalizedMarketingConsent: boolean | undefined = undefined
    if (marketingConsent !== undefined) {
      if (typeof marketingConsent !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Invalid marketing consent value',
          code: 'INVALID_MARKETING_CONSENT'
        })
      }
      normalizedMarketingConsent = marketingConsent
    }

    let normalizedAvatar: string | null | undefined = undefined
    if (avatar !== undefined) {
      if (avatar === null || avatar === '') {
        normalizedAvatar = null
      } else if (typeof avatar === 'string') {
        const trimmedAvatar = avatar.trim()
        if (!trimmedAvatar) {
          normalizedAvatar = null
        } else {
          normalizedAvatar = trimmedAvatar
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid avatar value',
          code: 'INVALID_AVATAR'
        })
      }
    }

    // ✅ ИСПРАВЛЕНО: Обновляем ClientProfile по email (не User по userId)
    const updatePayload: any = {
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      phone: normalizedPhone,
      ...(normalizedBirthdate !== undefined ? { birthdate: normalizedBirthdate } : {}),
      ...(normalizedGender !== undefined ? { gender: normalizedGender } : {}),
      ...(normalizedLanguage !== undefined ? { preferredLanguage: normalizedLanguage } : {}),
      ...(normalizedMarketingConsent !== undefined ? { marketingConsent: normalizedMarketingConsent } : {})
    }

    if (normalizedAvatar !== undefined) {
      updatePayload.avatar = normalizedAvatar
    }

    const updatedClient = await tenantPrisma(null).clientProfile.update({
      where: { email: user.email },
      data: updatePayload,
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        birthdate: true,
        gender: true,
        avatar: true,
        preferredLanguage: true,
        marketingConsent: true,
        googleId: true,
        joinedPortalAt: true,
        source: true
      } as any
    }) as any

    logger.info({
      email: user.email,
      action: 'client_profile_updated'
    }, 'Client profile updated')

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedClient.email, // Email как ID
        ...updatedClient
      }
    })

  } catch (error) {
    logger.error({ error }, 'Failed to update client profile')
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      code: 'INTERNAL_ERROR'
    })
  }
})

const ACTIVE_APPOINTMENT_STATUSES = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS'])
const MAX_APPOINTMENTS_PER_TENANT = 50

type ClientAppointmentResponse = {
  id: string
  appointmentNumber: string
  salonId: string
  salon: {
    id: string
    name: string
    address: string | null
    phone: string | null
    currency: string
  }
  serviceId?: string | null
  service: {
    id: string
    name: string
    duration: number
    price: number
    currency: string
  } | null
  staffId?: string | null
  staff: {
    id: string
    name: string
    avatar: string | null
  } | null
  startTime: string
  endTime: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

const fetchClientAppointments = async (email: string): Promise<ClientAppointmentResponse[]> => {
  const relations = await prisma.clientSalonRelation.findMany({
    where: { clientEmail: email, isActive: true },
    select: {
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          currency: true
        }
      }
    }
  })

  if (!relations.length) {
    return []
  }

  const appointmentBatches = await Promise.all(
    relations.map(async relation => {
      const tenantClient = tenantPrisma(relation.tenantId)

      const client = await tenantClient.client.findFirst({
        where: { email },
        select: { id: true }
      })

      if (!client) {
        return []
      }

      type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
        include: {
          service: {
            select: {
              id: true
              name: true
              duration: true
              price: true
            }
          }
          assignedTo: {
            select: {
              id: true
              firstName: true
              lastName: true
              avatar: true
            }
          }
        }
      }>

      const appointments = (await tenantClient.appointment.findMany({
        where: { clientId: client.id },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        orderBy: { startAt: 'desc' },
        take: MAX_APPOINTMENTS_PER_TENANT
      })) as AppointmentWithRelations[]

      return appointments.map(appointment => {
        const startTimeIso = appointment.startAt.toISOString()
        const endTimeIso = appointment.endAt.toISOString()
        const service = appointment.service
        const staff = appointment.assignedTo
          ? {
              id: appointment.assignedTo.id,
              name: `${appointment.assignedTo.firstName} ${appointment.assignedTo.lastName}`.trim(),
              avatar: appointment.assignedTo.avatar ?? null
            }
          : null

        return {
          id: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          salonId: relation.tenantId,
          salon: {
            id: relation.tenantId,
            name: relation.tenant.name,
            address: relation.tenant.address ?? null,
            phone: relation.tenant.phone ?? null,
            currency: relation.tenant.currency
          },
          serviceId: appointment.serviceId,
          service: service
            ? {
                id: service.id,
                name: service.name,
                duration: service.duration,
                price: Number(service.price),
                currency: relation.tenant.currency
              }
            : null,
          staffId: appointment.assignedToId ?? null,
          staff,
          startTime: startTimeIso,
          endTime: endTimeIso,
          status: appointment.status,
          notes: appointment.notes ?? null,
          createdAt: appointment.createdAt.toISOString(),
          updatedAt: appointment.updatedAt.toISOString()
        } as ClientAppointmentResponse
      })
    })
  )

  return appointmentBatches
    .flat()
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
}

/**
 * GET /auth/client/dashboard
 * Получение агрегированной информации для dashboard
 */
router.get('/client/dashboard', authenticate, async (req, res) => {
  try {
    const user = (req as any).user

    if (!user?.email) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED'
      })
    }

    // Получаем client profile с relations
    const clientProfile = await tenantPrisma(null).clientProfile.findUnique({
      where: { email: user.email },
      include: {
        salonRelations: {
          where: { isActive: true },
          include: {
            tenant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!clientProfile) {
      // Новый клиент без профиля
      return res.json({
        success: true,
        data: {
          totalSalons: 0,
          totalLoyaltyPoints: 0,
          totalVisits: 0,
          totalSpent: 0,
          upcomingAppointments: 0,
          salons: []
        }
      })
    }

    // Агрегируем данные по всем салонам
    const totalLoyaltyPoints = clientProfile.salonRelations.reduce(
      (sum, rel) => sum + rel.loyaltyPoints,
      0
    )
    const totalVisits = clientProfile.salonRelations.reduce(
      (sum, rel) => sum + rel.visitCount,
      0
    )
    const totalSpent = clientProfile.salonRelations.reduce(
      (sum, rel) => sum + Number(rel.totalSpent),
      0
    )

    const appointments = await fetchClientAppointments(user.email)
    const upcomingAppointments = appointments.filter(appointment => {
      const startDate = new Date(appointment.startTime)
      return (
        startDate.getTime() >= Date.now() &&
        ACTIVE_APPOINTMENT_STATUSES.has(appointment.status)
      )
    }).length

    return res.json({
      success: true,
      data: {
        totalSalons: clientProfile.salonRelations.length,
        totalLoyaltyPoints,
        totalVisits,
        totalSpent,
        upcomingAppointments,
        salons: clientProfile.salonRelations.map(rel => ({
          id: rel.tenantId,
          name: rel.tenant.name,
          loyaltyTier: rel.loyaltyTier,
          loyaltyPoints: rel.loyaltyPoints,
          isPrimary: rel.isPrimary
        }))
      }
    })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch client dashboard')
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /auth/client/bookings
 * Возвращает список записей клиента по всем салонам
 */
router.get('/client/bookings', authenticate, async (req, res) => {
  try {
    const user = (req as any).user

    if (!user?.email) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED'
      })
    }

    const appointments = await fetchClientAppointments(user.email)

    const now = Date.now()
    const upcomingCount = appointments.filter(appointment => {
      const startDate = new Date(appointment.startTime)
      return (
        startDate.getTime() >= now &&
        ACTIVE_APPOINTMENT_STATUSES.has(appointment.status)
      )
    }).length

    return res.json({
      success: true,
      data: {
        appointments,
        totals: {
          total: appointments.length,
          upcoming: upcomingCount,
          past: appointments.length - upcomingCount
        }
      }
    })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch client bookings')
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /auth/client/salons
 * Получение списка салонов клиента с loyalty information
 */
router.get('/client/salons', authenticate, async (req, res) => {
  try {
    const user = (req as any).user

    if (!user?.email) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED'
      })
    }

    // Получаем client profile
    const clientProfile = await tenantPrisma(null).clientProfile.findUnique({
      where: { email: user.email },
      include: {
        salonRelations: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true
              }
            }
          },
          where: { isActive: true },
          orderBy: [
            { isPrimary: 'desc' }, // Primary salons first
            { lastVisitAt: 'desc' } // Then by recent visits
          ]
        }
      }
    })

    if (!clientProfile) {
      // Новый клиент — нет профиля
      return res.json({
        success: true,
        data: []
      })
    }

    // Формируем ответ
    const salons = clientProfile.salonRelations.map((relation) => ({
      id: relation.id,
      salonId: relation.tenantId,
      salonName: relation.tenant.name,
      salonAddress: relation.tenant.address,
      salonPhone: relation.tenant.phone,
      salonEmail: relation.tenant.email,
      loyaltyTier: relation.loyaltyTier,
      loyaltyPoints: relation.loyaltyPoints,
      totalSpent: Number(relation.totalSpent),
      visitCount: relation.visitCount,
      lastVisitAt: relation.lastVisitAt?.toISOString(),
      joinedSalonAt: relation.joinedSalonAt.toISOString(),
      salonNotes: relation.salonNotes,
      isPrimary: relation.isPrimary,
      isActive: relation.isActive
    }))

    return res.json({
      success: true,
      data: salons
    })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch client salons')
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch salons',
      code: 'INTERNAL_ERROR'
    })
  }
})

// ============================================================================
// Phone Verification Endpoints
// ============================================================================

/**
 * @route   POST /client/verify-phone
 * @desc    Send SMS verification code to phone number
 * @access  Authenticated (client must be logged in)
 */
router.post('/client/verify-phone', authenticate, clientSmsRequestLimiter, async (req, res) => {
  try {
    const { phone } = req.body

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
        code: 'VALIDATION_ERROR'
      })
    }

    // Валидация формата телефона (международный формат E.164)
    const parsedPhone = parsePhoneNumberFromString(phone)
    if (!parsedPhone || !parsedPhone.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Use international format (e.g. +48123456789)',
        code: 'INVALID_PHONE_FORMAT'
      })
    }

    const normalizedPhone = parsedPhone.number

    const { sendVerificationCode } = await import('../utils/sms')
    const result = await sendVerificationCode(normalizedPhone)

    if (!result.success) {
      return res.status(429).json({
        success: false,
        error: result.message,
        code: 'SMS_SEND_FAILED'
      })
    }

    const auth = getAuthContext(req)
    logger.info({ phone: normalizedPhone, email: auth.email }, 'Verification code sent')

    return res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn,
      remainingAttempts: result.remainingAttempts
    })
  } catch (error) {
    logger.error({ error }, 'Failed to send verification code')
    return res.status(500).json({
      success: false,
      error: 'Failed to send verification code',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * @route   POST /client/confirm-phone
 * @desc    Verify SMS code and update phone number
 * @access  Authenticated (client must be logged in)
 */
router.post('/client/confirm-phone', authenticate, clientSmsVerifyLimiter, async (req, res) => {
  try {
    const { phone, code } = req.body

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and verification code are required',
        code: 'VALIDATION_ERROR'
      })
    }

    if (typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code format',
        code: 'INVALID_CODE_FORMAT'
      })
    }

    const parsedPhone = parsePhoneNumberFromString(phone)
    if (!parsedPhone || !parsedPhone.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Use international format (e.g. +48123456789)',
        code: 'INVALID_PHONE_FORMAT'
      })
    }

    const normalizedPhone = parsedPhone.number

    // Проверка кода
    const { verifyCode } = await import('../utils/sms')
    const verificationResult = verifyCode(normalizedPhone, code)

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        error: verificationResult.message,
        code: 'VERIFICATION_FAILED'
      })
    }

    // Обновление профиля клиента
    const auth = getAuthContext(req)
    const email = auth.email
    if (!email) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      })
    }

    const clientProfileRepo = tenantPrisma(null).clientProfile

    const updatedProfile = await clientProfileRepo.update({
      where: { email },
      data: {
        phone: normalizedPhone,
        phoneVerified: true,
        phoneVerifiedAt: new Date()
      }
    })

    logger.info({ email, phone: normalizedPhone }, 'Phone number verified and updated')

    return res.json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        phone: updatedProfile.phone,
        phoneVerified: updatedProfile.phoneVerified,
        phoneVerifiedAt: updatedProfile.phoneVerifiedAt?.toISOString()
      }
    })
  } catch (error) {
    logger.error({ error }, 'Failed to confirm phone verification')
    return res.status(500).json({
      success: false,
      error: 'Failed to confirm phone verification',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * @route   POST /client/join-salon
 * @desc    Присоединяет клиента к салону по коду-приглашению
 * @access  Authenticated CLIENT
 */
router.post('/client/join-salon', authenticate, clientJoinSalonLimiter, async (req, res) => {
  try {
    const { code } = req.body as { code?: string }

    const normalizedCode = code?.trim().toUpperCase()
    if (!normalizedCode) {
      return res.status(400).json({
        success: false,
        error: 'INVITE_CODE_REQUIRED',
        message: 'Необходимо указать код приглашения'
      })
    }

    const auth = getAuthContext(req)
    const email = auth.email?.toLowerCase()
    if (!email) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Пользователь не авторизован'
      })
    }

    const now = new Date()

    const result = await prisma.$transaction(async transaction => {
      // 🔧 УЛУЧШЕНИЕ: Поддержка двух типов кодов
      // 1. Сначала ищем в salonInviteCode (новая система)
      let invite = await transaction.salonInviteCode.findUnique({
        where: { code: normalizedCode },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              address: true,
              phone: true,
              email: true
            }
          }
        }
      })

      let tenantId: string
      let tenantData: any

      if (invite) {
        // Найден код в salonInviteCode - проверяем ограничения
        if (invite.expiresAt && invite.expiresAt.getTime() < now.getTime()) {
          return { error: 'INVITE_EXPIRED' as const }
        }

        if (invite.maxUses && invite.usageCount >= invite.maxUses) {
          return { error: 'INVITE_LIMIT_REACHED' as const }
        }

        tenantId = invite.tenantId
        tenantData = invite.tenant
      } else {
        // 2. Не нашли в salonInviteCode - ищем по salonNumber (fallback для постоянных кодов)
        const tenant = await transaction.tenant.findUnique({
          where: { salonNumber: normalizedCode },
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            address: true,
            phone: true,
            email: true
          }
        })

        if (!tenant) {
          return { error: 'INVITE_NOT_FOUND' as const }
        }

        tenantId = tenant.id
        tenantData = tenant
      }

      // 🔧 НОВОЕ: Проверка дубликата - салон уже добавлен?
      const existingRelation = await transaction.clientSalonRelation.findUnique({
        where: {
          clientEmail_tenantId: {
            clientEmail: email,
            tenantId: tenantId
          }
        }
      })

      if (existingRelation && existingRelation.isActive) {
        return { error: 'SALON_ALREADY_ADDED' as const, tenant: tenantData }
      }

      let profile = await transaction.clientProfile.findUnique({ where: { email } })
      if (!profile) {
        profile = await transaction.clientProfile.create({
          data: {
            email,
            firstName: 'Client',
            lastName: '',
            source: 'WEBSITE',
            phone: null,
            phoneVerified: false
          }
        })
      }

      await transaction.clientSalonRelation.upsert({
        where: {
          clientEmail_tenantId: {
            clientEmail: email,
            tenantId: tenantId
          }
        },
        create: {
          clientEmail: email,
          tenantId: tenantId,
          salonNotes: null
        },
        update: {
          isActive: true,
          updatedAt: now
        }
      })

      // 🔧 ИСПРАВЛЕНИЕ: Создаём Client в CRM при join-salon
      // Это позволяет владельцу салона видеть клиента сразу после добавления
      await transaction.client.upsert({
        where: {
          tenantId_email: {
            tenantId: tenantId,
            email
          }
        },
        create: {
          tenantId: tenantId,
          name: `${profile.firstName} ${profile.lastName}`.trim() || 'Client',
          email,
          phone: profile.phone,
          birthday: profile.birthdate // ClientProfile.birthdate → Client.birthday
        },
        update: {
          // Синхронизируем данные из ClientProfile если клиент уже существует
          name: `${profile.firstName} ${profile.lastName}`.trim() || 'Client',
          phone: profile.phone,
          birthday: profile.birthdate, // ClientProfile.birthdate → Client.birthday
          updatedAt: now
        }
      })

      // Обновляем usage count только для salonInviteCode (не для salonNumber)
      if (invite) {
        await transaction.salonInviteCode.update({
          where: { id: invite.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: now
          }
        })
      }

      return {
        tenant: tenantData,
        invite
      }
    })

    if ('error' in result) {
      const errorMap: Record<string, { status: number; error: string; message: string }> = {
        INVITE_NOT_FOUND: {
          status: 404,
          error: 'INVITE_NOT_FOUND',
          message: 'Код приглашения не найден. Проверьте правильность ввода.'
        },
        INVITE_EXPIRED: {
          status: 410,
          error: 'INVITE_EXPIRED',
          message: 'Срок действия кода приглашения истёк'
        },
        INVITE_LIMIT_REACHED: {
          status: 409,
          error: 'INVITE_LIMIT_REACHED',
          message: 'Код приглашения больше не активен'
        },
        SALON_ALREADY_ADDED: {
          status: 200,
          error: 'SALON_ALREADY_ADDED',
          message: `Салон "${result.tenant?.name || 'этот'}" уже добавлен в ваш список`
        }
      }

      const payload = errorMap[result.error] ?? {
        status: 400,
        error: 'INVITE_INVALID',
        message: 'Не удалось использовать код приглашения'
      }

      return res.status(payload.status).json({
        success: false,
        error: payload.error,
        message: payload.message
      })
    }

    return res.json({
      success: true,
      data: {
        tenantId: result.tenant.id,
        salon: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          city: result.tenant.city,
          address: result.tenant.address,
          phone: result.tenant.phone,
          email: result.tenant.email
        }
      }
    })
  } catch (error) {
    console.error('[ClientJoinSalon] Failed to join via invite code', error)
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Не удалось обработать код приглашения'
    })
  }
})

export default router
