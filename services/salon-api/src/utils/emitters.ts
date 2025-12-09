/**
 * Эмиттеры событий для WebSocket/Socket.IO
 * Используются для отправки real-time уведомлений через notification-service
 *
 * Примечание: это временное решение. Функции логируют события,
 * которые затем отправляются через HTTP API к notification-service
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;
const INTERNAL_EVENTS_TOKEN = process.env.INTERNAL_EVENTS_TOKEN;

const postEvent = async (path: string, payload: Record<string, unknown>): Promise<void> => {
  const url = new URL(path, NOTIFICATION_SERVICE_URL);
  const body = JSON.stringify(payload);
  const isHttps = url.protocol === 'https:';

  const options: http.RequestOptions = {
    method: 'POST',
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...(INTERNAL_EVENTS_TOKEN ? { 'x-internal-token': INTERNAL_EVENTS_TOKEN } : {})
    },
    timeout: 3000
  };

  await new Promise<void>((resolve, reject) => {
    const req = (isHttps ? https : http).request(options, (res) => {
      // Читаем и игнорируем тело, важно закрыть соединение
      res.on('data', () => {});
      res.on('end', () => resolve());
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Event request timed out'));
    });

    req.write(body);
    req.end();
  });
};

/**
 * Эмитировать событие создания записи
 * Отправляет уведомление в real-time через WebSocket
 */
export async function emitAppointmentCreated(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  tenantId: string;
  startAt: string;
  endAt: string;
  service: string;
}): Promise<void> {
  try {
    console.log(`[Emitters] 📬 appointmentCreated event:`, {
      appointmentId: data.appointmentId,
      clientName: data.clientName,
      staffName: data.staffName,
      service: data.service,
      startAt: data.startAt,
      tenantId: data.tenantId
    });

    // TODO: Если notification-service построен и доступен,
    // отправляем HTTP запрос для WebSocket эмиссии
    await postEvent('/api/events/appointment-created', data);

  } catch (error) {
    console.error(`[Emitters] ❌ Failed to emit appointmentCreated:`, error);
    // Не блокируем основной flow если эмиссия не сработает
  }
}

/**
 * Эмитировать событие напоминания о записи
 * Отправляет уведомление за X часов до записи
 */
export async function emitAppointmentReminder(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  staffName: string;
  service: string;
  startAt: string;
  hoursUntilAppointment: number;
  tenantId: string;
}): Promise<void> {
  try {
    console.log(`[Emitters] ⏰ appointmentReminder event:`, {
      appointmentId: data.appointmentId,
      clientName: data.clientName,
      service: data.service,
      hoursUntilAppointment: data.hoursUntilAppointment,
      startAt: data.startAt,
      tenantId: data.tenantId
    });

    await postEvent('/api/events/appointment-reminder', data);

  } catch (error) {
    console.error(`[Emitters] ❌ Failed to emit appointmentReminder:`, error);
  }
}

/**
 * Эмитировать событие отмены записи
 */
export async function emitAppointmentCancelled(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  tenantId: string;
  reason?: string;
}): Promise<void> {
  try {
    console.log(`[Emitters] ❌ appointmentCancelled event:`, {
      appointmentId: data.appointmentId,
      clientName: data.clientName,
      reason: data.reason,
      tenantId: data.tenantId
    });

    await postEvent('/api/events/appointment-cancelled', data);

  } catch (error) {
    console.error(`[Emitters] ❌ Failed to emit appointmentCancelled:`, error);
  }
}

/**
 * Получить URL notification-service для отладки
 */
export function getNotificationServiceUrl(): string {
  return NOTIFICATION_SERVICE_URL;
}
