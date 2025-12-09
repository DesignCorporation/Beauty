import express from 'express';
import axios from 'axios';

import { EventEmitter } from 'events';

const router: express.Router = express.Router();

// Event emitter для real-time уведомлений
export const monitoringEvents = new EventEmitter();

// Импортируем структурированную конфигурацию сервисов
import { SERVICES_CONFIG, GATEWAY_ROUTED_SERVICES, DIRECT_ACCESS_SERVICES, INFRASTRUCTURE_SERVICES } from '../config/monitoring-services';

// Хранилище для метрик
interface ServiceMetrics {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
  availability24h: number;
  incidents24h: number;
  errorRate: number;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu?: number;
}

let servicesMetrics: Map<string, ServiceMetrics> = new Map();
let healthCheckInterval: NodeJS.Timeout | null = null;

const ORCHESTRATOR_BASE_URL = process.env.ORCHESTRATOR_BASE_URL || 'http://orchestrator:6030';

type OrchestratorAction = 'start' | 'stop' | 'restart' | 'resetCircuit';

async function orchestratorAction(serviceId: string, action: OrchestratorAction) {
  return axios.post(
    `${ORCHESTRATOR_BASE_URL}/orchestrator/services/${encodeURIComponent(serviceId)}/actions`,
    { action },
    { timeout: 15_000 }
  );
}

function resolveOrchestratorServiceId(serviceName: string): string | null {
  const config = SERVICES_CONFIG.find(service => service.name === serviceName);
  return config?.orchestratorId ?? null;
}

// Инициализация метрик
SERVICES_CONFIG.forEach(service => {
  servicesMetrics.set(service.name, {
    name: service.name,
    status: 'offline',
    responseTime: 0,
    uptime: 0,
    lastCheck: new Date(),
    availability24h: 100,
    incidents24h: 0,
    errorRate: 0
  });
});

// Функция проверки здоровья сервиса
async function checkServiceHealth(service: typeof SERVICES_CONFIG[0]): Promise<ServiceMetrics> {
  const startTime = Date.now();
  const metrics = servicesMetrics.get(service.name) || {
    name: service.name,
    status: 'offline' as const,
    responseTime: 0,
    uptime: 0,
    lastCheck: new Date(),
    availability24h: 100,
    incidents24h: 0,
    errorRate: 0
  };

  try {
    const response = await axios.get(service.url + service.healthEndpoint, {
      timeout: service.timeout,
      headers: {
        'User-Agent': 'Beauty-Platform-Monitor/2.0'
      }
    });

    const responseTime = Date.now() - startTime;
    const isHealthy = response.status === service.expectedStatus;

    // Определяем статус
    let status: 'online' | 'offline' | 'degraded';
    if (isHealthy && responseTime < 3000) {
      status = 'online';
    } else if (isHealthy && responseTime < 10000) {
      status = 'degraded';
    } else {
      status = 'offline';
    }

    // Извлекаем дополнительные метрики из ответа
    let memory, cpu, uptime;
    if (response.data && typeof response.data === 'object') {
      uptime = response.data.uptime || 0;
      
      if (response.data.memory) {
        const mem = response.data.memory;
        memory = {
          used: Math.round((mem.heapUsed || mem.used || 0) / 1024 / 1024), // MB
          total: Math.round((mem.heapTotal || mem.total || 0) / 1024 / 1024), // MB
          percentage: mem.heapUsed && mem.heapTotal 
            ? Math.round((mem.heapUsed / mem.heapTotal) * 100)
            : 0
        };
      }

      cpu = response.data.cpu || 0;
    }

    const updatedMetrics: ServiceMetrics = {
      ...metrics,
      status,
      responseTime,
      uptime: uptime || metrics.uptime,
      lastCheck: new Date(),
      cpu
    };

    // Only add memory if it exists
    if (memory) {
      updatedMetrics.memory = memory;
    }

    // Если статус изменился, отправляем событие
    if (metrics.status !== status) {
      monitoringEvents.emit('statusChange', {
        service: service.name,
        previousStatus: metrics.status,
        currentStatus: status,
        responseTime,
        critical: service.critical,
        timestamp: new Date()
      });

      // Увеличиваем счетчик инцидентов при переходе в offline
      if (status === 'offline') {
        updatedMetrics.incidents24h = metrics.incidents24h + 1;
      }
    }

    servicesMetrics.set(service.name, updatedMetrics);
    return updatedMetrics;

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    const errorStatus = 'offline';

    // Обработка разных типов ошибок
    let errorDetails = 'Connection failed';
    if (error.code === 'ECONNREFUSED') {
      errorDetails = 'Connection refused - service may be down';
    } else if (error.code === 'ETIMEDOUT') {
      errorDetails = 'Request timeout - service overloaded';
    } else if (error.code === 'ENOTFOUND') {
      errorDetails = 'Host not found - DNS or service issue';
    }

    const updatedMetrics: ServiceMetrics = {
      ...metrics,
      status: errorStatus,
      responseTime,
      lastCheck: new Date(),
      errorRate: metrics.errorRate + 1
    };

    // Отправляем событие об ошибке
    if (metrics.status !== errorStatus) {
      monitoringEvents.emit('statusChange', {
        service: service.name,
        previousStatus: metrics.status,
        currentStatus: errorStatus,
        responseTime,
        critical: service.critical,
        error: errorDetails,
        timestamp: new Date()
      });

      updatedMetrics.incidents24h = metrics.incidents24h + 1;
    }

    servicesMetrics.set(service.name, updatedMetrics);
    return updatedMetrics;
  }
}

// API для получения структурированных метрик по категориям
router.get('/metrics-structured', async (_req, res) => {
  try {
    const gatewayServices = GATEWAY_ROUTED_SERVICES.map(service => {
      const metrics = servicesMetrics.get(service.name);
      return {
        ...service,
        metrics: metrics || {
          name: service.name,
          status: 'unknown',
          responseTime: 0,
          uptime: 0,
          lastCheck: new Date(),
          availability24h: 100,
          incidents24h: 0,
          errorRate: 0
        }
      };
    });

    const directServices = DIRECT_ACCESS_SERVICES.map(service => {
      const metrics = servicesMetrics.get(service.name);
      return {
        ...service,
        metrics: metrics || {
          name: service.name,
          status: 'unknown',
          responseTime: 0,
          uptime: 0,
          lastCheck: new Date(),
          availability24h: 100,
          incidents24h: 0,
          errorRate: 0
        }
      };
    });

    const infrastructureServices = INFRASTRUCTURE_SERVICES.map(service => {
      const metrics = servicesMetrics.get(service.name);
      return {
        ...service,
        metrics: metrics || {
          name: service.name,
          status: 'unknown',
          responseTime: 0,
          uptime: 0,
          lastCheck: new Date(),
          availability24h: 100,
          incidents24h: 0,
          errorRate: 0
        }
      };
    });

    const totalServices = gatewayServices.length + directServices.length + infrastructureServices.length;
    const onlineServices = [...gatewayServices, ...directServices, ...infrastructureServices]
      .filter(s => s.metrics.status === 'online').length;

    res.json({
      success: true,
      data: {
        categories: {
          gatewayRouted: {
            title: 'API Gateway Routed Services',
            description: 'Services accessed through API Gateway (port 6020)',
            icon: '🚀',
            services: gatewayServices
          },
          directAccess: {
            title: 'Direct Access Services',
            description: 'Frontend applications with direct nginx proxy',
            icon: '🌐',
            services: directServices
          },
          infrastructure: {
            title: 'Infrastructure Services',
            description: 'Development and infrastructure services',
            icon: '🛠️',
            services: infrastructureServices
          }
        },
        summary: {
          totalServices,
          onlineServices,
          gatewayRoutedCount: gatewayServices.length,
          directAccessCount: directServices.length,
          infrastructureCount: infrastructureServices.length
        },
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching structured metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch structured metrics'
    });
  }
});

// API для получения всех метрик (обратная совместимость)
router.get('/metrics', async (_req, res) => {
  try {
    const metricsArray = Array.from(servicesMetrics.values());
    
    // Вычисляем общие метрики системы
    const totalServices = metricsArray.length;
    const onlineServices = metricsArray.filter(m => m.status === 'online').length;
    const criticalServices = SERVICES_CONFIG.filter(s => s.critical);
    const criticalIssues = criticalServices.filter(cs => {
      const metrics = servicesMetrics.get(cs.name);
      return metrics && metrics.status !== 'online';
    });

    const systemHealth = {
      overall: criticalIssues.length === 0 ? 'healthy' : 'critical',
      servicesOnline: onlineServices,
      totalServices,
      averageResponseTime: metricsArray.reduce((acc, m) => acc + m.responseTime, 0) / totalServices,
      totalIncidents24h: metricsArray.reduce((acc, m) => acc + m.incidents24h, 0),
      criticalIssues: criticalIssues.map(ci => ci.name)
    };

    res.json({
      success: true,
      data: {
        services: metricsArray,
        systemHealth,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

// API для принудительной проверки всех сервисов
router.post('/check-all', async (_req, res) => {
  try {
    const results = await Promise.allSettled(
      SERVICES_CONFIG.map(service => checkServiceHealth(service))
    );

    const metrics = results.map((result, index) => {
      const service = SERVICES_CONFIG[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else if (!service) {
        // Skip if service config not found
        return null;
      } else {
        return {
          name: service.name,
          status: 'offline' as const,
          responseTime: 0,
          uptime: 0,
          lastCheck: new Date(),
          availability24h: 0,
          incidents24h: 1,
          errorRate: 1,
          error: 'Health check failed'
        };
      }
    });

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check services'
    });
  }
});

// API для перезапуска сервиса (через Smart Auto-Restore + Health Monitor)
router.post('/restart-service', async (req, res) => {
  const { serviceName } = req.body ?? {};

  if (!serviceName) {
    return res.status(400).json({
      success: false,
      error: 'Service name is required'
    });
  }

  const orchestratorId = resolveOrchestratorServiceId(serviceName);

  if (!orchestratorId) {
    return res.status(400).json({
      success: false,
      error: `Service ${serviceName} is not managed by the orchestrator`
    });
  }

  try {
    console.log(`[Monitoring] Restart request for ${serviceName} (orchestrator id: ${orchestratorId})`);

    const response = await orchestratorAction(orchestratorId, 'restart');

    monitoringEvents.emit('serviceRestart', {
      service: serviceName,
      timestamp: new Date(),
      status: 'completed',
      details: {
        orchestratorId,
        orchestratorResponse: response.data ?? null
      }
    });

    return res.json({
      success: true,
      message: `Restart requested for ${serviceName}`,
      orchestratorId,
      timestamp: new Date().toISOString(),
      orchestratorResponse: response.data ?? null
    });
  } catch (error) {
    console.error('Error restarting service via orchestrator:', error);

    monitoringEvents.emit('serviceRestart', {
      service: serviceName,
      timestamp: new Date(),
      status: 'failed',
      details: {
        orchestratorId,
        error: error instanceof Error ? error.message : String(error)
      }
    });

    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data?.error || 'Failed to restart service',
        orchestratorId,
        details: error.response.data ?? null
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to restart service',
      orchestratorId
    });
  }
});

router.post('/stop-service', async (req, res) => {
  const { serviceName } = req.body ?? {};

  if (!serviceName) {
    return res.status(400).json({
      success: false,
      error: 'Service name is required'
    });
  }

  const orchestratorId = resolveOrchestratorServiceId(serviceName);

  if (!orchestratorId) {
    return res.status(400).json({
      success: false,
      error: `Service ${serviceName} is not managed by the orchestrator`
    });
  }

  try {
    console.log(`[Monitoring] Stop request for ${serviceName} (orchestrator id: ${orchestratorId})`);

    const response = await orchestratorAction(orchestratorId, 'stop');

    monitoringEvents.emit('serviceStop', {
      service: serviceName,
      timestamp: new Date(),
      status: 'completed',
      details: {
        orchestratorId,
        orchestratorResponse: response.data ?? null
      }
    });

    return res.json({
      success: true,
      message: `Stop requested for ${serviceName}`,
      orchestratorId,
      timestamp: new Date().toISOString(),
      orchestratorResponse: response.data ?? null
    });
  } catch (error) {
    console.error('Error stopping service via orchestrator:', error);

    monitoringEvents.emit('serviceStop', {
      service: serviceName,
      timestamp: new Date(),
      status: 'failed',
      details: {
        orchestratorId,
        error: error instanceof Error ? error.message : String(error)
      }
    });

    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data?.error || 'Failed to stop service',
        orchestratorId,
        details: error.response.data ?? null
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to stop service',
      orchestratorId
    });
  }
});

// API для конфигурации алертов
router.get('/alerts/config', (_req, res) => {
  // TODO: Загрузка из базы данных
  res.json({
    success: true,
    data: {
      telegram: {
        enabled: process.env.TELEGRAM_ENABLED === 'true',
        configured: !!process.env.TELEGRAM_BOT_TOKEN
      },
      discord: {
        enabled: process.env.DISCORD_ENABLED === 'true',
        configured: !!process.env.DISCORD_WEBHOOK_URL
      },
      slack: {
        enabled: process.env.SLACK_ENABLED === 'true',
        configured: !!process.env.SLACK_TOKEN
      },
      thresholds: {
        responseTime: parseInt(process.env.THRESHOLD_RESPONSE_TIME || '5000'),
        errorRate: parseFloat(process.env.THRESHOLD_ERROR_RATE || '5'),
        availabilityMin: parseFloat(process.env.THRESHOLD_AVAILABILITY || '99')
      }
    }
  });
});

// Запуск автоматического мониторинга
export function startMonitoring() {
  if (healthCheckInterval) {
    console.log('Monitoring already running');
    return;
  }

  console.log('🔍 Starting automated health monitoring...');
  
  // Выполняем первоначальную проверку
  Promise.allSettled(
    SERVICES_CONFIG.map(service => checkServiceHealth(service))
  ).then(() => {
    console.log('✅ Initial health check completed');
  });

  // Настраиваем регулярные проверки каждые 30 секунд
  healthCheckInterval = setInterval(async () => {
    try {
      await Promise.allSettled(
        SERVICES_CONFIG.map(service => checkServiceHealth(service))
      );
    } catch (error) {
      console.error('Error in scheduled health check:', error);
    }
  }, 30000);

  console.log('📊 Health monitoring started with 30s interval');
}

// Остановка мониторинга
export function stopMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('🛑 Health monitoring stopped');
  }
}

// API для тестирования Telegram алертов
router.post('/test-alert', async (_req, res) => {
  try {
    // Импортируем Telegram alert
    const { telegramAlert } = await import('../alerts/TelegramAlert');
    
    const success = await telegramAlert.sendTestAlert();
    
    if (success) {
      res.json({
        success: true,
        message: 'Test alert sent successfully to Telegram',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send test alert',
        hint: 'Check Telegram configuration (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)'
      });
    }
  } catch (error: any) {
    console.error('Error sending test alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test alert',
      details: error.message
    });
  }
});

// API для получения конфигурации алертов
router.get('/alerts/status', async (_req, res) => {
  try {
    const { telegramAlert } = await import('../alerts/TelegramAlert');
    const stats = telegramAlert.getAlertStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting alert status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alert status',
      details: error.message
    });
  }
});

export default router;
