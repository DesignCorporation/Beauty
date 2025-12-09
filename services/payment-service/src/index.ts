// ⚠️ КРИТИЧНО: Load environment variables FIRST, before any other imports!
// This ensures providers can access env vars during module initialization
import dotenv from 'dotenv';
dotenv.config({ path: '/opt/beauty-dev/.env.development' });

// DEBUG: Log Stripe key loading
console.log('[DEBUG] STRIPE_SECRET_KEY loaded:', process.env.STRIPE_SECRET_KEY ? `${process.env.STRIPE_SECRET_KEY.substring(0, 15)}...` : 'NOT FOUND');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';

// Routes
import healthRoutes from './routes/health';
import subscriptionRoutes from './routes/subscriptions';
import webhookRoutes from './routes/webhooks';
import refundRoutes from './routes/refunds';
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';

const app: express.Application = express();
const PORT = parseInt(process.env.PORT || '6029', 10);

// 🔐 КРИТИЧНО: Raw body для Stripe webhooks ПЕРЕД другими middleware
// Stripe webhook signatures требуют raw body
app.use('/webhooks', express.raw({ type: 'application/json' }));

// 🛡️ Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// 🌐 CORS configuration
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true, // Important for httpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'X-Tenant-Id',
    'x-tenant-id',
    'Idempotency-Key',
    'idempotency-key',
    'Cache-Control',
    'cache-control'
  ]
}));

// 🍪 Cookie parser
app.use(cookieParser());

// 📄 JSON parsing для всех routes кроме webhooks
app.use('/api', express.json({ limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// 🚦 Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// 📊 Request logging
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// CSRF Protection Configuration
// 🔧 FIX: Dynamic CSRF config for localhost AND production domains
const csrfCookieConfig: any = {
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

  // Skip CSRF for health check and webhooks
  if (req.path === '/health' || req.path === '/') return true;
  if (req.path.startsWith('/webhooks')) return true;

  return false;
};

// CSRF Protection middleware (applied to all POST/PUT/DELETE)
app.use((req, res, next) => {
  if (csrfSkip(req)) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// 🎯 Routes
app.use('/', healthRoutes);                    // Health check (public)
app.use('/webhooks', webhookRoutes);           // Stripe webhooks (raw body)
app.use('/api/payments', paymentRoutes);       // Payment intents (protected)
app.use('/api/subscriptions', subscriptionRoutes); // Subscription management (protected)
// Support for API Gateway path-prefixed requests (/api/payments/subscriptions -> /api/subscriptions)
app.use('/api/payments/subscriptions', (req, res, next) => {
  // Strip the /payments prefix and pass to subscriptions router
  req.url = req.url.replace(/^\/payments/, '');
  subscriptionRoutes(req, res, next);
});
app.use('/api/refunds', refundRoutes);         // Refunds API (protected)
app.use('/api/invoices', invoiceRoutes);       // Invoice email delivery (protected)

// CSRF token endpoint (no protection, since it generates the token)
app.get(['/csrf-token', '/api/csrf-token'], csrfProtection, (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken(),
    message: 'CSRF token generated successfully'
  });
});

// 🏠 Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'Beauty Platform Payment Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    csrf: true,
    endpoints: {
      health: '/health',
      'csrf-token': '/api/csrf-token',
      payments: '/api/payments',
      subscriptions: '/api/subscriptions',
      refunds: '/api/refunds',
      invoices: '/api/invoices',
      webhooks: '/webhooks/stripe'
    }
  });
});

// 🚫 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    service: 'payment',
    timestamp: new Date().toISOString()
  });
});

// ❌ Global error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('💥 Global error handler:', err);

  // Stripe webhook errors
  if (req.path.includes('/webhooks/stripe')) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Regular API errors
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    service: 'payment',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
  return undefined;
});

// 🚀 Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Payment Service running on port ${PORT}`);
  console.log(`🏥 Health check: ${process.env.PAYMENT_SERVICE_URL || `http://localhost:${PORT}`}/health`);
  console.log(`💳 API: ${process.env.PAYMENT_SERVICE_URL || `http://localhost:${PORT}`}/api/subscriptions`);
  console.log(`🎣 Webhooks: ${process.env.PAYMENT_SERVICE_URL || `http://localhost:${PORT}`}/webhooks/stripe`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// 🔄 Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Payment Service stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Payment Service stopped');
    process.exit(0);
  });
});

export default app;
