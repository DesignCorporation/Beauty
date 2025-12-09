/**
 * Beauty Platform Orchestrator Server
 * Main entry point for the Node.js orchestrator service
 */

// CRITICAL: Load environment variables BEFORE any other imports
// This ensures service-registry can read Google OAuth credentials from .env
import { config } from 'dotenv';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd(), '..', '..');
config({ path: path.join(projectRoot, '.env') });
config({ path: path.join(projectRoot, '.env.development') });
config({ path: path.join(process.cwd(), '.env') });
config(); // Also load from current directory

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Orchestrator } from './managers/orchestrator';
import { createRoutes } from './api/routes';
import { loadConfig } from './utils/config';
import { createLogger, createExpressLoggerMiddleware, createExpressErrorMiddleware } from './utils/logger';

/**
 * Beauty Platform Orchestrator Server
 */
class OrchestratorServer {
  private app: express.Application;
  private orchestrator: Orchestrator;
  private logger: any;
  private config: any;

  constructor() {
    this.config = loadConfig();
    this.logger = createLogger(this.config.logsDir);
    this.app = express();
    this.orchestrator = new Orchestrator(this.config);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for API service
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: [
        'http://localhost:6002', // Admin Panel
        'http://localhost:6020', // API Gateway
        'https://admin.beauty.designcorp.eu',
        'https://test-admin.beauty.designcorp.eu'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Compression
    this.app.use(compression());

    // Request logging
    this.app.use(createExpressLoggerMiddleware(this.logger));

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = Math.random().toString(36).substring(7);
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });

    // Response time middleware
    this.app.use((_req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        res.responseTime = duration;
      });
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint (before rate limiting for monitoring)
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        service: 'orchestrator',
        version: '1.1.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // API routes
    this.app.use('/orchestrator', createRoutes(this.orchestrator));

    // Root endpoint info
    this.app.get('/', (_req, res) => {
      res.json({
        service: 'Beauty Platform Orchestrator',
        version: '1.1.0',
        description: 'Node.js Process Manager and Service Orchestration with Auto-Restart',
        endpoints: {
          health: '/health',
          status: '/orchestrator/status-all',
          registry: '/orchestrator/registry',
          services: {
            status: '/orchestrator/services/:id/status',
            actions: '/orchestrator/services/:id/actions',
            logs: '/orchestrator/services/:id/logs'
          },
          batch: {
            start: '/orchestrator/services/batch/start',
            stop: '/orchestrator/services/batch/stop'
          }
        },
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Express winston error logger
    this.app.use(createExpressErrorMiddleware(this.logger));

    // Global error handler
    this.app.use((err: any, req: any, res: any, _next: any) => {
      this.logger.error('Unhandled application error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        requestId: req.requestId
      });

      res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      void this.gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Promise Rejection:', {
        reason,
        promise: promise.toString()
      });
      void this.gracefulShutdown('unhandledRejection');
    });

    // Handle termination signals
    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM signal');
      void this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT signal');
      void this.gracefulShutdown('SIGINT');
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting Beauty Platform Orchestrator...');

      // Initialize orchestrator
      await this.orchestrator.initialize();

      // Setup orchestrator event listeners
      this.orchestrator.on('serviceStarted', (serviceId) => {
        this.logger.info(`Service started: ${serviceId}`);
      });

      this.orchestrator.on('serviceStopped', (serviceId) => {
        this.logger.info(`Service stopped: ${serviceId}`);
      });

      this.orchestrator.on('serviceRestarted', (serviceId) => {
        this.logger.info(`Service restarted: ${serviceId}`);
      });

      this.orchestrator.on('stateChange', (serviceId, state) => {
        this.logger.debug(`State change: ${serviceId} -> ${state}`);
      });

      this.orchestrator.on('processExit', (serviceId, exitCode, signal) => {
        this.logger.warn(`Process exit: ${serviceId}`, { exitCode, signal });
      });

      this.orchestrator.on('processError', (serviceId, error) => {
        this.logger.error(`Process error: ${serviceId}`, { error: error.message });
      });

      // Start HTTP server
      const server = this.app.listen(this.config.server.port, this.config.server.host, () => {
        this.logger.info('🚀 Beauty Platform Orchestrator started!', {
          port: this.config.server.port,
          host: this.config.server.host,
          environment: process.env.NODE_ENV || 'development',
          pid: process.pid
        });

        this.logger.info('📡 Available endpoints:', {
          health: `http://${this.config.server.host}:${this.config.server.port}/health`,
          status: `http://${this.config.server.host}:${this.config.server.port}/orchestrator/status-all`,
          registry: `http://${this.config.server.host}:${this.config.server.port}/orchestrator/registry`
        });

        console.log(`🚀 Beauty Platform Orchestrator running on http://${this.config.server.host}:${this.config.server.port}`);
      });

      // Store server instance for graceful shutdown
      this.server = server;

      // Configure server timeouts
      server.keepAliveTimeout = 65000;
      server.headersTimeout = 66000;

    } catch (error) {
      this.logger.error('Failed to start orchestrator:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  private async gracefulShutdown(signal: string): Promise<void> {
    this.logger.info(`Graceful shutdown initiated by ${signal}`);

    try {
      // Close HTTP server
      if (this.server) {
        this.server.close(() => {
          this.logger.info('HTTP server closed');
        });
      }

      // Shutdown orchestrator
      await this.orchestrator.shutdown();

      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  private server: any;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
    interface Response {
      responseTime?: number;
    }
  }
}

/**
 * Start the orchestrator server
 */
async function main(): Promise<void> {
  const server = new OrchestratorServer();
  await server.start();
}

// Start the server if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start orchestrator server:', error);
    process.exit(1);
  });
}

export { OrchestratorServer };