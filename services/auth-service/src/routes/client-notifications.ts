import express, { type Router } from 'express'
import { tenantPrisma } from '@beauty-platform/database'
import { UserRole } from '@prisma/client'
import { authenticate, authorize } from '../middleware/auth'
import { getAuthContext } from '../utils/get-auth-context'

const router: Router = express.Router()

// Все маршруты требуют аутентифицированного клиента
router.use(authenticate, authorize([UserRole.CLIENT]))

/**
 * GET /client/notifications
 * Возвращает список уведомлений клиентского портала
 */
router.get('/', async (req, res) => {
  try {
    const email = getAuthContext(req).email?.toLowerCase()
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'CLIENT_EMAIL_REQUIRED',
        message: 'Не удалось определить email клиента из токена'
      })
    }

    const take = Math.min(
      Math.max(Number.parseInt(req.query.limit as string, 10) || 50, 1),
      200
    )

    const clientNotificationRepo = tenantPrisma(null).clientNotification

    const [notifications, unreadCount] = await Promise.all([
      clientNotificationRepo.findMany({
        where: {
          clientEmail: email
        },
        orderBy: {
          createdAt: 'desc'
        },
        take
      }),
      clientNotificationRepo.count({
        where: {
          clientEmail: email,
          readAt: null
        }
      })
    ])

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    })
  } catch (error) {
    console.error('[ClientNotifications] GET / - error', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Не удалось загрузить уведомления клиентского портала'
    })
  }
  return undefined;
})

/**
 * PATCH /client/notifications/:id/read
 * Помечает уведомление как прочитанное
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const email = getAuthContext(req).email?.toLowerCase()
    const { id } = req.params

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'CLIENT_EMAIL_REQUIRED',
        message: 'Не удалось определить email клиента из токена'
      })
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'NOTIFICATION_ID_REQUIRED',
        message: 'Необходимо указать идентификатор уведомления'
      })
    }

    const clientNotificationRepo = tenantPrisma(null).clientNotification
    const result = await clientNotificationRepo.updateMany({
      where: {
        id,
        clientEmail: email
      },
      data: {
        readAt: new Date()
      }
    })

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOTIFICATION_NOT_FOUND',
        message: 'Уведомление не найдено или не принадлежит клиенту'
      })
    }

    res.json({
      success: true,
      data: {
        id,
        read: true
      }
    })
  } catch (error) {
    console.error('[ClientNotifications] PATCH /:id/read - error', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Не удалось отметить уведомление как прочитанное'
    })
  }
  return undefined;
})

/**
 * PATCH /client/notifications/read-all
 * Помечает все уведомления как прочитанные
 */
router.patch('/read-all', async (req, res) => {
  try {
    const email = getAuthContext(req).email?.toLowerCase()
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'CLIENT_EMAIL_REQUIRED',
        message: 'Не удалось определить email клиента из токена'
      })
    }

    const clientNotificationRepo = tenantPrisma(null).clientNotification
    const result = await clientNotificationRepo.updateMany({
      where: {
        clientEmail: email,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    })

    res.json({
      success: true,
      data: {
        updated: result.count
      }
    })
  } catch (error) {
    console.error('[ClientNotifications] PATCH /read-all - error', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Не удалось обновить уведомления'
    })
  }
  return undefined;
})

/**
 * DELETE /client/notifications/:id
 * Помечает уведомление как удалённое (экспирация)
 */
router.delete('/:id', async (req, res) => {
  try {
    const email = getAuthContext(req).email?.toLowerCase()
    const { id } = req.params

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'CLIENT_EMAIL_REQUIRED',
        message: 'Не удалось определить email клиента из токена'
      })
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'NOTIFICATION_ID_REQUIRED',
        message: 'Необходимо указать идентификатор уведомления'
      })
    }

    const clientNotificationRepo = tenantPrisma(null).clientNotification
    const result = await clientNotificationRepo.updateMany({
      where: {
        id,
        clientEmail: email
      },
      data: {
        expiresAt: new Date()
      }
    })

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOTIFICATION_NOT_FOUND',
        message: 'Уведомление не найдено или не принадлежит клиенту'
      })
    }

    res.json({
      success: true,
      data: {
        id,
        deleted: true
      }
    })
  } catch (error) {
    console.error('[ClientNotifications] DELETE /:id - error', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Не удалось удалить уведомление'
    })
  }
  return undefined;
})

export default router
