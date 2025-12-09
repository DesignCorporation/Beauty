import { Router, Request, Response } from 'express';
import { tenantAuth } from '../middleware/tenantAuth';
import { tenantPrisma } from '@beauty-platform/database';

const router: ReturnType<typeof Router> = Router();

/**
 * POST /api/notify/test/email
 * Тестовый endpoint для проверки Email отправки
 * Создает уведомление в БД и пытается отправить email
 */
router.post('/email', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.context!;
    const { to, subject, message } = req.body;

    // Валидация
    if (!to || !subject || !message) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Required fields: to, subject, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Создаем уведомление в БД
    const notification = await tenantPrisma(tenantId).notification.create({
      data: {
        tenantId,
        userId,
        type: 'EMAIL',
        status: 'PENDING',
        priority: 'MEDIUM',
        title: subject,
        message,
        metadata: {
          emailTo: to,
          testMode: true
        }
      }
    });

    console.log(`[TEST EMAIL] Created notification ${notification.id}`);

    // Отправляем email через email route
    try {
      const emailResponse = await fetch(`${process.env.NOTIFICATION_SERVICE_URL || ''}/api/notify/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to,
          subject,
          html: `<h1>${subject}</h1><p>${message}</p><hr><p><small>Test notification from Beauty Platform</small></p>`,
          text: message
        })
      });

      interface EmailResult {
        status?: string;
        message?: string;
      }
      const emailResult = await emailResponse.json() as EmailResult;

      // Обновляем статус уведомления
      const updatedNotification = await tenantPrisma(tenantId).notification.update({
        where: { id: notification.id },
        data: {
          status: emailResult.status === 'sent' ? 'SENT' : 'DELIVERED',
          sentAt: new Date()
        }
      });

      res.status(200).json({
        success: true,
        notification: updatedNotification,
        email: emailResult,
        message: emailResult.status === 'simulated'
          ? 'Email симулирован (SMTP не настроен). Заполните SMTP_PASS в .env для реальной отправки.'
          : 'Email отправлен успешно!',
        timestamp: new Date().toISOString()
      });

    } catch (emailError) {
      console.error('[TEST EMAIL] Failed to send:', emailError);

      // Помечаем как failed
      await tenantPrisma(tenantId).notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED'
        }
      });

      res.status(500).json({
        error: 'Email Send Failed',
        message: emailError instanceof Error ? emailError.message : 'Unknown error',
        notification,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[TEST EMAIL] Unexpected error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/notify/test/status
 * Проверка статуса SMTP конфигурации
 */
router.get('/status', async (_req: Request, res: Response) => {
  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );

  res.json({
    success: true,
    smtp: {
      configured: smtpConfigured,
      host: process.env.SMTP_HOST || 'not set',
      user: process.env.SMTP_USER || 'not set',
      port: process.env.SMTP_PORT || '587',
      from: process.env.EMAIL_FROM || 'not set',
      note: smtpConfigured
        ? 'SMTP полностью настроен. Email будут отправляться реально.'
        : 'SMTP не настроен. Email будут симулироваться. Заполните SMTP_PASS в .env.'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
