/**
 * REST API Routes
 * Express routes for orchestrator API endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Orchestrator } from '../managers/orchestrator';
import { ServiceActionSchema, ServiceAction } from '../types/orchestrator.types';
import { isExternallyManaged } from '@beauty-platform/service-registry';

const router: Router = Router();

/**
 * Validation middleware
 */
const validateServiceAction = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = ServiceActionSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: error instanceof z.ZodError ? error.issues : error
    });
  }
};

/**
 * Initialize routes with orchestrator instance
 */
export function createRoutes(orchestrator: Orchestrator): Router {
  /**
   * GET /orchestrator/status-all
   * Get status of all services
   */
  router.get('/status-all', async (_req: Request, res: Response) => {
    try {
      const status = orchestrator.getStatusAll();
      return res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting status-all:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get orchestrator status',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /orchestrator/services/:id/status
   * Get status of specific service
   */
  router.get('/services/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Service id is required',
          timestamp: new Date().toISOString()
        });
      }

      const status = orchestrator.getServiceStatus(id);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: `Service ${id} not found`,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error getting service status for ${req.params.id}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get service status',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /orchestrator/services/:id/actions
   * Execute action on specific service
   */
  router.post('/services/:id/actions', validateServiceAction, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Service id is required',
          timestamp: new Date().toISOString()
        });
      }

      const { action } = req.body as { action: ServiceAction };

      // Check if service is externally managed
      if (isExternallyManaged(id)) {
        return res.status(501).json({
          success: false,
          error: `Service ${id} is externally managed and cannot be controlled by orchestrator`,
          serviceId: id,
          managed: 'external',
          timestamp: new Date().toISOString()
        });
      }

      await orchestrator.executeServiceAction(id, action);

      return res.json({
        success: true,
        message: `Action ${action} executed successfully on service ${id}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error executing action ${req.body.action} on service ${req.params.id}:`, error);

      // Check for external service error
      if (error instanceof Error && error.message.includes('externally managed')) {
        return res.status(501).json({
          success: false,
          error: error.message,
          serviceId: req.params.id,
          managed: 'external',
          timestamp: new Date().toISOString()
        });
      }

      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;

      return res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute action',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /orchestrator/services/:id/logs
   * Get logs for specific service
   */
  router.get('/services/:id/logs', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Service id is required',
          timestamp: new Date().toISOString()
        });
      }

      const lines = parseInt(req.query.lines as string) || 50;

      if (lines < 1 || lines > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Lines parameter must be between 1 and 1000',
          timestamp: new Date().toISOString()
        });
      }

      const logs = orchestrator.getServiceLogs(id, lines);

      return res.json({
        success: true,
        data: {
          serviceId: id,
          logs,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error getting logs for service ${req.params.id}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get service logs',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /orchestrator/registry
   * Get service registry data
   */
  router.get('/registry', async (_req: Request, res: Response) => {
    try {
      const registry = orchestrator.getRegistry();
      return res.json({
        success: true,
        data: {
          services: registry,
          count: registry.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting registry:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get service registry',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /orchestrator/health
   * Health check endpoint
   */
  router.get('/health', (_req: Request, res: Response) => {
    return res.json({
      status: 'ok',
      service: 'orchestrator',
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  /**
   * Batch operations endpoints
   */

  /**
   * POST /orchestrator/services/batch/start
   * Start multiple services
   */
  router.post('/services/batch/start', async (req: Request, res: Response) => {
    try {
      const { serviceIds } = req.body;

      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'serviceIds must be a non-empty array',
          timestamp: new Date().toISOString()
        });
      }

      const results = [];
      for (const serviceId of serviceIds) {
        try {
          // Check if service is externally managed
          if (isExternallyManaged(serviceId)) {
            results.push({
              serviceId,
              success: false,
              error: `Service ${serviceId} is externally managed`,
              statusCode: 501,
              managed: 'external'
            });
            continue;
          }

          await orchestrator.executeServiceAction(serviceId, ServiceAction.START);
          results.push({ serviceId, success: true });
        } catch (error) {
          const isExternalError = error instanceof Error && error.message.includes('externally managed');
          results.push({
            serviceId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            statusCode: isExternalError ? 501 : 500,
            managed: isExternalError ? 'external' : undefined
          });
        }
      }

      return res.json({
        success: true,
        data: { results },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in batch start:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to execute batch start',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /orchestrator/services/batch/stop
   * Stop multiple services
   */
  router.post('/services/batch/stop', async (req: Request, res: Response) => {
    try {
      const { serviceIds } = req.body;

      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'serviceIds must be a non-empty array',
          timestamp: new Date().toISOString()
        });
      }

      const results = [];
      for (const serviceId of serviceIds) {
        try {
          // Check if service is externally managed
          if (isExternallyManaged(serviceId)) {
            results.push({
              serviceId,
              success: false,
              error: `Service ${serviceId} is externally managed`,
              statusCode: 501,
              managed: 'external'
            });
            continue;
          }

          await orchestrator.executeServiceAction(serviceId, ServiceAction.STOP);
          results.push({ serviceId, success: true });
        } catch (error) {
          const isExternalError = error instanceof Error && error.message.includes('externally managed');
          results.push({
            serviceId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            statusCode: isExternalError ? 501 : 500,
            managed: isExternalError ? 'external' : undefined
          });
        }
      }

      return res.json({
        success: true,
        data: { results },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in batch stop:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to execute batch stop',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * ✨ NEW: GET /orchestrator/services/:id/processes
   * Get detailed process information including kill tracking
   */
  router.get('/services/:id/processes', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Service id is required',
          timestamp: new Date().toISOString()
        });
      }

      const processInfo = orchestrator.getServiceProcesses(id);

      if (!processInfo) {
        return res.status(404).json({
          success: false,
          error: `Service ${id} not found`,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        data: processInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error getting process info for service ${req.params.id}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get process information',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * ✨ NEW: GET /orchestrator/services/:id/kill-status
   * Get current kill status and tracking information
   */
  router.get('/services/:id/kill-status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Service id is required',
          timestamp: new Date().toISOString()
        });
      }

      const killStatus = orchestrator.getServiceKillStatus(id);

      if (!killStatus) {
        return res.status(404).json({
          success: false,
          error: `Service ${id} not found`,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        data: killStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error getting kill status for service ${req.params.id}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get kill status',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * ✨ NEW: POST /orchestrator/services/:id/kill
   * Manually kill a service process (admin only)
   */
  router.post('/services/:id/kill', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Service id is required',
          timestamp: new Date().toISOString()
        });
      }

      const { force } = req.body as { force?: boolean };

      // Check if service is externally managed
      if (isExternallyManaged(id)) {
        return res.status(501).json({
          success: false,
          error: `Service ${id} is externally managed and cannot be controlled by orchestrator`,
          serviceId: id,
          managed: 'external',
          timestamp: new Date().toISOString()
        });
      }

      const result = await orchestrator.killServiceProcess(id, force === true);

      return res.json({
        success: true,
        message: `Process for service ${id} killed successfully`,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error killing process for service ${req.params.id}:`, error);

      // Check for external service error
      if (error instanceof Error && error.message.includes('externally managed')) {
        return res.status(501).json({
          success: false,
          error: error.message,
          serviceId: req.params.id,
          managed: 'external',
          timestamp: new Date().toISOString()
        });
      }

      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;

      return res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to kill process',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * ✨ NEW: POST /orchestrator/restart
   * Full orchestrator restart with all services reload
   * WARNING: All services will be stopped and restarted, connections will drop
   */
  router.post('/restart', async (_req: Request, res: Response): Promise<void> => {
    try {
      console.log('[ORCHESTRATOR-RESTART] Starting full orchestrator restart...');

      // Respond to client BEFORE restarting
      res.json({
        success: true,
        message: 'Orchestrator restart initiated. Services will reload shortly.',
        timestamp: new Date().toISOString()
      });

      // Schedule restart after response is sent
      // This gives the client time to receive the response before everything shuts down
      setTimeout(async () => {
        try {
          console.log('[ORCHESTRATOR-RESTART] Performing shutdown and reload...');

          // Gracefully shutdown current orchestrator
          await orchestrator.shutdown();

          // Reinitialize orchestrator with fresh state
          console.log('[ORCHESTRATOR-RESTART] Reinitializing orchestrator...');
          await orchestrator.initialize();

          console.log('[ORCHESTRATOR-RESTART] Orchestrator restart completed successfully');
        } catch (error) {
          console.error('[ORCHESTRATOR-RESTART] Error during restart:', error);
          process.exit(1);
        }
      }, 500); // 500ms delay to allow response to be sent
    } catch (error) {
      console.error('Error initiating orchestrator restart:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate restart',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Error handling middleware
   */
  router.use((error: any, _req: Request, res: Response, _next: any) => {
    console.error('Unhandled route error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

export default router;
