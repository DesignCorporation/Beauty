import crypto from 'crypto'

export interface PasswordResetToken {
  token: string          // Отправляется пользователю
  hash: string           // Хранится в БД
  expiresAt: Date        // Время истечения
}

/**
 * Generate a secure password reset token
 * Returns both the token (for email) and hash (for storage)
 */
export const generatePasswordResetToken = (hours = 24): PasswordResetToken => {
  // Generate random 32 bytes = 64 hex chars
  const token = crypto.randomBytes(32).toString('hex')

  // Hash the token for storage (one-way)
  const hash = crypto.createHash('sha256').update(token).digest('hex')

  // Set expiration time
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)

  return { token, hash, expiresAt }
}

/**
 * Verify a password reset token
 * Uses constant-time comparison to prevent timing attacks
 */
export const verifyPasswordResetToken = (
  token: string,
  storedHash: string | null | undefined
): boolean => {
  if (!token || !storedHash) {
    return false
  }

  try {
    // Hash the provided token
    const providedHash = crypto.createHash('sha256').update(token).digest('hex')

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash))
  } catch (error) {
    // timingSafeEqual throws if lengths don't match - this is OK
    return false
  }
}

/**
 * Check if token is still valid (not expired)
 */
export const isTokenValid = (expiresAt: Date | null | undefined): boolean => {
  if (!expiresAt) {
    return false
  }
  return new Date() < expiresAt
}
