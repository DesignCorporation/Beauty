import express from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { tenantPrisma, prisma } from '@beauty-platform/database'
import { generateTokenPair, getTokenExpiration, hashToken } from '../utils/jwt'
import { EntityStatus, UserRole } from '@prisma/client'
import { getAuthContext } from '../utils/get-auth-context'
import {
  salonRegistrationSchema,
  createSalonWithOwner,
  SalonRegistrationError
} from './salon-registration'
import type { SalonRegistrationTransactionResult } from './salon-registration'

const router: express.Router = express.Router()

/**
 * Простой endpoint для создания салона владельцем (который уже вошел)
 * Требует: JWT token (аутентифицированный пользователь с ролью SALON_OWNER)
 * Payload: { name, salonType, currency, description? }
 */
router.post('/owner/create-salon', async (req, res): Promise<void> => {
  try {
    const authUser = getAuthContext(req)

    if (!authUser.userId || !authUser.email) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      })
      return
    }

    // Валидация минимального payload'а
    const { name, salonType, currency } = req.body
    if (!name || !salonType || !currency) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name, salonType, currency',
        code: 'VALIDATION_ERROR'
      })
      return
    }

    const existingUser = await tenantPrisma(null).user.findUnique({
      where: { id: authUser.userId },
      include: {
        ownedTenants: true
      }
    })

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
      return
    }

    // Создать новый салон
    const result = await tenantPrisma(null).$transaction(async (tx) => {
      return createSalonWithOwner(tx, {
        owner: {
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName
        },
        value: {
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          password: 'unchanged', // dummy, не используется
          phone: existingUser.phone || '+380000000000',
          language: 'RU',
          salonName: name,
          businessType: salonType,
          country: 'Ukraine',
          teamSize: '1',
          planType: 'BASIC',
          acceptTerms: true,
          // Добавляем необходимые поля из payload
          salonType: salonType,
          currency: currency,
          description: req.body.description || ''
        },
        hashedPassword: '' // не требуется для существующего пользователя
      })
    }) as SalonRegistrationTransactionResult

    const newTenantId = result.salon.id

    const updatedUserData = await tenantPrisma(null).user.update({
      where: { id: authUser.userId },
      data: {
        tenantId: newTenantId,
        role: UserRole.SALON_OWNER,
        status: EntityStatus.ACTIVE
      }
    })

    // Собираем роли пользователя по tenant
    const tenantRoles = await prisma.userTenantRole.findMany({
      where: {
        userId: authUser.userId,
        isActive: true
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    const tokenTenants = tenantRoles.map(tenantRole => ({
      tenantId: tenantRole.tenantId,
      tenantName: tenantRole.tenant.name,
      slug: tenantRole.tenant.slug,
      role: tenantRole.role
    }))

    const activeTenantRole =
      tenantRoles.find(tenantRole => tenantRole.tenantId === newTenantId)?.role ??
      tenantRoles[0]?.role

    const roleRecord = await prisma.role.findUnique({
      where: { name: updatedUserData.role },
      include: {
        permissions: {
          select: { name: true }
        }
      }
    })

    const permissions = roleRecord?.permissions.map(permission => permission.name) ?? []

    const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim()
    const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim()
    const protocol = forwardedProto || (req.protocol ?? 'https')
    const host = forwardedHost || req.headers.host || 'localhost'
    const isBeautyDomain = host.endsWith('.beauty.designcorp.eu')
    const isSecure = protocol === 'https'

    const cookieOptions: express.CookieOptions = {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      domain: isBeautyDomain ? '.beauty.designcorp.eu' : undefined,
      path: '/'
    }

    const deviceId =
      authUser.deviceId ??
      crypto
        .createHash('sha256')
        .update(`${authUser.userId}:${req.headers['user-agent'] ?? 'unknown'}`)
        .digest('hex')

    const ipAddress =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      null

    const deviceRecord = await prisma.device.upsert({
      where: {
        userId_deviceId: {
          userId: authUser.userId,
          deviceId
        }
      },
      update: {
        lastUsedAt: new Date(),
        isActive: true,
        userAgent: req.headers['user-agent']?.toString() ?? null,
        ipAddress
      },
      create: {
        userId: authUser.userId,
        deviceId,
        userAgent: req.headers['user-agent']?.toString() ?? null,
        ipAddress,
        deviceName: 'Web Browser',
        lastUsedAt: new Date(),
        isActive: true
      }
    })

    const tokens = await generateTokenPair({
      userId: updatedUserData.id,
      tenantId: newTenantId,
      role: updatedUserData.role,
      email: updatedUserData.email,
      tenants: tokenTenants,
      permissions,
      deviceId,
      ...(activeTenantRole ? { tenantRole: activeTenantRole } : {}),
      ...(updatedUserData.firstName ? { firstName: updatedUserData.firstName } : {}),
      ...(updatedUserData.lastName ? { lastName: updatedUserData.lastName } : {})
    })

    const refreshExpiry =
      getTokenExpiration(tokens.refreshToken) ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await tenantPrisma(null).refreshToken.create({
      data: {
        token: hashToken(tokens.refreshToken),
        userId: updatedUserData.id,
        deviceId: deviceRecord.id,
        expiresAt: refreshExpiry,
        isUsed: false
      }
    })

    res.cookie('beauty_access_token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000
    })

    res.cookie('beauty_refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.cookie('beauty_onboarding_required', '0', {
      ...cookieOptions,
      maxAge: 10 * 60 * 1000
    })

    console.log('[Auth][Owner Create Salon] Updated JWT with new tenantId:', {
      userId: updatedUserData.id,
      tenantId: newTenantId,
      salonName: result.salon.name
    })

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        salon: {
          id: result.salon.id,
          slug: result.salon.slug,
          name: result.salon.name,
          email: result.salon.email,
          salonType: result.salonType
        },
        owner: result.owner,
        categories: {
          total: result.stats.categories,
          services: result.stats.services,
          customServicesCreated: result.stats.customServicesCreated
        },
        services: {
          activeKeys: result.activeServiceKeys
        },
        redirectUrl: '/dashboard'
      }
    })
  } catch (error) {
    console.error('Owner create salon error:', error)

    if (error instanceof SalonRegistrationError) {
      res.status(error.status).json({
        success: false,
        error: error.message,
        code: error.code,
        ...(error.details ?? {})
      })
      return
    }

    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create salon',
        code: 'INTERNAL_ERROR',
        details: error.message
      })
      return
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create salon',
      code: 'INTERNAL_ERROR'
    })
  }
})

router.post('/owner/salons', async (req, res): Promise<void> => {
  try {
    const authUser = getAuthContext(req)

    if (!authUser.userId || !authUser.email) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      })
      return
    }

    const payload = {
      ...req.body,
      email: authUser.email
    }

    const { error, value } = salonRegistrationSchema.validate(payload, { abortEarly: false })
    if (error) {
      throw new SalonRegistrationError(
        'VALIDATION_ERROR',
        `Validation error: ${error.details.map(d => d.message).join(', ')}`,
        400,
        { details: error.details }
      )
    }

    const existingUser = await tenantPrisma(null).user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        password: true,
        passwordAutoGenerated: true
      }
    })

    if (!existingUser) {
      throw new SalonRegistrationError(
        'USER_NOT_FOUND',
        'Authenticated user not found',
        404
      )
    }

    const hasStoredPassword = !!existingUser.password && !existingUser.passwordAutoGenerated

    if (hasStoredPassword) {
      const passwordMatches = await bcrypt.compare(value.password, existingUser.password!)
      if (!passwordMatches) {
        throw new SalonRegistrationError(
          'INVALID_PASSWORD',
          'Incorrect password. Please enter your current account password.',
          401
        )
      }
    } else if (!value.password || value.password.length < 8) {
      throw new SalonRegistrationError(
        'PASSWORD_REQUIRED',
        'Please set a password (minimum 8 characters) to create your first salon.',
        400
      )
    }

    const hashedPassword = await bcrypt.hash(value.password, 12)

    const result = await tenantPrisma(null).$transaction(async (tx) => {
      const updatedOwner = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: value.firstName,
          lastName: value.lastName,
          phone: value.phone,
          role: 'SALON_OWNER',
          ...(hasStoredPassword
            ? {}
            : {
                password: hashedPassword,
                passwordAutoGenerated: false
              })
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      })

      return createSalonWithOwner(tx, {
        owner: updatedOwner,
        value: {
          ...value,
          email: updatedOwner.email
        },
        hashedPassword
      })
    }) as SalonRegistrationTransactionResult

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        salon: {
          id: result.salon.id,
          slug: result.salon.slug,
          name: result.salon.name,
          email: result.salon.email,
          salonType: result.salonType
        },
        owner: result.owner,
        categories: {
          total: result.stats.categories,
          services: result.stats.services,
          customServicesCreated: result.stats.customServicesCreated
        },
        services: {
          activeKeys: result.activeServiceKeys
        },
        redirectUrl: '/dashboard'
      }
    })
  } catch (error) {
    console.error('Owner salon registration error:', error)

    if (error instanceof SalonRegistrationError) {
      res.status(error.status).json({
        success: false,
        error: error.message,
        code: error.code,
        ...(error.details ?? {})
      })
      return
    }

    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create salon for authenticated user',
        code: 'INTERNAL_ERROR',
        details: error.message
      })
      return
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create salon for authenticated user',
      code: 'INTERNAL_ERROR'
    })
  }
})

export default router
