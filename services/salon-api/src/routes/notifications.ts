import express, { type Router, type Request, type Response, type NextFunction } from 'express'
import { tenantPrisma } from '@beauty-platform/database'
import type { TenantRequest } from '../middleware/tenant'

const router: Router = express.Router()

const wrapTenantRoute =
  (handler: (req: TenantRequest, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req as TenantRequest, res)
    } catch (error) {
      next(error)
    }
  }

const parseLimit = (value: string | undefined, fallback = 50, max = 100) => {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.min(parsed, max)
}

router.get(
  '/me',
  wrapTenantRoute(async (req, res) => {
  try {
    const { tenantId, user } = req
    const userId = user?.userId

    if (!userId) {
      res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'User identifier is required to load notifications'
      })
      return
    }

    const limit = parseLimit(req.query.limit as string | undefined)
    const statusFilter = (req.query.status as string | undefined)
      ?.split(',')
      .map(entry => entry.trim().toUpperCase())
      .filter(Boolean)

    const prisma = tenantPrisma(tenantId ?? null)

    const notifications = await prisma.notification.findMany({
      where: {
        tenantId,
        userId,
        ...(statusFilter?.length ? { status: { in: statusFilter as any[] } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    const unreadCount = notifications.filter(notification => !notification.readAt).length

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      },
      meta: {
        tenantId,
        userId,
        fetchedAt: new Date().toISOString()
      }
    })
    return
  } catch (error) {
    console.error('[CRM Notifications] Failed to fetch notifications:', error)
    res.status(500).json({
      success: false,
      error: 'NOTIFICATIONS_FETCH_FAILED',
      message: 'Unable to load notifications'
    })
  }
  })
)

router.post(
  '/:id/read',
  wrapTenantRoute(async (req, res) => {
  try {
    const { tenantId, user } = req
    const userId = user?.userId
    const { id } = req.params

    if (!userId) {
      res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'User identifier is required to update notifications'
      })
      return
    }

    const prisma = tenantPrisma(tenantId ?? null)

    const existing = await prisma.notification.findFirst({
      where: {
        id,
        tenantId,
        userId
      }
    })

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found or access denied'
      })
      return
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    })

    res.json({
      success: true,
      data: updated,
      message: 'Notification marked as read'
    })
    return
  } catch (error) {
    console.error('[CRM Notifications] Failed to mark notification as read:', error)
    res.status(500).json({
      success: false,
      error: 'NOTIFICATION_UPDATE_FAILED',
      message: 'Unable to mark notification as read'
    })
  }
  })
)

router.post(
  '/mark-all-read',
  wrapTenantRoute(async (req, res) => {
  try {
    const { tenantId, user } = req
    const userId = user?.userId

    if (!userId) {
      res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'User identifier is required to update notifications'
      })
      return
    }

    const prisma = tenantPrisma(tenantId ?? null)

    const result = await prisma.notification.updateMany({
      where: {
        tenantId,
        userId,
        readAt: null
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    })

    res.json({
      success: true,
      data: {
        updated: result.count
      },
      message: 'All notifications marked as read'
    })
    return
  } catch (error) {
    console.error('[CRM Notifications] Failed to mark notifications as read:', error)
    res.status(500).json({
      success: false,
      error: 'NOTIFICATIONS_UPDATE_FAILED',
      message: 'Unable to mark notifications as read'
    })
  }
  })
)

export default router
