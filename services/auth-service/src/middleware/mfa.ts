import type { Request, Response, NextFunction } from 'express'
import { UserRole } from '@prisma/client'
import { prisma } from '@beauty-platform/database'
import pino from 'pino'
import { getAuthContext } from '../utils/get-auth-context'
import type { JWTPayload } from '../types/auth'

const logger = pino({ name: 'MFAMiddleware' })

const buildAuthRequired = () => ({
  success: false,
  error: 'AUTH_REQUIRED',
  code: 'AUTH_REQUIRED',
  message: 'Authentication required'
})

export async function requireMFA(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getAuthContext(req)

    if (user.role !== UserRole.SUPER_ADMIN) {
      next()
      return
    }

    if (!user.userId) {
      res.status(401).json(buildAuthRequired())
      return
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { mfaEnabled: true, mfaBackupCodes: true, mfaSecret: true }
    })

    if (!dbUser?.mfaEnabled || !dbUser.mfaSecret) {
      next()
      return
    }

    if (!dbUser.mfaBackupCodes || dbUser.mfaBackupCodes.length === 0) {
      logger.warn({ userId: user.userId }, 'User has MFA enabled but no backup codes')
    }

    if (req.cookies?.beauty_mfa_verified === 'true' || user.mfaVerified) {
      next()
      return
    }

    res.status(403).json({
      success: false,
      error: 'MFA verification required',
      code: 'MFA_VERIFICATION_REQUIRED',
      action: 'VERIFY_MFA',
      verifyEndpoint: '/auth/mfa/verify'
    })
  } catch (error) {
    let userId: string | undefined
    try {
      userId = getAuthContext(req).userId
    } catch {
      userId = undefined
    }

    logger.error({ error, userId }, 'MFA middleware error')
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
}

export function markMFAVerified(req: Request, _res: Response, next: NextFunction) {
  const user = req.user as JWTPayload | undefined
  if (user) {
    user.mfaVerified = true
  }
  next()
}

export async function requireMFAVerified(req: Request, res: Response, next: NextFunction) {
  let user: JWTPayload
  try {
    user = getAuthContext(req)
  } catch {
    res.status(401).json(buildAuthRequired())
    return
  }

  if (user.role !== UserRole.SUPER_ADMIN) {
    next()
    return
  }

  if (!user.userId) {
    res.status(401).json(buildAuthRequired())
    return
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { mfaEnabled: true }
    })

    if (!dbUser?.mfaEnabled) {
      next()
      return
    }

    const verified = req.cookies?.beauty_mfa_verified === 'true' || user.mfaVerified
    if (!verified) {
      res.status(403).json({
        success: false,
        error: 'MFA verification required for this action',
        code: 'MFA_SESSION_REQUIRED',
        action: 'VERIFY_MFA',
        verifyEndpoint: '/auth/mfa/verify'
      })
      return
    }

    if (req.user) {
      req.user.mfaVerified = true
    }

    next()
  } catch (error) {
    logger.error({ error, userId: user.userId }, 'Error checking MFA status')
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
}
