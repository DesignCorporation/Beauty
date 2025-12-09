import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import dotenv from 'dotenv';
import path from 'path';

// Routes
import healthRoutes from './routes/health';
import notificationRoutes from './routes/notifications';
import settingsRoutes from './routes/settings';
import emailRoutes from './routes/email';
import testRoutes from './routes/test';
import eventsRoutes from './routes/events';
// import { initNotificationQueue } from './services/notificationQueue'; // TODO: Enable when Redis is configured

// WebSocket/Socket.IO
import { initializeSocketServer } from './socket-server';
import { setSocketIOInstance } from './emitters';
import { createServer } from 'http';

// Загрузка переменных окружения
// __dirname в dist/index.js указывает на /root/projects/beauty/services/notification-service/dist
// Нужно подняться на 3 уровня вверх: dist -> notification-service -> services -> beauty
const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });
dotenv.config(); // Локальный .env файл если есть

console.log('[ENV] Loading .env from:', rootEnvPath);
console.log('[ENV] SMTP_HOST:', process.env.SMTP_HOST);
console.log('[ENV] SMTP_USER:', process.env.SMTP_USER);
console.log('[ENV] SMTP_PASS exists:', !!process.env.SMTP_PASS);
console.log('[ENV] SMTP configured:', !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));

import type { Application } from 'express';
const app: Application = express();
const PORT = process.env.PORT || 6028;

// 🔧 TEMPORARY FIX: Отключена инициализация BullMQ queue из-за Redis read-only replica
// Проблема: Redis настроен как read-only replica, BullMQ не может писать
// TODO: Настроить отдельный Redis instance для BullMQ или исправить конфигурацию
// const queueInitialized = initNotificationQueue();
// console.log('[Queue] Notification queue initialized:', queueInitialized);
console.log('[Queue] Notification queue initialization SKIPPED (Redis read-only issue)');

// ========================================
// MIDDLEWARE SETUP
// ========================================

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-CSRF-Token', 'x-csrf-token'],
  exposedHeaders: ['X-CSRF-Token']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing for JWT tokens
app.use(cookieParser());

// CSRF Protection Configuration
// 🔧 FIX: Dynamic CSRF config for localhost AND production domains
const csrfCookieConfig: csrf.CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  path: '/'
};

if (process.env.NODE_ENV === 'production') {
  csrfCookieConfig.secure = true;
  csrfCookieConfig.domain = '.beauty.designcorp.eu';
} else {
  csrfCookieConfig.secure = false;
}

const csrfProtection = csrf({
  cookie: csrfCookieConfig
});

// CSRF skip function for specific paths
const csrfSkip = (req: express.Request) => {
  // Skip CSRF for GET requests (safe)
  if (req.method === 'GET') return true;

  // Skip CSRF for health check
  if (req.path === '/health' || req.path === '/ready' || req.path === '/') return true;

  // Skip CSRF for debug and internal service-to-service communication
  if (req.path.startsWith('/debug')) return true;
  if (req.path.startsWith('/api/notify')) return true; // Internal email API
  if (req.path.startsWith('/api/events')) return true; // Internal events API (from CRM, Payment services)

  return false;
};

// CSRF Protection middleware (applied to all POST/PUT/PATCH/DELETE)
app.use((req, res, next) => {
  if (csrfSkip(req)) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// Logging middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ========================================
// ROUTES
// ========================================

// Health routes (no auth required)
app.use('/', healthRoutes);

// Debug endpoint to check JWT_SECRET
app.get('/debug/jwt-secret', (_req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  res.json({
    secret_prefix: JWT_SECRET.substring(0, 10) + '...',
    secret_length: JWT_SECRET.length,
    full_secret: JWT_SECRET // ТОЛЬКО ДЛЯ DEBUG!
  });
});

// CSRF token endpoint (no protection, since it generates the token)
app.get(['/csrf-token', '/api/csrf-token'], csrfProtection, (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken(),
    message: 'CSRF token generated successfully'
  });
});

// API routes (with authentication)
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/events', eventsRoutes);

// Email API routes (no tenant auth for cross-service communication)
app.use('/api/notify', emailRoutes);

// Test routes (with tenant auth for security)
app.use('/api/notify/test', testRoutes);

// Future API routes
// app.use('/api/templates', tenantAuth, templateRoutes);

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    service: 'notification',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
interface ErrorWithStatus extends Error {
  status?: number;
  stack?: string;
}

app.use((error: ErrorWithStatus, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', error);

  res.status(error.status || 500).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'Something went wrong',
    service: 'notification',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ========================================
// SERVER STARTUP
// ========================================

// Создать HTTP сервер для Express + WebSocket
const httpServer = createServer(app);

const server = httpServer.listen(PORT, () => {
  console.log(`🔔 Notification Service started successfully`);
  console.log(`📍 Running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Status check: http://localhost:${PORT}/status`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  // Инициализировать Socket.IO после запуска сервера
  try {
    const io = initializeSocketServer(httpServer);
    setSocketIOInstance(io);
    console.log(`🔌 WebSocket/Socket.IO initialized successfully`);
  } catch (error) {
    console.error(`❌ WebSocket initialization error:`, error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
