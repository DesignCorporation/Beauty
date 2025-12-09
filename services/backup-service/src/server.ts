// Beauty Platform Backup Service - Main Server
// Express + WebSocket сервер для управления системой резервного копирования

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import pino from 'pino'
import pinoHttp from 'pino-http'
import dotenv from 'dotenv'
import http from 'http'
import _path from 'path'

// Routes
import backupRoutes from './routes/backup'

// Services
import { BackupService } from './services/BackupService'
import { WebSocketService } from './services/WebSocketService'

// Middleware
import { handleAuthError } from './middleware/auth'

// Load environment variables
dotenv.config()

const app: express.Application = express()
const PORT = parseInt(process.env.PORT || '6027', 10)

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

// HTTP request logger
app.use(pinoHttp({ logger }))

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"] // Для WebSocket соединений
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Global rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_REQUESTS || '200'), // 200 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
    code: 'GLOBAL_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and WebSocket
    return req.path === '/health' || req.path.startsWith('/backup-ws')
  }
})

// ГЛОБАЛЬНЫЙ DEBUG ПЕРЕД ВСЕМИ ДРУГИМИ MIDDLEWARE
app.use('*', (req, _res, next) => {
  console.log(`🚨 BACKUP SERVICE RAW REQUEST: ${req.method} ${req.originalUrl}`)
  next()
})

app.use(globalRateLimit)

// Cookie parsing middleware
app.use(cookieParser())

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (_req, _res, buf) => {
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

// Initialize services
const backupService = new BackupService()

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'backup-service',
    version: '1.0.0',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    },
    features: {
      authentication: 'JWT',
      authorization: 'Super Admin only',
      realTimeMonitoring: 'WebSocket',
      scriptIntegration: 'production-backup.sh'
    }
  })
})

// Test endpoint БЕЗ аутентификации для диагностики
app.get('/test-backup-direct', (_req, res) => {
  res.json({
    success: true,
    message: 'Direct backup test endpoint works!',
    timestamp: new Date().toISOString(),
    middleware: 'no auth required for this endpoint'
  })
})

// Debug middleware for all requests
app.use((req, _res, next) => {
  logger.debug(`🔧 Backup Service Request: ${req.method} ${req.path}`, {
    headers: {
      host: req.headers.host,
      'authorization': req.headers.authorization ? 'present' : 'missing',
      'user-agent': req.headers['user-agent']
    },
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  })
  next()
})

// API routes
app.use('/api/backup', backupRoutes)

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Beauty Platform Backup Service',
    version: '1.0.0',
    documentation: '/api/backup',
    websocket: '/backup-ws',
    endpoints: {
      backup: {
        status: 'GET /api/backup/status',
        list: 'GET /api/backup/list',
        create: 'POST /api/backup/create',
        delete: 'DELETE /api/backup/:id',
        download: 'GET /api/backup/:id/download',
        logs: 'GET /api/backup/logs',
        config: 'GET /api/backup/config',
        updateConfig: 'PUT /api/backup/config',
        testScript: 'POST /api/backup/test-script'
      },
      websocket: {
        connect: 'ws://host:port/backup-ws',
        events: ['backup-progress', 'backup-completed', 'backup-error']
      }
    },
    security: {
      authentication: 'JWT Bearer token required',
      authorization: 'Super Admin role required',
      rateLimit: '200 requests per 15 minutes'
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

// Auth error handler
app.use(handleAuthError)

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

// Create HTTP server for WebSocket
const httpServer = http.createServer(app)

// Initialize WebSocket service
const wsService = new WebSocketService(httpServer, backupService)

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`)
  
  try {
    // Close WebSocket connections
    await wsService.close()
    
    // Close HTTP server
    httpServer.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })
    
    // Force exit if server doesn't close within 30 seconds
    setTimeout(() => {
      logger.error('Forcefully shutting down')
      process.exit(1)
    }, 30000)
    
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown')
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception')
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled rejection')
  process.exit(1)
})

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info({
    port: PORT,
    protocol: 'HTTP + WebSocket',
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled',
    security: 'helmet + rate limiting + JWT auth',
    logging: 'pino',
    features: {
      backupIntegration: '/root/SCRIPTS/production-backup.sh',
      realTimeMonitoring: 'WebSocket at /backup-ws',
      authentication: 'Super Admin only',
      downloadSupport: 'Individual files and full archives'
    }
  }, `🔧 Beauty Platform Backup Service started`)
  
  logger.info(`📡 Health check: http://135.181.156.117:${PORT}/health`)
  logger.info(`🔧 API endpoints: http://135.181.156.117:${PORT}/api/backup/*`)
  logger.info(`🔌 WebSocket: ws://135.181.156.117:${PORT}/backup-ws`)
  logger.info(`📋 Backup script: /root/SCRIPTS/production-backup.sh`)
  logger.info(`📁 Backup storage: /root/BACKUPS/production/`)
})

// Handle server errors
httpServer.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`)
    process.exit(1)
  } else {
    logger.error(error, 'HTTP server error')
  }
})

export default app
