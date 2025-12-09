import nodemailer, { Transporter } from 'nodemailer';

/**
 * 📧 EmailService - Отправка писем через nodemailer
 * Поддерживает как реальную SMTP отправку, так и dev mode (логирование в консоль)
 */
class EmailService {
  private transporter: Transporter | null = null;
  private isDevelopmentMode: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Инициализация транспорта nodemailer
   * Если SMTP не настроен, переходит в dev mode
   */
  private initializeTransporter(): void {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM;

    // Проверяем обязательные SMTP переменные
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
      console.warn(
        '[EmailService] ⚠️  SMTP credentials not configured. Using development mode (console logging).'
      );
      console.warn(
        '[EmailService] Required ENV vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM'
      );
      this.isDevelopmentMode = true;
      return;
    }

    try {
      // Создаем транспорт для реальной отправки
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: process.env.SMTP_SECURE === 'true', // true для 465, false для других портов
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      console.log(
        `[EmailService] ✅ SMTP configured: ${smtpUser}@${smtpHost}:${smtpPort}`
      );
    } catch (error) {
      console.error('[EmailService] ❌ Failed to initialize SMTP transport:', error);
      this.isDevelopmentMode = true;
    }
  }

  /**
   * Отправка письма
   * @param to - Email адрес получателя
   * @param subject - Тема письма
   * @param html - HTML содержимое письма
   * @throws Error если отправка не удалась
   */
  async sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string }> {
    const smtpFrom = process.env.SMTP_FROM || 'noreply@beauty-platform.com';

    if (this.isDevelopmentMode) {
      // Dev mode: логируем содержимое письма
      console.log('[EmailService] 📧 DEV MODE - Email content (not sent):');
      console.log(`  To: ${to}`);
      console.log(`  From: ${smtpFrom}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Body:\n${html}`);
      console.log('---');

      return {
        success: true,
        messageId: `dev-${Date.now()}`
      };
    }

    if (!this.transporter) {
      throw new Error('[EmailService] Email transporter not initialized and not in dev mode');
    }

    try {
      // Отправляем письмо через SMTP
      const info = await this.transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
        replyTo: smtpFrom
      });

      console.log(`[EmailService] ✅ Email sent: ${info.messageId} to ${to}`);

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[EmailService] ❌ Failed to send email to ${to}:`, errorMessage);
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  /**
   * Проверка соединения с SMTP сервером (для диагностики)
   */
  async verify(): Promise<boolean> {
    if (this.isDevelopmentMode) {
      console.log('[EmailService] Development mode - verification skipped');
      return true;
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('[EmailService] ✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('[EmailService] ❌ SMTP verification failed:', error);
      return false;
    }
  }
}

// Экспортируем синглтон инстанс
export const emailService = new EmailService();
