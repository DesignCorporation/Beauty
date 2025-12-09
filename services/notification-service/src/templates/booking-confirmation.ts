/**
 * Booking Confirmation Email Template
 * Отправляется клиенту сразу после создания записи
 */

export interface BookingConfirmationData {
  clientName: string;
  appointmentNumber: string;
  serviceName: string;
  staffName: string;
  appointmentDate: string; // DD.MM.YYYY
  appointmentTime: string; // HH:MM
  duration: number; // minutes
  price: number;
  currency: string;
  salonName: string;
  salonAddress?: string;
  salonPhone?: string;
  notes?: string;
}

/**
 * Генерирует HTML для email подтверждения записи
 */
export function generateBookingConfirmationEmail(data: BookingConfirmationData): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Подтверждение записи</title>
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    .appointment-card {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .appointment-card .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6c757d;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .appointment-card .value {
      font-size: 18px;
      color: #212529;
      font-weight: 600;
      margin-bottom: 15px;
    }
    .appointment-card .value.large {
      font-size: 24px;
      color: #667eea;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .detail-item {
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    .detail-item .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6c757d;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .detail-item .value {
      font-size: 16px;
      color: #212529;
      font-weight: 500;
    }
    .notes {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .notes .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #856404;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .notes .value {
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
      color: #667eea;
      text-decoration: none;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #667eea;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      margin: 20px 0;
    }
    @media (max-width: 600px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>✓ Запись подтверждена</h1>
      <p>Ваша запись успешно создана</p>
    </div>

    <!-- Content -->
    <div class="content">
      <p>Здравствуйте, <strong>${data.clientName}</strong>!</p>
      <p>Благодарим вас за запись в <strong>${data.salonName}</strong>. Ваша запись подтверждена.</p>

      <!-- Appointment Number -->
      <div class="appointment-card">
        <div class="label">Номер записи</div>
        <div class="value large">${data.appointmentNumber}</div>

        <div class="label">Услуга</div>
        <div class="value">${data.serviceName}</div>

        <div class="label">Мастер</div>
        <div class="value">${data.staffName}</div>
      </div>

      <!-- Details Grid -->
      <div class="details-grid">
        <div class="detail-item">
          <div class="label">Дата</div>
          <div class="value">${data.appointmentDate}</div>
        </div>
        <div class="detail-item">
          <div class="label">Время</div>
          <div class="value">${data.appointmentTime}</div>
        </div>
        <div class="detail-item">
          <div class="label">Длительность</div>
          <div class="value">${data.duration} мин</div>
        </div>
        <div class="detail-item">
          <div class="label">Стоимость</div>
          <div class="value">${data.price} ${data.currency}</div>
        </div>
      </div>

      ${data.notes ? `
      <!-- Notes -->
      <div class="notes">
        <div class="label">Примечания</div>
        <div class="value">${data.notes}</div>
      </div>
      ` : ''}

      <!-- Call to Action -->
      <p style="text-align: center; margin-top: 30px;">
        <a href="#" class="button">Посмотреть все записи</a>
      </p>

      <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
        Если вам необходимо отменить или перенести запись, пожалуйста, свяжитесь с нами заранее.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>${data.salonName}</strong></p>
      ${data.salonAddress ? `<p>${data.salonAddress}</p>` : ''}
      ${data.salonPhone ? `<p>Телефон: <a href="tel:${data.salonPhone}">${data.salonPhone}</a></p>` : ''}
      <p style="margin-top: 15px;">
        <a href="#">Отменить запись</a> | <a href="#">Связаться с нами</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Генерирует тему письма для подтверждения записи
 */
export function generateBookingConfirmationSubject(data: BookingConfirmationData): string {
  return `✓ Запись подтверждена: ${data.serviceName} — ${data.appointmentDate} в ${data.appointmentTime}`;
}