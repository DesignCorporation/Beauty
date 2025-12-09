import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { tenantAuth } from '../middleware/tenantAuth';
import { tenantPrisma } from '@beauty-platform/database';

const router: ReturnType<typeof Router> = Router();

// Zod схема для валидации настроек
const updateSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  promotionalEmails: z.boolean().optional(),
  systemNotifications: z.boolean().optional()
});

/**
 * GET /settings/me
 * Получить настройки уведомлений для текущего пользователя
 */
router.get('/me', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.context!;

    const prisma = tenantPrisma(tenantId);

    // 🔧 FIX: Используем составной ключ для правильного поиска с tenant isolation
    let settings = await prisma.notificationSettings.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      }
    });

    // 🔧 FIX: Добавлен tenantId при создании настроек
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          tenantId,  // ✅ Добавлен tenantId для tenant isolation
          userId,
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
          appointmentReminders: true,
          promotionalEmails: false,
          systemNotifications: true
        }
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
      meta: {
        tenantId,
        userId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[SETTINGS] Error fetching settings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch notification settings',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /settings/me
 * Обновить настройки уведомлений для текущего пользователя
 */
router.put('/me', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.context!;

    // Валидация входных данных
    const validationResult = updateSettingsSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request body',
        details: validationResult.error.errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const updateData = validationResult.data;

    const prisma = tenantPrisma(tenantId);

    const updatedSettings = await prisma.notificationSettings.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      },
      update: updateData,
      create: {
        tenantId,  // 🔧 FIX: Добавлен tenantId для tenant isolation
        userId,
        emailEnabled: updateData.emailEnabled ?? true,
        smsEnabled: updateData.smsEnabled ?? true,
        pushEnabled: updateData.pushEnabled ?? true,
        appointmentReminders: updateData.appointmentReminders ?? true,
        promotionalEmails: updateData.promotionalEmails ?? false,
        systemNotifications: updateData.systemNotifications ?? true
      }
    });

    res.status(200).json({
      success: true,
      data: updatedSettings,
      message: 'Notification settings updated successfully',
      changes: updateData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SETTINGS] Error updating settings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update notification settings',
      timestamp: new Date().toISOString()
    });
    return;
  }
});

/**
 * POST /settings/reset
 * Сбросить настройки к дефолтным значениям
 */
router.post('/reset', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.context!;

    const prisma = tenantPrisma(tenantId);

    const defaultSettings = await prisma.notificationSettings.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      },
      update: {
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        appointmentReminders: true,
        promotionalEmails: false,
        systemNotifications: true
      },
      create: {
        tenantId,  // ✅ Добавлен tenantId для tenant isolation
        userId,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        appointmentReminders: true,
        promotionalEmails: false,
        systemNotifications: true
      }
    });

    res.status(200).json({
      success: true,
      data: defaultSettings,
      message: 'Notification settings reset to default values',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SETTINGS] Error resetting settings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset notification settings',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
