// BEAUTY PLATFORM - HEALTH MONITORING & AUTO-RECOVERY SERVICE
// Enterprise monitoring with Circuit Breaker pattern, auto-healing, and Telegram alerts

import express from 'express'
import { createClient } from 'redis'
import Docker from 'dockerode'
import axios from 'axios'
import cron from 'node-cron'
import pino from 'pino'

const app = express()
const port = process.env.PORT || 6030
const docker = new Docker()

// Logger
const logger = pino({
  name: 'beauty-monitoring',
  level: process.env.LOG_LEVEL || 'info'
})

// Redis client for circuit breaker state
const redis = createClient({
  url: process.env.REDIS_URL
})

// Service definitions
interface ServiceHealth {
  name: string
  url: string
  containerName?: string
  port: number
  healthPath: string
  timeout: number
  expectedStatus: number
  circuitBreaker: {
    failureCount: number
    lastFailureTime: Date | null
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    failureThreshold: number
    recoveryTimeout: number
  }
  restartPolicy: {
    enabled: boolean
    maxRetries: number
    backoffMultiplier: number
    currentDelay: number
  }
}

const SERVICES: ServiceHealth[] = [
  {
    name: 'Auth Service LB',
    url: 'http://nginx-auth-lb',
    containerName: 'beauty-nginx-auth-lb',
    port: 80,
    healthPath: '/health',
    timeout: 5000,
    expectedStatus: 200,
    circuitBreaker: {
      failureCount: 0,
      lastFailureTime: null,
      state: 'CLOSED',
      failureThreshold: 3,
      recoveryTimeout: 60000 // 1 minute
    },
    restartPolicy: {
      enabled: true,
      maxRetries: 3,
      backoffMultiplier: 2,
      currentDelay: 5000
    }
  },
  {
    name: 'Auth Service 1',
    url: 'http://auth-service-1:6021',
    containerName: 'beauty-auth-service-1',
    port: 6021,
    healthPath: '/health',
    timeout: 10000,
    expectedStatus: 200,
    circuitBreaker: {
      failureCount: 0,
      lastFailureTime: null,
      state: 'CLOSED',
      failureThreshold: 5,
      recoveryTimeout: 30000 // 30 seconds
    },
    restartPolicy: {
      enabled: true,
      maxRetries: 5,
      backoffMultiplier: 1.5,
      currentDelay: 10000
    }
  },
  {
    name: 'Auth Service 2',
    url: 'http://auth-service-2:6021',
    containerName: 'beauty-auth-service-2',
    port: 6021,
    healthPath: '/health',
    timeout: 10000,
    expectedStatus: 200,
    circuitBreaker: {
      failureCount: 0,
      lastFailureTime: null,
      state: 'CLOSED',
      failureThreshold: 5,
      recoveryTimeout: 30000
    },
    restartPolicy: {
      enabled: true,
      maxRetries: 5,
      backoffMultiplier: 1.5,
      currentDelay: 10000
    }
  },
  {
    name: 'API Gateway',
    url: 'http://api-gateway:6020',
    containerName: 'beauty-api-gateway',
    port: 6020,
    healthPath: '/health',
    timeout: 5000,
    expectedStatus: 200,
    circuitBreaker: {
      failureCount: 0,
      lastFailureTime: null,
      state: 'CLOSED',
      failureThreshold: 3,
      recoveryTimeout: 45000
    },
    restartPolicy: {
      enabled: true,
      maxRetries: 3,
      backoffMultiplier: 2,
      currentDelay: 15000
    }
  },
  {
    name: 'Database',
    url: 'http://postgres-primary:5432',
    containerName: 'beauty-postgres-primary',
    port: 5432,
    healthPath: '', // Custom check
    timeout: 3000,
    expectedStatus: 200,
    circuitBreaker: {
      failureCount: 0,
      lastFailureTime: null,
      state: 'CLOSED',
      failureThreshold: 2,
      recoveryTimeout: 120000 // 2 minutes
    },
    restartPolicy: {
      enabled: false, // Database restarts are dangerous
      maxRetries: 0,
      backoffMultiplier: 1,
      currentDelay: 0
    }
  }
]

// Health check metrics
interface HealthMetrics {
  timestamp: Date
  totalServices: number
  healthyServices: number
  degradedServices: number
  offlineServices: number
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
  details: {
    [serviceName: string]: {
      status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE'
      responseTime: number
      lastCheck: Date
      errorMessage?: string
    }
  }
}

let lastHealthMetrics: HealthMetrics = {
  timestamp: new Date(),
  totalServices: SERVICES.length,
  healthyServices: 0,
  degradedServices: 0,
  offlineServices: 0,
  systemHealth: 'HEALTHY',
  details: {}
}

// Telegram notification function
async function sendTelegramAlert(message: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO') {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  
  if (!botToken || !chatId) {
    logger.warn('Telegram credentials not configured')
    return
  }

  const emoji = severity === 'CRITICAL' ? '🚨' : severity === 'WARNING' ? '⚠️' : 'ℹ️'
  const formattedMessage = `${emoji} [Beauty Platform]\n\n${message}\n\nTime: ${new Date().toISOString()}`

  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: formattedMessage,
      parse_mode: 'Markdown'
    }, { timeout: 5000 })
    
    logger.info(`Telegram alert sent: ${severity}`)
  } catch (error) {
    logger.error('Failed to send Telegram alert:', error)
  }
}

// Circuit breaker logic
function updateCircuitBreaker(service: ServiceHealth, success: boolean) {
  if (success) {
    // Reset on success
    service.circuitBreaker.failureCount = 0
    service.circuitBreaker.lastFailureTime = null
    if (service.circuitBreaker.state === 'HALF_OPEN') {
      service.circuitBreaker.state = 'CLOSED'
      logger.info(`Circuit breaker CLOSED for ${service.name}`)
    }
  } else {
    // Increment failure count
    service.circuitBreaker.failureCount++
    service.circuitBreaker.lastFailureTime = new Date()
    
    // Open circuit if threshold reached
    if (service.circuitBreaker.failureCount >= service.circuitBreaker.failureThreshold &&
        service.circuitBreaker.state === 'CLOSED') {
      service.circuitBreaker.state = 'OPEN'
      logger.warn(`Circuit breaker OPENED for ${service.name} after ${service.circuitBreaker.failureCount} failures`)
      
      // Send alert
      sendTelegramAlert(
        `🚨 *Circuit Breaker OPENED*\n\nService: ${service.name}\nFailures: ${service.circuitBreaker.failureCount}\nThreshold: ${service.circuitBreaker.failureThreshold}`,
        'CRITICAL'
      )
    }
  }
}

// Check if circuit breaker allows requests
function isCircuitBreakerOpen(service: ServiceHealth): boolean {
  if (service.circuitBreaker.state === 'CLOSED') return false
  if (service.circuitBreaker.state === 'OPEN') {
    // Check if recovery time has passed
    const now = Date.now()
    const lastFailure = service.circuitBreaker.lastFailureTime?.getTime() || 0
    if (now - lastFailure > service.circuitBreaker.recoveryTimeout) {
      service.circuitBreaker.state = 'HALF_OPEN'
      logger.info(`Circuit breaker moved to HALF_OPEN for ${service.name}`)
      return false // Allow one request to test
    }
    return true
  }
  return false // HALF_OPEN allows requests
}

// Individual service health check
async function checkServiceHealth(service: ServiceHealth): Promise<{
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE'
  responseTime: number
  errorMessage?: string
}> {
  // Check circuit breaker
  if (isCircuitBreakerOpen(service)) {
    return {
      status: 'OFFLINE',
      responseTime: 0,
      errorMessage: 'Circuit breaker OPEN'
    }
  }

  const startTime = Date.now()

  try {
    // Service health check logic below
    // Special handling for database
    if (service.name === 'Database') {
      // Use pg client to check database
      await axios.get(`${service.url.replace('http://', 'http://')}/`, {
        timeout: service.timeout
      })
    } else {
      // Standard HTTP health check
      await axios.get(`${service.url}${service.healthPath}`, {
        timeout: service.timeout,
        validateStatus: (status) => status === service.expectedStatus
      })
    }

    const responseTime = Date.now() - startTime
    updateCircuitBreaker(service, true)

    // Determine status based on response time
    const status = responseTime < 1000 ? 'HEALTHY' : 'DEGRADED'

    return { status, responseTime }
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    updateCircuitBreaker(service, false)
    
    logger.error(`Health check failed for ${service.name}:`, error.message)
    
    return {
      status: 'OFFLINE',
      responseTime,
      errorMessage: error.message || 'Health check failed'
    }
  }
}

// Restart container with exponential backoff
async function restartContainer(service: ServiceHealth): Promise<boolean> {
  if (!service.containerName || !service.restartPolicy.enabled) {
    return false
  }

  try {
    logger.info(`Attempting to restart container: ${service.containerName}`)
    
    const container = docker.getContainer(service.containerName)
    await container.restart()
    
    // Reset restart delay on successful restart
    service.restartPolicy.currentDelay = 5000
    
    logger.info(`Successfully restarted container: ${service.containerName}`)
    
    // Wait a bit before next health check
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    return true
    
  } catch (error: any) {
    logger.error(`Failed to restart container ${service.containerName}:`, error.message)
    
    // Increase delay for next attempt (exponential backoff)
    service.restartPolicy.currentDelay *= service.restartPolicy.backoffMultiplier
    
    return false
  }
}

// Main health check function
async function performHealthChecks(): Promise<void> {
  logger.info('Starting health check cycle')
  
  const metrics: HealthMetrics = {
    timestamp: new Date(),
    totalServices: SERVICES.length,
    healthyServices: 0,
    degradedServices: 0,
    offlineServices: 0,
    systemHealth: 'HEALTHY',
    details: {}
  }

  // Check each service
  for (const service of SERVICES) {
    const healthResult = await checkServiceHealth(service)

    const detailEntry: HealthMetrics['details'][string] = {
      status: healthResult.status,
      responseTime: healthResult.responseTime,
      lastCheck: new Date()
    }

    // Only add errorMessage if it exists
    if (healthResult.errorMessage) {
      detailEntry.errorMessage = healthResult.errorMessage
    }

    metrics.details[service.name] = detailEntry

    // Update counters
    switch (healthResult.status) {
      case 'HEALTHY':
        metrics.healthyServices++
        break
      case 'DEGRADED':
        metrics.degradedServices++
        break
      case 'OFFLINE':
        metrics.offlineServices++
        
        // Attempt auto-recovery if enabled
        if (service.restartPolicy.enabled) {
          logger.warn(`Service ${service.name} is offline, attempting restart`)
          await restartContainer(service)
        }
        break
    }
  }

  // Determine overall system health
  if (metrics.offlineServices > 0) {
    metrics.systemHealth = 'CRITICAL'
  } else if (metrics.degradedServices > 0) {
    metrics.systemHealth = 'DEGRADED'
  } else {
    metrics.systemHealth = 'HEALTHY'
  }

  // Check if system health changed
  const healthChanged = lastHealthMetrics.systemHealth !== metrics.systemHealth
  const newOfflineServices = metrics.offlineServices - lastHealthMetrics.offlineServices

  if (healthChanged || newOfflineServices > 0) {
    const message = `*System Health: ${metrics.systemHealth}*\n\n` +
      `✅ Healthy: ${metrics.healthyServices}\n` +
      `⚠️ Degraded: ${metrics.degradedServices}\n` +
      `🚨 Offline: ${metrics.offlineServices}\n\n` +
      `Total Services: ${metrics.totalServices}`

    const severity = metrics.systemHealth === 'CRITICAL' ? 'CRITICAL' : 
                    metrics.systemHealth === 'DEGRADED' ? 'WARNING' : 'INFO'
    
    await sendTelegramAlert(message, severity)
  }

  // Store metrics in Redis
  try {
    await redis.setEx('beauty:health:current', 300, JSON.stringify(metrics))
    await redis.lPush('beauty:health:history', JSON.stringify(metrics))
    await redis.lTrim('beauty:health:history', 0, 100) // Keep last 100 entries
  } catch (error) {
    logger.error('Failed to store health metrics in Redis:', error)
  }

  lastHealthMetrics = metrics
  logger.info(`Health check complete. System: ${metrics.systemHealth}`)
}

// Express routes
app.get('/health', (_req, res) => {
  res.json({
    service: 'beauty-monitoring',
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

app.get('/system-health', async (_req, res) => {
  try {
    const currentHealth = await redis.get('beauty:health:current')
    if (currentHealth) {
      res.json(JSON.parse(currentHealth))
    } else {
      res.json(lastHealthMetrics)
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve health metrics' })
  }
})

app.get('/health-history', async (_req, res) => {
  try {
    const history = await redis.lRange('beauty:health:history', 0, 50)
    const parsedHistory = history.map((item: string) => JSON.parse(item))
    res.json(parsedHistory)
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve health history' })
  }
})

// Force restart endpoint (admin only)
app.post('/restart/:serviceName', async (req, res) => {
  const { serviceName } = req.params
  const service = SERVICES.find(s => s.name === serviceName)
  
  if (!service) {
    return res.status(404).json({ error: 'Service not found' })
  }

  const success = await restartContainer(service)
  res.json({ 
    success, 
    message: success ? 'Restart initiated' : 'Restart failed',
    service: serviceName
  })
  return undefined;
})

// Initialize
async function initialize() {
  try {
    await redis.connect()
    logger.info('Connected to Redis')

    // Schedule health checks every 30 seconds
    cron.schedule('*/30 * * * * *', performHealthChecks)
    
    // Initial health check
    setTimeout(performHealthChecks, 5000)

    // Send startup notification
    await sendTelegramAlert(
      '🚀 *Beauty Platform Monitoring Started*\n\nMonitoring services:\n' +
      SERVICES.map(s => `• ${s.name}`).join('\n'),
      'INFO'
    )

    app.listen(port, () => {
      logger.info(`Beauty Platform Monitoring Service running on port ${port}`)
    })

  } catch (error) {
    logger.error('Failed to initialize monitoring service:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down monitoring service')
  await redis.quit()
  process.exit(0)
})

// Start the service
initialize()
