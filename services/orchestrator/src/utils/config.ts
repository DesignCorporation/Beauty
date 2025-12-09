/**
 * Configuration Management
 * Load and validate orchestrator configuration
 */

import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';
import { OrchestratorConfig } from '../types/orchestrator.types';

// Load environment variables from project root first, then service-local overrides
const projectRoot = path.resolve(process.cwd(), '..', '..');
config({ path: path.join(projectRoot, '.env') });
config({ path: path.join(projectRoot, '.env.development') });
config({ path: path.join(process.cwd(), '.env') });
config();

/**
 * Environment configuration schema
 */
const EnvConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ORCHESTRATOR_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default('6030'),
  ORCHESTRATOR_HOST: z.string().default('localhost'),
  STATE_FILE_PATH: z.string().default('/root/projects/beauty/logs/orchestrator/state'),
  LOGS_DIR: z.string().default('/root/projects/beauty/logs/orchestrator'),
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).pipe(z.number().min(1000)).default('30000'),
  HEALTH_CHECK_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000)).default('5000'),
  HEALTH_CHECK_RETRIES: z.string().transform(Number).pipe(z.number().min(0)).default('3'),
  CIRCUIT_BREAKER_THRESHOLD: z.string().transform(Number).pipe(z.number().min(1)).default('5'),
  CIRCUIT_BREAKER_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000)).default('60000'),
  CIRCUIT_BREAKER_BACKOFF_MULTIPLIER: z.string().transform(Number).pipe(z.number().min(1)).default('2'),
  CIRCUIT_BREAKER_MAX_BACKOFF: z.string().transform(Number).pipe(z.number().min(1000)).default('300000'),
  PROCESS_KILL_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000)).default('10000'),
  PROCESS_LOG_LINES: z.string().transform(Number).pipe(z.number().min(10)).default('100')
});

/**
 * Load and validate configuration
 */
export function loadConfig(): OrchestratorConfig {
  // Use default config as fallback
  const defaults = getDefaultConfig();

  const env = EnvConfigSchema.parse({
    NODE_ENV: process.env.NODE_ENV || 'development',
    ORCHESTRATOR_PORT: process.env.ORCHESTRATOR_PORT || defaults.server.port.toString(),
    ORCHESTRATOR_HOST: process.env.ORCHESTRATOR_HOST || defaults.server.host,
    STATE_FILE_PATH: process.env.STATE_FILE_PATH || defaults.stateFile,
    LOGS_DIR: process.env.LOGS_DIR || defaults.logsDir,
    HEALTH_CHECK_INTERVAL: process.env.HEALTH_CHECK_INTERVAL || defaults.healthCheck.interval.toString(),
    HEALTH_CHECK_TIMEOUT: process.env.HEALTH_CHECK_TIMEOUT || defaults.healthCheck.timeout.toString(),
    HEALTH_CHECK_RETRIES: process.env.HEALTH_CHECK_RETRIES || defaults.healthCheck.retries.toString(),
    CIRCUIT_BREAKER_THRESHOLD: process.env.CIRCUIT_BREAKER_THRESHOLD || defaults.circuitBreaker.threshold.toString(),
    CIRCUIT_BREAKER_TIMEOUT: process.env.CIRCUIT_BREAKER_TIMEOUT || defaults.circuitBreaker.timeout.toString(),
    CIRCUIT_BREAKER_BACKOFF_MULTIPLIER: process.env.CIRCUIT_BREAKER_BACKOFF_MULTIPLIER || defaults.circuitBreaker.backoffMultiplier.toString(),
    CIRCUIT_BREAKER_MAX_BACKOFF: process.env.CIRCUIT_BREAKER_MAX_BACKOFF || defaults.circuitBreaker.maxBackoff.toString(),
    PROCESS_KILL_TIMEOUT: process.env.PROCESS_KILL_TIMEOUT || defaults.process.killTimeout.toString(),
    PROCESS_LOG_LINES: process.env.PROCESS_LOG_LINES || defaults.process.logLines.toString()
  });

  const config: OrchestratorConfig = {
    server: {
      port: env.ORCHESTRATOR_PORT,
      host: env.ORCHESTRATOR_HOST
    },
    stateFile: env.STATE_FILE_PATH,
    logsDir: env.LOGS_DIR,
    healthCheck: {
      interval: env.HEALTH_CHECK_INTERVAL,
      timeout: env.HEALTH_CHECK_TIMEOUT,
      retries: env.HEALTH_CHECK_RETRIES
    },
    circuitBreaker: {
      threshold: env.CIRCUIT_BREAKER_THRESHOLD,
      timeout: env.CIRCUIT_BREAKER_TIMEOUT,
      backoffMultiplier: env.CIRCUIT_BREAKER_BACKOFF_MULTIPLIER,
      maxBackoff: env.CIRCUIT_BREAKER_MAX_BACKOFF
    },
    process: {
      killTimeout: env.PROCESS_KILL_TIMEOUT,
      logLines: env.PROCESS_LOG_LINES
    }
  };

  return config;
}

/**
 * Get default configuration for development
 */
export function getDefaultConfig(): OrchestratorConfig {
  return {
    server: {
      port: 6030,
      host: 'localhost'
    },
    stateFile: '/root/projects/beauty/logs/orchestrator/state',
    logsDir: '/root/projects/beauty/logs/orchestrator',
    healthCheck: {
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retries: 3
    },
    circuitBreaker: {
      threshold: 5,          // 5 failures
      timeout: 60000,        // 1 minute
      backoffMultiplier: 2,  // Double backoff each time
      maxBackoff: 300000     // Max 5 minutes
    },
    process: {
      killTimeout: 10000,    // 10 seconds
      logLines: 100          // Keep 100 lines in memory
    }
  };
}
