import { Router } from 'express';

const router: Router = Router();

// 🏥 Health check endpoint (public)
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'payment-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: process.env.PORT || 6029
  });
});

export default router;