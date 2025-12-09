/**
 * Orchestrator Type Definitions
 * Service state management and process control types
 */

import { z } from 'zod';

// Service State Enums
export enum ServiceState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  UNHEALTHY = 'unhealthy',
  CIRCUIT_OPEN = 'circuit_open',
  WARMUP = 'warmup',
  ERROR = 'error',
  EXTERNAL = 'external' // For externally managed services
}

export enum ServiceAction {
  START = 'start',
  STOP = 'stop',
  RESTART = 'restart',
  RESET_CIRCUIT = 'resetCircuit',
  CLEANUP = 'cleanup'
}

// Process Kill Phase Tracking
export enum ProcessKillPhase {
  IDLE = 'idle',
  SIGTERM_SENT = 'sigterm_sent',
  SIGTERM_WAIT = 'sigterm_wait',
  SIGKILL_SENT = 'sigkill_sent',
  KILLED = 'killed',
  ZOMBIE = 'zombie'
}

// Process Kill Tracking Information
export interface ProcessKillTracking {
  phase: ProcessKillPhase;
  sigTermSentAt?: Date;
  sigKillSentAt?: Date;
  killAttempts: number;
  lastKillError?: string;
}

// Process Information
export interface ProcessInfo {
  pid?: number;
  startTime?: Date;
  uptime?: number;
  exitCode?: number;
  memory?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
}

// Health Check Information
export interface HealthInfo {
  isHealthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  responseTime?: number;
  error?: string;
}

// Circuit Breaker State
export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half_open';
  failures: number;
  lastFailure?: Date;
  nextRetry?: Date;
  backoffSeconds: number;
}

// Service Runtime State
export interface ServiceRuntimeState {
  serviceId: string;
  state: ServiceState;
  process: ProcessInfo;
  health: HealthInfo;
  circuitBreaker: CircuitBreakerState;
  warmup: {
    isInWarmup: boolean;
    successfulChecks: number;
    requiredChecks: number;
    startTime?: Date;
  };
  autoRestoreAttempts: number;
  lastStateChange: Date;
  dependencies: string[];
  logs: {
    stdout: string[];
    stderr: string[];
  };
  killTracking: ProcessKillTracking;
}

// Persistence State (for JSON storage)
export interface PersistedServiceState {
  serviceId: string;
  state: ServiceState;
  pid?: number;
  startTime?: string; // ISO string
  managed?: 'internal' | 'external';
  cwd?: string;
  circuitBreaker: {
    state: string;
    failures: number;
    lastFailure?: string;
    nextRetry?: string;
    backoffSeconds: number;
  };
  autoRestoreAttempts: number;
  lastStateChange: string; // ISO string
}

// API Request/Response Types
export const ServiceActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'resetCircuit', 'cleanup'])
});

export type ServiceActionRequest = z.infer<typeof ServiceActionSchema>;

// Status Response Types
export interface ServiceStatusResponse {
  serviceId: string;
  name: string;
  state: ServiceState;
  pid?: number;
  uptime?: number;
  managed: 'internal' | 'external';
  cwd: string;
  health: {
    isHealthy: boolean;
    lastCheck: string;
    consecutiveFailures: number;
    responseTime?: number;
    error?: string;
  };
  warmup: {
    isInWarmup: boolean;
    progress: number; // 0-100
    successfulChecks: number;
    requiredChecks: number;
  };
  circuitBreaker: {
    state: string;
    failures: number;
    nextRetry?: string;
    backoffSeconds: number;
  };
  dependencies: string[];
  autoRestoreAttempts: number;
  lastStateChange: string;
}

export interface OrchestratorStatusResponse {
  orchestrator: {
    version: string;
    uptime: number;
    servicesTotal: number;
    servicesRunning: number;
    servicesHealthy: number;
  };
  services: ServiceStatusResponse[];
}

export interface LogsResponse {
  serviceId: string;
  logs: {
    stdout: string[];
    stderr: string[];
  };
  timestamp: string;
}

// Configuration Types
export interface OrchestratorConfig {
  server: {
    port: number;
    host: string;
  };
  stateFile: string;
  logsDir: string;
  healthCheck: {
    interval: number; // ms
    timeout: number; // ms
    retries: number;
  };
  circuitBreaker: {
    threshold: number; // failures before opening
    timeout: number; // ms before trying half-open
    backoffMultiplier: number;
    maxBackoff: number; // ms
  };
  process: {
    killTimeout: number; // ms to wait for graceful shutdown
    logLines: number; // lines to keep in memory
  };
}