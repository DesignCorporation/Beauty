import express, { type Router } from 'express'
import crypto from 'node:crypto'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { prisma, ClientSource } from '@beauty-platform/database'
import { tenantPrisma } from '@beauty-platform/database'
import { authenticate } from '../middleware/auth'
import { sendVerificationSms } from '../config/sms-providers'
import {
  generateOtp,
  storeOtp,
  getStoredOtp,
  clearOtp,
  incrementSendRequest,
  recordFailedAttempt,
  resetAttempts,
  getOtpExpirySeconds,
  getMaxAttempts
} from '../utils/otp-manager'
import { getAuthContext } from '../utils/get-auth-context'

const router: Router = express.Router()

const authErrorResponse = () => ({
  success: false,
  error: 'Authentication required',
  code: 'AUTH_REQUIRED'
})

router.use(authenticate)

type VerifyBody = {
  phone?: string
}

type ConfirmBody = {
  phone?: string
  code?: string
}

function normalizePhoneOrThrow(rawPhone?: string): string {
  if (!rawPhone) {
    throw new Error('Phone number is required')
  }

  const phoneNumber = parsePhoneNumberFromString(rawPhone)

  if (!phoneNumber || !phoneNumber.isValid()) {
    throw new Error('Invalid phone number format')
  }

  return phoneNumber.number
}

router.post('/verify-phone', async (req, res) => {
  try {
    const body = req.body as VerifyBody
    const normalizedPhone = normalizePhoneOrThrow(body.phone)

    const { allowed, remaining } = await incrementSendRequest(normalizedPhone)

    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many verification attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        attemptsRemaining: 0,
        maxAttempts: getMaxAttempts()
      })
    }

    const otp = generateOtp()
    await storeOtp(normalizedPhone, otp)

    const expirySeconds = getOtpExpirySeconds()
    const minutes = Math.max(Math.floor(expirySeconds / 60), 1)

    const messageEn = `Your Beauty Platform verification code: ${otp}. Valid for ${minutes} minutes.`
    const messagePl = `Twój kod weryfikacyjny Beauty Platform: ${otp}. Ważny przez ${minutes} minut.`

    await sendVerificationSms(normalizedPhone, `${messageEn}\n${messagePl}`)

    return res.json({
      success: true,
      expiresIn: expirySeconds,
      attemptsRemaining: remaining,
      maxAttempts: getMaxAttempts()
    })
  } catch (error) {
    console.error('[Auth][Phone] verify-phone failed', error)

    if (error instanceof Error && error.message.includes('Invalid phone number')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'INVALID_PHONE'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to send verification code',
      code: 'SMS_FAILED'
    })
  }
})

router.post('/confirm-phone', authenticate, async (req, res) => {
  try {
    const body = req.body as ConfirmBody
    const normalizedPhone = normalizePhoneOrThrow(body.phone)
    const providedCode = (body.code || '').trim()

    if (!providedCode) {
      return res.status(400).json({
        success: false,
        error: 'Verification code is required',
        code: 'INVALID_CODE'
      })
    }

    const storedCode = await getStoredOtp(normalizedPhone)

    if (!storedCode) {
      return res.status(400).json({
        success: false,
        error: 'Verification code expired or not found',
        code: 'CODE_EXPIRED'
      })
    }

    const storedBuffer = Buffer.from(storedCode)
    const providedBuffer = Buffer.from(providedCode)
    const isEqual =
      storedBuffer.length === providedBuffer.length &&
      crypto.timingSafeEqual(storedBuffer, providedBuffer)

    if (!isEqual) {
      const { remaining } = await recordFailedAttempt(normalizedPhone)

      return res.status(400).json({
        success: false,
        error: 'Incorrect verification code',
        code: 'INVALID_CODE',
        attemptsRemaining: Math.max(remaining, 0),
        maxAttempts: getMaxAttempts()
      })
    }

    const auth = getAuthContext(req)
    if (!auth.email) {
      return res.status(401).json(authErrorResponse())
    }

    const userRepo = tenantPrisma(null).user
    const currentUser = await userRepo.findUnique({
      where: { email: auth.email.toLowerCase() }
    })

    if (!currentUser) {
      await clearOtp(normalizedPhone)
      await resetAttempts(normalizedPhone)

      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
    }

    await prisma.clientProfile.upsert({
      where: { email: auth.email.toLowerCase() },
      create: {
        email: auth.email.toLowerCase(),
        firstName: currentUser.firstName || 'Client',
        lastName: currentUser.lastName || '',
        phone: normalizedPhone,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        source: ClientSource.WALK_IN
      },
      update: {
        phone: normalizedPhone,
        phoneVerified: true,
        phoneVerifiedAt: new Date()
      }
    })

    await userRepo.update({
      where: { id: currentUser.id },
      data: {
        phone: normalizedPhone,
        emailVerified: true
      }
    })

    await clearOtp(normalizedPhone)
    await resetAttempts(normalizedPhone)

    return res.json({
      success: true,
      verified: true
    })
  } catch (error) {
    console.error('[Auth][Phone] confirm-phone failed', error)

    if (error instanceof Error && error.message.includes('Invalid phone number')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'INVALID_PHONE'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to verify phone number',
      code: 'VERIFICATION_FAILED'
    })
  }
})

export default router
