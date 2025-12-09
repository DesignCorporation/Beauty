import { Queue, Worker, QueueEvents, JobsOptions, Job } from 'bullmq';
import IORedis from 'ioredis';
import { tenantPrisma } from '@beauty-platform/database';
import { emailService } from './email.service';

const queueName = 'notification-delivery';
const DEFAULT_MAX_ATTEMPTS = parseInt(process.env.NOTIFICATION_QUEUE_ATTEMPTS ?? '5', 10);
const DEFAULT_CONCURRENCY = parseInt(process.env.NOTIFICATION_QUEUE_CONCURRENCY ?? '5', 10);

let connection: IORedis | null = null;
let queue: Queue | null = null;
let worker: Worker | null = null;
let queueEvents: QueueEvents | null = null;
let queueReady = false;
let initializationAttempted = false;

const resolveRedisUrl = () =>
  process.env.NOTIFICATION_REDIS_URL ||
  process.env.REDIS_URL ||
  process.env.BULLMQ_REDIS_URL;

const createRedisConnection = () => {
  const redisUrl = resolveRedisUrl() || 'redis://localhost:6379';
  const client = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });

  client.on('error', (error) => {
    console.error('[NotificationQueue] Redis connection error:', error.message);
    if (isQueueErrorRecoverable(error)) {
      disableQueue('redis-connection-error');
    }
  });

  client.on('ready', () => {
    console.log('[NotificationQueue] Redis connection established:', redisUrl);
  });

  return client;
};

const processNotificationLogic = async (tenantId: string, notificationId: string) => {
  const prisma = tenantPrisma(tenantId);

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId }
  });

  if (!notification) {
    throw new Error(`Notification ${notificationId} not found for tenant ${tenantId}`);
  }

  // Respect user channel preferences when possible
  const baseMetadata = (notification.metadata as Record<string, unknown> | null) ?? {};
  const settings = await prisma.notificationSettings.findFirst({
    where: { userId: notification.userId }
  });

  if (settings) {
    if (notification.type === 'EMAIL' && !settings.emailEnabled) {
      console.log(`[NotificationQueue] Email notifications disabled for user ${notification.userId}. Skipping send.`);
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          metadata: {
            ...baseMetadata,
            error: 'email_disabled_by_user'
          }
        }
      });
      return;
    }

    if (notification.type === 'SMS' && !settings.smsEnabled) {
      console.log(`[NotificationQueue] SMS notifications disabled for user ${notification.userId}. Skipping send.`);
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          metadata: {
            ...baseMetadata,
            error: 'sms_disabled_by_user'
          }
        }
      });
      return;
    }

    if (notification.type === 'PUSH' && !settings.pushEnabled) {
      console.log(`[NotificationQueue] Push notifications disabled for user ${notification.userId}. Skipping send.`);
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          metadata: {
            ...baseMetadata,
            error: 'push_disabled_by_user'
          }
        }
      });
      return;
    }
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'SENT',
      sentAt: new Date()
    }
  });

  // 📧 Handle EMAIL notifications
  if (notification.type === 'EMAIL') {
    const emailData = notification.metadata as Record<string, unknown> | null;

    // Get user email if needed
    let userEmail: string | undefined = (emailData?.to as string) || undefined;
    if (!userEmail && notification.userId) {
      const user = await prisma.user.findUnique({
        where: { id: notification.userId }
      });
      userEmail = user?.email || undefined;
    }

    // Email recipient can be in metadata.to or extracted from user email
    const recipientEmail = userEmail;
    const subject = (emailData?.subject as string) || notification.title || 'Notification';
    const html = (emailData?.html as string) ||
                 (emailData?.body as string) ||
                 `<p>${notification.message}</p>` ||
                 '<p>Notification</p>';

    if (!recipientEmail) {
      console.error(`[NotificationQueue] Email notification ${notificationId} missing recipient email`);
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          deliveredAt: new Date(),
          metadata: {
            ...baseMetadata,
            error: 'missing_recipient_email'
          }
        }
      });
      return;
    }

    try {
      const result = await emailService.sendEmail(recipientEmail, subject, html);
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          metadata: {
            ...baseMetadata,
            messageId: result.messageId,
            deliveredAt: new Date().toISOString()
          }
        }
      });
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[NotificationQueue] Failed to send email notification ${notificationId}:`, errorMessage);

      // Throw error to trigger BullMQ retry logic
      throw new Error(`Email delivery failed: ${errorMessage}`);
    }
  }

  // 📱 Handle SMS notifications (placeholder for future implementation)
  if (notification.type === 'SMS') {
    console.log(`[NotificationQueue] SMS notifications not yet implemented. Notification ${notificationId} marked as delivered.`);
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'DELIVERED',
        metadata: {
          ...baseMetadata,
          note: 'SMS support coming soon'
        }
      }
    });
    return;
  }

  // 🔔 Handle PUSH notifications (placeholder for future implementation)
  if (notification.type === 'PUSH') {
    console.log(`[NotificationQueue] Push notifications not yet implemented. Notification ${notificationId} marked as delivered.`);
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'DELIVERED',
        metadata: {
          ...baseMetadata,
          note: 'Push notifications support coming soon'
        }
      }
    });
    return;
  }

  // Default: mark as delivered (unknown type)
  console.warn(`[NotificationQueue] Unknown notification type: ${notification.type}. Marking as delivered.`);
  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'DELIVERED',
      metadata: {
        ...baseMetadata,
        note: `Unknown notification type: ${notification.type}`
      }
    }
  });
};

const processNotificationJob = async (job: Job<{ tenantId: string; notificationId: string }>) => {
  const { tenantId, notificationId } = job.data;
  await processNotificationLogic(tenantId, notificationId);
};

const registerWorker = () => {
  if (!connection) {
    throw new Error('Redis connection is not initialized');
  }

  worker = new Worker(queueName, processNotificationJob, {
    connection,
    concurrency: DEFAULT_CONCURRENCY
  });

  worker.on('completed', (job) => {
    console.log(`[NotificationQueue] ✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[NotificationQueue] ❌ Job ${job?.id} failed:`, error?.message);
  });

  worker.on('error', (error) => {
    console.error('[NotificationQueue] Worker error:', error);
    if (isQueueErrorRecoverable(error)) {
      disableQueue('worker-error');
    }
  });
};

const registerQueue = () => {
  if (!connection) {
    throw new Error('Redis connection is not initialized');
  }

  queue = new Queue(queueName, {
    connection,
    defaultJobOptions: {
      attempts: DEFAULT_MAX_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  });

  queueEvents = new QueueEvents(queueName, { connection });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[NotificationQueue] Job ${jobId} failed: ${failedReason}`);
  });

  queueEvents.on('completed', ({ jobId }) => {
    console.log(`[NotificationQueue] Job ${jobId} completed`);
  });

  queue.on('error', (error) => {
    console.error('[NotificationQueue] Queue error:', error);
    if (isQueueErrorRecoverable(error)) {
      disableQueue('queue-error');
    }
  });

  queueEvents.on('error', (error) => {
    console.error('[NotificationQueue] Queue events error:', error);
    if (isQueueErrorRecoverable(error)) {
      disableQueue('queue-events-error');
    }
  });
};

export const initNotificationQueue = () => {
  if (initializationAttempted) {
    return queueReady;
  }

  initializationAttempted = true;

  try {
    connection = createRedisConnection();
    registerQueue();
    registerWorker();
    queueReady = true;
    console.log('[NotificationQueue] Queue initialized successfully');
  } catch (error) {
    queueReady = false;
    console.warn('[NotificationQueue] Queue initialization failed. Falling back to immediate processing.', error);
  }

  return queueReady;
};

const processImmediately = async (tenantId: string, notificationId: string) => {
  console.warn('[NotificationQueue] Immediate processing fallback triggered');
  await processNotificationLogic(tenantId, notificationId);
};

export const enqueueNotification = async (
  tenantId: string,
  notificationId: string,
  options?: JobsOptions
) => {
  if (!queueReady || !queue) {
    await processImmediately(tenantId, notificationId);
    return { queued: false };
  }

  try {
    await queue.add(
      'notification:dispatch',
      { tenantId, notificationId },
      options
    );

    return { queued: true };
  } catch (error) {
    console.error('[NotificationQueue] Failed to enqueue notification, falling back to immediate processing:', error);
    disableQueue('enqueue-error');
    await processImmediately(tenantId, notificationId);
    return { queued: false };
  }
};

export const isNotificationQueueReady = () => queueReady;

interface ErrorWithMessage {
  message?: string;
}

function isQueueErrorRecoverable(error: unknown) {
  if (!error) return false;
  const message = typeof error === 'string' ? error : (error as ErrorWithMessage).message;
  if (!message) return false;
  return /READONLY|ENOTFOUND|ECONNREFUSED|WRONGPASS|NOAUTH|Connection is closed/i.test(message);
}

function disableQueue(reason: string) {
  if (!queueReady) {
    return;
  }

  console.warn(`[NotificationQueue] Disabling queue due to ${reason}. All jobs will be processed immediately.`);
  queueReady = false;

  Promise.allSettled([
    worker?.close().catch((err) => console.error('[NotificationQueue] Failed to close worker:', err)),
    queue?.close().catch((err) => console.error('[NotificationQueue] Failed to close queue:', err)),
    queueEvents?.close().catch((err) => console.error('[NotificationQueue] Failed to close queue events:', err)),
    connection?.quit().catch((err) => console.error('[NotificationQueue] Failed to close Redis connection:', err))
  ]).finally(() => {
    worker = null;
    queue = null;
    queueEvents = null;
    connection = null;
  });
}
