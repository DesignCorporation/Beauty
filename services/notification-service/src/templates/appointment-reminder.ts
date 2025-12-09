/**
 * Appointment Reminder Email Template
 * Отправляется клиенту за 24 часа до визита
 */

export interface AppointmentReminderData {
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
  hoursUntil: number; // часов до визита
}

/**
 * Генерирует HTML для email напоминания о записи
 */
export function generateAppointmentReminderEmail(data: AppointmentReminderData): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Напоминание о записи</title>
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
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
    .countdown {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      text-align: center;
    }
    .countdown .time {
      font-size: 36px;
      font-weight: 700;
      color: #856404;
      margin: 10px 0;
    }
    .countdown .label {
      font-size: 14px;
      color: #856404;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 30px 20px;
    }
    .appointment-card {
      background-color: #f8f9fa;
      border-left: 4px solid #f5576c;
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
      color: #f5576c;
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
      background-color: #e7f3ff;
      border-left: 4px solid #0d6efd;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .notes .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #084298;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .notes .value {
      font-size: 14px;
      color: #084298;
    }
    .action-buttons {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      text-align: center;
    }
    .button.primary {
      background-color: #28a745;
    }
    .button.secondary {
      background-color: #dc3545;
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
      color: #f5576c;
      text-decoration: none;
    }
    .important-note {
      background-color: #f8d7da;
      border: 1px solid #f5c2c7;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
    }
    .important-note p {
      margin: 0;
      font-size: 14px;
      color: #842029;
    }
    @media (max-width: 600px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
      .action-buttons {
        flex-direction: column;
      }
      .button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>⏰ Напоминание о записи</h1>
      <p>Ваш визит скоро состоится</p>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Countdown -->
      <div class="countdown">
        <div class="label">До вашего визита осталось</div>
        <div class="time">${data.hoursUntil} часов</div>
      </div>

      <p>Здравствуйте, <strong>${data.clientName}</strong>!</p>
      <p>Напоминаем вам о предстоящей записи в <strong>${data.salonName}</strong>.</p>

      <!-- Appointment Details -->
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
        <div class="label">Примечания к записи</div>
        <div class="value">${data.notes}</div>
      </div>
      ` : ''}

      <!-- Important Note -->
      <div class="important-note">
        <p><strong>Важно:</strong> Если вы не сможете прийти, пожалуйста, предупредите нас заранее. Это позволит другим клиентам воспользоваться этим временем.</p>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <a href="#" class="button primary">✓ Подтвердить визит</a>
        <a href="#" class="button secondary">✗ Отменить запись</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #6c757d; text-align: center;">
        Ждем вас ${data.appointmentDate} в ${data.appointmentTime}!
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>${data.salonName}</strong></p>
      ${data.salonAddress ? `<p>${data.salonAddress}</p>` : ''}
      ${data.salonPhone ? `<p>Телефон: <a href="tel:${data.salonPhone}">${data.salonPhone}</a></p>` : ''}
      <p style="margin-top: 15px;">
        <a href="#">Связаться с нами</a> | <a href="#">Изменить запись</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Генерирует тему письма для напоминания о записи
 */
export function generateAppointmentReminderSubject(data: AppointmentReminderData): string {
  return `⏰ Напоминание: ${data.serviceName} — завтра в ${data.appointmentTime}`;
}