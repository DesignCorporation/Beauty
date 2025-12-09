/**
 * Role Management API
 * Multi-Tenant Role System - управление владельцами и ролями
 *
 * Endpoints:
 * - GET /users/:id/tenants - список салонов пользователя
 * - GET /tenants/:id/owners - список владельцев салона
 * - POST /tenants/:id/owners - добавить со-владельца
 * - POST /users/:userId/tenants/:tenantId/roles - назначить роль
 * - DELETE /users/:userId/tenants/:tenantId/roles/:role - отозвать роль
 * - GET /users/:userId/tenants/:tenantId/roles - получить роли пользователя в салоне
 */

import express, { type Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { TenantRole } from '@prisma/client'
import { prisma } from '@beauty-platform/database'
import {
  getUserTenants,
  getTenantOwners,
  addTenantOwner,
  grantTenantRole,
  revokeTenantRole,
  getUserTenantRoles,
  isTenantOwner,
  hasAnyRole
} from '../utils/permissions'

const router: Router = express.Router()

// ✅ WAVE 2 AUTH GUARDS - Type-safe request authentication (no more as any!)
// Использует то же определение что и backup-service и crm-api
interface AuthContext {
  userId: string
  tenantId: string | null
  role: string
  email: string
}

/** Type guard: проверить что auth существует, иначе выбросить ошибку */
const assertAuth = (req: Request): AuthContext => {
  const user = (req as any).user as Partial<AuthContext> | undefined
  if (!user || !user.userId || !user.role || !user.email) {
    throw new Error('Unauthorized')
  }

  return {
    userId: user.userId,
    tenantId: user.tenantId ?? null,
    role: user.role,
    email: user.email
  }
}

/** DTO normalization: удалить null/undefined значения перед отправкой клиенту */
const createNormalizedDTO = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: Partial<T> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key as keyof T] = value
    }
  }
  return result
}

/**
 * GET /api/auth/users/:id/tenants
 * Получить список всех салонов где user имеет роли
 *
 * Response:
 * {
 *   success: true,
 *   tenants: [{
 *     tenantId, tenantName, slug, logoUrl,
 *     role: TenantRole, grantedAt
 *   }]
 * }
 */
router.get('/users/:id/tenants', async (req: Request, res: Response) => {
  try {
    const auth = assertAuth(req)
    const { id } = req.params
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        code: 'USER_ID_REQUIRED'
      })
    }
    const userId = id

    // Проверка: user может запросить только свои салоны ИЛИ если он SUPER_ADMIN
    if (auth.userId !== userId && auth.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN'
      })
    }

    // Получить список салонов
    const tenants = await getUserTenants(userId)

    console.log(`[ROLE-MGMT] User ${userId} has ${tenants.length} tenant(s)`)

    return res.json(
      createNormalizedDTO({
        success: true,
        tenants
      })
    )
  } catch (error: any) {
    console.error('[ROLE-MGMT] Error getting user tenants:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get user tenants',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /api/auth/tenants/:id/owners
 * Получить список всех владельцев салона
 *
 * Response:
 * {
 *   success: true,
 *   owners: [{
 *     userId, email, firstName, lastName, phone, avatar,
 *     isPrimary, share, createdAt
 *   }]
 * }
 */
router.get('/tenants/:id/owners', async (req: Request, res: Response) => {
  try {
    const auth = assertAuth(req)
    const { id } = req.params
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required',
        code: 'TENANT_ID_REQUIRED'
      })
    }
    const tenantId = id

    // Проверка: user должен иметь доступ к этому tenant (любая роль)
    if (auth.role !== 'SUPER_ADMIN') {
      // Проверить что user имеет роль в этом tenant
      const userRoles = await getUserTenantRoles(auth.userId, tenantId)
      if (userRoles.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this tenant',
          code: 'FORBIDDEN'
        })
      }
    }

    // Получить список владельцев
    const owners = await getTenantOwners(tenantId)

    console.log(`[ROLE-MGMT] Tenant ${tenantId} has ${owners.length} owner(s)`)

    return res.json(
      createNormalizedDTO({
        success: true,
        owners
      })
    )
  } catch (error: any) {
    console.error('[ROLE-MGMT] Error getting tenant owners:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get tenant owners',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /api/auth/tenants/:id/owners
 * Добавить со-владельца к салону (co-ownership)
 *
 * Body:
 * {
 *   userId: string,    // ID нового владельца
 *   share?: number     // Доля владения в % (optional, default 50)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   owner: { tenantId, userId, isPrimary, share, ... }
 * }
 */
router.post('/tenants/:id/owners', async (req: Request, res: Response) => {
  try {
    const auth = assertAuth(req)
    const { id } = req.params
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required',
        code: 'TENANT_ID_REQUIRED'
      })
    }
    const tenantId = id

    // Валидация body
    const schema = z.object({
      userId: z.string().cuid(),
      share: z.number().int().min(1).max(100).optional().default(50)
    })

    const validation = schema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: validation.error.issues
      })
    }

    const { userId, share } = validation.data

    // Проверка прав: только существующий OWNER может добавлять co-owner
    if (auth.role !== 'SUPER_ADMIN') {
      const isOwner = await isTenantOwner(auth.userId, tenantId)
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Only salon owners can add co-owners',
          code: 'FORBIDDEN'
        })
      }
    }

    // Проверить что новый owner существует
    const newOwner = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!newOwner) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
    }

    // Проверить что user еще не является owner
    const isAlreadyOwner = await isTenantOwner(userId, tenantId)
    if (isAlreadyOwner) {
      return res.status(409).json({
        success: false,
        error: 'User is already an owner of this salon',
        code: 'ALREADY_OWNER'
      })
    }

    // Добавить co-owner
    const owner = await addTenantOwner(tenantId, userId, share)

    console.log(`[ROLE-MGMT] Added co-owner: user ${userId} to tenant ${tenantId} (share: ${share}%)`)

    return res.status(201).json(
      createNormalizedDTO({
        success: true,
        owner
      })
    )
  } catch (error: any) {
    console.error('[ROLE-MGMT] Error adding co-owner:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to add co-owner',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /api/auth/users/:userId/tenants/:tenantId/roles
 * Назначить роль пользователю в салоне
 *
 * Body:
 * {
 *   role: TenantRole  // OWNER, MANAGER, STAFF, RECEPTIONIST, ACCOUNTANT
 * }
 *
 * Response:
 * {
 *   success: true,
 *   userTenantRole: { userId, tenantId, role, isActive, grantedAt, ... }
 * }
 */
router.post('/users/:userId/tenants/:tenantId/roles', async (req: Request, res: Response) => {
  try {
    const auth = assertAuth(req)
    const { userId: targetUserId, tenantId: targetTenantId } = req.params
    if (!targetUserId || !targetTenantId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and tenant ID are required',
        code: 'PARAMS_REQUIRED'
      })
    }

    // Валидация body
    const schema = z.object({
      role: z.enum(['OWNER', 'MANAGER', 'STAFF', 'RECEPTIONIST', 'ACCOUNTANT'] as const)
    })

    const validation = schema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: validation.error.issues
      })
    }

    const { role } = validation.data
    const userId = targetUserId
    const tenantId = targetTenantId

    // Проверка прав: только OWNER или MANAGER могут назначать роли
    if (auth.role !== 'SUPER_ADMIN') {
      const canManageRoles = await hasAnyRole(auth.userId, tenantId, ['OWNER', 'MANAGER'])
      if (!canManageRoles) {
        return res.status(403).json({
          success: false,
          error: 'Only salon owners or managers can grant roles',
          code: 'FORBIDDEN'
        })
      }

      // MANAGER не может назначать роль OWNER
      if (role === 'OWNER') {
        const isOwner = await isTenantOwner(auth.userId, tenantId)
        if (!isOwner) {
          return res.status(403).json({
            success: false,
            error: 'Only salon owners can grant OWNER role',
            code: 'FORBIDDEN'
          })
        }
      }
    }

    // Проверить что target user существует
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
    }

    // Назначить роль
    const userTenantRole = await grantTenantRole(userId, tenantId, role, auth.userId)

    console.log(`[ROLE-MGMT] Granted role ${role} to user ${userId} in tenant ${tenantId} by ${auth.userId}`)

    return res.status(201).json(
      createNormalizedDTO({
        success: true,
        userTenantRole
      })
    )
  } catch (error: any) {
    console.error('[ROLE-MGMT] Error granting role:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to grant role',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * DELETE /api/auth/users/:userId/tenants/:tenantId/roles/:role
 * Отозвать роль у пользователя в салоне
 *
 * Response:
 * {
 *   success: true,
 *   userTenantRole: { userId, tenantId, role, isActive: false, revokedAt, ... }
 * }
 */
router.delete('/users/:userId/tenants/:tenantId/roles/:role', async (req: Request, res: Response) => {
  try {
    const auth = assertAuth(req)
    const { userId, tenantId, role } = req.params
    if (!userId || !tenantId || !role) {
      return res.status(400).json({
        success: false,
        error: 'User ID, tenant ID and role are required',
        code: 'PARAMS_REQUIRED'
      })
    }

    // Валидация role
    const validRoles: TenantRole[] = ['OWNER', 'MANAGER', 'STAFF', 'RECEPTIONIST', 'ACCOUNTANT']
    if (!validRoles.includes(role as TenantRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        code: 'VALIDATION_ERROR'
      })
    }

    // Проверка прав: только OWNER или MANAGER могут отзывать роли
    if (auth.role !== 'SUPER_ADMIN') {
      const canManageRoles = await hasAnyRole(auth.userId, tenantId, ['OWNER', 'MANAGER'])
      if (!canManageRoles) {
        return res.status(403).json({
          success: false,
          error: 'Only salon owners or managers can revoke roles',
          code: 'FORBIDDEN'
        })
      }

      // MANAGER не может отозвать роль OWNER
      if (role === 'OWNER') {
        const isOwner = await isTenantOwner(auth.userId, tenantId)
        if (!isOwner) {
          return res.status(403).json({
            success: false,
            error: 'Only salon owners can revoke OWNER role',
            code: 'FORBIDDEN'
          })
        }
      }

      // Нельзя отозвать роль у самого себя (защита от блокировки)
      if (auth.userId === userId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot revoke your own role',
          code: 'FORBIDDEN'
        })
      }
    }

    // Отозвать роль
    const userTenantRole = await revokeTenantRole(userId, tenantId, role as TenantRole, auth.userId)

    console.log(`[ROLE-MGMT] Revoked role ${role} from user ${userId} in tenant ${tenantId} by ${auth.userId}`)

    return res.json(
      createNormalizedDTO({
        success: true,
        userTenantRole
      })
    )
  } catch (error: any) {
    console.error('[ROLE-MGMT] Error revoking role:', error)

    if (error.message === 'Role not found or already revoked') {
      return res.status(404).json({
        success: false,
        error: 'Role not found or already revoked',
        code: 'ROLE_NOT_FOUND'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to revoke role',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /api/auth/users/:userId/tenants/:tenantId/roles
 * Получить все активные роли пользователя в салоне
 *
 * Response:
 * {
 *   success: true,
 *   roles: ['OWNER', 'MANAGER', ...]
 * }
 */
router.get('/users/:userId/tenants/:tenantId/roles', async (req: Request, res: Response) => {
  try {
    const auth = assertAuth(req)
    const { userId, tenantId } = req.params
    if (!userId || !tenantId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and tenant ID are required',
        code: 'PARAMS_REQUIRED'
      })
    }

    // Проверка прав: user может запросить только свои роли ИЛИ если он OWNER/MANAGER
    if (auth.userId !== userId && auth.role !== 'SUPER_ADMIN') {
      const canViewRoles = await hasAnyRole(auth.userId, tenantId, ['OWNER', 'MANAGER'])
      if (!canViewRoles) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'FORBIDDEN'
        })
      }
    }

    // Получить роли
    const roles = await getUserTenantRoles(userId, tenantId)

    console.log(`[ROLE-MGMT] User ${userId} has ${roles.length} role(s) in tenant ${tenantId}`)

    return res.json(
      createNormalizedDTO({
        success: true,
        roles
      })
    )
  } catch (error: any) {
    console.error('[ROLE-MGMT] Error getting user roles:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get user roles',
      code: 'INTERNAL_ERROR'
    })
  }
})

export default router
