/**
 * Payment Receipt Email Template
 * Отправляется клиенту после успешной оплаты услуги
 */

export interface PaymentReceiptData {
  clientName: string;
  clientEmail: string;
  receiptNumber: string;
  appointmentNumber: string;
  paymentDate: string; // DD.MM.YYYY HH:MM
  serviceName: string;
  staffName: string;
  appointmentDate: string; // DD.MM.YYYY
  appointmentTime: string; // HH:MM
  price: number;
  currency: string;
  paymentMethod: string; // 'Stripe' | 'PayPal' | 'Cash' | 'Card'
  transactionId: string;
  salonName: string;
  salonAddress?: string;
  salonPhone?: string;
  salonEmail?: string;
  taxAmount?: number;
  discount?: number;
  totalAmount: number;
}

/**
 * Генерирует HTML для email чека об оплате
 */
export function generatePaymentReceiptEmail(data: PaymentReceiptData): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Чек об оплате</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 20px;
    }
    .receipt-number {
      text-align: center;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 4px;
      margin: 20px 0;
    }
    .receipt-number .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6c757d;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .receipt-number .value {
      font-size: 24px;
      color: #00f2fe;
      font-weight: 700;
      margin-top: 5px;
    }
    .payment-details {
      background-color: #e7f5ff;
      border-left: 4px solid #0d6efd;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .payment-details .row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #d1e7ff;
    }
    .payment-details .row:last-child {
      border-bottom: none;
    }
    .payment-details .label {
      font-size: 14px;
      color: #084298;
      font-weight: 500;
    }
    .payment-details .value {
      font-size: 14px;
      color: #084298;
      font-weight: 600;
    }
    .price-breakdown {
      margin: 30px 0;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    .price-breakdown .row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
    }
    .price-breakdown .label {
      font-size: 14px;
      color: #6c757d;
    }
    .price-breakdown .value {
      font-size: 14px;
      color: #212529;
      font-weight: 500;
    }
    .price-breakdown .total {
      border-top: 2px solid #dee2e6;
      padding-top: 15px;
      margin-top: 10px;
    }
    .price-breakdown .total .label {
      font-size: 18px;
      color: #212529;
      font-weight: 600;
    }
    .price-breakdown .total .value {
      font-size: 24px;
      color: #00f2fe;
      font-weight: 700;
    }
    .appointment-info {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .appointment-info .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #856404;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .appointment-info .value {
      font-size: 14px;
      color: #856404;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #dee2e6;
    }
    .footer p {
      margin: 5px 0;
      font-size: 14px;
      color: #6c757d;
    }
    .footer a {
      color: #00f2fe;
      text-decoration: none;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #00f2fe;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      margin: 20px 0;
    }
    .transaction-id {
      font-size: 12px;
      color: #6c757d;
      text-align: center;
      margin-top: 20px;
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>✓ Оплата получена</h1>
      <p>Спасибо за ваш платеж</p>
    </div>

    <!-- Content -->
    <div class="content">
      <p>Здравствуйте, <strong>${data.clientName}</strong>!</p>
      <p>Мы подтверждаем получение оплаты за услугу в <strong>${data.salonName}</strong>.</p>

      <!-- Receipt Number -->
      <div class="receipt-number">
        <div class="label">Номер чека</div>
        <div class="value">${data.receiptNumber}</div>
      </div>

      <!-- Payment Details -->
      <div class="payment-details">
        <div class="row">
          <span class="label">Дата оплаты:</span>
          <span class="value">${data.paymentDate}</span>
        </div>
        <div class="row">
          <span class="label">Метод оплаты:</span>
          <span class="value">${data.paymentMethod}</span>
        </div>
        <div class="row">
          <span class="label">Услуга:</span>
          <span class="value">${data.serviceName}</span>
        </div>
        <div class="row">
          <span class="label">Мастер:</span>
          <span class="value">${data.staffName}</span>
        </div>
      </div>

      <!-- Appointment Info -->
      <div class="appointment-info">
        <div class="label">Запись №${data.appointmentNumber}</div>
        <div class="value">${data.appointmentDate} в ${data.appointmentTime}</div>
      </div>

      <!-- Price Breakdown -->
      <div class="price-breakdown">
        <div class="row">
          <span class="label">Услуга:</span>
          <span class="value">${data.price} ${data.currency}</span>
        </div>
        ${data.discount ? `
        <div class="row">
          <span class="label">Скидка:</span>
          <span class="value">-${data.discount} ${data.currency}</span>
        </div>
        ` : ''}
        ${data.taxAmount ? `
        <div class="row">
          <span class="label">Налог:</span>
          <span class="value">${data.taxAmount} ${data.currency}</span>
        </div>
        ` : ''}
        <div class="row total">
          <span class="label">Итого оплачено:</span>
          <span class="value">${data.totalAmount} ${data.currency}</span>
        </div>
      </div>

      <!-- Transaction ID -->
      <div class="transaction-id">
        ID транзакции: ${data.transactionId}
      </div>

      <!-- Call to Action -->
      <p style="text-align: center; margin-top: 30px;">
        <a href="#" class="button">Скачать PDF чек</a>
      </p>

      <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
        Этот документ является подтверждением оплаты. Пожалуйста, сохраните его для ваших записей.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>${data.salonName}</strong></p>
      ${data.salonAddress ? `<p>${data.salonAddress}</p>` : ''}
      ${data.salonPhone ? `<p>Телефон: <a href="tel:${data.salonPhone}">${data.salonPhone}</a></p>` : ''}
      ${data.salonEmail ? `<p>Email: <a href="mailto:${data.salonEmail}">${data.salonEmail}</a></p>` : ''}
      <p style="margin-top: 15px;">
        <a href="#">Связаться с нами</a> | <a href="#">Политика возврата</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Генерирует тему письма для чека об оплате
 */
export function generatePaymentReceiptSubject(data: PaymentReceiptData): string {
  return `✓ Чек об оплате №${data.receiptNumber} — ${data.salonName}`;
}