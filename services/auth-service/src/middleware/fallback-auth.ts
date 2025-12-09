// BEAUTY PLATFORM - FALLBACK AUTHORIZATION SYSTEM
// Enterprise resilience: works even when primary auth fails

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createClient } from 'redis'
import pino from 'pino'

const logger = pino({ name: 'fallback-auth' })

// Redis client for caching
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 2000
  }
})

interface CachedUserData {
  userId: string
  email: string
  role: string
  tenantId?: string
  permissions: string[]
  cachedAt: number
  expiresAt: number
}

interface FallbackAuthOptions {
  enableCache: boolean
  cacheTimeout: number // milliseconds
  allowOfflineMode: boolean
  maxOfflineTime: number // milliseconds
}

const DEFAULT_OPTIONS: FallbackAuthOptions = {
  enableCache: true,
  cacheTimeout: 15 * 60 * 1000, // 15 minutes
  allowOfflineMode: true,
  maxOfflineTime: 60 * 60 * 1000 // 1 hour
}

class FallbackAuthManager {
  private isRedisConnected = false
  // Redis check timestamp for health monitoring (currently tracked via isRedisConnected state)
  private readonly options: FallbackAuthOptions

  constructor(options: Partial<FallbackAuthOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.initializeRedis()
  }

  private async initializeRedis() {
    try {
      await redis.connect()
      this.isRedisConnected = true
      logger.info('Fallback auth Redis connected')
    } catch (error) {
      logger.warn('Fallback auth Redis connection failed:', error)
      this.isRedisConnected = false
    }

    // Monitor Redis connection
    redis.on('error', () => {
      this.isRedisConnected = false
      logger.warn('Fallback auth Redis disconnected')
    })

    redis.on('ready', () => {
      this.isRedisConnected = true
      logger.info('Fallback auth Redis reconnected')
    })
  }

  // Cache user data after successful authentication
  async cacheUserData(token: string, userData: Omit<CachedUserData, 'cachedAt' | 'expiresAt'>): Promise<void> {
    if (!this.options.enableCache || !this.isRedisConnected) return

    try {
      const cachedData: CachedUserData = {
        ...userData,
        cachedAt: Date.now(),
        expiresAt: Date.now() + this.options.cacheTimeout
      }

      const cacheKey = `fallback:user:${token.substring(0, 16)}`
      await redis.setEx(cacheKey, Math.ceil(this.options.cacheTimeout / 1000), JSON.stringify(cachedData))
      
      logger.debug('User data cached for fallback auth')
    } catch (error) {
      logger.warn('Failed to cache user data:', error)
    }
  }

  // Retrieve cached user data
  async getCachedUserData(token: string): Promise<CachedUserData | null> {
    if (!this.options.enableCache || !this.isRedisConnected) return null

    try {
      const cacheKey = `fallback:user:${token.substring(0, 16)}`
      const cachedString = await redis.get(cacheKey)
      
      if (!cachedString) return null

      const cachedData: CachedUserData = JSON.parse(cachedString)
      
      // Check if cache is still valid
      if (Date.now() > cachedData.expiresAt) {
        await redis.del(cacheKey)
        return null
      }

      return cachedData
    } catch (error) {
      logger.warn('Failed to retrieve cached user data:', error)
      return null
    }
  }

  // Validate JWT locally (without database)
  validateJWTLocally(token: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!)
      return { valid: true, payload }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  // Check if we should allow offline mode
  shouldAllowOfflineMode(lastSuccessfulAuth?: number): boolean {
    if (!this.options.allowOfflineMode) return false
    if (!lastSuccessfulAuth) return false

    const timeSinceLastAuth = Date.now() - lastSuccessfulAuth
    return timeSinceLastAuth <= this.options.maxOfflineTime
  }

  // Get basic permissions for offline mode
  getOfflinePermissions(role: string): string[] {
    const basicPermissions: { [key: string]: string[] } = {
      'SUPER_ADMIN': ['*'],
      'SALON_OWNER': ['salons.read', 'salons.update', 'appointments.read', 'clients.read'],
      'MANAGER': ['appointments.read', 'appointments.create', 'clients.read'],
      'STAFF_MEMBER': ['appointments.read', 'clients.read'],
      'RECEPTIONIST': ['appointments.read', 'appointments.create', 'clients.read'],
      'CLIENT': ['appointments.read']
    }

    return basicPermissions[role] || ['basic.read']
  }
}

// Singleton instance
const fallbackAuth = new FallbackAuthManager()

// Middleware for fallback authentication
export function fallbackAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // This middleware runs AFTER primary auth fails
  // It's only used when the main Auth Service is down
  
  const token = extractTokenFromRequest(req)
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'NO_TOKEN',
      message: 'Authentication token required',
      fallbackMode: true
    })
  }

  // Try fallback authentication
  performFallbackAuth(token)
    .then(userData => {
      if (userData) {
        // Add user data to request
        ;(req as any).user = userData
        ;(req as any).fallbackMode = true
        
        logger.info(`Fallback auth successful for user ${userData.userId}`)
        next()
      } else {
        res.status(401).json({
          success: false,
          error: 'FALLBACK_AUTH_FAILED',
          message: 'Authentication failed - service temporarily unavailable',
          fallbackMode: true
        })
      }
    })
    .catch(error => {
      logger.error('Fallback auth error:', error)
      res.status(500).json({
        success: false,
        error: 'FALLBACK_AUTH_ERROR',
        message: 'Authentication service error',
        fallbackMode: true
      })
    })
  return undefined;
}

// Core fallback authentication logic
async function performFallbackAuth(token: string): Promise<CachedUserData | null> {
  // Step 1: Try cached user data
  const cachedData = await fallbackAuth.getCachedUserData(token)
  if (cachedData) {
    logger.debug('Using cached user data for fallback auth')
    return cachedData
  }

  // Step 2: Validate JWT locally
  const jwtResult = fallbackAuth.validateJWTLocally(token)
  if (!jwtResult.valid) {
    logger.warn('JWT validation failed in fallback mode:', jwtResult.error)
    return null
  }

  const { payload } = jwtResult
  
  // Step 3: Check if offline mode is allowed
  const lastAuth = payload.iat ? payload.iat * 1000 : Date.now() - (2 * 60 * 60 * 1000) // 2h ago fallback
  if (!fallbackAuth.shouldAllowOfflineMode(lastAuth)) {
    logger.warn('Offline mode not allowed - token too old')
    return null
  }

  // Step 4: Create fallback user data with basic permissions
  const fallbackUserData: CachedUserData = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
    permissions: fallbackAuth.getOfflinePermissions(payload.role),
    cachedAt: Date.now(),
    expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
  }

  logger.info(`Fallback auth using offline mode for user ${payload.userId}`)
  return fallbackUserData
}

// Extract token from request (cookies or headers)
function extractTokenFromRequest(req: Request): string | null {
  // Check httpOnly cookie first
  if (req.cookies?.beauty_access_token) {
    return req.cookies.beauty_access_token
  }

  // Check Authorization header
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

// Export the fallback auth manager for use in main auth flow
export { fallbackAuth, FallbackAuthManager }

// Express middleware wrapper for easy integration
export function withFallbackAuth(primaryAuthMiddleware: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Try primary authentication first
    primaryAuthMiddleware(req, res, (error?: any) => {
      if (error || res.headersSent) {
        // Primary auth failed, try fallback
        if (!res.headersSent) {
          fallbackAuthMiddleware(req, res, next)
        }
      } else {
        // Primary auth successful, cache the data
        const user = (req as any).user
        if (user) {
          const token = extractTokenFromRequest(req)
          if (token) {
            fallbackAuth.cacheUserData(token, {
              userId: user.id,
              email: user.email,
              role: user.role,
              tenantId: user.tenantId,
              permissions: user.permissions || fallbackAuth.getOfflinePermissions(user.role)
            }).catch(err => logger.warn('Failed to cache user data:', err))
          }
        }
        next()
      }
    })
  }
}