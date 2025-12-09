import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import { prisma } from '@beauty-platform/database'
import type { TenantRequest } from '../middleware/tenant'

const router: Router = express.Router()
const wrapTenantMiddleware =
  (middleware: (req: TenantRequest, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction): void =>
    middleware(req as TenantRequest, res, next)

const wrapTenantRoute =
  (handler: (req: TenantRequest, res: Response) => Promise<void> | void) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req as TenantRequest, res)
    } catch (error) {
      next(error)
    }
  }

const CLIENT_PORTAL_JOIN_URL = process.env.CLIENT_PORTAL_JOIN_URL || 'https://client.beauty.designcorp.eu/add-salon'

const NON_CLIENT_ROLES = new Set(['SUPER_ADMIN', 'SALON_OWNER', 'MANAGER', 'STAFF_MEMBER', 'RECEPTIONIST', 'ACCOUNTANT'])

const ensureStaffAccess = (req: TenantRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !NON_CLIENT_ROLES.has(req.user.role ?? '')) {
    res.status(403).json({
      success: false,
      error: 'ACCESS_DENIED',
      message: 'Only salon staff can manage invite codes'
    })
    return
  }

  if (!req.tenantId) {
    res.status(403).json({
      success: false,
      error: 'TENANT_REQUIRED',
      message: 'Tenant ID is required to manage invite codes'
    })
    return
  }

  next()
}

const generateInviteCode = (length = 8): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * characters.length)
    code += characters[index]
  }
  return code
}

router.use(wrapTenantMiddleware(ensureStaffAccess))

router.get('/', wrapTenantRoute(async (req, res): Promise<void> => {
  try {
    const codes = await prisma.salonInviteCode.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: { createdAt: 'desc' }
    })

    const payload = codes.map(code => ({
      id: code.id,
      code: code.code,
      shareUrl: `${CLIENT_PORTAL_JOIN_URL}?code=${encodeURIComponent(code.code)}`,
      usageCount: code.usageCount,
      maxUses: code.maxUses,
      expiresAt: code.expiresAt,
      lastUsedAt: code.lastUsedAt,
      createdAt: code.createdAt,
      createdBy: code.createdBy
    }))

    res.json({
      success: true,
      data: payload
    })
  } catch (error) {
    console.error('[InviteCodes] Failed to fetch codes', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to load invite codes'
    })
  }
}))

router.post('/', wrapTenantRoute(async (req, res): Promise<void> => {
  try {
    const { maxUses, expiresAt } = req.body as { maxUses?: number; expiresAt?: string }
    const normalizedMaxUses = typeof maxUses === 'number' && maxUses > 0 ? Math.floor(maxUses) : null
    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null

    if (parsedExpiresAt && Number.isNaN(parsedExpiresAt.getTime())) {
      res.status(400).json({
        success: false,
        error: 'INVALID_EXPIRES_AT',
        message: 'expiresAt must be a valid ISO date-time string'
      })
      return
    }

    let code = generateInviteCode()
    let attempts = 0

    while (attempts < 5) {
      const existing = await prisma.salonInviteCode.findUnique({ where: { code } })
      if (!existing) break
      code = generateInviteCode()
      attempts += 1
    }

    if (attempts >= 5) {
      res.status(500).json({
        success: false,
        error: 'CODE_GENERATION_FAILED',
        message: 'Failed to generate unique invite code. Please retry.'
      })
      return
    }

    const record = await prisma.salonInviteCode.create({
      data: {
        tenantId: req.tenantId!,
        code,
        createdBy: req.user?.email || req.user?.userId || null,
        maxUses: normalizedMaxUses,
        expiresAt: parsedExpiresAt
      }
    })

    res.status(201).json({
      success: true,
      data: {
        id: record.id,
        code: record.code,
        shareUrl: `${CLIENT_PORTAL_JOIN_URL}?code=${encodeURIComponent(record.code)}`,
        maxUses: record.maxUses,
        usageCount: record.usageCount,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt
      }
    })
    return
  } catch (error) {
    console.error('[InviteCodes] Failed to create code', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create invite code'
    })
  }
}))

export default router;
