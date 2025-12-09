import nodemailer from 'nodemailer';

// Динамическая загрузка SMTP Configuration из environment при каждом вызове
const getSMTPConfig = () => ({
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'Beauty Platform <noreply@designcorp.eu>'
});

// Check if SMTP is configured
export const isSmtpConfigured = (): boolean => {
  const config = getSMTPConfig();
  return !!(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);
};

// Create reusable transporter
export const createEmailTransporter = () => {
  if (!isSmtpConfigured()) {
    console.warn('[EMAIL] SMTP not fully configured. Email sending will be simulated.');
    return null;
  }

  const config = getSMTPConfig();

  try {
    const transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
      // Development settings
      ...(process.env.NODE_ENV === 'development' && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    });

    console.log(`[EMAIL] SMTP транспорт создан: ${config.SMTP_USER}@${config.SMTP_HOST}:${config.SMTP_PORT}`);
    return transporter;
  } catch (error) {
    console.error('[EMAIL] Failed to create transporter:', error);
    return null;
  }
};

// Get default FROM address
export const getDefaultFrom = (): string => {
  const config = getSMTPConfig();
  return config.EMAIL_FROM;
};

// Test SMTP connection
export const testSmtpConnection = async (): Promise<boolean> => {
  const transporter = createEmailTransporter();

  if (!transporter) {
    console.log('[EMAIL] SMTP not configured, skipping connection test');
    return false;
  }

  try {
    await transporter.verify();
    console.log('[EMAIL] ✅ SMTP connection успешно проверено');
    return true;
  } catch (error) {
    console.error('[EMAIL] ❌ SMTP connection failed:', error);
    return false;
  }
};