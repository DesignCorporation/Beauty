import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { SERVICES } from '../config/services';
import { ProxyRequest, ProxyResponse } from '../types/gateway';
import { healthChecker } from '../middleware/health';

const router: Router = Router();

// Handle CORS preflight requests before proxying
router.options('*', (req, res) => {
  console.log('⚙️  Handling CORS preflight for', req.originalUrl, 'origin:', req.headers.origin);
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,X-Requested-With,X-Request-ID,X-CSRF-Token,x-csrf-token,X-Tenant-Id,x-tenant-id,Idempotency-Key,idempotency-key,Cache-Control,cache-control'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// Custom error handler for proxy с graceful degradation
const handleProxyError = (serviceName: string, serviceKey: string) => (err: any, req: ProxyRequest, res: ProxyResponse) => {
  console.error(`Proxy error for ${serviceName}:`, err.message);

  if (!res.headersSent) {
    // Проверяем статус сервиса для более точного ответа
    const serviceHealth = healthChecker.getServiceHealth(serviceKey);
    const isHealthy = serviceHealth?.status === 'healthy';

    // Умные fallback responses в зависимости от типа сервиса
    const fallbackResponse = generateFallbackResponse(serviceKey, serviceName, req.path, isHealthy);

    res.status(fallbackResponse.status).json({
      ...fallbackResponse.body,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
};

// Генерация умных fallback responses
const generateFallbackResponse = (serviceKey: string, serviceName: string, path: string, _isHealthy: boolean) => {
  const baseError = {
    error: 'Service Temporarily Unavailable',
    service: serviceName,
    degraded: true
  };

  // Специальные fallback для разных сервисов
  switch (serviceKey) {
    case 'notification-service':
      if (path.includes('/notifications')) {
        return {
          status: 200, // Graceful degradation для уведомлений
          body: {
            ...baseError,
            message: 'Notifications service is temporarily unavailable. Your action was completed but notifications may be delayed.',
            fallback: {
              notifications: [],
              unreadCount: 0,
              status: 'degraded'
            }
          }
        };
      }
      break;

    case 'images-api':
      if (path.includes('/images')) {
        return {
          status: 200, // Graceful degradation для изображений
          body: {
            ...baseError,
            message: 'Image service is temporarily unavailable. Please try uploading again later.',
            fallback: {
              placeholder: '/assets/placeholder-image.png',
              status: 'degraded'
            }
          }
        };
      }
      break;

    case 'payment-service':
      return {
        status: 503, // Payments - критический сервис
        body: {
          ...baseError,
          message: 'Payment service is temporarily unavailable. Please try again in a few moments.',
          critical: true
        }
      };

    case 'auth-service':
      return {
        status: 503, // Auth - критический сервис
        body: {
          ...baseError,
          message: 'Authentication service is temporarily unavailable. Please try again in a few moments.',
          critical: true
        }
      };

    default:
      return {
        status: 503,
        body: {
          ...baseError,
          message: `${serviceName} is currently unavailable. Please try again later.`
        }
      };
  }

  // Default fallback
  return {
    status: 503,
    body: {
      ...baseError,
      message: `${serviceName} is currently unavailable. Please try again later.`
    }
  };
};

// Custom request handler to add headers and check service health
const handleProxyRequest = (serviceName: string) => (proxyReq: any, req: ProxyRequest, _res: ProxyResponse) => {
  // ✅ ИСПРАВЛЕНИЕ: Сначала сохраняем ВСЕ важные заголовки
  const criticalHeaders = [
    'cookie',           // httpOnly cookies - КРИТИЧНО!
    'x-csrf-token',     // CSRF защита - КРИТИЧНО!
    'authorization',    // Bearer tokens
    'content-type',     // Тип контента
    'user-agent',       // Браузер info
    'referer',          // Откуда пришел запрос
    'accept',           // Что ожидает клиент
    'accept-language',  // Язык
    'accept-encoding',  // Сжатие
    'x-tenant-id'       // Выбор tenant для клиентского портала
  ];
  
  // Копируем все критичные заголовки из оригинального запроса
  criticalHeaders.forEach(headerName => {
    if (req.headers[headerName]) {
      proxyReq.setHeader(headerName, req.headers[headerName]);
    }
  });
  
  // Добавляем Gateway заголовки ПОСЛЕ критичных
  const requestId = req.headers['x-request-id'] || `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  proxyReq.setHeader('X-Request-ID', requestId);
  proxyReq.setHeader('X-Forwarded-By', 'Beauty-Platform-API-Gateway');
  proxyReq.setHeader('X-Target-Service', serviceName);
  
  // Debug: Log the exact path being proxied + COOKIES!
  console.log(`🔄 Proxying to ${serviceName}:`);
  console.log(`  - req.path: ${req.path}`);
  console.log(`  - req.originalUrl: ${req.originalUrl}`);
  console.log(`  - req.url: ${req.url}`);
  console.log(`  - req.baseUrl: ${req.baseUrl}`);
  console.log(`  - proxyReq.path: ${proxyReq.path}`);
  console.log(`  - cookies: ${req.headers.cookie ? 'PRESENT' : 'MISSING'}`);
  if (req.headers.cookie) {
    console.log(`  - cookie value: ${req.headers.cookie}`);
  }
  console.log(`  - csrf-token: ${req.headers['x-csrf-token'] ? 'present' : 'missing'}`);
  
  // Store service name for metrics
  req.targetService = serviceName;
};

// Custom response handler for logging and metrics
const handleProxyResponse = (serviceName: string) => (proxyRes: any, req: ProxyRequest, res: ProxyResponse) => {
  // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Set-Cookie headers должны дойти до браузера!

  // 1. Логируем что получили от backend
  console.log(`✅ Response from ${serviceName} for ${req.method} ${req.originalUrl}:`);
  console.log(`   Status: ${proxyRes.statusCode}`);
  console.log(`   Set-Cookie: ${proxyRes.headers['set-cookie'] ? 'PRESENT' : 'MISSING'}`);
  if (proxyRes.headers['set-cookie']) {
    console.log(`   Set-Cookie value:`, proxyRes.headers['set-cookie']);
  }

  // 2. ГЛАВНОЕ: Прокидываем Set-Cookie headers на клиент
  if (proxyRes.headers['set-cookie']) {
    // Убеждаемся что Set-Cookie доходит до клиента
    res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
    console.log(`🍪 Set-Cookie forwarded to client:`, proxyRes.headers['set-cookie']);
  }

  // 3. CORS headers для credentials support
  const origin = req.headers.origin;
  if (origin) {
    // Сбрасываем любые заголовки CORS из бэкенда, чтобы избежать мульти-значений
    if (proxyRes.headers['access-control-allow-origin']) {
      delete proxyRes.headers['access-control-allow-origin'];
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    console.log(`🌍 CORS origin mirrored: ${origin}`);
  }

  // 4. Стандартные gateway headers
  proxyRes.headers['x-served-by'] = 'Beauty-Platform-API-Gateway';
  proxyRes.headers['x-target-service'] = serviceName;

  // 5. Завершение логирования
  proxyRes.on('end', () => {
    console.log(`🎉 Response completed for ${req.method} ${req.originalUrl}`);
  });

  proxyRes.on('error', (err: any) => {
    console.error(`❌ Response error for ${req.method} ${req.originalUrl}:`, err.message);
  });
};

// Service availability middleware
const checkServiceAvailability = (serviceName: string) => (_req: ProxyRequest, res: ProxyResponse, next: any) => {
  if (!healthChecker.isServiceHealthy(serviceName)) {
    const health = healthChecker.getServiceHealth(serviceName);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: `${serviceName} is currently unhealthy`,
      details: health?.error || 'Service health check failed',
      timestamp: new Date().toISOString()
    });
  }
  return next();
};

// Debug middleware to see what routes are being registered
const debugMiddleware = (req: any, _res: any, next: any) => {
  console.log(`🔍 Gateway request: ${req.method} ${req.path} - Original URL: ${req.originalUrl}`);
  return next();
};

router.use(debugMiddleware);

// Create proxy for each service
Object.entries(SERVICES).forEach(([serviceKey, serviceConfig]) => {
  console.log(`🔧 Creating proxy for service: ${serviceKey} (${serviceConfig.name})`);
  console.log(`   Path: ${serviceConfig.path} -> ${serviceConfig.url}`);

  // Special handling for different services
  let pathRewrite: Record<string, string> | ((path: string, req: any) => string) | undefined;
  
  // Images API - rewrite paths (router already stripped /images prefix)
  if (serviceKey === 'images-api') {
    pathRewrite = (path: string) => {
      if (!path) return path;

      if (path.startsWith('/uploads/')) {
        return path;
      }

      if (path.startsWith('/images/uploads/')) {
        return path.replace(/^\/images\/uploads\//, '/uploads/');
      }

      if (path.startsWith('/images?')) {
        return '/api/images' + path.substring('/images'.length);
      }

      if (path === '/images') {
        return '/api/images';
      }

      if (path.startsWith('/images/')) {
        return path.replace(/^\/images/, '/api/images');
      }

      if (path.startsWith('/api/images?')) {
        return path;
      }

      if (path.startsWith('/api/images/')) {
        return path;
      }

      if (path === '/api/images') {
        return '/api/images';
      }

      if (path.startsWith('?')) {
        return '/api/images' + path;
      }

      return `/api/images${path.startsWith('/') ? path : `/${path}`}`;
    };
  }
  
  // Auth Service expects /auth paths
  // РЕАЛЬНОСТЬ: pathRewrite получает ПОЛНЫЙ путь /api/auth/me
  // Нужно: /api/auth/me -> /auth/me
  if (serviceKey === 'auth-service') {
    pathRewrite = undefined;
  }
  
  // MCP Server expects direct paths (remove /api/mcp prefix, keep just /mcp)
  if (serviceKey === 'mcp-server') {
    pathRewrite = {
      '^/api/mcp': '/mcp'  // /api/mcp/project-state -> /mcp/project-state
    };
  }
  
  // Backup Service expects direct paths (remove /backup prefix)
  if (serviceKey === 'backup') {
    pathRewrite = {
      '^/backup(.*)$': '$1'  // /backup/health -> /health
    };
  }
  
  // Salon API expects /api/* paths
  if (serviceKey === 'salon-api') {
    pathRewrite = {
      '^/salon(.*)$': '/api$1'  // /salon/staff -> /api/staff
    };
  }

  // Payment Service expects /api/* paths (remove /payments prefix)
  if (serviceKey === 'payment-service') {
    pathRewrite = (path: string) => {
      console.log(`[PAYMENT-SERVICE] Original path: ${path}`);
      if (path.startsWith('/payments/')) {
        const rewritten = '/api' + path.substring('/payments'.length);
        console.log(`[PAYMENT-SERVICE] Rewritten to: ${rewritten}`);
        return rewritten;
      }
      if (path === '/payments') {
        console.log(`[PAYMENT-SERVICE] Rewritten /payments to /api`);
        return '/api';
      }
      console.log(`[PAYMENT-SERVICE] Path not matched, returning as-is: ${path}`);
      return path;
    };
  }

  // Notification Service expects /api/* paths
  if (serviceKey === 'notification-service') {
    pathRewrite = (path: string) => {
      if (!path) {
        return path;
      }

      // Ensure we work with a normalized path without duplicated /api prefix.
      const normalized = path.startsWith('/api/notifications')
        ? path.replace(/^\/api\/notifications/, '/notifications')
        : path;

      if (!path) {
        return path;
      }

      // Health & readiness probes
      if (normalized === '/notifications/health' || normalized.startsWith('/notifications/health?')) {
        return normalized.replace(/^\/notifications\/health/, '/health');
      }

      if (normalized === '/notifications/ready' || normalized.startsWith('/notifications/ready?')) {
        return normalized.replace(/^\/notifications\/ready/, '/ready');
      }

      if (normalized === '/notifications/metrics' || normalized.startsWith('/notifications/metrics?')) {
        return normalized.replace(/^\/notifications\/metrics/, '/metrics');
      }

      if (normalized === '/notifications/info' || normalized.startsWith('/notifications/info?')) {
        return normalized.replace(/^\/notifications\/info/, '/info');
      }

      if (normalized === '/notifications' || normalized === '/notifications/') {
        return '/api/notifications';
      }

      if (normalized.startsWith('/notifications/settings')) {
        return normalized.replace(/^\/notifications\/settings/, '/api/settings');
      }

      if (normalized.startsWith('/notifications/notify')) {
        return normalized.replace(/^\/notifications\/notify/, '/api/notify');
      }

      if (normalized.startsWith('/notifications/')) {
        return normalized.replace(/^\/notifications/, '/api/notifications');
      }

      return normalized;
    };
  }

  const proxyOptions = {
    target: serviceConfig.url,
    changeOrigin: true,
    timeout: serviceConfig.timeout || 30000,

    // ✅ WebSocket support для Socket.IO (notification-service)
    ws: serviceKey === 'notification-service',

    // ✅ ИСПРАВЛЕНИЕ: Правильная обработка cookies и заголовков
    cookieDomainRewrite: false as const,     // Сохраняем оригинальные домены cookies
    cookiePathRewrite: false as const,       // Сохраняем оригинальные пути cookies
    xfwd: true,                     // Добавляем X-Forwarded-* заголовки

    // ✅ ИСПРАВЛЕНИЕ POST timeout: Правильная обработка body
    selfHandleResponse: false,      // Позволяем middleware обрабатывать ответ
    // Убрали buffer: true - конфликтует с pipe

    pathRewrite,
    onError: handleProxyError(serviceConfig.name, serviceKey),
    onProxyReq: handleProxyRequest(serviceConfig.name),
    onProxyRes: handleProxyResponse(serviceConfig.name),
    logLevel: (process.env.NODE_ENV === 'development' ? 'debug' : 'warn') as 'debug' | 'warn'
  };

  console.log(`🔧 Creating proxy middleware for ${serviceKey} with options:`, {
    target: serviceConfig.url,
    pathRewrite: typeof pathRewrite === 'function' ? '[Function]' : pathRewrite
  });

  // Create proxy middleware for the specific path
  const proxyMiddleware = createProxyMiddleware(proxyOptions as any);

  console.log(`🔧 Mounting routes for ${serviceKey}:`);
  console.log(`   ${serviceConfig.path}`);
  console.log(`   ${serviceConfig.path}/*`);

  // Mount proxy for both exact path and subpaths
  router.use(serviceConfig.path, checkServiceAvailability(serviceKey), proxyMiddleware);
  router.use(`${serviceConfig.path}/*`, checkServiceAvailability(serviceKey), proxyMiddleware);

  // Специальный роут для полного префикса /api/salon/* (универсальный fallback)
  if (serviceKey === 'salon-api') {
    const crmPrefixProxy = createProxyMiddleware({
      ...proxyOptions,
      pathRewrite: {
        '^/salon': '/api' // /salon/* (after /api prefix) -> /api/* for Salon API
      }
    } as any);
    router.use('/salon', checkServiceAvailability(serviceKey), crmPrefixProxy);
    router.use('/salon/*', checkServiceAvailability(serviceKey), crmPrefixProxy);
    console.log('✅ Fallback route for Salon API: /api/salon -> /api/*');
  }

  const rewriteDescription = typeof pathRewrite === 'function' ? '[Function]' : JSON.stringify(pathRewrite);
  console.log(`✅ Proxy route created: ${serviceConfig.path} -> ${serviceConfig.url} (rewrite: ${rewriteDescription})`);

  // 🔧 СПЕЦИАЛЬНАЯ ОБРАБОТКА: Images API нужен также на /api/images (не только /images)
  if (serviceKey === 'images-api') {
    // Создаем отдельный middleware для /api/images БЕЗ pathRewrite
    // т.к. путь уже правильный и не требует переписывания
    const apiImagesProxyOptions = {
      ...proxyOptions,
      pathRewrite: undefined  // Убираем pathRewrite - путь уже правильный!
    };
    const apiImagesMiddleware = createProxyMiddleware(apiImagesProxyOptions as any);

    router.use('/api/images', checkServiceAvailability(serviceKey), apiImagesMiddleware);
    router.use('/api/images/*', checkServiceAvailability(serviceKey), apiImagesMiddleware);
    console.log(`✅ Additional route for images-api: /api/images -> ${serviceConfig.url} (no pathRewrite)`);
  }

  if (serviceKey === 'auth-service') {
    // Публичные discovery endpoints (без аутентификации)
    const discoveryProxyOptions = {
      ...proxyOptions,
      pathRewrite: (path: string) => {
        if (!path) {
          return path;
        }
        return path.replace(/^\/api\/auth\/\.well-known/, '/.well-known');
      }
    };

    const discoveryMiddleware = createProxyMiddleware(discoveryProxyOptions);
    router.use('/api/auth/.well-known', discoveryMiddleware);
    router.use('/api/auth/.well-known/*', discoveryMiddleware);
    console.log(`✅ Discovery routes proxied without auth: /api/auth/.well-known -> ${serviceConfig.url}`);

    const apiAuthProxyOptions = {
      ...proxyOptions,
      pathRewrite: (path: string) => {
        if (!path) {
          return path;
        }

        if (path.startsWith('/api/auth')) {
          return path.replace(/^\/api\/auth/, '/auth');
        }

        return path;
      }
    };

    const apiAuthMiddleware = createProxyMiddleware(apiAuthProxyOptions);
    router.use('/api/auth', checkServiceAvailability(serviceKey), apiAuthMiddleware);
    router.use('/api/auth/*', checkServiceAvailability(serviceKey), apiAuthMiddleware);
    console.log(`✅ Auth routes proxied with auth checks: /api/auth -> ${serviceConfig.url}`);
  }
});

// ========================================
// WEBSOCKET / SOCKET.IO ENDPOINT
// ========================================
// Explicit WebSocket route for Socket.IO namespace /socket.io/
console.log('🔧 Setting up WebSocket route for Socket.IO');
const notificationServiceConfig = SERVICES['notification-service'];
if (notificationServiceConfig) {
  const socketIOProxyOptions = {
    target: notificationServiceConfig.url,
    changeOrigin: true,
    ws: true,  // Enable WebSocket upgrade protocol
    xfwd: true,  // Forward X-Forwarded-* headers
    timeout: 30000
  };

  // Mount Socket.IO proxy on /socket.io and /socket.io/*
  router.use('/socket.io',
    checkServiceAvailability('notification-service'),
    createProxyMiddleware(socketIOProxyOptions as any)
  );
  router.use('/socket.io/*',
    checkServiceAvailability('notification-service'),
    createProxyMiddleware(socketIOProxyOptions as any)
  );

  // Backward compatibility: some clients still call /api/socket.io
  router.use('/api/socket.io',
    checkServiceAvailability('notification-service'),
    createProxyMiddleware({
      ...socketIOProxyOptions,
      pathRewrite: { '^/api/socket.io': '/socket.io' }
    } as any)
  );
  router.use('/api/socket.io/*',
    checkServiceAvailability('notification-service'),
    createProxyMiddleware({
      ...socketIOProxyOptions,
      pathRewrite: { '^/api/socket.io': '/socket.io' }
    } as any)
  );
  console.log(`✅ WebSocket route for Socket.IO: /socket.io -> ${notificationServiceConfig.url} (ws: true)`);
}

// ========================================
// CSRF TOKEN ENDPOINTS
// ========================================
// Forward CSRF token requests to Salon API (default) or other services
// Paths: /csrf-token, /api/csrf-token
const createCSRFProxyMiddleware = (serviceName: string) => {
  const service = SERVICES[serviceName];
  if (!service) {
    return (_req: any, res: any) => {
      return res.status(503).json({
        error: 'Service not configured',
        service: serviceName
      });
    };
  }

  return createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    timeout: service.timeout || 30000,
    cookieDomainRewrite: false as const,
    cookiePathRewrite: false as const,
    xfwd: true,
    pathRewrite: (path: string) => {
      // Remove gateway prefix and add service prefix if needed
      if (path === '/csrf-token' || path === '/api/csrf-token') {
        return '/api/csrf-token';
      }
      return path;
    },
    onError: handleProxyError(service.name, serviceName),
    onProxyReq: handleProxyRequest(service.name),
    onProxyRes: handleProxyResponse(service.name),
    logLevel: (process.env.NODE_ENV === 'development' ? 'debug' : 'warn') as 'debug' | 'warn'
  } as any);
};

// ========================================
// SPECIAL ROUTING FOR CRM SCHEDULE ENDPOINTS
// ========================================
// Schedule endpoints are registered as /api/schedule/* in Salon API
// But clients request them as /api/crm/schedule/* through gateway
// So we need to rewrite /crm/schedule -> /schedule
router.get('/crm/schedule/available-slots', checkServiceAvailability('salon-api'), createProxyMiddleware({
  target: SERVICES['salon-api'].url,
  changeOrigin: true,
  timeout: 30000,
  cookieDomainRewrite: false as const,
  cookiePathRewrite: false as const,
  xfwd: true,
  pathRewrite: {
    '^/crm/schedule/available-slots': '/api/schedule/available-slots'
  },
  onError: handleProxyError('Salon API', 'salon-api'),
  onProxyReq: handleProxyRequest('Salon API'),
  onProxyRes: handleProxyResponse('Salon API'),
  logLevel: (process.env.NODE_ENV === 'development' ? 'debug' : 'warn') as 'debug' | 'warn'
} as any));

router.get('/crm/staff/:id/schedule', checkServiceAvailability('salon-api'), createProxyMiddleware({
  target: SERVICES['salon-api'].url,
  changeOrigin: true,
  timeout: 30000,
  cookieDomainRewrite: false as const,
  cookiePathRewrite: false as const,
  xfwd: true,
  pathRewrite: {
    '^/crm/staff/(.+)/schedule': '/api/staff/$1/schedule'
  },
  onError: handleProxyError('Salon API', 'salon-api'),
  onProxyReq: handleProxyRequest('Salon API'),
  onProxyRes: handleProxyResponse('Salon API'),
  logLevel: (process.env.NODE_ENV === 'development' ? 'debug' : 'warn') as 'debug' | 'warn'
} as any));

// Mount CSRF token endpoints (proxy to Salon API by default)
// Note: These are mounted WITHOUT /api prefix because they're registered with app.use('/api', proxyRoutes)
// So /csrf-token in router becomes /api/csrf-token in Express, and /crm/csrf-token becomes /api/crm/csrf-token
const csrfProxyMiddleware = createCSRFProxyMiddleware('salon-api');
router.get('/csrf-token', checkServiceAvailability('salon-api'), csrfProxyMiddleware);
router.get('/csrf-token', checkServiceAvailability('salon-api'), csrfProxyMiddleware);

// CSRF endpoints for CRM through proper path
// /crm/csrf-token (in router) → /api/crm/csrf-token (in Express) → /api/csrf-token on Salon API
router.get('/crm/csrf-token', checkServiceAvailability('salon-api'), createProxyMiddleware({
  target: SERVICES['salon-api'].url,
  changeOrigin: true,
  timeout: 30000,
  cookieDomainRewrite: false as const,
  cookiePathRewrite: false as const,
  xfwd: true,
  pathRewrite: (path: string) => {
    // /api/crm/csrf-token → /api/csrf-token
    if (path === '/api/crm/csrf-token' || path === '/crm/csrf-token') {
      return '/api/csrf-token';
    }
    return path;
  },
  onError: handleProxyError('Salon API', 'salon-api'),
  onProxyReq: (proxyReq: any, req: any, _res: any) => {
    // Forward critical headers
    const criticalHeaders = ['cookie', 'x-csrf-token', 'authorization', 'content-type', 'user-agent', 'referer'];
    criticalHeaders.forEach(headerName => {
      if (req.headers[headerName]) {
        proxyReq.setHeader(headerName, req.headers[headerName]);
      }
    });
    console.log(`🔄 CRM CSRF proxy: ${req.method} ${req.originalUrl} (rewritten to ${proxyReq.path})`);
  },
  onProxyRes: (proxyRes: any, _req: any, res: any) => {
    // Forward Set-Cookie headers for CSRF cookies
    if (proxyRes.headers['set-cookie']) {
      res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
    }
  },
  logLevel: (process.env.NODE_ENV === 'development' ? 'debug' : 'warn') as 'debug' | 'warn'
} as any));

// Health check route for direct service access
router.get('/services/:service/health', async (req, res) => {
  const serviceName = req.params.service;
  const service = SERVICES[serviceName];

  if (!service) {
    return res.status(404).json({
      error: 'Service not found',
      availableServices: Object.keys(SERVICES)
    });
  }

  const health = healthChecker.getServiceHealth(serviceName);
  return res.json({
    service: serviceName,
    health: health || { status: 'unknown', lastCheck: new Date() }
  });
});

export default router;
