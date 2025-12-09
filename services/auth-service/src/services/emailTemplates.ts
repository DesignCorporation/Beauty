/**
 * Email templates for salon registration and password reset
 */

/**
 * Welcome email template for new salon owner
 * No password in email - only reset link for security
 */
export const getWelcomeEmailTemplate = (
  firstName: string,
  salonName: string,
  resetLink: string
): string => {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 0;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 20px;
      background: #f9f9f9;
    }
    .greeting {
      font-size: 16px;
      color: #333;
      margin-bottom: 20px;
    }
    .main-text {
      font-size: 15px;
      color: #555;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .salon-name {
      font-weight: 600;
      color: #667eea;
    }
    .setup-box {
      background: white;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .setup-box h3 {
      margin: 0 0 15px 0;
      color: #667eea;
      font-size: 16px;
    }
    .setup-box p {
      margin: 0;
      color: #666;
      font-size: 14px;
      line-height: 1.8;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 30px 0;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
    }
    .security-note {
      background: #f0f4ff;
      border: 1px solid #d0d9ff;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      font-size: 13px;
      color: #555;
      line-height: 1.6;
    }
    .footer {
      background: #f0f0f0;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #ddd;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Beauty Platform</h1>
      <p style="margin: 10px 0 0 0; font-size: 14px;">Добро пожаловать на платформу управления салоном</p>
    </div>

    <div class="content">
      <p class="greeting">Привет, <strong>${firstName}</strong>! 👋</p>

      <p class="main-text">
        Поздравляем! Ваш салон <span class="salon-name">"${salonName}"</span> успешно создан на платформе Beauty Platform.
        Сейчас вы можете настроить доступ к панели управления и начать работу.
      </p>

      <div class="setup-box">
        <h3>🔐 Установка пароля</h3>
        <p>
          Для безопасности вам нужно установить пароль через ссылку ниже.
          Ссылка действительна 24 часа.
        </p>
      </div>

      <center>
        <a href="${resetLink}" class="cta-button">Установить пароль</a>
      </center>

      <div class="security-note">
        <strong>⚠️ Важно для безопасности:</strong><br>
        Никогда не делитесь этой ссылкой и паролем с другими людьми.
        Если вы не создавали этот аккаунт, пожалуйста, свяжитесь с поддержкой.
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        После установки пароля вы сможете полностью использовать панель управления:
      </p>
      <ul style="color: #666; font-size: 14px; margin: 10px 0; padding-left: 20px;">
        <li>📅 Управление расписанием и записями клиентов</li>
        <li>👥 База данных клиентов и история визитов</li>
        <li>💰 Отчеты по доходам и аналитика</li>
        <li>⚙️ Настройка услуг, мастеров и параметров салона</li>
      </ul>
    </div>

    <div class="footer">
      <p>Beauty Platform © 2025</p>
      <p>Если у вас есть вопросы, свяжитесь с нашей поддержкой</p>
      <p><a href="https://support.designcorp.eu" style="color: #667eea; text-decoration: none;">support@designcorp.eu</a></p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Password reset confirmation email
 */
export const getPasswordResetConfirmationTemplate = (firstName: string): string => {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 20px; border-radius: 5px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .success { color: #28a745; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Пароль установлен</h1>
    </div>
    <div class="content">
      <p>Привет, ${firstName}!</p>
      <p>Ваш пароль успешно установлен. Теперь вы можете войти в панель управления с вашим email и новым паролем.</p>
      <p style="margin-top: 30px;"><a href="https://salon.beauty.designcorp.eu/login" style="color: #667eea; text-decoration: none;">Перейти к входу</a></p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
