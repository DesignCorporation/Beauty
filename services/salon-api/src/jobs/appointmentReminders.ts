/**
 * Appointment Reminders Job
 * Отправляет email напоминания клиентам за 24 часа до визита
 *
 * Запускается каждый час (можно настроить частоту)
 */

import cron from 'node-cron';
import { prisma, Prisma } from '@beauty-platform/database';
import { ClientNotificationType, NotificationPriority } from '@prisma/client';
import { sendAppointmentReminderEmail } from '../utils/emailSender';
import { createClientPortalNotification } from '../utils/clientNotifications';

/**
 * Интервал отправки напоминаний (в часах)
 * Напоминания отправляются за 24 часа до визита
 */
const REMINDER_HOURS_BEFORE = 24;

/**
 * Окно времени для поиска appointments (в часах)
 * Ищем appointments в диапазоне от 23 до 25 часов вперед
 * Это дает 2-часовое окно для обработки
 */
const TIME_WINDOW_START = REMINDER_HOURS_BEFORE - 1; // 23 часа
const TIME_WINDOW_END = REMINDER_HOURS_BEFORE + 1;   // 25 часов

type ReminderAppointment = Prisma.AppointmentGetPayload<{
  include: {
    client: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    service: {
      select: {
        id: true;
        name: true;
        price: true;
      };
    };
    assignedTo: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
      };
    };
    tenant: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

/**
 * Функция для отправки напоминаний о предстоящих записях
 */
async function sendAppointmentReminders() {
  console.log('[REMINDER JOB] 🔔 Запуск проверки предстоящих записей...');

  try {
    // Вычисляем временное окно для поиска
    const now = new Date();
    const startTime = new Date(now.getTime() + TIME_WINDOW_START * 60 * 60 * 1000);
    const endTime = new Date(now.getTime() + TIME_WINDOW_END * 60 * 60 * 1000);

    console.log(`[REMINDER JOB] Поиск записей между ${startTime.toISOString()} и ${endTime.toISOString()}`);

    // Находим все appointments в указанном временном окне
    // Используем prisma (global client) для доступа ко всем tenants
    const upcomingAppointments: ReminderAppointment[] = await prisma.appointment.findMany({
      where: {
        startAt: {
          gte: startTime,
          lte: endTime
        },
        status: {
          in: ['PENDING', 'CONFIRMED'] // Только для pending и confirmed записей
        }
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        tenant: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`[REMINDER JOB] Найдено ${upcomingAppointments.length} предстоящих записей`);

    if (upcomingAppointments.length === 0) {
      console.log('[REMINDER JOB] ✅ Нет записей для напоминаний');
      return;
    }

    // Отправляем email напоминания для каждой записи
    let successCount = 0;
    let errorCount = 0;

    for (const appointment of upcomingAppointments) {
      try {
        // Пропускаем если у клиента или услуги нет email/данных
        if (!appointment.client.email || !appointment.service) {
          console.log(`[REMINDER JOB] ⚠️ Пропущено: клиент ${appointment.client.name} без email`);
          continue;
        }

        const staffFirstName = appointment.assignedTo?.firstName ?? 'Сотрудник';
        const staffLastName = appointment.assignedTo?.lastName ?? '';
        const staffName = `${staffFirstName}${staffLastName ? ` ${staffLastName}` : ''}`;

        const salonName = appointment.tenant?.name ?? 'Beauty Salon';

        // Форматируем данные для email template
        const appointmentDate = appointment.startAt.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const appointmentTime = appointment.startAt.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const duration = Math.round((appointment.endAt.getTime() - appointment.startAt.getTime()) / (1000 * 60));

        // Вычисляем точное количество часов до визита
        const hoursUntil = Math.round((appointment.startAt.getTime() - now.getTime()) / (1000 * 60 * 60));

        // Отправляем reminder email
        const emailPayload: Parameters<typeof sendAppointmentReminderEmail>[1] = {
          clientName: appointment.client.name,
          appointmentNumber: appointment.appointmentNumber,
          serviceName: appointment.service.name,
          staffName,
          appointmentDate,
          appointmentTime,
          duration,
          price: Number(appointment.service.price),
          currency: 'PLN',
          salonName,
          hoursUntil
        };

        if (appointment.notes) {
          emailPayload.notes = appointment.notes;
        }

        await sendAppointmentReminderEmail(appointment.client.email, emailPayload);

        await createClientPortalNotification({
          clientEmail: appointment.client.email,
          type: ClientNotificationType.APPOINTMENT_REMINDER,
          title: 'Напоминание о записи',
          message: `Напоминаем о записи №${appointment.appointmentNumber} на ${appointmentDate} в ${appointmentTime}. До визита осталось примерно ${hoursUntil} час(ов).`,
          priority: NotificationPriority.MEDIUM,
          metadata: {
            appointmentId: appointment.id,
            tenantId: appointment.tenantId,
            startAt: appointment.startAt.toISOString(),
            endAt: appointment.endAt.toISOString(),
            salonName
          }
        });

        successCount++;
        console.log(`[REMINDER JOB] ✅ Отправлено напоминание: ${appointment.client.name} (${appointment.client.email}) — ${appointmentDate} ${appointmentTime}`);

      } catch (error) {
        errorCount++;
        console.error(`[REMINDER JOB] ❌ Ошибка отправки напоминания для записи ${appointment.id}:`, error);
      }
    }

    console.log(`[REMINDER JOB] 🎯 Завершено: успешно ${successCount}, ошибок ${errorCount}`);

  } catch (error) {
    console.error('[REMINDER JOB] ❌ Критическая ошибка при обработке напоминаний:', error);
  }
}

/**
 * Инициализация и запуск cron job
 * Запускается каждый час в :00 минут
 *
 * Cron pattern: '0 * * * *'
 * - 0: В начале часа (0 минут)
 * - *: Каждый час
 * - *: Каждый день
 * - *: Каждый месяц
 * - *: Каждый день недели
 */
export function initializeAppointmentRemindersJob() {
  console.log('[REMINDER JOB] 🚀 Инициализация cron job для appointment reminders');
  console.log(`[REMINDER JOB] ⏰ Напоминания отправляются за ${REMINDER_HOURS_BEFORE} часов до визита`);
  console.log('[REMINDER JOB] 📅 Schedule: каждый час в :00 минут');

  // Запускаем cron job каждый час
  const job = cron.schedule('0 * * * *', async () => {
    await sendAppointmentReminders();
  }, {
    scheduled: true,
    timezone: 'Europe/Warsaw' // Польша (можно настроить через ENV)
  });

  console.log('[REMINDER JOB] ✅ Cron job запущен успешно');

  // Опционально: запустить сразу при старте для тестирования
  if (process.env.RUN_REMINDERS_ON_STARTUP === 'true') {
    console.log('[REMINDER JOB] 🔄 Запуск проверки при старте сервера...');
    sendAppointmentReminders().catch(err => {
      console.error('[REMINDER JOB] ❌ Ошибка при первичном запуске:', err);
    });
  }

  return job;
}

/**
 * Ручной запуск job для тестирования (можно вызвать через API endpoint)
 */
export async function runAppointmentRemindersManually() {
  console.log('[REMINDER JOB] 🔧 Ручной запуск job...');
  await sendAppointmentReminders();
}
