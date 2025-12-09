/**
 * Appointment Invitation Email Template
 * Отправляется НОВЫМ клиентам (без ClientProfile)
 * Приглашает зарегистрироваться на Client Portal
 */

export interface AppointmentInvitationData {
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
  registrationLink: string; // CTA link для регистрации
}

/**
 * Генерирует HTML для email приглашения нового клиента
 */
export function generateAppointmentInvitationEmail(data: AppointmentInvitationData): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Вас записали в салон</title>
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
    .benefits-box {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: #ffffff;
      padding: 25px;
      margin: 25px 0;
      border-radius: 8px;
    }
    .benefits-box h3 {
      margin: 0 0 15px 0;
      font-size: 20px;
      font-weight: 600;
    }
    .benefits-box ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .benefits-box li {
      margin: 10px 0;
      padding-left: 25px;
      position: relative;
    }
    .benefits-box li:before {
      content: "✓";
      position: absolute;
      left: 0;
      font-weight: bold;
      font-size: 18px;
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
      padding: 14px 40px;
      background-color: #28a745;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
      transition: all 0.3s ease;
    }
    .button:hover {
      background-color: #218838;
      box-shadow: 0 6px 16px rgba(40, 167, 69, 0.4);
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
      <h1>🎉 Вас записали в салон!</h1>
      <p>Детали вашей записи</p>
    </div>

    <!-- Content -->
    <div class="content">
      <p>Здравствуйте, <strong>${data.clientName}</strong>!</p>
      <p>Салон <strong>${data.salonName}</strong> создал для вас запись на услугу. Мы будем рады видеть вас!</p>

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

      <!-- Benefits Box (CTA) -->
      <div class="benefits-box">
        <h3>💎 Зарегистрируйтесь на нашем портале!</h3>
        <ul>
          <li>Просматривайте все свои записи онлайн</li>
          <li>Копите баллы лояльности и получайте скидки</li>
          <li>Записывайтесь на услуги в любое время</li>
          <li>Получайте персональные предложения</li>
          <li>Отслеживайте историю визитов</li>
        </ul>
      </div>

      <!-- Call to Action -->
      <p style="text-align: center; margin-top: 30px;">
        <a href="${data.registrationLink}" class="button">🚀 Зарегистрироваться сейчас</a>
      </p>

      <p style="margin-top: 30px; font-size: 14px; color: #6c757d; text-align: center;">
        Регистрация займет всего 2 минуты. После регистрации вы сможете управлять всеми своими записями в одном месте.
      </p>

      <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
        Если вам необходимо отменить или перенести запись, пожалуйста, свяжитесь с салоном заранее.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>${data.salonName}</strong></p>
      ${data.salonAddress ? `<p>${data.salonAddress}</p>` : ''}
      ${data.salonPhone ? `<p>Телефон: <a href="tel:${data.salonPhone}">${data.salonPhone}</a></p>` : ''}
      <p style="margin-top: 15px; color: #adb5bd;">
        Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Генерирует тему письма для приглашения нового клиента
 */
export function generateAppointmentInvitationSubject(data: AppointmentInvitationData): string {
  return `🎉 Вас записали в ${data.salonName} — ${data.appointmentDate} в ${data.appointmentTime}`;
}
