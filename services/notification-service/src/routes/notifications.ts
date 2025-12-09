import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { tenantAuth } from '../middleware/tenantAuth';
import { tenantPrisma } from '@beauty-platform/database';
import { enqueueNotification } from '../services/notificationQueue';

const router: ReturnType<typeof Router> = Router();

// Zod schemas
const createNotificationSchema = z.object({
  userId: z.string(),
  type: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK']),
  title: z.string().min(1),
  message: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  metadata: z.any().optional()
});

// TODO: Use this schema when implementing mark-as-read endpoint
// const markAsReadSchema = z.object({
//   read: z.boolean().optional()
// });

/**
 * GET /notifications/me
 * Получить все уведомления для текущего пользователя
 */
router.get('/me', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.context!;

    // ✅ Для CLIENT без tenantId - требуем явно указать салон через header
    if (!tenantId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'CLIENT users must provide X-Tenant-Id header to specify which salon notifications to fetch',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const statusQuery = req.query.status;
    let statusFilter: string[] | undefined;

    if (typeof statusQuery === 'string' && statusQuery.trim().length > 0) {
      statusFilter = statusQuery.split(',').map(status => status.trim().toUpperCase());
    }

    // Получаем уведомления из БД
    const notifications = await tenantPrisma(tenantId).notification.findMany({
      where: {
        tenantId,
        userId,
        ...(statusFilter ? { status: { in: statusFilter } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Лимит для производительности
    });

    const unreadCount = notifications.filter(n => !n.readAt).length;

    console.log(`[NOTIFICATIONS] Fetched ${notifications.length} notifications for user ${userId}, ${unreadCount} unread`);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        total: notifications.length,
        unreadCount
      },
      meta: {
        tenantId,
        userId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[NOTIFICATIONS] Error fetching notifications:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch notifications',
      timestamp: new Date().toISOString()
    });
    return;
  }
});

/**
 * POST /notifications
 * Создать новое уведомление (используется другими сервисами)
 */
router.post('/', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.context!;

    // Требуем tenantId для создания уведомлений
    if (!tenantId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Creating notifications requires a valid tenant context',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Валидация
    const validation = createNotificationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request body',
        details: validation.error.errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { userId, type, title, message, priority, metadata } = validation.data;

    // Создаем уведомление
    const notification = await tenantPrisma(tenantId).notification.create({
      data: {
        tenantId,
        userId,
        type,
        title,
        message,
        priority: priority || 'MEDIUM',
        metadata: metadata || null,
        status: 'PENDING'
      }
    });

    console.log(`[NOTIFICATIONS] Created notification ${notification.id} for user ${userId}`);

    try {
      await enqueueNotification(tenantId, notification.id);
    } catch (queueError) {
      console.error('[NOTIFICATIONS] Failed to enqueue notification job, falling back to immediate processing:', queueError);
    }

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[NOTIFICATIONS] Error creating notification:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create notification',
      timestamp: new Date().toISOString()
    });
    return;
  }
});

/**
 * POST /notifications/:id/read
 * Отметить уведомление как прочитанное
 */
router.post('/:id/read', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;

    // Проверяем ownership уведомления
    const notification = await tenantPrisma(tenantId).notification.findFirst({
      where: {
        id,
        tenantId,
        userId
      }
    });

    if (!notification) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Notification not found or access denied',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Обновляем статус
    const updatedNotification = await tenantPrisma(tenantId).notification.update({
      where: { id },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });

    console.log(`[NOTIFICATIONS] Marked notification ${id} as read`);

    res.status(200).json({
      success: true,
      data: updatedNotification,
      message: 'Notification marked as read',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[NOTIFICATIONS] Error updating notification:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update notification',
      timestamp: new Date().toISOString()
    });
    return;
  }
});

/**
 * POST /notifications/mark-all-read
 * Отметить все уведомления пользователя как прочитанные
 */
router.post('/mark-all-read', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.context!;

    const result = await tenantPrisma(tenantId).notification.updateMany({
      where: {
        tenantId,
        userId,
        readAt: null
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      data: {
        updated: result.count
      },
      message: 'All notifications marked as read',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] Error marking all notifications as read:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark notifications as read',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /notifications/:id
 * Удалить уведомление
 */
router.delete('/:id', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;

    // Проверяем ownership
    const notification = await tenantPrisma(tenantId).notification.findFirst({
      where: {
        id,
        tenantId,
        userId
      }
    });

    if (!notification) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Notification not found or access denied',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Удаляем
    await tenantPrisma(tenantId).notification.delete({
      where: { id }
    });

    console.log(`[NOTIFICATIONS] Deleted notification ${id}`);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[NOTIFICATIONS] Error deleting notification:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete notification',
      timestamp: new Date().toISOString()
    });
    return;
  }
});

/**
 * GET /notifications/count
 * Получить количество непрочитанных уведомлений
 */
router.get('/count', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.context!;

    const unreadCount = await tenantPrisma(tenantId).notification.count({
      where: {
        tenantId,
        userId,
        readAt: null
      }
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
        tenantId,
        userId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[NOTIFICATIONS] Error counting notifications:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to count notifications',
      timestamp: new Date().toISOString()
    });
    return;
  }
});

/**
 * GET /notifications/_debug/whoami
 * Debug endpoint для диагностики аутентификации
 */
router.get('/_debug/whoami', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const cookiesPresent = !!req.headers.cookie;
  const cookieValue = req.cookies?.beauty_access_token ? 'present' : 'missing';
  const bearerToken = authHeader?.startsWith('Bearer ') ? 'present' : 'missing';

  let authSource = 'none';
  let tokenValidation = null;

  try {
    // Попытка получить токен из различных источников
    let token: string | undefined;

    // 1. httpOnly cookies (приоритет)
    token = req.cookies?.beauty_access_token ||
            req.cookies?.beauty_client_access_token ||
            req.cookies?.beauty_token;

    if (token) {
      authSource = 'cookie';
    } else if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      authSource = 'auth-header';
    }

    if (token) {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, JWT_SECRET);
      tokenValidation = { valid: true, payload: { userId: decoded.userId, tenantId: decoded.tenantId } };
    } else {
      tokenValidation = { valid: false, reason: 'no token found' };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    tokenValidation = { valid: false, reason };
  }

  res.json({
    debug: {
      authSource,
      cookiesPresent,
      cookieValue,
      bearerToken,
      tokenValidation,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        'user-agent': req.headers['user-agent'],
        cookie: req.headers.cookie ? 'present' : 'missing'
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
