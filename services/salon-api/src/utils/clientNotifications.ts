import { ClientNotificationType, NotificationPriority, Prisma } from '@prisma/client';
import { tenantPrisma } from '@beauty-platform/database';

export async function createClientPortalNotification(params: {
  clientEmail: string | undefined | null;
  type: ClientNotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
}) {
  const email = params.clientEmail?.toLowerCase().trim();
  if (!email) {
    return;
  }

  try {
    const data: Prisma.ClientNotificationUncheckedCreateInput = {
      clientEmail: email,
      type: params.type,
      priority: params.priority ?? NotificationPriority.MEDIUM,
      title: params.title,
      message: params.message
    };

    // Add metadata only if provided (never undefined with exactOptionalPropertyTypes)
    if (params.metadata) {
      data.metadata = params.metadata as Prisma.InputJsonValue;
    }

    await tenantPrisma(null).clientNotification.create({ data });
  } catch (error) {
    console.error('[ClientNotifications] Failed to create client portal notification', {
      email,
      type: params.type,
      error
    });
  }
}
