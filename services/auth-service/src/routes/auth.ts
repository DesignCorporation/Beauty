// Authentication Routes
// Beauty Platform Auth Service

import express from 'express'
import Joi from 'joi'
import { AuthService } from '../services/AuthService'
import { authenticate } from '../middleware/auth'
import { UserRole } from '@prisma/client'
import { tenantPrisma } from '@beauty-platform/database'
import {
  adminLoginLimiter,
  adminRegisterLimiter,
  refreshTokenLimiter
} from '../middleware/rateLimiters'
import { generateDeviceContext } from '../utils/device'
import { getAuthContext } from '../utils/get-auth-context'

const router: express.Router = express.Router()
const authService = new AuthService()

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  tenantSlug: Joi.string().optional()
})

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    }),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  phone: Joi.string().optional(),
  role: Joi.string().valid(...Object.values(UserRole)).required(),
  tenantId: Joi.string().when('role', {
    not: UserRole.SUPER_ADMIN,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  invitationCode: Joi.string().optional()
})

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
})

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
})

/**
 * POST /auth/login
 * Authenticate user with email and password
 */
router.post('/login', adminLoginLimiter, async (req, res): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body)
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.details
      })
      return
    }

    const deviceContext = generateDeviceContext(req)
    const result = await authService.login(value, deviceContext)
    
    if (!result.success) {
      res.status(401).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    console.error('Login route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /auth/register
 * Register new user (client or staff with invitation)
 */
router.post('/register', adminRegisterLimiter, async (req, res): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body)
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.details
      })
      return
    }

    const deviceContext = generateDeviceContext(req)
    const result = await authService.register(value, deviceContext)
    
    if (!result.success) {
      res.status(400).json(result)
      return
    }

    // Different responses for different user types
    if (value.role === UserRole.CLIENT) {
      res.status(201).json(result)
    } else {
      // Staff registration (awaiting approval)
      res.status(202).json({
        success: true,
        message: 'Registration successful. Awaiting approval from salon owner.',
        user: result.user
      })
    }
  } catch (error) {
    console.error('Register route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', refreshTokenLimiter, async (req, res): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = refreshTokenSchema.validate(req.body)
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.details
      })
      return
    }

    const deviceContext = generateDeviceContext(req)
    const result = await authService.refreshToken(value, deviceContext)
    
    if (!result.success) {
      res.status(401).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    console.error('Refresh route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /auth/logout
 * Logout user and invalidate refresh token
 */
router.post('/logout', authenticate, async (req, res): Promise<void> => {
  try {
    const { refreshToken } = req.body
    
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      })
      return
    }

    const auth = getAuthContext(req)
    if (!auth.userId) {
      res.status(400).json({
        success: false,
        error: 'User context missing',
        code: 'USER_CONTEXT_REQUIRED'
      })
      return
    }
    const deviceContext = generateDeviceContext(req)
    const result = await authService.logout(refreshToken, auth.userId, deviceContext)
    
    res.json(result)
  } catch (error) {
    console.error('Logout route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /auth/me
 * Get current user information
 */
router.get('/me', authenticate, async (req, res): Promise<void> => {
  try {
    const user = getAuthContext(req)
    
    // Get additional user data from database
    const userData = await tenantPrisma(null).user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        color: true,
        status: true,
        emailVerified: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        password: true,
        passwordAutoGenerated: true,
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
            currency: true
          }
        },
        tenantRoles: {
          where: { isActive: true },
          select: {
            tenantId: true,
            role: true,
            grantedAt: true,
            tenant: {
              select: {
                id: true,
                slug: true,
                name: true,
                status: true,
                currency: true
              }
            }
          }
        }
      }
    })

    if (!userData) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
      return
    }

    const { password, passwordAutoGenerated, tenantRoles, ...userWithoutPassword } = userData as any
    const hasPassword = !!password && !passwordAutoGenerated

    // Преобразуем tenantRoles в tenants (для фронтенда)
    const tenants = tenantRoles?.map((tr: any) => ({
      tenantId: tr.tenantId,
      tenantName: tr.tenant.name,
      slug: tr.tenant.slug,
      currency: tr.tenant.currency || 'EUR',
      role: tr.role,
      grantedAt: tr.grantedAt ? new Date(tr.grantedAt).toISOString() : new Date().toISOString()
    })) || [];

    const responseUser = {
      ...userWithoutPassword,
      hasPassword,
      tenants
    };

    res.json({
      success: true,
      user: responseUser
    })
  } catch (error) {
    console.error('Me route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /auth/permissions
 * Get user permissions
 */
router.get('/permissions', authenticate, async (req, res): Promise<void> => {
  try {
    const auth = getAuthContext(req)
    const permissions = authService.getUserPermissions(auth.role)

    res.json({
      success: true,
      permissions,
      role: auth.role
    })
  } catch (error) {
    console.error('Permissions route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /auth/change-password
 * Change user password
 */
router.post('/change-password', authenticate, async (req, res): Promise<void> => {
  try {
    // Validate request body
    const { error } = changePasswordSchema.validate(req.body)
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.details
      })
      return
    }

    // Implementation would go here
    res.json({
      success: true,
      message: 'Password change endpoint - implementation pending'
    })
  } catch (error) {
    console.error('Change password route error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /auth/health
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'auth-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

export default router
