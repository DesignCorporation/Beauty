// Beauty Platform Auth Service Server
// Express server with JWT authentication and authorization

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import csrf from 'csurf'
import pino from 'pino'
import pinoHttp from 'pino-http'
import dotenv from 'dotenv'
// Unused imports commented out
// import https from 'https'
// import fs from 'fs'
// import path from 'path'
// import authRoutes from './routes/auth'
import authSecureRoutes from './routes/auth-secure'
import clientAuthRoutes from './routes/client-auth'
import clientNotificationRoutes from './routes/client-notifications'
import salonRegistrationRoutes from './routes/salon-registration'
import ownerSalonRoutes from './routes/owner-salon'
import mfaRoutes from './routes/mfa'
import adminProtectedRoutes from './routes/admin-protected'
import userProfileRoutes from './routes/user-profile'
import roleManagementRoutes from './routes/role-management'
import { authenticate } from './middleware/auth'
import passport from './config/passport'
import googleOAuthRoutes from './routes/google-oauth'
import googleOAuthOwnerRoutes from './routes/google-oauth-owner'
import phoneVerificationRoutes from './routes/phone-verification'
import deviceRoutes from './routes/device-management'
import ipGeoRoutes from './routes/ip-geo'
import { getCookieDomain } from './config/oauthConfig'
import passwordResetRoutes from './routes/password-reset'
// import openidRoutes from './routes/openid'  // TODO: Fix RSAKey model dependency

// Load environment variables
dotenv.config({ path: '../../.env' })
dotenv.config() // Локальный .env файл если есть

// ✅ DEBUG: Проверяем JWT_SECRET при старте сервиса
console.log('🔍 DEBUG: JWT_SECRET from auth-service:', process.env.JWT_SECRET)

const app: express.Application = express()
const PORT = parseInt(process.env.PORT || '6021', 10)

// 🔥 2025 Fix: Cookie Policy Utility Function для определения окружения
interface CookieConfig {
  domain?: string
  sameSite: 'lax' | 'strict' | 'none'
  secure: boolean
  httpOnly: boolean
  maxAge: number
}

function getCookieConfig(req: express.Request): CookieConfig {
  const xfHost = (req.headers['x-forwarded-host'] as string) || null
  const xfProto = (req.headers['x-forwarded-proto'] as string) || null
  const host = req.get('host') || null
  const protocol = req.protocol || null

  const isDev = process.env.NODE_ENV === 'development'
  const isProd = process.env.NODE_ENV === 'production'
  const isHttps = (xfProto || protocol) === 'https'
  const effectiveHost = xfHost || host || ''
  const isBeauty = /\.beauty\.designcorp\.eu$/i.test(effectiveHost)
  const isLocalhost = /localhost|127\.0\.0\.1/i.test(effectiveHost)

  let config: CookieConfig = {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
    sameSite: 'lax',
    secure: false
  }

  if (isProd && isBeauty) {
    // 🌍 Production с поддоменами
    config.domain = '.beauty.designcorp.eu'
    config.sameSite = 'none'
    config.secure = true
  } else if (isDev && isLocalhost) {
    // 🔧 Development localhost
    config.sameSite = 'lax'
    config.secure = false
    // Без domain для localhost
  } else if (isHttps) {
    // 🔒 HTTPS окружение
    config.sameSite = 'none'
    config.secure = true
  }

  return config
}

// Trust proxy for nginx
app.set('trust proxy', 1)

// Logger configuration
const loggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  })
}
const logger = pino(loggerOptions)

// Request tracing for debugging orchestration warmup issues
app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  logger.info({
    method: req.method,
    path: req.originalUrl,
    source: 'auth-service',
    stage: 'start'
  }, 'Incoming request')

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000
    logger.info({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      source: 'auth-service',
      stage: 'finish'
    }, 'Request completed')
  })

  next()
})

// HTTP request logger
app.use(pinoHttp({ logger }))

// Security middleware
const isDevelopment = process.env.NODE_ENV === 'development'
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: isDevelopment
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Allow Vite dev scripts
        : ["'self'"], // Secure production settings
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from Beauty Platform domains
    const allowedOrigins = [
      'http://localhost:6001',           // Salon CRM (dev)
      'http://localhost:6002',           // Admin Panel (dev)
      'http://localhost:6003',           // Client Booking (dev)
      'http://localhost:6004',           // Public Websites (dev)
      'https://dev-salon.beauty.designcorp.eu',    // Development Salon CRM
      'https://dev-admin.beauty.designcorp.eu',    // Development Admin Panel
      'https://dev-client.beauty.designcorp.eu',   // Development Client Portal
      'https://dev-crm.beauty.designcorp.eu',      // Development CRM on new subdomain
      'https://dev.beauty.designcorp.eu',          // Development Landing Page
      'https://salon.beauty.designcorp.eu',        // Production Salon CRM
      'https://admin.beauty.designcorp.eu',        // Production Admin Panel
      'https://client.beauty.designcorp.eu',       // Production Client Portal
      'https://beauty.designcorp.eu',              // Production Landing Page
      `http://135.181.156.117:6001`,              // Direct IP access
      `http://135.181.156.117:6002`,
      `http://135.181.156.117:6003`,
      `http://135.181.156.117:6004`
    ]

    // 🔥 2025 Fix: Development mode - allow any localhost origin for easier debugging
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev && origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      console.log(`🌐 CORS: Development mode - allowing localhost origin: ${origin}`)
      return callback(null, origin)
    }

    // Allow requests with no origin (e.g. mobile apps, Postman)
    if (!origin) return callback(null, true)

    if (allowedOrigins.indexOf(origin) !== -1) {
      // Return the actual origin that made the request, not first from array
      console.log(`✅ CORS: Allowed origin: ${origin}`)
      callback(null, origin)
    } else {
      logger.warn(`❌ CORS blocked request from origin: ${origin}`)
      // 🔥 2025 Fix: В development режиме логируем больше деталей для отладки
      if (isDev) {
        console.log('🔧 CORS Debug: Allowed origins list:', allowedOrigins)
        console.log('🔧 CORS Debug: Rejected origin details:', { origin, type: typeof origin })
      }
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    // 🔥 2025 Fix: Дополнительные заголовки для лучшей совместимости
    'Accept',
    'Accept-Language',
    'Accept-Encoding',
    'Connection',
    'DNT',
    'User-Agent',
    'X-Forwarded-For',
    'X-Forwarded-Host',
    'X-Forwarded-Proto'
  ],
  // 🔥 2025 Fix: Expose headers для лучшей работы с cookies
  exposedHeaders: ['Set-Cookie', 'X-CSRF-Token']
}))

// Global rate limiting - временно отключен в development
const disableAuthRateLimit = process.env.AUTH_DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV !== 'production';

const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_REQUESTS || '1000'), // Увеличенный лимит для development
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
    code: 'GLOBAL_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and in non-production environments
    if (disableAuthRateLimit) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔧 Rate limiting DISABLED in development mode for:', req.path)
      }
      return true
    }

    // Always allow auth essentials (login/logout/csrf) to reduce lockouts
    const path = req.path || ''
    if (
      path === '/auth/csrf-token' ||
      path === '/auth/login' ||
      path === '/auth/logout' ||
      path === '/auth/refresh' ||
      path === '/auth/status' ||
      path.startsWith('/auth/login-') // handles google login etc.
    ) {
      return true
    }

    return req.path === '/health' || req.path === '/auth/health'
  }
})

app.use(globalRateLimit)

// Cookie parsing middleware (КРИТИЧНО для httpOnly cookies!)
app.use(cookieParser())
app.use(passport.initialize())

// CSRF Protection
// 🔧 FIX: Dynamic CSRF config for localhost AND production domains
const isLocalhost = process.env.NODE_ENV === 'development'
const csrfCookieConfig: any = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 1000 // 1 час
}

// Set secure and domain based on environment
if (isLocalhost) {
  // For localhost development: no domain, secure=false
  csrfCookieConfig.secure = false
} else {
  // For production: secure=true, domain for subdomains
  csrfCookieConfig.secure = true
  csrfCookieConfig.domain = '.beauty.designcorp.eu'
}

const csrfProtection = csrf({
  cookie: csrfCookieConfig,
  // Исключения для endpoints, которые не требуют CSRF (GET запросы и публичные API)
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  // Настройка для работы с SPA - токен может быть в заголовке или теле
  value: function (req) {
    return req.headers['x-csrf-token'] ||
           (req.body && req.body._csrf) ||
           (req.query && req.query._csrf)
  }
})

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (_req, _res, buf) => {
    // Разрешаем пустое тело запроса (для refresh/logout endpoints)
    if (buf.length === 0) return
    
    try {
      JSON.parse(buf.toString())
    } catch (e) {
      logger.error('Invalid JSON in request body')
      throw new Error('Invalid JSON')
    }
  }
}))

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}))

// OIDC discovery & JWKS endpoints (public)
// app.use(openidRoutes)  // TODO: Fix RSAKey model dependency in openid.ts

// Health check endpoint (без CSRF)
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'auth-service',
    version: '1.0.0',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    }
  })
})

// CSRF token endpoint (без защиты, т.к. выдает токен)
app.get(['/auth/csrf-token', '/api/auth/csrf-token'], csrfProtection, (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken(),
    message: 'CSRF token generated successfully'
  })
})

// Middleware для условного применения CSRF защиты
const conditionalCSRF = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 🚨 КРИТИЧНО: НЕ УДАЛЯТЬ НИКАКИХ ИСКЛЮЧЕНИЙ БЕЗ ПОЛНОГО ПОНИМАНИЯ ПОСЛЕДСТВИЙ!
  // ВАЖНО: req.path НЕ включает базовый /auth prefix! Используйте ТОЛЬКО относительные пути!
  const csrfExceptions = [
    'GET /health',          // req.path для /auth/health
    'GET /me',              // req.path для /auth/me
    'GET /permissions',     // req.path для /auth/permissions
    'GET /csrf-token',      // req.path для /auth/csrf-token
    'GET /force-logout',    // req.path для /auth/force-logout
    'POST /login',          // 🚨 КРИТИЧНО: БЕЗ ЭТОГО НИКТО НЕ МОЖЕТ ВОЙТИ В СИСТЕМУ!
    'POST /refresh',        // Критично для SPA - refresh должен работать без CSRF
    'POST /logout',         // ВРЕМЕННО: для исправления logout проблемы
    'GET /mfa/status',      // ВРЕМЕННО: для тестирования MFA
    'POST /mfa/setup/initiate', // ВРЕМЕННО: для тестирования MFA
    'POST /mfa/verify',     // ВРЕМЕННО: для тестирования MFA
    'POST /mfa/disable',    // ВРЕМЕННО: для тестирования MFA
    'POST /mfa/complete-login', // ВРЕМЕННО: для тестирования MFA
    'POST /mfa/test-db-update', // ДИАГНОСТИКА: тестирование БД обновления
    'POST /mfa/fix-admin-mfa',  // ДИАГНОСТИКА: исправление MFA для админа
    // Client auth endpoints (нужны для SPA клиентского портала)
    'POST /register-client',  // Регистрация клиентов
    'POST /login-client',     // Вход клиентов
    'POST /logout-client',    // Выход клиентов
    'GET /client/profile',    // Профиль клиента
    // User profile endpoints (GET безопасен без CSRF, PUT/POST требуют токен)
    'GET /users/profile',     // Чтение профиля пользователя
    // Salon registration endpoints - только POST требует CSRF (GET игнорируются по умолчанию)
    'POST /salon-registration/create',  // Создание салона
    'POST /salon-registration/resend-email',  // Повторная отправка письма
    // Owner salon endpoints - защищены JWT аутентификацией (CSRF не нужен)
    'POST /owner/salons',              // Создание салона владельцем (требует JWT + полная регистрация)
    'POST /owner/create-salon',        // Упрощенное создание салона владельцем (требует JWT)
    // 🚨 ВНИМАНИЕ: EXPRESS req.path = относительный путь БЕЗ /auth префикса!
    // GET запросы игнорируются CSRF middleware по конфигу ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
  ]
  
  const routeKey = `${req.method} ${req.path}`
  
  console.log(`🔐 CSRF Check: ${routeKey} - Exception: ${csrfExceptions.includes(routeKey)}`)
  
  if (req.path.startsWith('/client/notifications')) {
    console.log(`✅ CSRF Skipped for client notifications route: ${routeKey}`)
    return next()
  }

  if (csrfExceptions.includes(routeKey)) {
    // Пропускаем CSRF для этих endpoints
    console.log(`✅ CSRF Skipped for: ${routeKey}`)
    next()
  } else {
    // Применяем CSRF защиту для остальных
    csrfProtection(req, res, next)
  }
}

// Debug middleware for all requests
app.use((req, _res, next) => {
  console.log(`🔍 Auth Service Request: ${req.method} ${req.path} - Headers:`, {
    host: req.headers.host,
    'x-forwarded-by': req.headers['x-forwarded-by'],
    'x-target-service': req.headers['x-target-service'],
    'authorization': req.headers.authorization ? 'present' : 'missing'
  });
  next();
});

// MFA routes (without CSRF protection for now - TEMPORARY) - MUST BE FIRST!
app.use(['/auth/mfa', '/api/auth/mfa'], mfaRoutes)

// API routes - используем условную CSRF защиту для критичных SPA endpoints
app.use('/auth', googleOAuthRoutes)
app.use('/api/auth', googleOAuthRoutes)

// Google OAuth for SALON OWNERS (CRM registration)
app.use('/auth', googleOAuthOwnerRoutes)
app.use('/api/auth', googleOAuthOwnerRoutes)

// Public IP geo endpoint (used by CRM onboarding)
app.use('/auth', ipGeoRoutes)
app.use('/api/auth', ipGeoRoutes)

// Client authentication routes (специальные endpoints для клиентского портала)
app.use('/auth', conditionalCSRF, clientAuthRoutes)
app.use('/api/auth', conditionalCSRF, clientAuthRoutes)
app.use('/auth/client/notifications', conditionalCSRF, clientNotificationRoutes)
app.use('/api/auth/client/notifications', conditionalCSRF, clientNotificationRoutes)
app.use('/auth', conditionalCSRF, passwordResetRoutes)
app.use('/api/auth', conditionalCSRF, passwordResetRoutes)

// Secure/authenticated routes for staff/admin flows
app.use('/auth', conditionalCSRF, authSecureRoutes)
app.use('/api/auth', conditionalCSRF, authSecureRoutes)

app.use('/api/clients', conditionalCSRF, phoneVerificationRoutes)
app.use('/auth/client', conditionalCSRF, phoneVerificationRoutes)

// Protected admin routes (requires MFA verification)
app.use('/auth/admin', conditionalCSRF, adminProtectedRoutes)
app.use('/api/auth/admin', conditionalCSRF, adminProtectedRoutes)

// Salon registration routes (PUBLIC endpoints - MUST be BEFORE general /auth routes!)
// csrfProtection автоматически игнорирует GET/HEAD/OPTIONS через ignoreMethods
// ⚠️ ВАЖНО: Эти routes должны быть ПЕРЕД общим `/auth` middleware с `authenticate`!
app.use('/auth/salon-registration', csrfProtection, salonRegistrationRoutes)
app.use('/api/auth/salon-registration', csrfProtection, salonRegistrationRoutes)
// Legacy routes for backwards compatibility (also with CSRF)
app.use('/salon-registration', csrfProtection, salonRegistrationRoutes)

// User profile routes (authenticated users)
app.use('/auth/users', conditionalCSRF, authenticate, userProfileRoutes)
app.use('/api/auth/users', conditionalCSRF, authenticate, userProfileRoutes)

// Device management routes
app.use('/auth', conditionalCSRF, authenticate, deviceRoutes)
app.use('/api/auth', conditionalCSRF, authenticate, deviceRoutes)

// Role management routes (authenticated users, requires tenant access)
app.use('/auth', conditionalCSRF, authenticate, roleManagementRoutes)
app.use('/api/auth', conditionalCSRF, authenticate, roleManagementRoutes)

// Authenticated salon creation routes for existing users
app.use('/auth', conditionalCSRF, authenticate, ownerSalonRoutes)
app.use('/api/auth', conditionalCSRF, authenticate, ownerSalonRoutes)

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Beauty Platform Auth Service',
    version: '1.0.0',
    docs: '/auth/health',
    endpoints: {
      auth: {
        csrfToken: 'GET /auth/csrf-token',
        login: 'POST /auth/login',
        register: 'POST /auth/register',
        refresh: 'POST /auth/refresh',
        logout: 'POST /auth/logout',
        me: 'GET /auth/me',
        permissions: 'GET /auth/permissions',
        changePassword: 'POST /auth/change-password'
      },
      client: {
        register: 'POST /auth/register-client',
        login: 'POST /auth/login-client',
        logout: 'POST /auth/logout-client',
        profile: 'GET /auth/client/profile',
        updateProfile: 'PUT /auth/client/profile',
        notifications: 'GET /auth/client/notifications'
      },
      mfa: {
        setup: 'POST /auth/mfa/setup',
        verify: 'POST /auth/mfa/verify',
        disable: 'POST /auth/mfa/disable',
        status: 'GET /auth/mfa/status'
      }
    }
  })
})

// 🔥 2025 Fix: Enhanced debug endpoint with new cookie policy logic
app.get('/auth/debug/whoami', (req, res) => {
  const xfHost = (req.headers['x-forwarded-host'] as string) || null
  const xfProto = (req.headers['x-forwarded-proto'] as string) || null
  const host = req.get('host') || null
  const hostname = req.hostname || null
  const protocol = req.protocol || null

  // Используем новую utility функцию
  const cookieConfig = getCookieConfig(req)

  const effectiveHost = xfHost || host || ''
  const isDev = process.env.NODE_ENV === 'development'
  const isProd = process.env.NODE_ENV === 'production'
  const isHttps = (xfProto || protocol) === 'https'
  const isBeauty = /\.beauty\.designcorp\.eu$/i.test(effectiveHost)
  const isLocalhost = /localhost|127\.0\.0\.1/i.test(effectiveHost)

  res.json({
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || null,
      isDev,
      isProd
    },
    request: {
      host,
      hostname,
      protocol,
      headers: {
        'x-forwarded-host': xfHost,
        'x-forwarded-proto': xfProto,
        origin: req.headers.origin || null,
        referer: req.headers.referer || null,
        cookie: req.headers.cookie ? 'present' : 'missing'
      }
    },
    analysis: {
      effectiveHost,
      isHttps,
      isBeauty,
      isLocalhost,
      detectedEnvironment: isProd ? 'production' : isDev ? 'development' : 'unknown'
    },
    // 🔥 2025 Fix: Показываем результат новой cookie policy logic
    cookieConfig,
    // Legacy для совместимости
    derivedCookieConfig: {
      domain: cookieConfig.domain || null,
      sameSite: cookieConfig.sameSite,
      secure: cookieConfig.secure
    }
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  })
})

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }, 'Unhandled error')

  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  res.status(error.status || 500).json({
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: error.stack })
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  process.exit(0)
})

const validateProductionConfig = () => {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  logger.info('[Startup] Validating production configuration...')

  const cookieDomain = getCookieDomain()
  logger.info(`[Startup] ✅ COOKIE_DOMAIN=${cookieDomain}`)

  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'DATABASE_URL'
  ]

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }

  logger.info('[Startup] ✅ All required environment variables are set')
}

let server: ReturnType<typeof app.listen> | null = null

try {
  validateProductionConfig()

  // Start server (HTTP for simplicity in development)
  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info({
      port: PORT,
      protocol: 'HTTP',
      environment: process.env.NODE_ENV || 'development',
      cors: 'enabled',
      security: 'helmet + rate limiting',
      logging: 'pino'
    }, `🔐 Beauty Platform Auth Service started`)

    logger.info(`📡 Health check: http://135.181.156.117:${PORT}/health`)
    logger.info(`🔑 Auth endpoints: http://135.181.156.117:${PORT}/auth/*`)
  })
} catch (error) {
  logger.error({ error }, '[Startup] Fatal error, exiting')
  process.exit(1)
}

if (server) {
  // Handle server errors
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`)
      process.exit(1)
    } else {
      logger.error(error, 'Server error')
    }
  })
}

export default app
