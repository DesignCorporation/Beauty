// SMS Verification Service using Twilio
import twilio from 'twilio';
import crypto from 'crypto';

const normalizeEnv = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/\s+/g, '');
  return trimmed.replace(/^['"]|['"]$/g, '');
};

const accountSid = normalizeEnv(process.env.TWILIO_ACCOUNT_SID);
const authToken = normalizeEnv(process.env.TWILIO_AUTH_TOKEN);
const fromPhone = normalizeEnv(process.env.TWILIO_PHONE_NUMBER);

const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
const isTwilioConfigured = Boolean(
  accountSid &&
  authToken &&
  fromPhone &&
  accountSid.startsWith('AC') &&
  PHONE_REGEX.test(fromPhone)
);

const OTP_LENGTH = parseInt(process.env.SMS_OTP_LENGTH || '6');
const OTP_EXPIRY_MINUTES = parseInt(process.env.SMS_OTP_EXPIRY_MINUTES || '5');
const MAX_ATTEMPTS_PER_HOUR = parseInt(process.env.SMS_MAX_ATTEMPTS_PER_HOUR || '3');

// In-memory storage для OTP кодов (в production использовать Redis)
interface OTPData {
  code: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

const otpStorage = new Map<string, OTPData>();
const attemptStorage = new Map<string, { count: number; resetAt: number }>();

// Генерация случайного OTP кода
function generateOTP(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  return otp;
}

// Проверка rate limit
function checkRateLimit(phone: string): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now();
  const attempt = attemptStorage.get(phone);

  if (!attempt || now > attempt.resetAt) {
    // Создаем новый счетчик
    attemptStorage.set(phone, {
      count: 0,
      resetAt: now + 60 * 60 * 1000 // 1 час
    });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS_PER_HOUR };
  }

  if (attempt.count >= MAX_ATTEMPTS_PER_HOUR) {
    return { allowed: false, remainingAttempts: 0 };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS_PER_HOUR - attempt.count
  };
}

// Увеличение счетчика попыток
function incrementAttempts(phone: string): void {
  const attempt = attemptStorage.get(phone);
  if (attempt) {
    attempt.count++;
  }
}

// Отправка SMS кода через Twilio
export async function sendVerificationCode(phone: string): Promise<{
  success: boolean;
  message: string;
  expiresIn?: number;
  remainingAttempts?: number;
}> {
  try {
    // Проверка rate limit
    const rateLimit = checkRateLimit(phone);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `Too many attempts. Please try again later.`,
        remainingAttempts: 0
      };
    }

    // Проверка Twilio конфигурации (валидный SID и телефон в E.164)
    if (!isTwilioConfigured) {
      console.warn('⚠️ Twilio credentials invalid or missing, using mock mode');
      const mockCode = generateOTP();
      console.log(`📱 MOCK SMS: Phone=${phone}, Code=${mockCode}`);

      // Сохраняем mock код
      otpStorage.set(phone, {
        code: mockCode,
        expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
        attempts: 0,
        createdAt: Date.now()
      });

      incrementAttempts(phone);

      return {
        success: true,
        message: `Mock verification code sent: ${mockCode}`,
        expiresIn: OTP_EXPIRY_MINUTES * 60,
        remainingAttempts: rateLimit.remainingAttempts - 1
      };
    }

    // Генерация OTP кода
    const code = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

    // Сохранение кода в storage
    otpStorage.set(phone, {
      code,
      expiresAt,
      attempts: 0,
      createdAt: Date.now()
    });

    // Отправка SMS через Twilio
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body: `Your Beauty Platform verification code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      to: phone,
      ...(fromPhone ? { from: fromPhone } : {})
    });

    console.log(`✅ SMS sent successfully to ${phone}, SID: ${message.sid}`);

    incrementAttempts(phone);

    return {
      success: true,
      message: 'Verification code sent successfully',
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      remainingAttempts: rateLimit.remainingAttempts - 1
    };
  } catch (error: any) {
    console.error('❌ Error sending verification code:', error);
    return {
      success: false,
      message: error.message || 'Failed to send verification code'
    };
  }
}

// Проверка введенного кода
export function verifyCode(phone: string, code: string): {
  success: boolean;
  message: string;
} {
  const otpData = otpStorage.get(phone);

  if (!otpData) {
    return {
      success: false,
      message: 'No verification code found. Please request a new code.'
    };
  }

  // Проверка истечения времени
  if (Date.now() > otpData.expiresAt) {
    otpStorage.delete(phone);
    return {
      success: false,
      message: 'Verification code expired. Please request a new code.'
    };
  }

  // Проверка количества попыток
  if (otpData.attempts >= 3) {
    otpStorage.delete(phone);
    return {
      success: false,
      message: 'Too many failed attempts. Please request a new code.'
    };
  }

  // Проверка кода
  if (otpData.code !== code) {
    otpData.attempts++;
    return {
      success: false,
      message: `Invalid verification code. ${3 - otpData.attempts} attempts remaining.`
    };
  }

  // Успешная верификация - удаляем код
  otpStorage.delete(phone);
  attemptStorage.delete(phone);

  return {
    success: true,
    message: 'Phone number verified successfully'
  };
}

// Очистка истекших кодов (вызывать периодически)
export function cleanupExpiredCodes(): void {
  const now = Date.now();
  for (const [phone, otpData] of otpStorage.entries()) {
    if (now > otpData.expiresAt) {
      otpStorage.delete(phone);
    }
  }
}

// Запуск очистки каждые 5 минут
setInterval(cleanupExpiredCodes, 5 * 60 * 1000);
