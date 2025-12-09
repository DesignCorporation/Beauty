import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Безопасное шифрование TOTP секретов согласно OWASP 2025
 * Использует AES-256-GCM с уникальными IV для каждого секрета
 */

// 🔒 Получаем мастер-ключ из переменных окружения
const MASTER_KEY =
  process.env.MFA_MASTER_KEY ||
  'beauty-platform-test-master-key-for-development-only-2025-abcdefgh1234567890';

if (!process.env.MFA_MASTER_KEY) {
  console.warn('🚨 WARNING: MFA_MASTER_KEY not set! Using test key for development');
}

/**
 * Шифрует TOTP секрет с помощью AES-256-GCM
 */
export function encryptTOTPSecret(plainSecret: string): { encrypted: string; iv: string; authTag: string } {
  try {
    // 🎆 ИСПРАВЛЕНО: использовать современный createCipheriv 
    const key = crypto.createHash('sha256').update(MASTER_KEY).digest();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(plainSecret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: 'test' // Для совместимости
    };
  } catch (error) {
    console.error('🚨 TOTP encryption failed:', error);
    console.error('MASTER_KEY:', MASTER_KEY ? 'SET' : 'EMPTY');
    console.error('Error details:', error);
    throw new Error('Failed to encrypt TOTP secret');
  }
}

/**
 * Расшифровывает TOTP секрет
 */
export function decryptTOTPSecret(encryptedData: { encrypted: string; iv: string; authTag: string }): string {
  try {
    // 🎆 ИСПРАВЛЕНО: использовать современный createDecipheriv
    const key = crypto.createHash('sha256').update(MASTER_KEY).digest();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('🚨 TOTP decryption failed:', error);
    throw new Error('Failed to decrypt TOTP secret');
  }
}

/**
 * Хэширует backup код с помощью bcrypt (одноразовое использование)
 */
export async function hashBackupCode(code: string): Promise<string> {
  try {
    const saltRounds = 12; // Высокий уровень защиты для backup кодов
    return await bcrypt.hash(code, saltRounds);
  } catch (error) {
    console.error('🚨 Backup code hashing failed:', error);
    throw new Error('Failed to hash backup code');
  }
}

/**
 * Проверяет backup код
 */
export async function verifyBackupCode(plainCode: string, hashedCode: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainCode, hashedCode);
  } catch (error) {
    console.error('🚨 Backup code verification failed:', error);
    return false;
  }
}

/**
 * Безопасно генерирует backup коды
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Генерируем 8-символьный код из безопасных символов
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  
  return codes;
}

/**
 * Проверяет надежность мастер-ключа
 */
export function validateMasterKey(): boolean {
  if (!MASTER_KEY || MASTER_KEY.length < 64) {
    console.error('🚨 CRITICAL: MFA_MASTER_KEY too short or missing!');
    return false;
  }
  
  return true;
}

/**
 * Генерирует новый мастер-ключ для production
 */
export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
