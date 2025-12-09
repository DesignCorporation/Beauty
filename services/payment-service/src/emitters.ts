/**
 * Эмиттеры платежных событий для WebSocket/Socket.IO
 * Используются для отправки real-time уведомлений через notification-service
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
 * Эмитировать событие завершения платежа
 * Отправляет уведомление о успешном платеже в real-time
 */
export async function emitPaymentCompleted(data: {
  paymentId: string;
  amount: number;
  currency: string;
  appointmentId?: string;
  tenantId: string;
  clientId?: string;
  clientName: string;
}): Promise<void> {
  try {
    console.log(`[Emitters] 💳 paymentCompleted event:`, {
      paymentId: data.paymentId,
      amount: data.amount,
      currency: data.currency,
      clientName: data.clientName,
      appointmentId: data.appointmentId,
      tenantId: data.tenantId
    });

    await postEvent('/api/events/payment-completed', data);
  } catch (error) {
    console.error(`[Emitters] ❌ Failed to emit paymentCompleted:`, error);
    // Не блокируем webhook если эмиссия не сработает
  }
}

/**
 * Эмитировать событие ошибки платежа
 */
export async function emitPaymentFailed(data: {
  paymentId: string;
  amount: number;
  currency: string;
  reason: string;
  tenantId: string;
  clientName: string;
}): Promise<void> {
  try {
    console.log(`[Emitters] ❌ paymentFailed event:`, {
      paymentId: data.paymentId,
      amount: data.amount,
      reason: data.reason,
      clientName: data.clientName,
      tenantId: data.tenantId
    });

    await postEvent('/api/events/payment-failed', data);
  } catch (error) {
    console.error(`[Emitters] ❌ Failed to emit paymentFailed:`, error);
  }
}

/**
 * Эмитировать событие возврата средств (refund)
 */
export async function emitRefundProcessed(data: {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  tenantId: string;
  clientName: string;
  reason?: string;
}): Promise<void> {
  try {
    console.log(`[Emitters] 🔄 refundProcessed event:`, {
      refundId: data.refundId,
      paymentId: data.paymentId,
      amount: data.amount,
      reason: data.reason,
      tenantId: data.tenantId
    });

    await postEvent('/api/events/payment-refunded', data);
  } catch (error) {
    console.error(`[Emitters] ❌ Failed to emit refundProcessed:`, error);
  }
}
