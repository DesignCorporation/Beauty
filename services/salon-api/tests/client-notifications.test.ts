import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClientPortalNotification } from '../src/utils/clientNotifications'
import { ClientNotificationType, NotificationPriority } from '@prisma/client'

const clientNotificationCreate = vi.fn()

vi.mock('@beauty-platform/database', () => ({
  tenantPrisma: vi.fn(() => ({
    clientNotification: {
      create: clientNotificationCreate
    }
  }))
}))

describe('createClientPortalNotification', () => {
  beforeEach(() => {
    clientNotificationCreate.mockReset()
  })

  it('пропускает создание уведомления без email', async () => {
    await createClientPortalNotification({
      clientEmail: null,
      type: ClientNotificationType.APPOINTMENT_CONFIRMED,
      title: 'Test',
      message: 'Body'
    })

    expect(clientNotificationCreate).not.toHaveBeenCalled()
  })

  it('создаёт уведомление и нормализует email', async () => {
    await createClientPortalNotification({
      clientEmail: '  TestUser@Example.COM ',
      type: ClientNotificationType.APPOINTMENT_REMINDER,
      title: 'Напоминание',
      message: 'Запись завтра'
    })

    expect(clientNotificationCreate).toHaveBeenCalledTimes(1)
    expect(clientNotificationCreate).toHaveBeenCalledWith({
      data: {
        clientEmail: 'testuser@example.com',
        type: ClientNotificationType.APPOINTMENT_REMINDER,
        priority: NotificationPriority.MEDIUM,
        title: 'Напоминание',
        message: 'Запись завтра'
      }
    })
  })

  it('пробрасывает кастомный priority и metadata', async () => {
    const metadata = { foo: 'bar' }

    await createClientPortalNotification({
      clientEmail: 'client@example.com',
      type: ClientNotificationType.APPOINTMENT_CANCELLED,
      title: 'Отмена',
      message: 'Запись отменена',
      priority: NotificationPriority.HIGH,
      metadata
    })

    expect(clientNotificationCreate).toHaveBeenCalledWith({
      data: {
        clientEmail: 'client@example.com',
        type: ClientNotificationType.APPOINTMENT_CANCELLED,
        priority: NotificationPriority.HIGH,
        title: 'Отмена',
        message: 'Запись отменена',
        metadata
      }
    })
  })
})
