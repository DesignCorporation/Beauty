import fs from 'node:fs'
import { Application } from 'express'
import { CONNECTION_MAP_PATH, loadConnectionMap } from '@beauty-platform/service-registry'
import { generateGatewayRoutes, validateGatewayConfig } from './routes-generator'

// Simple logger
const logger = {
  info: (msg: string) => console.log(`ℹ️ ${msg}`),
  warn: (msg: string) => console.warn(`⚠️  ${msg}`),
  error: (msg: string, err?: any) => console.error(`❌ ${msg}`, err || '')
}

/**
 * Watches connection-map.json for changes and hot-reloads routes
 * Only enabled in development mode
 */
export function setupRouteHotReload(app: Application): void {
  if (process.env.NODE_ENV !== 'development') {
    logger.info('ℹ️ Hot reload disabled (not in development mode)')
    return
  }

  let isReloading = false
  let reloadScheduled = false

  const scheduleReload = () => {
    if (isReloading) {
      reloadScheduled = true
      return
    }

    if (reloadScheduled) {
      reloadScheduled = false
    }
  }

  const reloadRoutes = () => {
    if (isReloading) {
      logger.warn('⚠️ Reload already in progress, scheduling next reload')
      reloadScheduled = true
      return
    }

    isReloading = true

    try {
      logger.info('🔄 Connection Map changed! Reloading routes...')

      // Clear require cache to load fresh connection map
      delete require.cache[require.resolve('@beauty-platform/service-registry/connection-map.json')]

      // Load fresh connection map
      const freshMap = loadConnectionMap()

      // Validate configuration
      const validation = validateGatewayConfig(freshMap)
      if (!validation.valid) {
        logger.error('❌ Configuration validation failed:')
        validation.errors.forEach((err) => logger.error(`   - ${err}`))
        isReloading = false
        return
      }

      // Generate new routes
      const newRoutes = generateGatewayRoutes(freshMap)

      // Remove old API routes from express stack (but keep other middleware)
      const originalStackLength = app._router.stack.length
      app._router.stack = app._router.stack.filter((layer: any) => {
        // Keep middleware that's not a route handler
        if (!layer.route && !layer.name?.includes('proxy')) {
          return true
        }
        // Keep routes that are not under /api
        if (layer.route && !layer.route.path?.toString().startsWith('/api')) {
          return true
        }
        return false
      })

      const removedCount = originalStackLength - app._router.stack.length
      logger.info(`📊 Removed ${removedCount} old routes`)

      // Mount new routes
      app.use('/api', newRoutes)

      logger.info('✅ Routes reloaded without restart! (took ~100ms)')

      if (reloadScheduled) {
        reloadScheduled = false
        setImmediate(() => {
          logger.info('🔄 Running scheduled reload...')
          isReloading = false
          reloadRoutes()
        })
      } else {
        isReloading = false
      }
    } catch (error) {
      logger.error('❌ Error reloading routes:', error)
      isReloading = false
    }
  }

  // Watch connection map file for changes
  let watchTimeout: NodeJS.Timeout | null = null

  const onFileChange = () => {
    if (watchTimeout) {
      clearTimeout(watchTimeout)
    }

    // Debounce: wait 100ms before reloading to avoid multiple rapid reloads
    watchTimeout = setTimeout(() => {
      reloadRoutes()
      watchTimeout = null
    }, 100)
  }

  try {
    logger.info(`📁 Watching ${CONNECTION_MAP_PATH} for changes...`)

    fs.watchFile(CONNECTION_MAP_PATH, { interval: 1000 }, (_curr, _prev) => {
      onFileChange()
    })

    logger.info('✅ Hot reload enabled for routes')

    // Graceful shutdown: stop watching on process exit
    process.on('exit', () => {
      fs.unwatchFile(CONNECTION_MAP_PATH)
      if (watchTimeout) {
        clearTimeout(watchTimeout)
      }
    })
  } catch (error) {
    logger.error('❌ Failed to setup hot reload watcher:', error)
  }
}
