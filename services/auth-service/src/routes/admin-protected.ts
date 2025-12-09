// Protected Admin Routes для демонстрации MFA
// Beauty Platform Auth Service

import express, { type Router, type Request, type Response } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { requireMFAVerified } from '../middleware/mfa'
import { UserRole } from '@prisma/client'
import pino from 'pino'
import { prisma } from '@beauty-platform/database'
import { getAuth } from '@beauty/shared'

const router: Router = express.Router()
const logger = pino({ name: 'AdminProtectedRoutes' })

/**
 * GET /auth/admin/dashboard
 * Тестовый защищенный endpoint для Super Admin
 * Требует MFA проверку в сессии
 */
router.get('/dashboard', authenticate, requireMFAVerified, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getAuth(req)
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      })
      return
    }

    logger.info({
      userId: user.userId,
      email: user.email,
      mfaVerified: user.mfaVerified
    }, 'Super Admin accessed protected dashboard')

    res.json({
      success: true,
      message: '🎉 Welcome to Super Admin Dashboard!',
      data: {
        user: {
          id: user.userId,
          email: user.email,
          role: user.role
        },
        securityStatus: {
          mfaEnabled: true,
          mfaVerified: user.mfaVerified,
          sessionSecure: true
        },
        adminStats: {
          totalSalons: 3,
          activeSessions: 5,
          systemHealth: 'excellent'
        },
        message: 'Этот endpoint защищен MFA! Вы можете его видеть только после ввода TOTP кода 🔐'
      }
    })

  } catch (error) {
    const authUser = getAuth(req)
    logger.error({ error, userId: authUser?.userId }, 'Protected dashboard access failed')
    res.status(500).json({
      success: false,
      error: 'Failed to access dashboard',
      code: 'DASHBOARD_ACCESS_FAILED'
    })
    return
  }
})

/**
 * GET /auth/admin/sensitive-data
 * Еще один защищенный endpoint для тестирования
 */
router.get('/sensitive-data', authenticate, requireMFAVerified, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getAuth(req)
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      })
      return
    }

    res.json({
      success: true,
      message: '🔒 Sensitive Admin Data Access',
      data: {
        secretInfo: 'This is highly sensitive information that requires MFA',
        adminSecrets: [
          'Database backup keys',
          'API master tokens',
          'System configuration'
        ],
        accessTime: new Date().toISOString(),
        accessedBy: user.email
      }
    })

  } catch (error) {
    const authUser = getAuth(req)
    logger.error({ error, userId: authUser?.userId }, 'Sensitive data access failed')
    res.status(500).json({
      success: false,
      error: 'Failed to access sensitive data',
      code: 'SENSITIVE_DATA_ACCESS_FAILED'
    })
    return
  }
})

/**
 * GET /auth/admin/salons
 * Возвращает список всех салонов для супер-админки
 */
router.get(
  '/salons',
  authenticate,
  requireMFAVerified,
  authorize([UserRole.SUPER_ADMIN]),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const salons = await prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              clients: true,
              services: true
            }
          }
        }
      })

      const formatted = salons.map((salon) => ({
        id: salon.id,
        name: salon.name,
        slug: salon.slug,
        city: salon.city,
        address: salon.address,
        status: salon.status,
        isActive: salon.isActive,
        logoUrl: salon.logoUrl,
        currency: salon.currency,
        language: salon.language,
        timezone: salon.timezone,
        createdAt: salon.createdAt,
        updatedAt: salon.updatedAt,
        staffCount: salon._count?.users ?? 0,
        clientsCount: salon._count?.clients ?? 0,
        servicesCount: salon._count?.services ?? 0
      }))

      const totals = {
        salons: formatted.length,
        active: formatted.filter((salon) => salon.isActive).length,
        inactive: formatted.filter((salon) => !salon.isActive).length
      }

      res.json({
        success: true,
        data: formatted,
        totals
      })
    } catch (error) {
      logger.error({ error }, 'Failed to fetch salons for admin dashboard')
      res.status(500).json({
        success: false,
        error: 'Failed to load salons',
        code: 'SALONS_FETCH_FAILED'
      })
      return
    }
  }
)

/**
 * DELETE /auth/admin/salons/:salonId
 * Полное удаление салона вместе со всеми связанными данными
 */
router.delete(
  '/salons/:salonId',
  authenticate,
  requireMFAVerified,
  authorize([UserRole.SUPER_ADMIN]),
  async (req: Request, res: Response): Promise<void> => {
    const { salonId } = req.params as { salonId?: string }

    if (!salonId) {
      res.status(400).json({
        success: false,
        error: 'Salon ID is required',
        code: 'SALON_ID_REQUIRED'
      })
      return
    }

    try {
      // Проверить что салон существует
      const salon = await prisma.tenant.findUnique({
        where: { id: salonId },
        select: { id: true, name: true }
      })

      if (!salon) {
        res.status(404).json({
          success: false,
          error: 'Salon not found',
          code: 'SALON_NOT_FOUND'
        })
        return
      }

      // Удалить салон со всеми связанными данными (cascade)
      await prisma.tenant.delete({
        where: { id: salonId }
      })

      const user = getAuth(req)
      logger.info(
        {
          salonId,
          salonName: salon.name,
          deletedBy: user?.userId
        },
        'Salon deleted by super admin'
      )

      res.json({
        success: true,
        message: 'Salon deleted'
      })
    } catch (error) {
      logger.error({ error, salonId }, 'Failed to delete salon')
      res.status(500).json({
        success: false,
        error: 'Failed to delete salon',
        code: 'SALON_DELETE_FAILED'
      })
      return
    }
  }
)

export default router
