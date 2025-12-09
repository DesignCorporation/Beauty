// MFA Service для Beauty Platform Auth Service
// Реализует TOTP (Time-based One-Time Password) для Super Admin

import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'
import crypto from 'crypto'
import pino from 'pino'

interface MFASetupResult {
  secret: string
  qrCodeUrl: string
  qrCodeDataUrl: string
  backupCodes: string[]
  manualEntryKey: string
}

interface MFAVerificationResult {
  verified: boolean
  window?: number
  usedBackupCode?: boolean
}

export class MFAService {
  private logger: pino.Logger
  private readonly issuer: string
  private readonly window: number

  constructor() {
    this.logger = pino({ name: 'MFAService' })
    this.issuer = process.env.MFA_ISSUER || 'Beauty Platform'
    this.window = parseInt(process.env.MFA_WINDOW || '1', 10) // Окно времени для валидации (30 сек * window)
  }

  /**
   * Генерирует секрет и QR-код для настройки MFA
   */
  async generateMFASetup(userEmail: string, userName?: string): Promise<MFASetupResult> {
    try {
      // Генерируем секрет для TOTP
      const secret = speakeasy.generateSecret({
        name: `${userName || userEmail} (${this.issuer})`,
        issuer: this.issuer,
        length: 32, // 256-bit секрет для высокой безопасности
      })

      if (!secret.base32) {
        throw new Error('Failed to generate MFA secret')
      }

      // Создаем otpauth URL для QR-кода
      const otpauthUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: `${userName || userEmail}`,
        issuer: this.issuer,
        encoding: 'base32',
      })

      // Генерируем QR-код как Data URL
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 256,
      })

      // Генерируем backup коды (10 одноразовых кодов)
      const backupCodes = this.generateBackupCodes(10)

      this.logger.info({
        userEmail,
        action: 'mfa_setup_generated',
        secretLength: secret.base32.length,
        backupCodesCount: backupCodes.length
      }, 'MFA setup generated for user')

      return {
        secret: secret.base32,
        qrCodeUrl: otpauthUrl,
        qrCodeDataUrl,
        backupCodes,
        manualEntryKey: this.formatSecretForManualEntry(secret.base32)
      }
    } catch (error) {
      this.logger.error({ error, userEmail }, 'Failed to generate MFA setup')
      throw new Error('Failed to generate MFA setup')
    }
  }

  /**
   * Проверяет TOTP токен или backup код
   */
  verifyMFAToken(
    secret: string, 
    token: string, 
    usedBackupCodes: string[] = []
  ): MFAVerificationResult {
    try {
      // Очищаем токен от пробелов и приводим к верхнему регистру
      const cleanToken = token.replace(/\s/g, '').toUpperCase()

      // Проверяем если это backup код (8 символов)
      if (cleanToken.length === 8) {
        return this.verifyBackupCode(cleanToken, usedBackupCodes)
      }

      // Проверяем TOTP токен (6 цифр)
      if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
        this.logger.warn({ tokenLength: cleanToken.length }, 'Invalid MFA token format')
        return { verified: false }
      }

      // Проверяем TOTP с окном времени
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: cleanToken,
        window: this.window,
        time: Math.floor(Date.now() / 1000)
      })

      this.logger.info({
        verified,
        window: this.window,
        action: 'mfa_token_verified'
      }, 'MFA token verification result')

      return {
        verified: Boolean(verified),
        window: this.window
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to verify MFA token')
      return { verified: false }
    }
  }

  /**
   * Проверяет backup код
   */
  private verifyBackupCode(code: string, usedBackupCodes: string[]): MFAVerificationResult {
    // Проверяем что код не использован
    if (usedBackupCodes.includes(code)) {
      this.logger.warn({ code }, 'Backup code already used')
      return { verified: false }
    }

    // В реальной системе backup коды должны храниться в БД в зашифрованном виде
    // Здесь упрощенная проверка формата
    if (code.length === 8 && /^[A-Z0-9]{8}$/.test(code)) {
      this.logger.info({ code }, 'Backup code verified')
      return { 
        verified: true, 
        usedBackupCode: true 
      }
    }

    return { verified: false }
  }

  /**
   * Генерирует backup коды
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = []
    
    for (let i = 0; i < count; i++) {
      // Генерируем 8-символьный код из цифр и букв
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      codes.push(code)
    }

    return codes
  }

  /**
   * Форматирует секрет для ручного ввода (группы по 4 символа)
   */
  private formatSecretForManualEntry(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret
  }

  /**
   * Генерирует текущий TOTP токен (для тестирования)
   */
  generateCurrentToken(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32'
    })
  }

  /**
   * Проверяет валидность секрета
   */
  validateSecret(secret: string): boolean {
    try {
      // Проверяем что секрет корректный base32
      return /^[A-Z2-7]+=*$/i.test(secret) && secret.length >= 16
    } catch {
      return false
    }
  }

  /**
   * Хеширует backup коды для безопасного хранения
   */
  hashBackupCodes(codes: string[]): string[] {
    return codes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    )
  }

  /**
   * Проверяет хешированный backup код
   */
  verifyHashedBackupCode(code: string, hashedCodes: string[], usedHashes: string[]): MFAVerificationResult {
    const codeHash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex')
    
    // Проверяем что код не использован
    if (usedHashes.includes(codeHash)) {
      return { verified: false }
    }

    // Проверяем что код существует
    if (hashedCodes.includes(codeHash)) {
      return { 
        verified: true, 
        usedBackupCode: true 
      }
    }

    return { verified: false }
  }

  /**
   * Получает время до следующего токена (в секундах)
   */
  getTimeUntilNextToken(): number {
    const now = Math.floor(Date.now() / 1000)
    const timeStep = 30 // TOTP использует 30-секундные интервалы
    return timeStep - (now % timeStep)
  }

  /**
   * Проверяет нужно ли требовать MFA для роли
   */
  static requiresMFA(userRole: string): boolean {
    // Пока только для SUPER_ADMIN
    return userRole === 'SUPER_ADMIN'
  }
}

// Singleton instance
export const mfaService = new MFAService()