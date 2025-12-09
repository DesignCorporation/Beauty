// Salon Registration Routes
// Beauty Platform Auth Service - Salon Creation

import express from 'express'
import Joi from 'joi'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcrypt'
import { Prisma, UserRole, Currency, Language, SalonType } from '@prisma/client'
import { tenantPrisma, seedDefaultCategories, seedDefaultServices, SALON_SERVICE_PRESETS } from '@beauty-platform/database'
import { generatePasswordResetToken } from '../utils/passwordResetToken'
import { getWelcomeEmailTemplate } from '../services/emailTemplates'

const router: express.Router = express.Router()

const normalizeVatNumber = (input?: string | null): string | null => {
  if (!input) return null
  const normalized = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return normalized.length ? normalized : null
}

const isValidVatNumber = (vat?: string | null): boolean => {
  const normalized = normalizeVatNumber(vat)
  if (!normalized) return false
  return /^\d{10}$/.test(normalized) || /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(normalized)
}

// Notification Service URL для отправки email
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL

const vatIdSchema = Joi.string()
  .required()
  .custom((value, helpers) => {
    const normalized = normalizeVatNumber(value)
    if (normalized && isValidVatNumber(normalized)) {
      return normalized
    }
    return helpers.error('string.pattern.base', { name: 'vatId' })
  }, 'VAT format validation')

const BillingSchema = Joi.object({
  companyName: Joi.string().min(2).max(150).required(),
  vatId: vatIdSchema,
  useSalonAddress: Joi.boolean().default(true),
  address: Joi.object({
    street: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    postalCode: Joi.string().allow('', null),
    country: Joi.string().allow('', null)
  })
    .allow(null)
    .optional()
})
  .custom((value, helpers) => {
    if (!value.useSalonAddress) {
      if (!value.address?.street || !value.address?.city || !value.address?.postalCode) {
        return helpers.error('any.custom', { message: 'Billing address is required when not using salon address' })
      }
    }
    return value
  }, 'Billing address validation')

// ПРИМЕЧАНИЕ: CSRF protection применяется через conditionalCSRF middleware в server.ts
// Не применяем csrfProtection здесь, чтобы избежать двойного применения!

/**
 * Отправляет приветственное письмо владельцу салона
 */
async function sendWelcomeEmail(email: string, firstName: string, salonName: string, resetLink: string) {
  try {
    const html = getWelcomeEmailTemplate(firstName, salonName, resetLink)

    const response = await fetch(
      `${NOTIFICATION_SERVICE_URL}/api/notify/email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Добро пожаловать в Beauty Platform - ${salonName}`,
          html,
          text: `Салон "${salonName}" создан. Установите пароль по ссылке: ${resetLink}`
        })
      }
    )

    const result = await response.json()
    console.log(`[SALON REGISTRATION] Приветственное письмо отправлено на ${email}:`, result)
    return result
  } catch (error) {
    console.error(`[SALON REGISTRATION] Ошибка при отправке приветственного письма:`, error)
    // Не выбрасываем ошибку - салон уже создан, письмо - это бонус
    return { success: false, error: error instanceof Error ? error.message : 'Email sending failed' }
  }
}

const SALON_TYPE_ALIAS_MAP: Record<string, SalonType> = {
  HAIR: SalonType.HAIR,
  HAIR_SALON: SalonType.HAIR,
  HAIRSALON: SalonType.HAIR,
  HAIR_SPA: SalonType.HAIR,
  HAIRSPA: SalonType.HAIR,
  BARBERSHOP: SalonType.BARBERSHOP,
  NAILS: SalonType.NAILS,
  NAIL: SalonType.NAILS,
  NAIL_SALON: SalonType.NAILS,
  MASSAGE: SalonType.MASSAGE,
  MASSAGE_SPA: SalonType.MASSAGE,
  MASSAGESPA: SalonType.MASSAGE,
  PET_GROOMING: SalonType.PET_GROOMING,
  PETGROOMING: SalonType.PET_GROOMING,
  GROOMING: SalonType.PET_GROOMING,
  WELLNESS: SalonType.WELLNESS,
  WELLNESS_CENTER: SalonType.WELLNESS,
  COSMETOLOGY: SalonType.COSMETOLOGY,
  BEAUTY_CLINIC: SalonType.COSMETOLOGY,
  BROW_LASH: SalonType.BROW_LASH,
  BROWLASH: SalonType.BROW_LASH,
  BROW_LASH_STUDIO: SalonType.BROW_LASH,
  CUSTOM: SalonType.MIXED,
  MIXED: SalonType.MIXED
}

const SALON_TYPE_ALLOWED_INPUTS = Array.from(
  new Set<string>([
    ...Object.keys(SALON_TYPE_ALIAS_MAP),
    ...Object.values(SALON_TYPE_ALIAS_MAP)
  ])
)

const BUSINESS_TYPE_OPTIONS = [
  'salon',
  'mobile',
  'home',
  'online',
  'hair_salon',
  'nail_salon',
  'massage_spa',
  'barbershop',
  'pet_grooming',
  'wellness',
  'cosmetology',
  'brow_lash',
  'custom'
] as const

type CustomServicePayload = {
  name: string
  price: number
  duration: number
  description?: string | null
  categoryName?: string | null
  subcategoryName?: string | null
}

const toSelectionKey = (raw: string) =>
  `service_${raw
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()}`

const buildPresetInternalKey = (category: string, subcategory: string, serviceKey: string) =>
  `${category}::${subcategory}::${serviceKey}`

const tryNormalizeSalonType = (value?: string | null): SalonType | null => {
  if (!value) return null
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '_')
  return SALON_TYPE_ALIAS_MAP[normalized] ?? null
}

const normalizeSalonType = (value: string): SalonType => {
  return tryNormalizeSalonType(value) ?? SalonType.MIXED
}

export type SalonRegistrationTransactionResult = {
  salon: {
    id: string
    slug: string
    name: string
    email: string | null
  }
  owner: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
  resetToken: string
  salonType: SalonType
  message: string
  stats: {
    categories: number
    services: number
    customServicesCreated: number
  }
  activeServiceKeys: string[]
}

export class SalonRegistrationError extends Error {
  code: string
  status: number
  details?: Record<string, unknown>

  constructor(code: string, message: string, status = 400, details?: Record<string, unknown>) {
    super(message)
    this.name = 'SalonRegistrationError'
    this.code = code
    this.status = status
    if (details) {
      this.details = details
    }
  }
}

// Rate limiting for salon registration
const salonRegistrationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 salon registrations per window
  message: {
    success: false,
    error: 'Too many salon registration attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Validation schema for salon registration
export const salonRegistrationSchema = Joi.object({
  // Owner data
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  phone: Joi.string().required(),
  language: Joi.string().valid('en', 'pl', 'ua', 'ru').required(),
  
  // Salon data
  salonName: Joi.string().min(2).max(100).required(),
  website: Joi.string().uri().optional().allow(''),
  businessType: Joi.string().valid(...BUSINESS_TYPE_OPTIONS).required(),
  salonType: Joi.string().valid(...SALON_TYPE_ALLOWED_INPUTS).required(),
  
  // Location and currency
  country: Joi.string().min(2).max(50).required(),
  currency: Joi.string().valid('PLN', 'EUR', 'USD', 'UAH').required(),
  address: Joi.object({
    street: Joi.string().allow('').optional(),
    city: Joi.string().allow('').optional(),
    postalCode: Joi.string().allow('').optional(),
    country: Joi.string().allow('').optional(),
    coordinates: Joi.object({
      lat: Joi.number().optional(),
      lng: Joi.number().optional()
    }).optional()
  }).optional(),
  billing: BillingSchema.required(),
  
  // Services and team
  serviceCategories: Joi.array().items(Joi.string()).default([]),
  selectedServiceKeys: Joi.array().items(Joi.string()).default([]),
  selectedSalonTypes: Joi.array().items(Joi.string()).default([]),
  customServices: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().min(2).max(150).required(),
        price: Joi.number().min(0).required(),
        duration: Joi.number().integer().min(5).max(600).required(),
        description: Joi.string().allow('', null).optional(),
        categoryName: Joi.string().allow('', null).optional(),
        subcategoryName: Joi.string().allow('', null).optional()
      })
    )
    .default([]),
  teamSize: Joi.string().valid('solo', 'small', 'medium', 'large').required(),
  staffSeats: Joi.number().integer().min(0).max(100).optional().default(0),
  estimatedMonthlyNetPricePln: Joi.number().min(0).optional(),
  
  // Pricing
  planType: Joi.string().valid('starter', 'team', 'business', 'enterprise').required(),
  trialPeriod: Joi.boolean().default(true),
  
  // Activation
  acceptTerms: Joi.boolean().valid(true).required(),
  subscribeNewsletter: Joi.boolean().default(true)
})

type SalonRegistrationValue = {
  [key: string]: any
}

type SalonOwnerContext = {
  id: string
  email: string
  firstName: string
  lastName: string
}

export async function createSalonWithOwner(
  tx: Prisma.TransactionClient,
  params: {
    owner: SalonOwnerContext
    value: SalonRegistrationValue
    hashedPassword: string
  }
): Promise<SalonRegistrationTransactionResult> {
  const { owner: ownerUser, value, hashedPassword } = params

  const baseSlug = value.salonName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  let salonSlug = baseSlug
  let slugCounter = 1
  while (await tx.tenant.findUnique({ where: { slug: salonSlug } })) {
    salonSlug = `${baseSlug}-${slugCounter}`
    slugCounter++
  }

  const languageMap: Record<string, Language> = {
    'en': 'EN',
    'pl': 'PL',
    'ua': 'UA',
    'ru': 'RU'
  }

  const currencyMap: Record<string, Currency> = {
    'PLN': 'PLN',
    'EUR': 'EUR',
    'USD': 'USD',
    'UAH': 'UAH'
  }

  const salonTypeEnum = tryNormalizeSalonType(value.salonType) ?? SalonType.MIXED
  const selectedServiceKeysInput: string[] = Array.isArray(value.selectedServiceKeys)
    ? value.selectedServiceKeys
    : []
  const selectedSalonTypesInput: string[] = Array.isArray(value.selectedSalonTypes)
    ? value.selectedSalonTypes
    : []
  const customServicesInput: CustomServicePayload[] = Array.isArray(value.customServices)
    ? value.customServices
    : []

  // Generate unique salon number (8 characters, random alphanumeric - secure)
  // Исключаем похожие символы: 0/O, 1/I/l для удобства чтения
  const generateSecureSalonCode = (): string => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Без 0, O, 1, I, L
    let code = '';
    for (let i = 0; i < 8; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
    return code;
  };

  // Генерируем уникальный код (проверяем на коллизии)
  let salonNumber: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    salonNumber = generateSecureSalonCode();
    const existing = await tx.tenant.findUnique({
      where: { salonNumber }
    });
    if (!existing) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique salon number after 10 attempts');
  }

  console.log(`[SALON REG] Generated secure salon code: ${salonNumber} (attempt ${attempts + 1})`)

  const resolvedSalonTypes = selectedSalonTypesInput
    .map(type => tryNormalizeSalonType(type))
    .filter((type): type is SalonType => Boolean(type))

  const presetSourceTypes =
    resolvedSalonTypes.length > 0
      ? resolvedSalonTypes
      : salonTypeEnum
        ? [salonTypeEnum]
        : Object.values(SalonType)

  const presetDefinitions = presetSourceTypes.flatMap(type => SALON_SERVICE_PRESETS[type] ?? [])
  const serviceKeyMap = new Map<string, string>()

  for (const preset of presetDefinitions) {
    for (const svc of preset.services) {
      const internalKey = buildPresetInternalKey(preset.category, preset.subcategory, svc.key)
      const keyVariants = [
        internalKey,
        internalKey.replace(/::/g, '_'),
        svc.key,
        svc.key.replace(/[^\w]+/g, '_'),
        toSelectionKey(svc.key)
      ]

      keyVariants.forEach(variant => {
        if (variant) {
          serviceKeyMap.set(variant.toLowerCase(), internalKey)
        }
      })
    }
  }

  const invalidServiceKeys: string[] = []
  const normalizedActiveServiceKeys: string[] = []

  for (const rawKey of selectedServiceKeysInput) {
    const trimmedKey = typeof rawKey === 'string' ? rawKey.trim() : ''
    if (!trimmedKey) continue

    const mappedKey = serviceKeyMap.get(trimmedKey.toLowerCase())
    if (!mappedKey) {
      invalidServiceKeys.push(trimmedKey)
      continue
    }
    normalizedActiveServiceKeys.push(mappedKey)
  }

  if (invalidServiceKeys.length) {
    throw new SalonRegistrationError(
      'INVALID_SERVICE_KEYS',
      `One or more service keys are invalid: ${invalidServiceKeys.join(', ')}`,
      400,
      { invalidKeys: invalidServiceKeys }
    )
  }

  const activeServiceKeys = Array.from(new Set(normalizedActiveServiceKeys))
  const sanitizedCustomServices = customServicesInput.map(service => ({
    name: service.name.trim(),
    price: Number(service.price),
    duration: Number(service.duration),
    description: service.description ? service.description.trim() : null,
    categoryName: service.categoryName ? service.categoryName.trim() : null,
    subcategoryName: service.subcategoryName ? service.subcategoryName.trim() : null
  }))

  const billingInfo = value.billing ?? null
  const resolvedBillingAddress = billingInfo?.useSalonAddress
    ? {
        street: value.address?.street ?? null,
        city: value.address?.city ?? null,
        postalCode: value.address?.postalCode ?? null,
        country: value.address?.country ?? value.country ?? null
      }
    : {
        street: billingInfo?.address?.street ?? null,
        city: billingInfo?.address?.city ?? null,
        postalCode: billingInfo?.address?.postalCode ?? null,
        country: billingInfo?.address?.country ?? null
      }

  const salon = await tx.tenant.create({
    data: {
      slug: salonSlug,
      name: value.salonName,
      description: `Beauty salon - ${value.businessType}`,
      email: value.email,
      phone: value.phone,
      website: value.website || null,
      country: value.country,
      city: value.address?.city || null,
      address: value.address?.street || null,
      postalCode: value.address?.postalCode || null,
      billingCompanyName: billingInfo?.companyName ?? null,
      billingVatId: billingInfo?.vatId ?? null,
      billingUseSalonAddress: billingInfo?.useSalonAddress ?? true,
      billingAddress: resolvedBillingAddress?.street ?? null,
      billingCity: resolvedBillingAddress?.city ?? null,
      billingPostalCode: resolvedBillingAddress?.postalCode ?? null,
      billingCountry: resolvedBillingAddress?.country ?? null,
      currency: currencyMap[value.currency] || 'PLN',
      language: languageMap[value.language] || 'EN',
      timezone: 'Europe/Warsaw',
      salonType: salonTypeEnum,
      salonNumber: salonNumber, // Постоянный 8-значный уникальный код салона (безопасный)
      status: 'ACTIVE',
      isActive: true
    }
  })

  await tx.tenantOwner.create({
    data: {
      tenantId: salon.id,
      userId: ownerUser.id,
      isPrimary: true,
      share: 100
    }
  })

  console.log(`[SALON REG] TenantOwner created: user ${ownerUser.id} owns tenant ${salon.id}`)

  await tx.userTenantRole.create({
    data: {
      userId: ownerUser.id,
      tenantId: salon.id,
      role: 'OWNER',
      isActive: true,
      grantedAt: new Date()
    }
  })

  console.log(`[SALON REG] UserTenantRole created: user ${ownerUser.id} has OWNER role in tenant ${salon.id}`)

  await seedDefaultCategories(tx, salon.id, salonTypeEnum)
  const serviceSeedOptions = activeServiceKeys.length ? { activeServiceKeys } : undefined
  await seedDefaultServices(tx, salon.id, salonTypeEnum, serviceSeedOptions)

  let customServicesCreated = 0

  if (sanitizedCustomServices.length > 0) {
    const categories = await tx.serviceCategory.findMany({
      where: { tenantId: salon.id },
      include: { subcategories: true },
      orderBy: { order: 'asc' }
    })

    const categoryMap = new Map<
      string,
      {
        id: string
        name: string
        order: number
        subcategories: Array<{ id: string; name: string; order: number }>
      }
    >()

    for (const category of categories) {
      categoryMap.set(category.name.toLowerCase(), {
        id: category.id,
        name: category.name,
        order: category.order,
        subcategories: category.subcategories.map(sub => ({
          id: sub.id,
          name: sub.name,
          order: sub.order
        }))
      })
    }

    let nextCategoryOrder = categories.length

    for (const customService of sanitizedCustomServices) {
      let categoryId: string | null = null
      let subcategoryId: string | null = null
      let categoryKey: string | null = null

      if (customService.categoryName) {
        categoryKey = customService.categoryName.toLowerCase()
        let existingCategory = categoryMap.get(categoryKey)

        if (!existingCategory) {
          const createdCategory = await tx.serviceCategory.create({
            data: {
              tenantId: salon.id,
              name: customService.categoryName,
              icon: null,
              order: nextCategoryOrder,
              isDefault: false,
              isActive: true
            }
          })

          existingCategory = {
            id: createdCategory.id,
            name: createdCategory.name,
            order: createdCategory.order,
            subcategories: []
          }

          categoryMap.set(categoryKey, existingCategory)
          nextCategoryOrder++
        }

        categoryId = existingCategory.id
      }

      if (categoryId && categoryKey && customService.subcategoryName) {
        const subcategoryKey = customService.subcategoryName.toLowerCase()
        const categoryEntry = categoryMap.get(categoryKey)

        if (categoryEntry) {
          let existingSubcategory = categoryEntry.subcategories.find(
            sub => sub.name.toLowerCase() === subcategoryKey
          )

          if (!existingSubcategory) {
            const createdSubcategory = await tx.serviceSubcategory.create({
              data: {
                categoryId: categoryEntry.id,
                name: customService.subcategoryName,
                order: categoryEntry.subcategories.length,
                isDefault: false,
                isActive: true
              }
            })

            existingSubcategory = {
              id: createdSubcategory.id,
              name: createdSubcategory.name,
              order: createdSubcategory.order
            }

            categoryEntry.subcategories.push(existingSubcategory)
          }

          subcategoryId = existingSubcategory.id
        }
      }

      const existingService = await tx.service.findFirst({
        where: {
          tenantId: salon.id,
          name: customService.name
        }
      })

      const baseServiceData = {
        name: customService.name,
        description: customService.description,
        duration: customService.duration,
        price: new Prisma.Decimal(customService.price),
        status: 'ACTIVE' as const,
        isDefault: false,
        isActive: true,
        categoryId,
        subcategoryId
      }

      if (existingService) {
        await tx.service.update({
          where: { id: existingService.id },
          data: baseServiceData
        })
      } else {
        await tx.service.create({
          data: {
            tenantId: salon.id,
            ...baseServiceData
          }
        })
        customServicesCreated++
      }
    }
  }

  const [categoryCount, serviceCount] = await Promise.all([
    tx.serviceCategory.count({ where: { tenantId: salon.id } }),
    tx.service.count({ where: { tenantId: salon.id } })
  ])

  const staffMembers = [
    { firstName: 'Мария', lastName: 'Иванова', email: 'master1@' + salonSlug + '.ru', role: 'STAFF_MEMBER', color: '#ef4444' },
    { firstName: 'Елена', lastName: 'Петрова', email: 'master2@' + salonSlug + '.ru', role: 'STAFF_MEMBER', color: '#10b981' }
  ]

  if (value.teamSize !== 'solo') {
    for (const staff of staffMembers) {
      await tx.user.create({
        data: {
          email: staff.email,
          password: hashedPassword,
          firstName: staff.firstName,
          lastName: staff.lastName,
          phone: '+48 500 000 001',
          role: staff.role as UserRole,
          color: staff.color,
          status: 'ACTIVE',
          emailVerified: true,
          tenantId: salon.id
        }
      })
    }
  }

  if (['medium', 'large'].includes(value.teamSize)) {
    await tx.user.create({
      data: {
        email: 'manager@' + salonSlug + '.ru',
        password: hashedPassword,
        firstName: 'Ольга',
        lastName: 'Менеджер',
        phone: '+48 500 000 002',
        role: 'MANAGER',
        color: '#8b5cf6',
        status: 'ACTIVE',
        emailVerified: true,
        tenantId: salon.id
      }
    })
  }

  if (value.teamSize === 'large') {
    await tx.user.create({
      data: {
        email: 'reception@' + salonSlug + '.ru',
        password: hashedPassword,
        firstName: 'Светлана',
        lastName: 'Администратор',
        phone: '+48 500 000 003',
        role: 'RECEPTIONIST',
        color: '#f59e0b',
        status: 'ACTIVE',
        emailVerified: true,
        tenantId: salon.id
      }
    })
  }

  // Generate password reset token for owner (24h TTL)
  const { token: resetToken, hash: resetHash, expiresAt } = generatePasswordResetToken(24)
  await tx.user.update({
    where: { id: ownerUser.id },
    data: {
      passwordResetToken: resetHash,
      passwordResetExpiresAt: expiresAt
    }
  })

  return {
    salon,
    owner: {
      id: ownerUser.id,
      email: ownerUser.email,
      firstName: ownerUser.firstName,
      lastName: ownerUser.lastName
    },
    resetToken,
    salonType: salonTypeEnum,
    message: 'Salon created successfully',
    stats: {
      categories: categoryCount,
      services: serviceCount,
      customServicesCreated
    },
    activeServiceKeys
  }
}

/**
 * GET /salon-registration/csrf-token
 * Get CSRF token for salon registration form
 */
router.get('/csrf-token', (req, res): void => {
  res.json({
    success: true,
    csrfToken: req.csrfToken(),
    message: 'CSRF token generated for salon registration'
  })
})

/**
 * GET /salon-registration
 * Get salon registration form with CSRF token
 * (alias for /csrf-token for easier use)
 */
router.get('/', (req, res): void => {
  res.json({
    success: true,
    csrfToken: req.csrfToken(),
    message: 'CSRF token generated for salon registration'
  })
})

/**
 * POST /salon-registration/create
 * Create new salon and owner account
 */
router.post('/create', salonRegistrationRateLimit, async (req, res): Promise<void> => {
  try {
    const result = await tenantPrisma(null).$transaction(async (tx) => {
      const { error, value } = salonRegistrationSchema.validate(req.body)
      if (error) {
        throw new SalonRegistrationError(
          'VALIDATION_ERROR',
          `Validation error: ${error.details.map(d => d.message).join(', ')}`,
          400
        )
      }

      const hashedPassword = await bcrypt.hash(value.password, 12)

      const existingUser = await tx.user.findUnique({
        where: { email: value.email },
        include: {
          ownedTenants: true,
          tenantRoles: true,
          clientProfile: true
        }
      })

      if (existingUser) {
        throw new SalonRegistrationError(
          'ACCOUNT_EXISTS',
          'Account already exists. Please login and create a salon from your dashboard.',
          409,
          { requiresLogin: true }
        )
      }

      console.log(`[SALON REG] Creating new global user account: ${value.email}`)

      const newUser = await tx.user.create({
        data: {
          email: value.email,
          password: hashedPassword,
          firstName: value.firstName,
          lastName: value.lastName,
          phone: value.phone,
          role: 'SALON_OWNER',
          color: '#6366f1',
          status: 'ACTIVE',
          emailVerified: true,
          tenantId: null
        }
      })

      console.log(`[SALON REG] New user created: ${newUser.id}`)

      return createSalonWithOwner(tx, {
        owner: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName
        },
        value,
        hashedPassword
      })
    }) as SalonRegistrationTransactionResult

    const forwardedProtoHeader = req.headers['x-forwarded-proto'] as string | undefined
    const forwardedHostHeader = req.headers['x-forwarded-host'] as string | undefined
    const forwardedProto = forwardedProtoHeader?.split(',')[0]?.trim()
    const forwardedHost = forwardedHostHeader?.split(',')[0]?.trim()

    const derivedBaseUrl = forwardedHost
      ? `${forwardedProto ?? req.protocol}://${forwardedHost}`
      : `${req.protocol}://${req.get('host')}`

    const frontendBase =
      process.env.FRONTEND_BASE_URL ||
      process.env.CRM_URL ||
      derivedBaseUrl ||
      'https://salon.beauty.designcorp.eu'

    const normalizedBase = frontendBase.replace(/\/$/, '')
    const resetLink = `${normalizedBase}/auth/reset-password?token=${result.resetToken}`

    sendWelcomeEmail(
      result.owner.email,
      result.owner.firstName,
      result.salon.name,
      resetLink
    ).catch(err => {
      console.error('Failed to send welcome email:', err)
    })

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        salon: {
          id: result.salon.id,
          slug: result.salon.slug,
          name: result.salon.name,
          email: result.salon.email,
          salonType: result.salonType
        },
        owner: {
          id: result.owner.id,
          email: result.owner.email,
          firstName: result.owner.firstName,
          lastName: result.owner.lastName
        },
        categories: {
          total: result.stats.categories,
          services: result.stats.services,
          customServicesCreated: result.stats.customServicesCreated
        },
        services: {
          activeKeys: result.activeServiceKeys
        }
      }
    })

  } catch (error) {
    console.error('Salon registration error:', error)

    if (error instanceof SalonRegistrationError) {
      res.status(error.status).json({
        success: false,
        error: error.message,
        code: error.code,
        ...(error.details ?? {})
      })
      return
    }

    if (error instanceof Error) {
      if (error.message.startsWith('INVALID_SERVICE_KEYS:')) {
        const invalidKeys = error.message.split(':')[1]?.split(',').filter(Boolean) ?? []
        res.status(400).json({
          success: false,
          error: 'One or more service keys are invalid',
          code: 'INVALID_SERVICE_KEYS',
          invalidKeys
        })
        return
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create salon',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /salon-registration/check-email/:email
 * Check if email is already registered
 */
router.get('/check-email/:email', async (req, res): Promise<void> => {
  try {
    const { email } = req.params

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      })
      return
    }

    const existingUser = await tenantPrisma(null).user.findUnique({
      where: { email: email.toLowerCase() }
    })

    res.json({
      success: true,
      available: !existingUser,
      message: existingUser ? 'Email already registered' : 'Email available'
    })

  } catch (error) {
    console.error('Check email error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check email availability',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /salon-registration/check-slug/:slug
 * Check if salon slug is available
 */
router.get('/check-slug/:slug', async (req, res): Promise<void> => {
  try {
    const { slug } = req.params

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      res.status(400).json({
        success: false,
        error: 'Invalid slug format',
        code: 'INVALID_SLUG'
      })
      return
    }

    const existingTenant = await tenantPrisma(null).tenant.findUnique({
      where: { slug }
    })

    res.json({
      success: true,
      available: !existingTenant,
      message: existingTenant ? 'Slug already taken' : 'Slug available'
    })

  } catch (error) {
    console.error('Check slug error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check slug availability',
      code: 'INTERNAL_ERROR'
    })
  }
})

export default router
