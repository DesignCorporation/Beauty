/**
 * Payment Email Sender Utility
 * Отправляет email уведомления о платежах через Notification Service
 *
 * Интеграция с Phase 2.2 - Automatic Email Sending
 */

import axios from 'axios';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResponse {
  success: boolean;
  emailId?: string;
  status?: 'sent' | 'simulated' | 'failed';
  messageId?: string;
  error?: string;
}

/**
 * Базовая функция отправки email через Notification Service
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResponse> {
  try {
    console.log(`[EMAIL SENDER] Sending email to ${params.to}: ${params.subject}`);

    const response = await axios.post<EmailResponse>(
      `${NOTIFICATION_SERVICE_URL}/api/notify/email`,
      {
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text || stripHtmlTags(params.html),
      },
      {
        timeout: 10000, // 10 секунд
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[EMAIL SENDER] ✅ Email sent successfully to ${params.to}: ${response.data.emailId || 'unknown'}`);
    return response.data;

  } catch (error: any) {
    console.error(`[EMAIL SENDER] ❌ Error sending email:`, error.message);

    // Graceful fallback при недоступности Notification Service
    if (error.code === 'ECONNREFUSED' || error.response?.status === 503) {
      console.warn('[EMAIL SENDER] ⚠️ Notification Service unavailable, email not sent');
      return {
        success: false,
        status: 'failed',
        error: 'Notification Service unavailable'
      };
    }

    throw error;
  }
}

/**
 * Вспомогательная функция для удаления HTML тегов
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

interface PaymentReceiptData {
  customerName: string;
  customerEmail: string;
  receiptNumber: string;
  transactionId: string;
  paymentDate: string;
  serviceName: string;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'paypal';
  salonName: string;
  notes?: string;
}

/**
 * Отправка Payment Receipt email клиенту после успешной оплаты
 */
export async function sendPaymentReceiptEmail(
  recipientEmail: string,
  data: PaymentReceiptData
): Promise<EmailResponse> {

  const subject = `Чек оплаты №${data.receiptNumber} - ${data.salonName}`;

  // HTML шаблон Payment Receipt
  const html = generatePaymentReceiptEmail(data);

  return sendEmail({
    to: recipientEmail,
    subject,
    html
  });
}

/**
 * Генерация HTML шаблона для Payment Receipt
 * Используется профессиональный шаблон с invoice стилем
 */
function generatePaymentReceiptEmail(data: PaymentReceiptData): string {
  const {
    customerName,
    receiptNumber,
    transactionId,
    paymentDate,
    serviceName,
    amount,
    currency,
    paymentMethod,
    salonName,
    notes
  } = data;

  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Чек оплаты</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 2px solid #8b5cf6;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          color: #8b5cf6;
          font-size: 28px;
        }
        .receipt-number {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 15px;
          border-radius: 6px;
          text-align: center;
          margin-bottom: 30px;
          font-size: 18px;
          font-weight: bold;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 30px;
        }
        .info-item {
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 6px;
        }
        .info-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 16px;
          color: #111827;
          font-weight: 600;
        }
        .price-section {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
        }
        .price-label {
          font-size: 16px;
          color: #374151;
        }
        .price-amount {
          font-size: 24px;
          font-weight: bold;
          color: #8b5cf6;
        }
        .payment-method {
          display: inline-block;
          padding: 6px 12px;
          background-color: #dbeafe;
          color: #1e40af;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
        }
        .notes {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin-top: 20px;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        @media only screen and (max-width: 600px) {
          body {
            padding: 10px;
          }
          .container {
            padding: 20px;
          }
          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💳 Чек оплаты</h1>
          <p style="margin: 5px 0 0 0; color: #6b7280;">${salonName}</p>
        </div>

        <div class="receipt-number">
          Чек № ${receiptNumber}
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Клиент</div>
            <div class="info-value">${customerName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Дата оплаты</div>
            <div class="info-value">${paymentDate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Услуга</div>
            <div class="info-value">${serviceName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Способ оплаты</div>
            <div class="info-value">
              <span class="payment-method">${paymentMethod === 'stripe' ? 'Stripe' : 'PayPal'}</span>
            </div>
          </div>
        </div>

        <div class="price-section">
          <div class="price-row">
            <span class="price-label">Сумма к оплате:</span>
            <span class="price-amount">${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ${currency}</span>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item" style="grid-column: 1 / -1;">
            <div class="info-label">ID транзакции</div>
            <div class="info-value" style="font-size: 12px; word-break: break-all;">${transactionId}</div>
          </div>
        </div>

        ${notes ? `
        <div class="notes">
          <strong>📝 Примечание:</strong><br>
          ${notes}
        </div>
        ` : ''}

        <div class="footer">
          <p>Спасибо за оплату!</p>
          <p style="margin-top: 10px;">
            Этот чек является подтверждением оплаты.<br>
            Сохраните его для своих записей.
          </p>
          <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
            ${salonName} • Beauty Platform
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Генерация subject для Payment Receipt
 */
export function generatePaymentReceiptSubject(data: PaymentReceiptData): string {
  return `Чек оплаты №${data.receiptNumber} - ${data.salonName}`;
}
