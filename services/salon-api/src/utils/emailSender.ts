/**
 * Email Sender Utility
 * Утилита для отправки email через Notification Service
 * Используется в CRM API для триггерных email уведомлений
 */

import axios from 'axios';

// Notification Service URL из переменных окружения
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;

/**
 * Интерфейс для отправки email
 */
interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Интерфейс ответа от Notification Service
 */
interface EmailResponse {
  success: boolean;
  emailId?: string;
  messageId?: string;
  status: 'sent' | 'simulated';
  provider: string;
  timestamp: string;
  message?: string;
  error?: string;
}

/**
 * Отправляет email через Notification Service API
 *
 * @param params - Параметры email (to, subject, html, text)
 * @returns Promise с результатом отправки
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResponse> {
  try {
    console.log(`[EMAIL SENDER] Отправка email на ${params.to}: ${params.subject}`);

    const response = await axios.post<EmailResponse>(
      `${NOTIFICATION_SERVICE_URL}/api/notify/email`,
      {
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text || stripHtmlTags(params.html),
      },
      {
        timeout: 10000, // 10 секунд timeout
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success) {
      console.log(`[EMAIL SENDER] ✅ Email успешно отправлен: ${response.data.status} (${response.data.provider})`);
      return response.data;
    } else {
      console.error(`[EMAIL SENDER] ❌ Email не отправлен:`, response.data.error);
      return response.data;
    }

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`[EMAIL SENDER] ❌ Ошибка отправки email:`, {
        message: error.message,
        code: error.code,
        response: error.response?.data,
      });

      return {
        success: false,
        status: 'simulated',
        provider: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }

    console.error(`[EMAIL SENDER] ❌ Неизвестная ошибка:`, error);
    return {
      success: false,
      status: 'simulated',
      provider: 'error',
      timestamp: new Date().toISOString(),
      error: 'Unknown error',
    };
  }
}

/**
 * Отправляет email подтверждения записи клиенту
 *
 * @param clientEmail - Email клиента
 * @param data - Данные для формирования email
 */
export async function sendBookingConfirmationEmail(
  clientEmail: string,
  data: {
    clientName: string;
    appointmentNumber: string;
    serviceName: string;
    staffName: string;
    appointmentDate: string; // DD.MM.YYYY
    appointmentTime: string; // HH:MM
    duration: number;
    price: number;
    currency: string;
    salonName: string;
    notes?: string;
  }
): Promise<EmailResponse> {
  // Импортируем template функцию из локальных templates
  const {
    generateBookingConfirmationEmail,
    generateBookingConfirmationSubject,
  } = await import('../templates/booking-confirmation');

  const html = generateBookingConfirmationEmail(data);
  const subject = generateBookingConfirmationSubject(data);

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
}

/**
 * Отправляет email напоминания о записи клиенту (за 24 часа)
 *
 * @param clientEmail - Email клиента
 * @param data - Данные для формирования email
 */
export async function sendAppointmentReminderEmail(
  clientEmail: string,
  data: {
    clientName: string;
    appointmentNumber: string;
    serviceName: string;
    staffName: string;
    appointmentDate: string; // DD.MM.YYYY
    appointmentTime: string; // HH:MM
    duration: number;
    price: number;
    currency: string;
    salonName: string;
    notes?: string;
    hoursUntil: number;
  }
): Promise<EmailResponse> {
  // Импортируем template функцию из локальных templates
  const {
    generateAppointmentReminderEmail,
    generateAppointmentReminderSubject,
  } = await import('../templates/appointment-reminder');

  const html = generateAppointmentReminderEmail(data);
  const subject = generateAppointmentReminderSubject(data);

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
}

/**
 * Отправляет email с чеком об оплате клиенту
 *
 * @param clientEmail - Email клиента
 * @param data - Данные для формирования email
 */
export async function sendPaymentReceiptEmail(
  clientEmail: string,
  data: {
    clientName: string;
    clientEmail: string;
    receiptNumber: string;
    appointmentNumber: string;
    paymentDate: string;
    serviceName: string;
    staffName: string;
    appointmentDate: string;
    appointmentTime: string;
    price: number;
    currency: string;
    paymentMethod: string;
    transactionId: string;
    salonName: string;
    totalAmount: number;
  }
): Promise<EmailResponse> {
  // Импортируем template функцию из локальных templates
  const {
    generatePaymentReceiptEmail,
    generatePaymentReceiptSubject,
  } = await import('../templates/payment-receipt');

  const html = generatePaymentReceiptEmail(data);
  const subject = generatePaymentReceiptSubject(data);

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
}

/**
 * Отправляет email приглашение новому клиенту (без ClientProfile)
 * Содержит CTA для регистрации на Client Portal
 *
 * @param clientEmail - Email клиента
 * @param data - Данные для формирования email
 */
export async function sendAppointmentInvitationEmail(
  clientEmail: string,
  data: {
    clientName: string;
    appointmentNumber: string;
    serviceName: string;
    staffName: string;
    appointmentDate: string; // DD.MM.YYYY
    appointmentTime: string; // HH:MM
    duration: number;
    price: number;
    currency: string;
    salonName: string;
    registrationLink: string; // Link to Client Portal registration
    notes?: string;
  }
): Promise<EmailResponse> {
  // Импортируем template функцию из локальных templates
  const {
    generateAppointmentInvitationEmail,
    generateAppointmentInvitationSubject,
  } = await import('../templates/appointment-invitation');

  const html = generateAppointmentInvitationEmail(data);
  const subject = generateAppointmentInvitationSubject(data);

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
}

/**
 * Вспомогательная функция для удаления HTML тегов из строки
 * Используется как fallback для text версии email
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
