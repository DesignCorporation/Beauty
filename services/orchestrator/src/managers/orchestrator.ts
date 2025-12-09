/**
 * Main Orchestrator Service
 * Coordinates service management, state persistence, and health monitoring
 */

import { EventEmitter } from 'events';
import {
  ServiceRuntimeState,
  ServiceState,
  ServiceAction,
  OrchestratorConfig,
  ServiceStatusResponse,
  OrchestratorStatusResponse,
  ProcessKillPhase
} from '../types/orchestrator.types';
import {
  ServiceConfig,
  ServiceCriticality,
  calculateStartupOrder,
  getAllServices,
  findServiceById,
  isExternallyManaged
} from '@beauty-platform/service-registry';
import { ProcessManager } from './process-manager';
import { StateManager } from './state-manager';

export class Orchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private processManager: ProcessManager;
  private stateManager: StateManager;
  private services = new Map<string, ServiceRuntimeState>();
  private startTime = new Date();

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.processManager = new ProcessManager(config);
    this.stateManager = new StateManager(config.stateFile);

    // Forward process manager events
    this.processManager.on('stateChange', this.handleStateChange.bind(this));
    this.processManager.on('processExit', this.handleProcessExit.bind(this));
    this.processManager.on('processError', this.handleProcessError.bind(this));
  }

  /**
   * Initialize orchestrator
   */
  async initialize(): Promise<void> {
    console.log('Initializing Beauty Platform Orchestrator...');

    // Initialize state manager
    await this.stateManager.initialize();

    // Load service registry
    await this.loadServices();

    // Restore previous state
    await this.restoreState();

    // Auto-start configured services (critical + explicit autoStart flag)
    await this.autoStartConfiguredServices();

    console.log('Orchestrator initialized successfully');
  }

  /**
   * Start a specific service
   */
  async startService(serviceId: string): Promise<void> {
    const serviceConfig = findServiceById(serviceId);
    if (!serviceConfig) {
      throw new Error(`Service ${serviceId} not found in registry`);
    }

    const runtimeState = this.services.get(serviceId);
    if (!runtimeState) {
      throw new Error(`Runtime state not found for service ${serviceId}`);
    }

    // Check if already starting/running
    if ([ServiceState.STARTING, ServiceState.RUNNING, ServiceState.WARMUP].includes(runtimeState.state)) {
      throw new Error(`Service ${serviceId} is already ${runtimeState.state}`);
    }

    // Check dependencies
    await this.checkDependencies(serviceId);

    // Start the service
    await this.processManager.startService(serviceConfig, runtimeState);

    // Persist state change
    await this.stateManager.updateServiceState(serviceId, runtimeState);

    this.emit('serviceStarted', serviceId);
  }

  /**
   * Stop a specific service
   */
  async stopService(serviceId: string): Promise<void> {
    const runtimeState = this.services.get(serviceId);
    if (!runtimeState) {
      throw new Error(`Runtime state not found for service ${serviceId}`);
    }

    await this.processManager.stopService(serviceId, runtimeState);
    await this.stateManager.updateServiceState(serviceId, runtimeState);

    this.emit('serviceStopped', serviceId);
  }

  /**
   * Restart a specific service
   */
  async restartService(serviceId: string): Promise<void> {
    const serviceConfig = findServiceById(serviceId);
    if (!serviceConfig) {
      throw new Error(`Service ${serviceId} not found in registry`);
    }

    const runtimeState = this.services.get(serviceId);
    if (!runtimeState) {
      throw new Error(`Runtime state not found for service ${serviceId}`);
    }

    await this.processManager.restartService(serviceConfig, runtimeState);
    await this.stateManager.updateServiceState(serviceId, runtimeState);

    this.emit('serviceRestarted', serviceId);
  }

  /**
   * Reset circuit breaker for service
   */
  async resetCircuitBreaker(serviceId: string): Promise<void> {
    const runtimeState = this.services.get(serviceId);
    if (!runtimeState) {
      throw new Error(`Runtime state not found for service ${serviceId}`);
    }

    this.processManager.resetCircuitBreaker(runtimeState);
    await this.stateManager.updateServiceState(serviceId, runtimeState);

    this.emit('circuitBreakerReset', serviceId);
  }

  /**
   * Execute service action
   */
  async executeServiceAction(serviceId: string, action: ServiceAction): Promise<void> {
    switch (action) {
      case ServiceAction.START:
        await this.startService(serviceId);
        break;
      case ServiceAction.STOP:
        await this.stopService(serviceId);
        break;
      case ServiceAction.RESTART:
        await this.restartService(serviceId);
        break;
      case ServiceAction.RESET_CIRCUIT:
        await this.resetCircuitBreaker(serviceId);
        break;
      case ServiceAction.CLEANUP:
        await this.cleanupServiceProcesses(serviceId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Get status of all services
   */
  getStatusAll(): OrchestratorStatusResponse {
    const services: ServiceStatusResponse[] = [];
    let runningCount = 0;
    let healthyCount = 0;

    for (const [serviceId, runtimeState] of this.services) {
      const serviceConfig = findServiceById(serviceId);
      if (!serviceConfig) continue;

      const status = this.buildServiceStatus(serviceId, runtimeState, serviceConfig);
      services.push(status);

      if (status.state === ServiceState.RUNNING) {
        runningCount++;
        if (status.health.isHealthy) {
          healthyCount++;
        }
      }
    }

    return {
      orchestrator: {
        version: '1.2.0',
        uptime: (Date.now() - this.startTime.getTime()) / 1000,
        servicesTotal: this.services.size,
        servicesRunning: runningCount,
        servicesHealthy: healthyCount
      },
      services: services.sort((a, b) => a.serviceId.localeCompare(b.serviceId))
    };
  }

  /**
   * Get status of specific service
   */
  getServiceStatus(serviceId: string): ServiceStatusResponse | null {
    const runtimeState = this.services.get(serviceId);
    const serviceConfig = findServiceById(serviceId);

    if (!runtimeState || !serviceConfig) {
      return null;
    }

    return this.buildServiceStatus(serviceId, runtimeState, serviceConfig);
  }

  /**
   * Get service logs
   */
  getServiceLogs(serviceId: string, lines: number = 50): { stdout: string[], stderr: string[] } {
    const runtimeState = this.services.get(serviceId);
    if (!runtimeState) {
      return { stdout: [], stderr: [] };
    }

    return {
      stdout: runtimeState.logs.stdout.slice(-lines),
      stderr: runtimeState.logs.stderr.slice(-lines)
    };
  }

  /**
   * Get service registry data
   */
  getRegistry(): ServiceConfig[] {
    return getAllServices();
  }

  /**
   * Shutdown orchestrator gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down orchestrator...');

    // Save current state
    await this.stateManager.saveState(this.services);

    // Cleanup process manager
    await this.processManager.cleanup();

    console.log('Orchestrator shutdown complete');
  }

  /**
   * Load services from registry
   */
  private async loadServices(): Promise<void> {
    const allServices = getAllServices();

    for (const serviceConfig of allServices) {
      const isExternal = isExternallyManaged(serviceConfig.id);

      const runtimeState: ServiceRuntimeState = {
        serviceId: serviceConfig.id,
        state: isExternal ? ServiceState.EXTERNAL : ServiceState.STOPPED,
        process: {},
        health: {
          isHealthy: isExternal ? true : false, // External services assumed healthy
          lastCheck: new Date(),
          consecutiveFailures: 0,
          consecutiveSuccesses: isExternal ? 1 : 0 // External services start with success
        },
        circuitBreaker: {
          state: 'closed',
          failures: 0,
          backoffSeconds: isExternal ? 0 : 1 // No backoff for external services
        },
        warmup: {
          isInWarmup: false,
          successfulChecks: isExternal ? 1 : 0, // External services pre-warmed
          requiredChecks: isExternal ? 1 : Math.ceil(serviceConfig.warmupTime / (this.config.healthCheck.interval / 1000))
        },
        autoRestoreAttempts: 0,
        lastStateChange: new Date(),
        dependencies: serviceConfig.dependencies,
        logs: {
          stdout: [],
          stderr: []
        },
        killTracking: {
          phase: ProcessKillPhase.IDLE,
          killAttempts: 0
        }
      };

      this.services.set(serviceConfig.id, runtimeState);
    }

    console.log(`Loaded ${allServices.length} services from registry`);
  }

  /**
   * Restore state from persistence
   */
  private async restoreState(): Promise<void> {
    const persistedStates = await this.stateManager.loadState();

    for (const [serviceId, persistedState] of persistedStates) {
      const runtimeState = this.services.get(serviceId);
      if (!runtimeState) continue;

      // Skip restoring state for external services - they should keep their initialized state
      const isExternal = isExternallyManaged(serviceId);
      if (isExternal) {
        console.log(`Skipping state restoration for external service: ${serviceId}`);
        continue;
      }

      // Apply persisted state
      const partialState = this.stateManager.persistedToRuntime(persistedState, serviceId);
      Object.assign(runtimeState, partialState);

      // If service was running, mark it as stopped for now
      // The orchestrator will decide whether to auto-restart
      if (runtimeState.state === ServiceState.RUNNING || runtimeState.state === ServiceState.STARTING) {
        runtimeState.state = ServiceState.STOPPED;
        delete runtimeState.process.pid;
      }
    }

    console.log(`Restored state for ${persistedStates.size} services`);
  }

  /**
   * Check service dependencies
   */
  private async checkDependencies(serviceId: string): Promise<void> {
    const runtimeState = this.services.get(serviceId);
    if (!runtimeState) return;

    for (const depId of runtimeState.dependencies) {
      const depState = this.services.get(depId);
      const isExternal = isExternallyManaged(depId);

      // For external services, only check if they're marked as EXTERNAL (assume healthy)
      // For internal services, check if they're RUNNING AND HEALTHY (passed warmup)
      const isReady = isExternal
        ? (depState?.state === ServiceState.EXTERNAL)
        : (depState?.state === ServiceState.RUNNING && depState?.health?.isHealthy === true);

      if (!depState || !isReady) {
        const expectedState = isExternal ? 'external and healthy' : 'running and healthy';
        throw new Error(`Dependency ${depId} is not ${expectedState} for service ${serviceId}`);
      }
    }
  }

  /**
   * Build service status response
   */
  private buildServiceStatus(serviceId: string, runtimeState: ServiceRuntimeState, serviceConfig: ServiceConfig): ServiceStatusResponse {
    const processInfo = this.processManager.getProcessInfo(serviceId);
    const isExternal = isExternallyManaged(serviceId);

    const health: ServiceStatusResponse['health'] = {
      isHealthy: isExternal ? true : runtimeState.health.isHealthy,
      lastCheck: runtimeState.health.lastCheck.toISOString(),
      consecutiveFailures: isExternal ? 0 : runtimeState.health.consecutiveFailures
    };

    if (!isExternal) {
      if (typeof runtimeState.health.responseTime === 'number') {
        health.responseTime = runtimeState.health.responseTime;
      }
      if (runtimeState.health.error) {
        health.error = runtimeState.health.error;
      }
    }

    const warmup: ServiceStatusResponse['warmup'] = {
      isInWarmup: isExternal ? false : runtimeState.warmup.isInWarmup,
      progress: isExternal
        ? 100
        : runtimeState.warmup.requiredChecks > 0
          ? Math.round((runtimeState.warmup.successfulChecks / runtimeState.warmup.requiredChecks) * 100)
          : 0,
      successfulChecks: isExternal ? 0 : runtimeState.warmup.successfulChecks,
      requiredChecks: isExternal ? 0 : runtimeState.warmup.requiredChecks
    };

    const circuitBreaker: ServiceStatusResponse['circuitBreaker'] = {
      state: isExternal ? 'closed' : runtimeState.circuitBreaker.state,
      failures: isExternal ? 0 : runtimeState.circuitBreaker.failures,
      backoffSeconds: isExternal ? 0 : runtimeState.circuitBreaker.backoffSeconds
    };

    if (!isExternal) {
      const nextRetryIso = runtimeState.circuitBreaker.nextRetry?.toISOString();
      if (nextRetryIso) {
        circuitBreaker.nextRetry = nextRetryIso;
      }
    }

    const status: ServiceStatusResponse = {
      serviceId,
      name: serviceConfig.name,
      state: isExternal ? ServiceState.EXTERNAL : runtimeState.state,
      managed: serviceConfig.run?.managed || 'internal',
      cwd: serviceConfig.run?.cwd || serviceConfig.directory, // fallback to legacy directory
      health,
      warmup,
      circuitBreaker,
      dependencies: runtimeState.dependencies,
      autoRestoreAttempts: isExternal ? 0 : runtimeState.autoRestoreAttempts,
      lastStateChange: runtimeState.lastStateChange.toISOString()
    };

    if (!isExternal) {
      if (processInfo?.pid !== undefined) {
        status.pid = processInfo.pid;
      }
      if (processInfo?.uptime !== undefined) {
        status.uptime = processInfo.uptime;
      }
    }

    return status;
  }

  /**
   * Auto-start services based on registry configuration
   */
  private async autoStartConfiguredServices(): Promise<void> {
    const startupOrder = calculateStartupOrder();

    for (const { serviceId } of startupOrder) {
      const serviceConfig = findServiceById(serviceId);
      if (!serviceConfig) continue;

      if (!this.shouldAutoStart(serviceConfig)) {
        continue;
      }

      const runtimeState = this.services.get(serviceId);
      if (!runtimeState) {
        continue;
      }

      if ([ServiceState.RUNNING, ServiceState.STARTING, ServiceState.WARMUP].includes(runtimeState.state)) {
        continue;
      }

      try {
        // Применяем startDelay если указан
        if (serviceConfig.startDelay && serviceConfig.startDelay > 0) {
          console.log(`[AutoStart] Delaying start of ${serviceId} by ${serviceConfig.startDelay} seconds...`);
          await new Promise(resolve => setTimeout(resolve, serviceConfig.startDelay! * 1000));
        }

        await this.startService(serviceId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[AutoStart] Failed to start ${serviceId}: ${message}`);
      }
    }
  }

  /**
   * Determine if a service should auto-start
   */
  private shouldAutoStart(serviceConfig: ServiceConfig): boolean {
    if (serviceConfig.run?.managed === 'external') {
      return false;
    }

    if (serviceConfig.run?.autoStart !== undefined) {
      return serviceConfig.run.autoStart;
    }

    return serviceConfig.criticality === ServiceCriticality.Critical;
  }

  /**
   * Handle state change events from process manager
   */
  private async handleStateChange(serviceId: string, runtimeState: ServiceRuntimeState): Promise<void> {
    this.emit('stateChange', serviceId, runtimeState.state);

    // Persist state changes
    try {
      await this.stateManager.updateServiceState(serviceId, runtimeState);
    } catch (error) {
      console.error(`Failed to persist state for service ${serviceId}:`, error);
    }

    // When a service becomes healthy, try to start dependent services
    if (runtimeState.state === ServiceState.RUNNING && runtimeState.health?.isHealthy) {
      // Reset auto-restore attempts counter on successful health
      if (runtimeState.autoRestoreAttempts && runtimeState.autoRestoreAttempts > 0) {
        console.log(`[Circuit Breaker Reset] Service ${serviceId} is healthy. Resetting restart attempts counter (was: ${runtimeState.autoRestoreAttempts})`);
        runtimeState.autoRestoreAttempts = 0;
      }

      await this.startDependentServices(serviceId);
    }
  }

  /**
   * Start services that depend on this service
   */
  private async startDependentServices(serviceId: string): Promise<void> {
    // Find all services that depend on this service
    for (const [depServiceId, depRuntimeState] of this.services.entries()) {
      if (!depRuntimeState.dependencies.includes(serviceId)) {
        continue; // Skip if this service is not a dependency
      }

      // Skip if already running or starting
      if ([ServiceState.RUNNING, ServiceState.STARTING, ServiceState.WARMUP].includes(depRuntimeState.state)) {
        continue;
      }

      const serviceConfig = findServiceById(depServiceId);
      if (!serviceConfig || !this.shouldAutoStart(serviceConfig)) {
        continue;
      }

      // Try to start the dependent service
      try {
        console.log(`[DependencyReady] Starting ${depServiceId} because dependency ${serviceId} is now healthy`);
        await this.startService(depServiceId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[DependencyReady] Cannot start ${depServiceId} yet: ${message}`);
      }
    }
  }

  /**
   * Handle process exit events with auto-restart logic
   */
  private async handleProcessExit(serviceId: string, exitCode: number | null, signal: string | null): Promise<void> {
    console.log(`Process ${serviceId} exited with code ${exitCode}, signal ${signal}`);
    this.emit('processExit', serviceId, exitCode, signal);

    const runtimeState = this.services.get(serviceId);
    if (!runtimeState || runtimeState.state === ServiceState.STOPPING) {
      return; // Don't auto-restart if manually stopped
    }

    const serviceConfig = findServiceById(serviceId);
    if (!serviceConfig) {
      return;
    }

    // Check if service should be auto-restarted
    const shouldRestart = this.shouldAutoStart(serviceConfig);
    if (!shouldRestart) {
      console.log(`Service ${serviceId} exited but auto-restart is disabled`);
      return;
    }

    // Circuit breaker: max 10 restart attempts
    const MAX_RESTART_ATTEMPTS = 10;
    const currentAttempts = runtimeState.autoRestoreAttempts || 0;

    if (currentAttempts >= MAX_RESTART_ATTEMPTS) {
      console.error(`[Circuit Breaker] Service ${serviceId} reached max restart attempts (${MAX_RESTART_ATTEMPTS}). Giving up.`);
      runtimeState.state = ServiceState.ERROR;
      return;
    }

    // Exponential backoff: 5s, 10s, 20s, 40s, ... max 60s
    const baseDelay = 5000;
    const maxDelay = 60000;
    const backoffDelay = Math.min(baseDelay * Math.pow(2, currentAttempts), maxDelay);

    console.log(`[Auto-Restart] Service ${serviceId} exited unexpectedly. Attempt ${currentAttempts + 1}/${MAX_RESTART_ATTEMPTS}. Restarting in ${backoffDelay}ms...`);

    setTimeout(async () => {
      try {
        await this.startService(serviceId);
        runtimeState.autoRestoreAttempts = (runtimeState.autoRestoreAttempts || 0) + 1;
        console.log(`[Auto-Restart] Service ${serviceId} restarted successfully`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Auto-Restart] Failed to restart service ${serviceId}:`, message);
        runtimeState.autoRestoreAttempts = (runtimeState.autoRestoreAttempts || 0) + 1;
      }
    }, backoffDelay);
  }

  /**
   * Handle process error events
   */
  private handleProcessError(serviceId: string, error: Error): void {
    console.error(`Process error for ${serviceId}:`, error);
    this.emit('processError', serviceId, error);
  }

  /**
   * Cleanup service processes (for API calls)
   */
  async cleanupServiceProcesses(serviceId: string): Promise<void> {
    console.log(`[ORCHESTRATOR] Initiating process cleanup for service ${serviceId}`);
    await this.processManager.cleanupServiceProcesses(serviceId);
  }

  /**
   * ✨ NEW: Get detailed process information for a service
   * Returns main process info, child processes, and kill tracking status
   */
  getServiceProcesses(serviceId: string) {
    const runtimeState = this.services.get(serviceId);
    if (!runtimeState) return null;

    const processInfo = this.processManager.getProcessInfo(serviceId);

    return {
      serviceId,
      state: runtimeState.state,
      mainProcess: {
        pid: processInfo?.pid,
        alive: processInfo?.pid ? this.isProcessAlive(processInfo.pid) : false,
        startTime: processInfo?.startTime,
        uptime: processInfo?.uptime
      },
      killTracking: runtimeState.killTracking
    };
  }

  /**
   * ✨ NEW: Get kill status for a service
   * Returns current kill phase and tracking information
   */
  getServiceKillStatus(serviceId: string) {
    const runtimeState = this.services.get(serviceId);
    if (!runtimeState) return null;

    return {
      serviceId,
      killTracking: runtimeState.killTracking
    };
  }

  /**
   * ✨ NEW: Manually kill service process (admin action from UI)
   * Can perform graceful (SIGTERM) or force kill (SIGKILL)
   */
  async killServiceProcess(serviceId: string, force: boolean = false): Promise<{ killed: boolean; message: string }> {
    const runtimeState = this.services.get(serviceId);
    if (!runtimeState) {
      throw new Error(`Service ${serviceId} not found`);
    }

    const processInfo = this.processManager.getProcessInfo(serviceId);
    if (!processInfo?.pid) {
      throw new Error(`No active process for service ${serviceId}`);
    }

    try {
      if (force) {
        // Force kill: use SIGKILL
        console.log(`[ADMIN-KILL] Force killing process ${processInfo.pid} for service ${serviceId}`);
        process.kill(processInfo.pid, 'SIGKILL');
        runtimeState.killTracking.phase = ProcessKillPhase.SIGKILL_SENT;
        runtimeState.killTracking.sigKillSentAt = new Date();
        runtimeState.killTracking.killAttempts++;
      } else {
        // Graceful kill: use SIGTERM
        console.log(`[ADMIN-KILL] Gracefully killing process ${processInfo.pid} for service ${serviceId}`);
        process.kill(processInfo.pid, 'SIGTERM');
        runtimeState.killTracking.phase = ProcessKillPhase.SIGTERM_SENT;
        runtimeState.killTracking.sigTermSentAt = new Date();
        runtimeState.killTracking.killAttempts++;
      }

      await this.stateManager.updateServiceState(serviceId, runtimeState);
      return {
        killed: true,
        message: `Process ${processInfo.pid} killed with ${force ? 'SIGKILL' : 'SIGTERM'}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      runtimeState.killTracking.lastKillError = message;
      runtimeState.killTracking.killAttempts++;
      console.error(`[ADMIN-KILL] Failed to kill process for ${serviceId}:`, error);
      throw new Error(`Failed to kill process: ${message}`);
    }
  }

  /**
   * ✨ NEW: Check if process is alive (exposed from ProcessManager)
   * Uses kill -0 to verify process existence without killing
   */
  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
