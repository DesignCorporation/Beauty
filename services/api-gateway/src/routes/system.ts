import { Router } from 'express';
import { healthChecker } from '../middleware/health';
import { SERVICES } from '../config/services';
import { exec } from 'child_process';
import { promisify } from 'util';
import { loadConnectionMap } from '@beauty-platform/service-registry';

const router: Router = Router();
const execAsync = promisify(exec);

// Database health check endpoint
router.get('/db-health', async (_req, res) => {
  try {
    const startTime = Date.now();
    
    // Простая проверка подключения к PostgreSQL
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.$queryRaw`SELECT 1 as test`;
      await prisma.$disconnect();
      
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: true,
        status: 'healthy',
        database: 'beauty_platform_new',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        connection: 'PostgreSQL connected successfully'
      });
      
    } catch (dbError) {
      throw dbError;
    }
    
  } catch (error) {
    console.error('Database health check failed:', error);
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      database: 'beauty_platform_new',
      error: error instanceof Error ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Service restart endpoint (via PM2)
router.post('/restart-service', async (req, res) => {
  try {
    const { serviceName, port } = req.body;
    
    if (!serviceName || !port) {
      return res.status(400).json({
        success: false,
        error: 'serviceName and port are required'
      });
    }
    
    // Поиск PM2 процесса по порту
    const pm2ServiceMap: Record<number, string> = {
      6020: 'api-gateway',
      6021: 'auth-service',
      6001: 'salon-crm',
      6002: 'admin-panel',
      6003: 'client-booking',
      6025: 'mcp-server',
      6026: 'images-api'
    };
    
    const pm2ProcessName = pm2ServiceMap[port];
    
    if (!pm2ProcessName) {
      return res.status(400).json({
        success: false,
        error: `No PM2 process found for port ${port}`,
        availablePorts: Object.keys(pm2ServiceMap)
      });
    }
    
    console.log(`🔄 Restarting service: ${serviceName} (${pm2ProcessName}) on port ${port}`);
    
    // Выполняем рестарт через PM2
    try {
      const { stdout, stderr } = await execAsync(`pm2 restart ${pm2ProcessName}`);
      
      if (stderr && !stderr.includes('✓')) {
        throw new Error(stderr);
      }
      
      return res.json({
        success: true,
        message: `Service ${serviceName} restart initiated`,
        pm2Process: pm2ProcessName,
        port: port,
        output: stdout,
        timestamp: new Date().toISOString()
      });
      
    } catch (pm2Error) {
      console.error('PM2 restart failed:', pm2Error);
      
      return res.status(500).json({
        success: false,
        error: `Failed to restart ${serviceName}`,
        details: pm2Error instanceof Error ? pm2Error.message : 'PM2 command failed',
        pm2Process: pm2ProcessName
      });
    }
    
  } catch (error) {
    console.error('Service restart error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error during service restart',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get system metrics endpoint
router.get('/metrics', async (_req, res) => {
  try {
    // Получаем статус всех сервисов
    const services = Object.entries(SERVICES).map(([key, config]) => {
      const health = healthChecker.getServiceHealth(key);
      return {
        name: config.name,
        key,
        port: new URL(config.url).port,
        status: health?.status || 'unknown',
        responseTime: health?.responseTime || null,
        lastCheck: health?.lastCheck || null,
        error: health?.error || null
      };
    });
    
    // Базовые системные метрики
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
    
    return res.json({
      services,
      system: systemMetrics,
      summary: {
        totalServices: services.length,
        healthyServices: services.filter(s => s.status === 'healthy').length,
        unhealthyServices: services.filter(s => s.status !== 'healthy').length
      }
    });
    
  } catch (error) {
    console.error('System metrics error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get system metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get service logs endpoint
router.get('/service-logs/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const { lines = 50 } = req.query;
    
    const pm2ServiceMap: Record<string, string> = {
      'api-gateway': 'api-gateway',
      'auth-service': 'auth-service',
      'salon-crm': 'salon-crm',
      'admin-panel': 'admin-panel',
      'client-booking': 'client-booking',
      'mcp-server': 'mcp-server',
      'images-api': 'images-api'
    };
    
    const pm2ProcessName = pm2ServiceMap[service];
    
    if (!pm2ProcessName) {
      return res.status(404).json({
        success: false,
        error: `Service ${service} not found`,
        availableServices: Object.keys(pm2ServiceMap)
      });
    }
    
    // Получаем логи через PM2
    const { stdout } = await execAsync(`pm2 logs ${pm2ProcessName} --lines ${lines} --raw`);
    
    return res.json({
      success: true,
      service,
      logs: stdout.split('\n').filter(line => line.trim()),
      lines: parseInt(lines as string),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Service logs error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get service logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Connection map endpoint (single source of truth for routes/services)
router.get('/connection-map', async (_req, res) => {
  try {
    const map = loadConnectionMap();
    return res.json({
      success: true,
      data: map,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to load connection map:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load connection map'
    });
  }
});

export default router;
