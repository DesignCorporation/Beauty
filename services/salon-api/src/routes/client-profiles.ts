import express, { type NextFunction, type Response, type Router } from 'express'
import { z } from 'zod'
import {
  prisma,
  Prisma,
  PrismaPromise,
  ClientSource,
  LoyaltyTier,
  Gender
} from '@beauty-platform/database'
import { assertAuth } from '@beauty/shared'
import type { TenantRequest } from '../middleware/tenant'

const router: Router = express.Router()

const wrapTenantRoute =
  (handler: (req: TenantRequest, res: Response) => Promise<void | Response>) =>
  async (req: express.Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req as TenantRequest, res)
    } catch (error) {
      next(error)
    }
  }

const AUTH_REQUIRED_ERROR = 'Authentication required'

const requireTenantContext = (
  req: TenantRequest,
  res: Response
): { tenantId: string } | null => {
  try {
    const auth = assertAuth(req)
    const tenantId = req.tenantId ?? auth.tenantId

    if (!tenantId) {
      res.status(403).json({
        success: false,
        error: 'Tenant context is required'
      })
      return null
    }

    return { tenantId }
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
      return null
    }
    throw error
  }
}

type RelationWithProfile = Prisma.ClientSalonRelationGetPayload<{
  include: { client: true }
}>

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .trim()
    .transform((val) => (val.length > 0 ? val : undefined))
    .optional(),
  tier: z.nativeEnum(LoyaltyTier).optional(),
  source: z.nativeEnum(ClientSource).optional()
})

const CreateClientSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  source: z.nativeEnum(ClientSource),
  phone: z.string().min(5).max(32).optional(),
  birthdate: z
    .string()
    .datetime()
    .or(z.date())
    .optional(),
  gender: z.nativeEnum(Gender).optional(),
  marketingConsent: z.boolean().optional(),
  preferredLanguage: z.string().optional(),
  referralCode: z.string().optional(),
  referredBy: z.string().email().optional(),
  salonNotes: z.string().optional(),
  loyaltyTier: z.nativeEnum(LoyaltyTier).optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
  totalSpent: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : Number.parseFloat(String(value))
    ),
  isPrimary: z.boolean().optional()
})

const UpdateClientSchema = z.object({
  profile: z
    .object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().min(5).max(32).nullable().optional(),
      birthdate: z
        .string()
        .datetime()
        .or(z.date())
        .nullable()
        .optional(),
      gender: z.nativeEnum(Gender).nullable().optional(),
      marketingConsent: z.boolean().optional(),
      preferredLanguage: z.string().optional(),
      referralCode: z.string().optional(),
      referredBy: z.string().email().nullable().optional(),
      isActive: z.boolean().optional()
    })
    .optional(),
  salonRelation: z
    .object({
      salonNotes: z.string().nullable().optional(),
      loyaltyTier: z.nativeEnum(LoyaltyTier).optional(),
      loyaltyPoints: z.number().int().min(0).optional(),
      totalSpent: z
        .union([z.string(), z.number()])
        .optional()
        .transform((value) =>
          value === undefined ? undefined : Number.parseFloat(String(value))
        ),
      visitCount: z.number().int().min(0).optional(),
      isPrimary: z.boolean().optional(),
      isActive: z.boolean().optional()
    })
    .optional()
})

const LOYALTY_THRESHOLDS: Record<LoyaltyTier, number> = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  PLATINUM: 10000
}

const tierOrder: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']

const formatDate = (value: Date | null | undefined) =>
  value ? value.toISOString() : null

const mapRelationToResponse = (relation: RelationWithProfile) => {
  const points = relation.loyaltyPoints ?? 0
  const totalSpent = relation.totalSpent ? Number(relation.totalSpent) : 0
  const nextTier = tierOrder.find((tier) => LOYALTY_THRESHOLDS[tier] > points)
  const pointsToNextTier =
    nextTier != null ? LOYALTY_THRESHOLDS[nextTier] - points : 0

  return {
    profile: {
      email: relation.client.email,
      firstName: relation.client.firstName,
      lastName: relation.client.lastName,
      phone: relation.client.phone,
      phoneVerified: relation.client.phoneVerified,
      birthdate: formatDate(relation.client.birthdate),
      gender: relation.client.gender,
      avatar: (relation.client as any).avatar,
      googleId: relation.client.googleId,
      joinedPortalAt: formatDate(relation.client.joinedPortalAt),
      source: relation.client.source,
      referredBy: relation.client.referredBy,
      referralCode: relation.client.referralCode,
      referralCount: relation.client.referralCount,
      preferredLanguage: relation.client.preferredLanguage,
      marketingConsent: relation.client.marketingConsent,
      isActive: relation.client.isActive,
      status: relation.client.status,
      createdAt: formatDate(relation.client.createdAt),
      updatedAt: formatDate(relation.client.updatedAt)
    },
    salonRelation: {
      id: relation.id,
      tenantId: relation.tenantId,
      salonNotes: relation.salonNotes,
      visitCount: relation.visitCount,
      lastVisitAt: formatDate(relation.lastVisitAt),
      joinedSalonAt: formatDate(relation.joinedSalonAt),
      loyaltyTier: relation.loyaltyTier,
      loyaltyPoints: relation.loyaltyPoints,
      totalSpent: totalSpent.toFixed(2),
      isActive: relation.isActive,
      isPrimary: relation.isPrimary
    },
    loyalty: {
      tier: relation.loyaltyTier,
      points,
      nextTier,
      pointsToNextTier: nextTier ? pointsToNextTier : 0
    },
    stats: {
      visitCount: relation.visitCount,
      totalSpent: totalSpent.toFixed(2),
      lastVisitAt: formatDate(relation.lastVisitAt)
    }
  }
}

router.get(
  '/',
  wrapTenantRoute(async (req, res) => {
  const parseResult = ListQuerySchema.safeParse(req.query)

  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid query parameters',
      details: parseResult.error.flatten()
    })
    return
  }

  const { page, limit, search, tier, source } = parseResult.data
  const skip = (page - 1) * limit

  try {
    const context = requireTenantContext(req, res)
    if (!context) {
      return
    }
    const { tenantId } = context

    const relationWhere: Prisma.ClientSalonRelationWhereInput = {
      tenantId,
      isActive: true
    }

    if (tier) {
      relationWhere.loyaltyTier = tier
    }

    if (search || source) {
      const clientWhere: Prisma.ClientProfileWhereInput = {}

      if (search) {
        clientWhere.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } }
        ]
      }

      if (source) {
        clientWhere.source = source
      }

      if (Object.keys(clientWhere).length > 0) {
        relationWhere.client = clientWhere
      }
    }

    const [relations, total] = await Promise.all([
      prisma.clientSalonRelation.findMany({
        where: relationWhere,
        include: { client: true },
        orderBy: [
          { loyaltyPoints: 'desc' },
          { client: { joinedPortalAt: 'desc' } }
        ],
        skip,
        take: limit
      }),
      prisma.clientSalonRelation.count({ where: relationWhere })
    ])

    const clients = relations.map(mapRelationToResponse)

    res.json({
      success: true,
      data: {
        clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
    return
  } catch (error) {
    console.error('Error fetching client profiles:', error)

    res.status(500).json({
      success: false,
      error: 'Failed to fetch client profiles'
    })
    return
  }
  })
)

router.post(
  '/',
  wrapTenantRoute(async (req, res) => {
  const parseResult = CreateClientSchema.safeParse(req.body)

  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: parseResult.error.flatten()
    })
  }

  const data = parseResult.data
  const birthdate =
    data.birthdate instanceof Date
      ? data.birthdate
      : data.birthdate
      ? new Date(data.birthdate)
      : undefined

  try {
    const context = requireTenantContext(req, res)
    if (!context) {
      return
    }
    const { tenantId } = context

    const emailLower = data.email.toLowerCase()

    const [relation] = await prisma.$transaction(async (tx) => {
      const clientProfileCreate: Prisma.ClientProfileCreateInput = {
        email: emailLower,
        firstName: data.firstName,
        lastName: data.lastName,
        source: data.source,
        marketingConsent: data.marketingConsent ?? false,
        preferredLanguage: (data.preferredLanguage as any) ?? 'RU'
      }

      if (data.phone) {
        clientProfileCreate.phone = data.phone
      }
      if (birthdate) {
        clientProfileCreate.birthdate = birthdate
      }
      if (data.gender) {
        clientProfileCreate.gender = data.gender
      }
      if (data.referralCode) {
        clientProfileCreate.referralCode = data.referralCode
      }
      if (data.referredBy) {
        clientProfileCreate.referredBy = data.referredBy
      }

      const clientProfileUpdate: Prisma.ClientProfileUpdateInput = {}
      clientProfileUpdate.firstName = data.firstName
      clientProfileUpdate.lastName = data.lastName
      if (data.phone !== undefined) {
        clientProfileUpdate.phone = data.phone
      }
      if (birthdate !== undefined) {
        clientProfileUpdate.birthdate = birthdate ?? null
      }
      if (data.gender !== undefined) {
        clientProfileUpdate.gender = data.gender
      }
      if (data.marketingConsent !== undefined) {
        clientProfileUpdate.marketingConsent = data.marketingConsent
      }
      if (data.preferredLanguage !== undefined) {
        clientProfileUpdate.preferredLanguage = data.preferredLanguage as any
      }
      if (data.referralCode !== undefined) {
        clientProfileUpdate.referralCode = data.referralCode
      }
      if (data.referredBy !== undefined) {
        clientProfileUpdate.referredBy = data.referredBy
      }

      await tx.clientProfile.upsert({
        where: { email: emailLower },
        create: clientProfileCreate,
        update: clientProfileUpdate
      })

      const relationCreate: Prisma.ClientSalonRelationUncheckedCreateInput = {
        clientEmail: emailLower,
        tenantId,
        loyaltyTier: data.loyaltyTier ?? LoyaltyTier.BRONZE,
        loyaltyPoints: data.loyaltyPoints ?? 0,
        totalSpent: new Prisma.Decimal(data.totalSpent ?? 0),
        isPrimary: data.isPrimary ?? false,
        isActive: true
      }
      if (data.salonNotes !== undefined) {
        relationCreate.salonNotes = data.salonNotes
      }

      const relationUpdate: Prisma.ClientSalonRelationUncheckedUpdateInput = {
        isActive: true
      }
      if (data.salonNotes !== undefined) {
        relationUpdate.salonNotes = data.salonNotes
      }
      if (data.loyaltyTier !== undefined) {
        relationUpdate.loyaltyTier = data.loyaltyTier
      }
      if (data.loyaltyPoints !== undefined) {
        relationUpdate.loyaltyPoints = data.loyaltyPoints
      }
      if (data.totalSpent !== undefined) {
        relationUpdate.totalSpent = new Prisma.Decimal(data.totalSpent)
      }
      if (data.isPrimary !== undefined) {
        relationUpdate.isPrimary = data.isPrimary
      }

      const relation = await tx.clientSalonRelation.upsert({
        where: {
          clientEmail_tenantId: {
            clientEmail: emailLower,
            tenantId
          }
        },
        create: relationCreate,
        update: relationUpdate,
        include: { client: true }
      })

      return [relation]
    })

    return res.status(201).json({
      success: true,
      data: mapRelationToResponse(relation as any)
    })
  } catch (error) {
    console.error('Error creating client profile:', error)

    return res.status(500).json({
      success: false,
      error: 'Failed to create client profile'
    })
  }
  })
)

router.get(
  '/:email',
  wrapTenantRoute(async (req, res) => {
  const emailParam = req.params.email
  if (!emailParam) {
    return res.status(400).json({
      success: false,
      error: 'Email parameter is required'
    })
  }
  const email = emailParam.toLowerCase()

  try {
    const context = requireTenantContext(req, res)
    if (!context) {
      return
    }
    const { tenantId } = context

    const relation = await prisma.clientSalonRelation.findFirst({
      where: {
        tenantId,
        clientEmail: email,
        isActive: true
      },
      include: { client: true }
    })

    if (!relation) {
      return res.status(404).json({
        success: false,
        error: 'Client profile not found for this tenant'
      })
    }

    return res.json({
      success: true,
      data: mapRelationToResponse(relation as any)
    })
  } catch (error) {
    console.error('Error fetching client profile:', error)

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch client profile'
    })
  }
  })
)

router.put(
  '/:email',
  wrapTenantRoute(async (req, res) => {
  const emailParam = req.params.email
  if (!emailParam) {
    return res.status(400).json({
      success: false,
      error: 'Email parameter is required'
    })
  }
  const email = emailParam.toLowerCase()
  const parseResult = UpdateClientSchema.safeParse(req.body)

  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: parseResult.error.flatten()
    })
  }

  const { profile, salonRelation } = parseResult.data

  if (!profile && !salonRelation) {
    return res.status(400).json({
      success: false,
      error: 'No data provided for update'
    })
  }

  try {
    const context = requireTenantContext(req, res)
    if (!context) {
      return
    }
    const { tenantId } = context

    const operations: PrismaPromise<any>[] = []

    if (profile) {
      const profileData: Prisma.ClientProfileUpdateInput = {}

      if (profile.firstName !== undefined) profileData.firstName = profile.firstName
      if (profile.lastName !== undefined) profileData.lastName = profile.lastName
      if (profile.phone !== undefined) profileData.phone = profile.phone
      if (profile.birthdate !== undefined) {
        profileData.birthdate =
          profile.birthdate === null
            ? null
            : profile.birthdate instanceof Date
            ? profile.birthdate
            : new Date(profile.birthdate)
      }
      if (profile.gender !== undefined) profileData.gender = profile.gender
      if (profile.marketingConsent !== undefined) {
        profileData.marketingConsent = profile.marketingConsent
      }
      if (profile.preferredLanguage !== undefined) {
        profileData.preferredLanguage = profile.preferredLanguage as any
      }
      if (profile.referralCode !== undefined) {
        profileData.referralCode = profile.referralCode
      }
      if (profile.referredBy !== undefined) {
        profileData.referredBy = profile.referredBy
      }
      if (profile.isActive !== undefined) {
        profileData.isActive = profile.isActive
      }

      operations.push(
        prisma.clientProfile.update({
          where: { email },
          data: profileData
        })
      )
    }

    if (salonRelation) {
      const relationData: Prisma.ClientSalonRelationUpdateInput = {}

      if (salonRelation.salonNotes !== undefined) {
        relationData.salonNotes = salonRelation.salonNotes
      }
      if (salonRelation.loyaltyTier !== undefined) {
        relationData.loyaltyTier = salonRelation.loyaltyTier
      }
      if (salonRelation.loyaltyPoints !== undefined) {
        relationData.loyaltyPoints = salonRelation.loyaltyPoints
      }
      if (salonRelation.totalSpent !== undefined) {
        relationData.totalSpent = new Prisma.Decimal(salonRelation.totalSpent)
      }
      if (salonRelation.visitCount !== undefined) {
        relationData.visitCount = salonRelation.visitCount
      }
      if (salonRelation.isPrimary !== undefined) {
        relationData.isPrimary = salonRelation.isPrimary
      }
      if (salonRelation.isActive !== undefined) {
        relationData.isActive = salonRelation.isActive
      }

      operations.push(
        prisma.clientSalonRelation.updateMany({
          where: {
            tenantId,
            clientEmail: email
          },
          data: relationData
        })
      )
    }

    await prisma.$transaction(operations)

    const updatedRelation = await prisma.clientSalonRelation.findFirst({
      where: {
        tenantId,
        clientEmail: email
      },
      include: { client: true }
    })

    if (!updatedRelation) {
      return res.status(404).json({
        success: false,
        error: 'Client profile not found for this tenant'
      })
    }

    return res.json({
      success: true,
      data: mapRelationToResponse(updatedRelation as any)
    })
  } catch (error) {
    console.error('Error updating client profile:', error)

    return res.status(500).json({
      success: false,
      error: 'Failed to update client profile'
    })
  }
  })
)

router.delete(
  '/:email',
  wrapTenantRoute(async (req, res) => {
  const emailParam = req.params.email
  if (!emailParam) {
    return res.status(400).json({
      success: false,
      error: 'Email parameter is required'
    })
  }
  const email = emailParam.toLowerCase()

  try {
    const context = requireTenantContext(req, res)
    if (!context) {
      return
    }
    const { tenantId } = context

    const result = await prisma.clientSalonRelation.updateMany({
      where: {
        tenantId,
        clientEmail: email,
        isActive: true
      },
      data: {
        isActive: false
      }
    })

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client profile not found or already inactive'
      })
    }

    return res.json({
      success: true,
      message: 'Client relation deactivated for tenant',
      data: {
        tenantId,
        email
      }
    })
  } catch (error) {
    console.error('Error deactivating client profile:', error)

    return res.status(500).json({
      success: false,
      error: 'Failed to deactivate client profile'
    })
  }
  })
)

export default router
