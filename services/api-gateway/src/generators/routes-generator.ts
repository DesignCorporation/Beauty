import { Router } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { ConnectionMap, ConnectionRoute, loadConnectionMap } from '@beauty-platform/service-registry'

// Simple logger (can be replaced with winston/pino later)
const logger = {
  info: (msg: string) => console.log(`ℹ️ ${msg}`),
  warn: (msg: string) => console.warn(`⚠️  ${msg}`),
  error: (msg: string, err?: any) => console.error(`❌ ${msg}`, err || '')
}

/**
 * Generates gateway routes dynamically from Connection Map
 * Handles HTTP proxy routing and WebSocket upgrade protocol
 */
export function generateGatewayRoutes(connectionMap?: ConnectionMap): Router {
  const router = Router()
  const map = connectionMap || loadConnectionMap()
  const gatewayConfig = map.services['api-gateway']

  if (!gatewayConfig?.routes) {
    logger.warn('No routes found in gateway configuration')
    return router
  }

  // Track generated routes for logging
  const generatedRoutes: Array<{ path: string; service: string; methods: string[] }> = []

  // Generate HTTP routes
  gatewayConfig.routes?.forEach((route: ConnectionRoute) => {
    const targetService = map.services[route.targetService]
    if (!targetService) {
      logger.error(`Target service not found: ${route.targetService}`)
      return
    }

    const targetUrl = `http://${targetService.host || 'localhost'}:${targetService.port}`
    const methods = route.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']

    // Build pathRewrite configuration
    const pathRewrite: Record<string, string> = {}
    if (route.pathRewrite) {
      Object.entries(route.pathRewrite).forEach(([from, to]: any) => {
        pathRewrite[from] = to
      })
    } else if (route.targetPath && route.targetPath !== route.gatewayPath) {
      // Auto-generate pathRewrite if targetPath is different
      pathRewrite[`^${route.gatewayPath}`] = route.targetPath
    }

    const proxyOptions = {
      target: targetUrl,
      changeOrigin: true,
      pathRewrite: Object.keys(pathRewrite).length > 0 ? pathRewrite : undefined,
      logLevel: 'warn' as const,
      timeout: 30000,
      proxyTimeout: 30000,
      onProxyReq: (proxyReq: any, req: any, _res: any) => {
        // Forward cookies to backend
        if (req.headers.cookie) {
          proxyReq.setHeader('cookie', req.headers.cookie)
        }
        // Forward headers from Nginx/Load Balancer
        if (req.headers['x-forwarded-host']) {
          proxyReq.setHeader('x-forwarded-host', req.headers['x-forwarded-host'])
        }
        if (req.headers['x-forwarded-proto']) {
          proxyReq.setHeader('x-forwarded-proto', req.headers['x-forwarded-proto'])
        }
        // Add request ID for tracing
        if (req.id) {
          proxyReq.setHeader('x-request-id', req.id)
        }
      },
      onProxyRes: (proxyRes: any, req: any, res: any) => {
        // Forward Set-Cookie headers to client
        if (proxyRes.headers['set-cookie']) {
          res.setHeader('Set-Cookie', proxyRes.headers['set-cookie'])
        }
        // Add CORS headers for credentials
        const origin = req.headers.origin
        if (origin) {
          res.setHeader('Access-Control-Allow-Origin', origin)
          res.setHeader('Access-Control-Allow-Credentials', 'true')
        }
      }
    }

    // Register route(s)
    methods.forEach((method: string) => {
      const methodLower = method.toLowerCase() as keyof Router
      const routePath = route.gatewayPath

      if (typeof router[methodLower] === 'function') {
        ;(router[methodLower] as any)(routePath, createProxyMiddleware(proxyOptions))
      }
    })

    // Also register wildcard path for nested routes
    if (!route.gatewayPath.includes('*')) {
      const wildcardPath = `${route.gatewayPath}/*`
      methods.forEach((method: string) => {
        const methodLower = method.toLowerCase() as keyof Router
        if (typeof router[methodLower] === 'function') {
          ;(router[methodLower] as any)(wildcardPath, createProxyMiddleware(proxyOptions))
        }
      })
    }

    generatedRoutes.push({
      path: route.gatewayPath,
      service: route.targetService,
      methods
    })

    logger.info(`Route registered: ${route.gatewayPath} → ${route.targetService}`)
  })

  // Generate WebSocket route if configured
  if (gatewayConfig.websocket) {
    const wsConfig = gatewayConfig.websocket
    const targetService = map.services[wsConfig.targetService]

    if (targetService) {
      const wsUrl = `http://${targetService.host || 'localhost'}:${targetService.port}`
      
      // Automatically rewrite /api/socket.io to /socket.io if needed
      const wsPathRewrite = wsConfig.path.includes('/socket.io') && wsConfig.path !== '/socket.io' 
        ? { [`^${wsConfig.path}`]: '/socket.io' }
        : undefined;

      const wsProxyOptions = {
        target: wsUrl,
        changeOrigin: true,
        ws: true, // Enable WebSocket upgrade
        pathRewrite: wsPathRewrite,
        timeout: 30000,
        proxyTimeout: 30000,
        onProxyReq: (proxyReq: any, req: any, _res: any) => {
          if (req.headers.cookie) {
            proxyReq.setHeader('cookie', req.headers.cookie)
          }
          if (req.id) {
            proxyReq.setHeader('x-request-id', req.id)
          }
        }
      }

      // Register WebSocket routes
      router.use(wsConfig.path, createProxyMiddleware(wsProxyOptions))
      router.use(`${wsConfig.path}/*`, createProxyMiddleware(wsProxyOptions))

      logger.info(
        `WebSocket route registered: ${wsConfig.path} → ${wsConfig.targetService} (ws: true)`
      )
    }
  }

  logger.info(`\n📊 Gateway routes summary:`)
  generatedRoutes.forEach((r) => {
    logger.info(
      `   ${r.methods.length > 1 ? '[' + r.methods.join(',') + ']' : r.methods[0]} ${r.path} → ${r.service}`
    )
  })

  return router
}

/**
 * Validates connection map and returns human-readable errors
 */
export function validateGatewayConfig(map: ConnectionMap): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const gatewayConfig = map.services['api-gateway']

  if (!gatewayConfig) {
    errors.push('api-gateway service not found in connection map')
    return { valid: false, errors }
  }

  if (!gatewayConfig.routes || gatewayConfig.routes.length === 0) {
    errors.push('api-gateway has no routes configured')
  }

  // Validate each route references existing services
  gatewayConfig.routes?.forEach((route: ConnectionRoute) => {
    if (!map.services[route.targetService]) {
      errors.push(`Route ${route.gatewayPath} references unknown service: ${route.targetService}`)
    }
  })

  // Validate WebSocket config
  if (gatewayConfig.websocket && !map.services[gatewayConfig.websocket.targetService]) {
    errors.push(
      `WebSocket route references unknown service: ${gatewayConfig.websocket.targetService}`
    )
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
