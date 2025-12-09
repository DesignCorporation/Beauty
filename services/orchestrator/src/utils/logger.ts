/**
 * Winston Logger Configuration
 * Structured logging for orchestrator service
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Create and configure Winston logger
 */
export function createLogger(logsDir: string): winston.Logger {
  // Ensure logs directory exists
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    console.warn(`Failed to create logs directory ${logsDir}:`, error);
  }

  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  );

  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
      let logMessage = `${timestamp} [${level}]`;

      if (service) {
        logMessage += ` [${service}]`;
      }

      logMessage += `: ${message}`;

      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }

      return logMessage;
    })
  );

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'orchestrator' },
    transports: [
      // Console transport for development
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
      }),

      // File transport for general logs
      new winston.transports.File({
        filename: path.join(logsDir, 'orchestrator.log'),
        level: 'info',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      }),

      // File transport for error logs
      new winston.transports.File({
        filename: path.join(logsDir, 'orchestrator-error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 3,
        tailable: true
      }),

      // File transport for debug logs
      new winston.transports.File({
        filename: path.join(logsDir, 'orchestrator-debug.log'),
        level: 'debug',
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 2,
        tailable: true
      })
    ],

    // Handle uncaught exceptions and promise rejections
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'orchestrator-exceptions.log')
      })
    ],

    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'orchestrator-rejections.log')
      })
    ]
  });

  return logger;
}

/**
 * Create child logger for specific service
 */
export function createServiceLogger(parentLogger: winston.Logger, serviceId: string): winston.Logger {
  return parentLogger.child({ serviceId });
}

/**
 * Express winston middleware configuration
 */
export function createExpressLoggerMiddleware(logger: winston.Logger) {
  return require('express-winston').logger({
    winstonInstance: logger,
    meta: true,
    msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
    expressFormat: false,
    colorize: false,
    ignoreRoute: (req: any, _res: any) => {
      // Ignore health check requests to reduce noise
      return req.url === '/orchestrator/health';
    },
    requestWhitelist: ['url', 'method', 'body', 'query'],
    responseWhitelist: ['statusCode'],
    dynamicMeta: (req: any, res: any) => {
      return {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        responseTime: res.responseTime
      };
    }
  });
}

/**
 * Express winston error middleware configuration
 */
export function createExpressErrorMiddleware(logger: winston.Logger) {
  return require('express-winston').errorLogger({
    winstonInstance: logger,
    meta: true,
    msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{err.message}}',
    expressFormat: false,
    colorize: false,
    requestWhitelist: ['url', 'method', 'body', 'query'],
    responseWhitelist: ['statusCode'],
    dynamicMeta: (req: any, _res: any, err: any) => {
      return {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        stack: err.stack
      };
    }
  });
}