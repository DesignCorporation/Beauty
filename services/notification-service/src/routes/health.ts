import { Router, Request, Response } from 'express';
const router: ReturnType<typeof Router> = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/health', (_req: Request, res: Response) => {
  const healthData = {
    status: 'ok',
    service: 'notification',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 6028
  };

  res.status(200).json(healthData);
});

/**
 * Detailed status endpoint for monitoring
 * GET /status
 */
router.get('/status', (_req: Request, res: Response) => {
  const status = {
    service: 'notification',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    // TODO: Add database connection check
    // TODO: Add Redis connection check
    // TODO: Add SMTP/SMS provider checks
    checks: {
      database: 'not_implemented',
      redis: 'not_implemented',
      smtp: 'not_implemented',
      sms: 'not_implemented'
    }
  };

  res.status(200).json(status);
});

export default router;
