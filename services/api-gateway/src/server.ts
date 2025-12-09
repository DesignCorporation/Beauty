import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config } from 'dotenv';

// Load environment variables
config();

import path from 'path';
import { API_GATEWAY_CONFIG } from './config/services';
import { metricsMiddleware, metricsRoute } from './middleware/metrics';
import { healthChecker, healthRoute, readinessRoute, servicesHealthRoute } from './middleware/health';
import { createProxyMiddleware } from 'http-proxy-middleware';
import systemRoutes from './routes/system';
import { generateGatewayRoutes } from './generators/routes-generator';
import { setupRouteHotReload } from './generators/hot-reload-manager';
import { loadConnectionMap } from '@beauty-platform/service-registry';

const app: express.Application = express();

// Static assets (e.g. Related Website Set for third-party cookie compatibility)
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.json')) {
      res.type('application/json');
    }
  }
}));

// Basic middleware setup
if (API_GATEWAY_CONFIG.security.enableHelmet) {
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com", "https://js.stripe.com"],
        "script-src-elem": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com", "https://js.stripe.com"],
        "img-src": ["'self'", "data:", "https:", "https://q.stripe.com"],
        "connect-src": ["'self'", "ws:", "wss:", "https://challenges.cloudflare.com", "https://js.stripe.com", "https://api.stripe.com", "https://q.stripe.com", "https://m.stripe.network"],
        "font-src": ["'self'"],
        "object-src": ["'none'"],
        "media-src": ["'self'"],
        "frame-src": ["'self'", "https://challenges.cloudflare.com", "https://js.stripe.com", "https://hooks.stripe.com"],
      },
    },
  }));
}

if (API_GATEWAY_CONFIG.security.enableCompression) {
  app.use(compression());
}

// CORS configuration
app.use(cors({
  origin: API_GATEWAY_CONFIG.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'X-CSRF-Token',
    'x-csrf-token',
    'X-Tenant-Id',
    'x-tenant-id',
    'Idempotency-Key',
    'idempotency-key',
    'Cache-Control',
    'cache-control'
  ]
}));

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://nginx-auth-lb';
const CRM_SERVICE_URL = process.env.SALON_API_URL || 'http://salon-api:6022';
const AUTH_SERVICE_INTERNAL_URL = process.env.AUTH_SERVICE_INTERNAL_URL || 'http://auth-service-1:6021';

app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: false, // preserve original Host for correct redirect URLs
  ws: true,
  xfwd: true,
  logLevel: 'warn',
  onProxyReq: (proxyReq, req, _res) => {
    const host = req.headers['host'] as string | undefined;
    const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() || req.protocol;
    if (host) {
      proxyReq.setHeader('host', host);
      proxyReq.setHeader('x-forwarded-host', host);
    }
    if (proto) {
      proxyReq.setHeader('x-forwarded-proto', proto);
    }
  }
}));

app.use(['/api/crm', '/api/salon-types', '/api/csrf-token'], createProxyMiddleware({
  target: CRM_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  xfwd: true,
  logLevel: 'warn'
}));

// Direct auth health (internal) to keep readiness working even if lb misroutes Host
app.use('/internal/auth-health', createProxyMiddleware({
  target: AUTH_SERVICE_INTERNAL_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/internal/auth-health': '/health'
  },
  logLevel: 'error'
}));

// Rate limiting (disable in non-production unless explicitly enabled)
const isProductionEnv = process.env.NODE_ENV === 'production';
const gatewayRateLimitDisabled =
  process.env.API_GATEWAY_DISABLE_RATE_LIMIT === 'true' ||
  !isProductionEnv;

if (gatewayRateLimitDisabled) {
  console.log('⚠️ API Gateway rate limiting disabled (development mode)');
} else {
  const limiter = rateLimit({
    ...API_GATEWAY_CONFIG.rateLimit,
    skip: (req) => {
      // Whitelist auth routes (login, logout, csrf) and health checks
      if (req.path.startsWith('/api/auth/')) {
        return true;
      }
      if (req.path === '/api/auth' || req.path === '/api/auth/') {
        return true;
      }
      if (req.path === '/health' || req.path === '/ready') {
        return true;
      }
      return false;
    }
  });
  app.use(limiter);
}

// Request parsing - НЕ для proxy API роутов (они обрабатываются proxy)
app.use((req, res, next) => {
  // Пропускаем парсинг body для проксируемых роутов
  // НО включаем парсинг для локальных роутов: /api/monitoring/, /api/system/, /api/orchestrator/

  // CRITICAL: Пропускаем /webhooks (raw body нужен для Stripe signature verification)
  if (req.path.startsWith('/webhooks')) {
    return next();
  }

  if (req.path.startsWith('/api/') &&
      !req.path.startsWith('/api/monitoring/') &&
      !req.path.startsWith('/api/system/') &&
      !req.path.startsWith('/api/orchestrator/')) {
    return next(); // Пропускаем парсинг для proxy роутов
  }
  // Для всех остальных (включая /api/monitoring/ и /api/system/) используем стандартный парсинг
  express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  // Аналогично для urlencoded

  // CRITICAL: Пропускаем /webhooks (raw body нужен для Stripe signature verification)
  if (req.path.startsWith('/webhooks')) {
    return next();
  }

  if (req.path.startsWith('/api/') &&
      !req.path.startsWith('/api/monitoring/') &&
      !req.path.startsWith('/api/system/') &&
      !req.path.startsWith('/api/orchestrator/')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// Logging
if (API_GATEWAY_CONFIG.security.enableLogging) {
  app.use(morgan('combined', {
    stream: {
      write: (message) => console.log(message.trim())
    }
  }));
}

// Public OIDC discovery endpoints (no auth)
const oidcTarget = API_GATEWAY_CONFIG.services['auth-service']?.url || 'http://localhost:6021';
app.use('/api/auth/.well-known', createProxyMiddleware({
  target: oidcTarget,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth/.well-known': '/.well-known'
  }
}));

// Metrics collection
app.use(metricsMiddleware);

// Health and status routes
app.get('/health', healthRoute);
app.get('/api/health', healthRoute); // Alias for SDK/frontend checks
app.get('/ready', readinessRoute);
app.get('/metrics', metricsRoute);

// Отдельные health метрики для сервисов (разделение gateway/services)
app.get('/services/health', servicesHealthRoute); // Все сервисы
app.get('/services/health/:service', servicesHealthRoute); // Конкретный сервис

// Gateway info route
app.get('/info', (_req, res) => {
  res.json({
    name: 'Beauty Platform API Gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: Object.keys(require('./config/services').SERVICES),
    endpoints: {
      health: '/health',
      ready: '/ready',
      metrics: '/metrics',
      info: '/info'
    }
  });
});

// System management routes (before proxy)
app.use('/api/system', systemRoutes);

// Monitoring routes (enhanced)
import monitoringRoutes, { startMonitoring } from './routes/monitoring';
app.use('/api/monitoring', monitoringRoutes);

// New Orchestrator API with circuit breaker and advanced state management
import orchestratorRoutes from './routes/orchestrator';
app.use('/api/orchestrator', orchestratorRoutes);

// 🎣 Webhooks proxy (PUBLIC - no authentication required)
// CRITICAL: Must use raw body for Stripe signature verification

// Debug logging middleware for webhooks
app.use('/webhooks', (req, _res, next) => {
  console.log(`[WEBHOOK DEBUG] Incoming ${req.method} ${req.url}`);
  console.log(`[WEBHOOK DEBUG] Content-Type: ${req.headers['content-type']}`);
  console.log(`[WEBHOOK DEBUG] Body type: ${typeof req.body}, is Buffer: ${Buffer.isBuffer(req.body)}`);
  next();
});

app.use('/webhooks', createProxyMiddleware({
  target: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:6029',
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, _res) => {
    console.log(`[WEBHOOK PROXY] ${req.method} ${req.url} → Payment Service (port 6029)`);
    console.log(`[WEBHOOK PROXY] Target: ${proxyReq.path}`);

    // Forward Stripe signature header
    if (req.headers['stripe-signature']) {
      proxyReq.setHeader('stripe-signature', req.headers['stripe-signature']);
      console.log(`[WEBHOOK PROXY] Forwarded stripe-signature header`);
    }
  },
  onProxyRes: (proxyRes, _req, _res) => {
    console.log(`[WEBHOOK PROXY] Response: ${proxyRes.statusCode}`);
  },
  onError: (err, _req, res) => {
    console.error('[WEBHOOK PROXY] Error:', err.message);
    console.error('[WEBHOOK PROXY] Stack:', err.stack);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Webhook Proxy Error',
        message: 'Failed to forward webhook to Payment Service',
        details: err.message
      });
    }
  }
}));

// 🎯 PUBLIC ENDPOINTS: Salon Types and Service Presets (для onboarding без аутентификации)
// Эти endpoints должны быть доступны из Client Portal для регистрации салонов
app.use('/api/salon-types', createProxyMiddleware({
  target: CRM_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/salon-types': '/api/salon-types'
  },
  onProxyReq: (_proxyReq, req, _res) => {
    console.log(`🔄 Public endpoint proxy: ${req.method} ${req.originalUrl} → CRM API`);
  }
}));

app.use('/api/service-presets', createProxyMiddleware({
  target: CRM_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/service-presets': '/api/service-presets'
  },
  onProxyReq: (_proxyReq, req, _res) => {
    console.log(`🔄 Public endpoint proxy: ${req.method} ${req.originalUrl} → CRM API`);
  }
}));

// Direct proxy for subscription routes (payment-service handles both paths)
const paymentServiceConfig = API_GATEWAY_CONFIG.services['payment-service'];
if (paymentServiceConfig) {
  const subscriptionProxy = createProxyMiddleware({
    target: paymentServiceConfig.url,
    changeOrigin: true,
    timeout: paymentServiceConfig.timeout || 30000,
    pathRewrite: {
      '^/api/subscriptions': '/api/subscriptions'  // Keep /api/subscriptions as-is for payment-service
    },
    onProxyReq: (proxyReq, req) => {
      // Forward cookies and auth headers
      if (req.headers.cookie) {
        proxyReq.setHeader('cookie', req.headers.cookie);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Forward Set-Cookie headers
      if (proxyRes.headers['set-cookie']) {
        res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
      }
    }
  });
  app.use('/api/subscriptions', subscriptionProxy);
  app.use('/api/subscriptions/*', subscriptionProxy);
  console.log('✅ Added direct subscription routes to payment-service');
}

// CSRF token endpoint (direct access without /api prefix)
app.get('/csrf-token', createProxyMiddleware({
  target: CRM_SERVICE_URL,  // CRM API
  changeOrigin: true,
  timeout: 30000,
  cookieDomainRewrite: false as const,
  cookiePathRewrite: false as const,
  pathRewrite: {
    '^/csrf-token$': '/api/csrf-token'  // /csrf-token → CRM API /api/csrf-token
  },
  onProxyReq: (proxyReq, req, _res) => {
    // Forward critical headers
    const criticalHeaders = ['cookie', 'x-csrf-token', 'authorization', 'content-type', 'user-agent', 'referer'];
    criticalHeaders.forEach(headerName => {
      if (req.headers[headerName]) {
        proxyReq.setHeader(headerName, req.headers[headerName]);
      }
    });
    console.log(`🔄 CSRF Token proxy: ${req.method} ${req.originalUrl} → CRM API /api/csrf-token`);
  },
  onProxyRes: (proxyRes, _req, res) => {
    // Forward Set-Cookie headers for CSRF cookies
    if (proxyRes.headers['set-cookie']) {
      res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
      console.log(`🍪 CSRF token forwarded to client`);
    }
  },
  onError: (err, _req, res) => {
    console.error(`❌ CSRF token proxy error:`, err.message);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'CSRF token service is temporarily unavailable',
        timestamp: new Date().toISOString()
      });
    }
  }
}));

// Main API routes (dynamically generated from Connection Map)
try {
  const connectionMap = loadConnectionMap();
  const generatedRoutes = generateGatewayRoutes(connectionMap);
  // Mount at root because gatewayPaths in connection-map already include /api prefix
  app.use('/', generatedRoutes);

  // Setup hot reload for development
  setupRouteHotReload(app);
} catch (error) {
  console.error('❌ Failed to load or generate gateway routes:', error);
  process.exit(1);
}

// Fallback for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route Not Found',
    message: `The requested route ${req.method} ${req.originalUrl} was not found`,
    availableRoutes: [
      '/health',
      '/ready',
      '/metrics',
      '/info',
      '/webhooks/stripe (PUBLIC)',
      '/webhooks/paypal (PUBLIC)',
      '/api/auth/*',
      '/api/backup/*',
      '/api/system/*',
      '/api/monitoring/*',
      '/orchestrator/*',
      '/api/images/*',
      '/api/mcp/*',
      '/api/crm/*',
      '/api/context/*',
      '/api/booking/*',
      '/api/notifications/*',
      '/api/payments/*'
    ],
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Gateway Error:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500).json({
    error: 'Internal Gateway Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  healthChecker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  healthChecker.stop();
  process.exit(0);
});

// Start server
const PORT = parseInt(process.env.PORT || API_GATEWAY_CONFIG.port.toString(), 10);
const HOST = API_GATEWAY_CONFIG.host;

app.listen(PORT, HOST, () => {
  console.log('🚀 Beauty Platform API Gateway started!');
  console.log(`📡 Server running on http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🔗 Available routes:');
  console.log('  - /health (Health check)');
  console.log('  - /ready (Readiness check)');
  console.log('  - /metrics (Gateway metrics)');
  console.log('  - /info (Gateway information)');
  console.log('  - /webhooks/stripe (PUBLIC - Stripe webhooks)');
  console.log('  - /webhooks/paypal (PUBLIC - PayPal webhooks)');
  console.log('  - /api/auth/* (Auth Service proxy)');
  console.log('  - /api/system/* (System monitoring endpoints)');
  console.log('  - /api/images/* (Images API proxy)');
  console.log('  - /api/mcp/* (MCP Server proxy)');
  console.log('  - /api/orchestrator/* (Orchestrator control API)');
  console.log('  - /api/crm/* (CRM API proxy)');
  console.log('  - /api/backup/* (Backup Service proxy)');
  console.log('  - /api/booking/* (Booking Service proxy - planned)');
  console.log('  - /api/notifications/* (Notification Service proxy)');
  console.log('  - /api/payments/* (Payment Service proxy)');
  
  // Start health checker
  healthChecker.start();
  console.log('🏥 Health checker started');
  
  // Start enhanced monitoring
  startMonitoring();
  console.log('🔍 Enhanced monitoring started');
  
  // Initialize Telegram alerts
  try {
    require('./alerts/TelegramAlert');
    console.log('📱 Telegram alerts initialized');
  } catch (error) {
    console.log('📱 Telegram alerts not available (missing configuration)');
  }
  
  console.log('✅ API Gateway ready to serve requests!');
});

export default app;
