import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  emitAppointmentCreated,
  emitAppointmentReminder,
  emitAppointmentCancelled,
  emitPaymentCompleted,
  emitPaymentFailed,
  emitRefundProcessed,
  emitToRoom
} from '../emitters';

const router: ReturnType<typeof Router> = Router();

const INTERNAL_EVENTS_TOKEN = process.env.INTERNAL_EVENTS_TOKEN;

const requireInternalToken = (req: Request, res: Response, next: NextFunction) => {
  if (!INTERNAL_EVENTS_TOKEN) {
    // Если токен не сконфигурирован, пропускаем (dev режим), но логируем предупреждение
    console.warn('[Events] INTERNAL_EVENTS_TOKEN not set, allowing unauthenticated event ingress');
    return next();
  }

  const token = req.headers['x-internal-token'];
  if (token !== INTERNAL_EVENTS_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid internal events token'
    });
  }

  return next();
};

const appointmentCreatedSchema = z.object({
  appointmentId: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  staffId: z.string(),
  staffName: z.string(),
  tenantId: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  service: z.string()
});

const appointmentReminderSchema = z.object({
  appointmentId: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  staffName: z.string(),
  service: z.string(),
  startAt: z.string(),
  hoursUntilAppointment: z.number(),
  tenantId: z.string()
});

const appointmentCancelledSchema = z.object({
  appointmentId: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  tenantId: z.string(),
  reason: z.string().optional()
});

const paymentCompletedSchema = z.object({
  paymentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  appointmentId: z.string().optional(),
  tenantId: z.string(),
  clientId: z.string().optional(),
  clientName: z.string()
});

const paymentFailedSchema = z.object({
  paymentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  reason: z.string(),
  tenantId: z.string(),
  clientName: z.string()
});

const paymentRefundedSchema = z.object({
  refundId: z.string(),
  paymentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  tenantId: z.string(),
  clientName: z.string(),
  reason: z.string().optional()
});

router.use(requireInternalToken);

router.post('/appointment-created', async (req: Request, res: Response) => {
  const parsed = appointmentCreatedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      details: parsed.error.flatten()
    });
  }

  emitAppointmentCreated(parsed.data);

  return res.status(202).json({
    success: true,
    message: 'appointment_created emitted'
  });
});

router.post('/appointment-reminder', async (req: Request, res: Response) => {
  const parsed = appointmentReminderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      details: parsed.error.flatten()
    });
  }

  emitAppointmentReminder(parsed.data);

  return res.status(202).json({
    success: true,
    message: 'appointment_reminder emitted'
  });
});

router.post('/appointment-cancelled', async (req: Request, res: Response) => {
  const parsed = appointmentCancelledSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      details: parsed.error.flatten()
    });
  }

  emitAppointmentCancelled(parsed.data);

  return res.status(202).json({
    success: true,
    message: 'appointment_cancelled emitted'
  });
});

router.post('/payment-completed', async (req: Request, res: Response) => {
  const parsed = paymentCompletedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      details: parsed.error.flatten()
    });
  }

  emitPaymentCompleted(parsed.data);

  return res.status(202).json({
    success: true,
    message: 'payment_completed emitted'
  });
});

router.post('/payment-failed', async (req: Request, res: Response) => {
  const parsed = paymentFailedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      details: parsed.error.flatten()
    });
  }

  emitPaymentFailed(parsed.data);

  return res.status(202).json({
    success: true,
    message: 'payment_failed emitted'
  });
});

router.post('/payment-refunded', async (req: Request, res: Response) => {
  const parsed = paymentRefundedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      details: parsed.error.flatten()
    });
  }

  emitRefundProcessed(parsed.data);

  return res.status(202).json({
    success: true,
    message: 'payment_refunded emitted'
  });
});

// Универсальный тестовый endpoint для отправки произвольного события в комнату
router.post('/emit-room', (req: Request, res: Response) => {
  const { room, event, payload } = req.body || {};

  if (!room || !event) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'room and event are required'
    });
  }

  emitToRoom(room, event, payload || {});

  return res.status(202).json({
    success: true,
    message: `event ${event} emitted to ${room}`
  });
});

export default router;
