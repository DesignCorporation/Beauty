/**
 * Process Manager
 * Manages service processes with spawn/kill, health checks, and circuit breaker
 */

import { execa, execaSync, ExecaChildProcess } from 'execa';
import { EventEmitter } from 'events';
import {
  ServiceRuntimeState,
  ServiceState,
  ProcessInfo,
  OrchestratorConfig,
  ProcessKillPhase,
  ProcessKillTracking,
  HealthInfo
} from '../types/orchestrator.types';
import {
  ServiceConfig,
  isExternallyManaged,
  getServiceWorkingDirectory,
  findServiceById,
  buildServiceEnvironment
} from '@beauty-platform/service-registry';
import * as path from 'path';

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, ExecaChildProcess>();
  private healthTimers = new Map<string, NodeJS.Timeout>();
  private config: OrchestratorConfig;
  private startingServices = new Set<string>();
  private stoppingServices = new Set<string>();

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
  }

  /**
   * Start a service process
   */
  async startService(serviceConfig: ServiceConfig, runtimeState: ServiceRuntimeState): Promise<void> {
    const { id: serviceId, run } = serviceConfig;

    // Check if service is externally managed
    if (isExternallyManaged(serviceId)) {
      throw new Error(`Service ${serviceId} is externally managed and cannot be started by orchestrator`);
    }

    // 🛡️ MUTEX PROTECTION: Prevent Race Condition
    if (this.startingServices.has(serviceId)) {
      throw new Error(`Service ${serviceId} is already starting`);
    }

    this.startingServices.add(serviceId);

    try {
      if (this.processes.has(serviceId)) {
        throw new Error(`Service ${serviceId} is already running`);
      }

      if (!run) {
        throw new Error(`Service ${serviceId} has no run configuration`);
      }
      // 🆕 ALWAYS CLEAR ALL SERVICE PROCESSES BEFORE STARTING (prevents conflicts)
      await this.clearServiceProcesses(serviceId, serviceConfig.port);

      // Update state to starting
      runtimeState.state = ServiceState.STARTING;
      runtimeState.lastStateChange = new Date();
      runtimeState.warmup.isInWarmup = true;
      runtimeState.warmup.startTime = new Date();
      runtimeState.warmup.successfulChecks = 0;
      runtimeState.warmup.requiredChecks = Math.ceil(serviceConfig.warmupTime / (this.config.healthCheck.interval / 1000));

      this.emit('stateChange', serviceId, runtimeState);

      // Get command and args from run config
      let { command } = run;
      const { args } = run;

      // Replace 'pnpm' command with full path if needed
      if (command === 'pnpm') {
        const pnpmPath = this.findPnpmExecutable();
        if (pnpmPath) {
          command = pnpmPath;
          console.log(`[PNPM] Using full path: ${command}`);
        }
      }

      // Get working directory and environment
      const projectRoot = path.resolve(process.cwd(), '../..'); // Go up from services/orchestrator to project root
      const workingDirectory = getServiceWorkingDirectory(serviceConfig, projectRoot);
      const serviceEnvironment = buildServiceEnvironment(serviceConfig, process.env);

      // Debug logging
      console.log(`[DEBUG] Service: ${serviceId}`);
      console.log(`[DEBUG] Project Root: ${projectRoot}`);
      console.log(`[DEBUG] Working Directory: ${workingDirectory}`);
      console.log(`[DEBUG] Command: ${command} ${args.join(' ')}`);

      // Augment PATH for package managers like pnpm
      const augmentedPath = this.augmentPathForPackageManagers(process.env.PATH || '');

      // Start process with new run configuration
      const childProcess = execa(command, args, {
        cwd: workingDirectory,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...serviceEnvironment,
          PATH: augmentedPath,
          NODE_ENV: process.env.NODE_ENV || 'development'
        },
        cleanup: true,
        killSignal: 'SIGTERM'
      });

      this.processes.set(serviceId, childProcess);

      // Update process info
      const processInfo: ProcessInfo = {
        startTime: new Date(),
        uptime: 0
      };
      if (typeof childProcess.pid === 'number') {
        processInfo.pid = childProcess.pid;
      }
      runtimeState.process = processInfo;

      // Handle process events
      this.setupProcessEvents(serviceId, childProcess, runtimeState);

      // Start health monitoring after warmup delay
      setTimeout(() => {
        this.startHealthMonitoring(serviceId, serviceConfig, runtimeState);
      }, serviceConfig.warmupTime * 1000);

      console.log(`Started service ${serviceId} with PID ${childProcess.pid}`);

    } catch (error) {
      runtimeState.state = ServiceState.ERROR;
      runtimeState.lastStateChange = new Date();
      this.emit('stateChange', serviceId, runtimeState);
      throw new Error(`Failed to start service ${serviceId}: ${error}`);
    } finally {
      // 🛡️ MUTEX CLEANUP: Always remove from startingServices
      this.startingServices.delete(serviceId);
    }
  }

  /**
   * Stop a service process
   */
  async stopService(serviceId: string, runtimeState: ServiceRuntimeState): Promise<void> {
    // Check if service is externally managed
    if (isExternallyManaged(serviceId)) {
      throw new Error(`Service ${serviceId} is externally managed and cannot be stopped by orchestrator`);
    }

    // 🛡️ MUTEX PROTECTION: Prevent concurrent stops
    if (this.stoppingServices.has(serviceId)) {
      return; // Already stopping, just return
    }
    this.stoppingServices.add(serviceId);

    try {
      const childProcess = this.processes.get(serviceId);
      const serviceConfig = findServiceById(serviceId);

      if (!childProcess) {
        runtimeState.state = ServiceState.STOPPED;
        runtimeState.lastStateChange = new Date();
        delete runtimeState.process.pid;
        this.emit('stateChange', serviceId, runtimeState);
        return;
      }

      runtimeState.state = ServiceState.STOPPING;
      runtimeState.lastStateChange = new Date();

      // 🆕 Initialize kill tracking
      runtimeState.killTracking = {
        phase: ProcessKillPhase.SIGTERM_SENT,
        killAttempts: 0
      };

      this.emit('stateChange', serviceId, runtimeState);

      // Stop health monitoring
      this.stopHealthMonitoring(serviceId);

      // 🆕 Reliable process termination with verification
      const pid = childProcess.pid;
      if (pid) {
        const killResult = await this.killProcessReliable(pid, serviceId, this.config.process.killTimeout, runtimeState);

        // Update kill tracking with final result
        const killTracking: ProcessKillTracking = {
          phase: killResult.phase,
          killAttempts: killResult.attempts
        };

        if (!killResult.success) {
          killTracking.lastKillError = `Failed to kill process: ${killResult.phase}`;
        }

        runtimeState.killTracking = killTracking;

        // Log kill result
        if (killResult.success) {
          console.log(`[KILL-${serviceId}] Process killed successfully in ${killResult.attempts} attempt(s)`);
        } else {
          console.error(`[KILL-${serviceId}] WARNING: Process may still be alive! Phase: ${killResult.phase}, Attempts: ${killResult.attempts}`);
        }

        this.emit('stateChange', serviceId, runtimeState);
      }

      this.processes.delete(serviceId);

      // Additional cleanup: clear port/processes by name
      await this.clearServiceProcesses(serviceId, serviceConfig?.port);

      // Ensure port is free
      if (serviceConfig?.port) {
        await this.ensurePortFree(serviceConfig.port);
      }

      // Update state
      runtimeState.state = ServiceState.STOPPED;
      delete runtimeState.process.pid;
      runtimeState.process.uptime = 0;
      runtimeState.lastStateChange = new Date();

      this.emit('stateChange', serviceId, runtimeState);
      console.log(`Stopped service ${serviceId}`);

    } finally {
      this.stoppingServices.delete(serviceId);
    }
  }

  /**
   * Restart a service
   */
  async restartService(serviceConfig: ServiceConfig, runtimeState: ServiceRuntimeState): Promise<void> {
    const serviceId = serviceConfig.id;

    // Check if service is externally managed
    if (isExternallyManaged(serviceId)) {
      throw new Error(`Service ${serviceId} is externally managed and cannot be restarted by orchestrator`);
    }

    // 🛡️ MUTEX PROTECTION: Prevent concurrent restarts
    if (this.startingServices.has(serviceId)) {
      throw new Error(`Service ${serviceId} is already (re)starting`);
    }
    this.startingServices.add(serviceId);

    try {
      await this.stopService(serviceId, runtimeState);
      await this.startService(serviceConfig, runtimeState);
    } finally {
      this.startingServices.delete(serviceId);
    }
  }

  /**
   * Get process information
   */
  getProcessInfo(serviceId: string): ProcessInfo | null {
    const childProcess = this.processes.get(serviceId);
    if (!childProcess || !childProcess.pid) return null;

    const startTime = this.getProcessStartTime(childProcess.pid);
    const uptime = startTime ? (Date.now() - startTime.getTime()) / 1000 : 0;

    const info: ProcessInfo = { uptime };

    if (typeof childProcess.pid === 'number') {
      info.pid = childProcess.pid;
    }
    if (startTime) {
      info.startTime = startTime;
    }
    const memory = this.getProcessMemory(childProcess.pid);
    if (memory) {
      info.memory = memory;
    }

    return info;
  }

  /**
   * Check if service is running
   */
  isServiceRunning(serviceId: string): boolean {
    const childProcess = this.processes.get(serviceId);
    return childProcess !== undefined && childProcess.pid !== undefined && !childProcess.killed;
  }

  /**
   * Get service logs
   */
  getServiceLogs(_serviceId: string, _lines: number = 50): { stdout: string[], stderr: string[] } {
    // For now, return empty logs - in production this would read from log files
    // This is a simplified implementation
    return {
      stdout: [],
      stderr: []
    };
  }

  /**
   * Reset circuit breaker for service
   */
  resetCircuitBreaker(runtimeState: ServiceRuntimeState): void {
    runtimeState.circuitBreaker = {
      state: 'closed',
      failures: 0,
      backoffSeconds: 1
    };

    if (runtimeState.state === ServiceState.CIRCUIT_OPEN) {
      runtimeState.state = ServiceState.STOPPED;
      runtimeState.lastStateChange = new Date();
    }
  }

  /**
   * Cleanup all processes
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up all processes...');

    // Stop all health monitoring
    for (const timer of this.healthTimers.values()) {
      clearInterval(timer);
    }
    this.healthTimers.clear();

    // Kill all processes
    const promises = Array.from(this.processes.entries()).map(async ([serviceId, childProcess]) => {
      try {
        childProcess.kill('SIGTERM');
        await childProcess.catch(() => {}); // Ignore errors
      } catch (error) {
        console.error(`Error killing process ${serviceId}:`, error);
      }
    });

    await Promise.all(promises);
    this.processes.clear();
  }

  /**
   * Find pnpm executable path
   */
  private findPnpmExecutable(): string | null {
    // Try locations in order of preference
    const possiblePaths = [
      // 1. PNPM_HOME (recommended)
      process.env.PNPM_HOME ? path.join(process.env.PNPM_HOME, 'pnpm') : null,
      // 2. System locations
      '/usr/local/bin/pnpm',
      '/usr/bin/pnpm',
      // 3. Our symlink as fallback
      '/root/bin/pnpm'
    ].filter(Boolean);

    for (const pnpmPath of possiblePaths) {
      try {
        require('fs').accessSync(pnpmPath, require('fs').constants.X_OK);
        console.log(`[PNPM] Found executable: ${pnpmPath}`);
        return pnpmPath;
      } catch (error) {
        // File doesn't exist or not executable, try next
        continue;
      }
    }

    // Last resort: try to detect via which
    try {
      const result = execaSync('which', ['pnpm'], { encoding: 'utf8' });
      if (result.stdout) {
        const detectedPath = result.stdout.trim();
        console.log(`[PNPM] Detected via which: ${detectedPath}`);
        return detectedPath;
      }
    } catch (error) {
      // which command failed
    }

    console.log(`[PNPM] No executable found, falling back to 'pnpm' command`);
    return null;
  }

  /**
   * Augment PATH environment variable for package managers
   * Adds common locations for pnpm, npm, yarn etc.
   */
  private augmentPathForPackageManagers(currentPath: string): string {
    // Detect pnpm directory
    let pnpmPath = process.env.PNPM_HOME;

    console.log(`[PATH DEBUG] PNPM_HOME from env: ${pnpmPath}`);

    if (!pnpmPath) {
      // Fallback: try to detect pnpm location
      try {
        const result = execaSync('which', ['pnpm'], { encoding: 'utf8' });
        if (result.stdout) {
          pnpmPath = path.dirname(result.stdout.trim());
          console.log(`[PATH DEBUG] pnpm detected via which: ${pnpmPath}`);
        }
      } catch (error) {
        // Last fallback: common pnpm location
        pnpmPath = '/root/.local/share/pnpm';
        console.log(`[PATH DEBUG] using fallback path: ${pnpmPath}`);
      }
    }

    const additionalPaths = [
      pnpmPath,                             // pnpm directory (dynamic detection)
      '/usr/local/bin',                     // common binary location
      '/usr/bin',                           // system binaries
      '/bin',                               // core system binaries
      path.join(process.env.HOME || '/root', '.local/bin'), // user local binaries
      '/opt/node/bin'                       // Node.js install location
    ].filter((p): p is string => Boolean(p)); // Remove any undefined paths

    const pathSegments = currentPath.split(':').filter(Boolean);

    // Add missing paths (prioritize pnpm path)
    for (const additionalPath of additionalPaths) {
      if (!pathSegments.includes(additionalPath)) {
        pathSegments.unshift(additionalPath);
      }
    }

    const finalPath = pathSegments.join(':');
    console.log(`[PATH DEBUG] Original PATH: ${currentPath}`);
    console.log(`[PATH DEBUG] Augmented PATH: ${finalPath}`);

    return finalPath;
  }

  /**
   * Clear all processes for specific service (both port and process name cleanup)
   */
  private async clearServiceProcesses(serviceId: string, port?: number): Promise<void> {
    try {
      console.log(`[SERVICE CLEANUP] Cleaning all processes for service ${serviceId}`);

      // Step 1: Kill processes by port (if provided)
      if (port) {
        await this.killProcessesByPort(port, serviceId);
      }

      // Step 2: Kill processes by service name patterns
      await this.killProcessesByServiceName(serviceId);

      // Step 3: Wait for processes to fully terminate
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log(`[SERVICE CLEANUP] Service ${serviceId} processes cleared`);
    } catch (error) {
      console.warn(`[SERVICE CLEANUP] Error cleaning service ${serviceId}:`, error instanceof Error ? error.message : error);
    }
  }


  /**
   * Kill processes using specific port
   */
  private async killProcessesByPort(port: number, serviceId: string): Promise<void> {
    try {
      console.log(`[PORT CLEANUP] Checking port ${port} for service ${serviceId}`);

      // Use lsof to find processes using the port
      const { stdout } = await execa('lsof', ['-ti', `:${port}`], {
        reject: false,
        timeout: 5000
      });

      if (stdout.trim()) {
        const pids = stdout.trim().split('\n').filter(pid => pid.trim());

        if (pids.length > 0) {
          console.log(`[PORT CLEANUP] Found ${pids.length} process(es) using port ${port}: ${pids.join(', ')}`);

          // Kill each process
          for (const pid of pids) {
            try {
              console.log(`[PORT CLEANUP] Killing PID ${pid} on port ${port} for service ${serviceId}`);
              await execa('kill', ['-9', pid], { reject: false, timeout: 3000 });
            } catch (error) {
              console.warn(`[PORT CLEANUP] Failed to kill PID ${pid}:`, error instanceof Error ? error.message : error);
            }
          }
          console.log(`[PORT CLEANUP] Port ${port} cleared for service ${serviceId}`);
        }
      } else {
        console.log(`[PORT CLEANUP] Port ${port} is free for service ${serviceId}`);
      }
    } catch (error) {
      // lsof command failed (port probably free) - this is normal
      console.log(`[PORT CLEANUP] Port ${port} appears to be free for service ${serviceId}`);
    }
  }

  /**
   * Kill processes by service name patterns
   */
  private async killProcessesByServiceName(serviceId: string): Promise<void> {
    try {
      console.log(`[PROCESS CLEANUP] Searching processes for service ${serviceId}`);

      // Get orchestrator PID to exclude it from cleanup
      const orchestratorPid = process.pid.toString();

      // Define search patterns for the service
      const searchPatterns = [
        `${serviceId}/node_modules/.bin/../tsx/dist/cli.mjs`,
        `services/${serviceId}`,
        `beauty-${serviceId}`,
        serviceId
      ];

      for (const pattern of searchPatterns) {
        try {
          // Use pgrep to find processes matching pattern
          const { stdout } = await execa('pgrep', ['-f', pattern], {
            reject: false,
            timeout: 5000
          });

          if (stdout.trim()) {
            const pids = stdout.trim().split('\n')
              .filter(pid => pid.trim())
              .filter(pid => pid !== orchestratorPid); // Exclude orchestrator itself

            if (pids.length > 0) {
              console.log(`[PROCESS CLEANUP] Found ${pids.length} process(es) matching pattern "${pattern}": ${pids.join(', ')} (excluding orchestrator PID ${orchestratorPid})`);

              // Kill each process
              for (const pid of pids) {
                try {
                  // First try graceful shutdown
                  console.log(`[PROCESS CLEANUP] Terminating PID ${pid} (pattern: ${pattern})`);
                  await execa('kill', ['-TERM', pid], { reject: false, timeout: 2000 });

                  // Wait a moment for graceful shutdown
                  await new Promise(resolve => setTimeout(resolve, 500));

                  // Check if still running, force kill if needed
                  try {
                    await execa('kill', ['-0', pid], { reject: false, timeout: 1000 });
                    console.log(`[PROCESS CLEANUP] Force killing PID ${pid} (pattern: ${pattern})`);
                    await execa('kill', ['-9', pid], { reject: false, timeout: 2000 });
                  } catch {
                    // Process already terminated, which is good
                  }
                } catch (error) {
                  console.warn(`[PROCESS CLEANUP] Failed to kill PID ${pid}:`, error instanceof Error ? error.message : error);
                }
              }
            }
          }
        } catch (error) {
          // pgrep command failed - this is normal if no processes found
          console.log(`[PROCESS CLEANUP] No processes found for pattern "${pattern}"`);
        }
      }
    } catch (error) {
      console.warn(`[PROCESS CLEANUP] Error searching processes for service ${serviceId}:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Setup process event handlers
   */
  private setupProcessEvents(serviceId: string, childProcess: ExecaChildProcess, runtimeState: ServiceRuntimeState): void {
    childProcess.on('exit', (exitCode, signal) => {
      console.log(`Service ${serviceId} exited with code ${exitCode}, signal ${signal}`);

      this.processes.delete(serviceId);
      this.stopHealthMonitoring(serviceId);

      if (runtimeState.state !== ServiceState.STOPPING) {
        // Unexpected exit
        runtimeState.state = ServiceState.ERROR;
        if (typeof exitCode === 'number') {
          runtimeState.process.exitCode = exitCode;
        } else {
          delete runtimeState.process.exitCode;
        }
      } else {
        runtimeState.state = ServiceState.STOPPED;
        delete runtimeState.process.exitCode;
      }

      delete runtimeState.process.pid;
      runtimeState.process.uptime = 0;
      runtimeState.lastStateChange = new Date();

      this.emit('stateChange', serviceId, runtimeState);
      this.emit('processExit', serviceId, exitCode, signal);
    });

    childProcess.on('error', (error) => {
      console.error(`Process error for ${serviceId}:`, error);
      runtimeState.state = ServiceState.ERROR;
      runtimeState.lastStateChange = new Date();
      this.emit('stateChange', serviceId, runtimeState);
      this.emit('processError', serviceId, error);
    });

    // Capture stdout/stderr for logging
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        runtimeState.logs.stdout.push(...lines);

        // Keep only recent logs in memory
        if (runtimeState.logs.stdout.length > this.config.process.logLines) {
          runtimeState.logs.stdout = runtimeState.logs.stdout.slice(-this.config.process.logLines);
        }
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        runtimeState.logs.stderr.push(...lines);

        if (runtimeState.logs.stderr.length > this.config.process.logLines) {
          runtimeState.logs.stderr = runtimeState.logs.stderr.slice(-this.config.process.logLines);
        }
      });
    }
  }

  /**
   * Start health monitoring for service
   */
  private startHealthMonitoring(serviceId: string, serviceConfig: ServiceConfig, runtimeState: ServiceRuntimeState): void {
    const timer = setInterval(async () => {
      await this.performHealthCheck(serviceId, serviceConfig, runtimeState);
    }, this.config.healthCheck.interval);

    // Health check timer registered for service
    this.healthTimers.set(serviceId, timer);
  }

  /**
   * Stop health monitoring for service
   */
  private stopHealthMonitoring(serviceId: string): void {
    const timer = this.healthTimers.get(serviceId);
    if (timer) {
      clearInterval(timer);
      this.healthTimers.delete(serviceId);
    }
  }

  /**
   * Perform health check on service
   */
  private async performHealthCheck(serviceId: string, serviceConfig: ServiceConfig, runtimeState: ServiceRuntimeState): Promise<void> {
    if (!this.isServiceRunning(serviceId)) {
      runtimeState.health.isHealthy = false;
      runtimeState.health.consecutiveFailures++;
      runtimeState.health.consecutiveSuccesses = 0;
      runtimeState.health.lastCheck = new Date();
      return;
    }

    try {
      const startTime = Date.now();

      // Simple HTTP health check
      const response = await fetch(`http://localhost:${serviceConfig.port}${serviceConfig.healthEndpoint}`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.healthCheck.timeout)
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;

      // Update health info
      const updatedHealth: HealthInfo = {
        isHealthy,
        lastCheck: new Date(),
        consecutiveFailures: isHealthy ? 0 : runtimeState.health.consecutiveFailures + 1,
        consecutiveSuccesses: isHealthy ? runtimeState.health.consecutiveSuccesses + 1 : 0,
        responseTime
      };

      if (!isHealthy) {
        updatedHealth.error = `HTTP ${response.status}`;
      }

      runtimeState.health = updatedHealth;

      // Update warmup progress
      if (runtimeState.warmup.isInWarmup && isHealthy) {
        runtimeState.warmup.successfulChecks++;

        if (runtimeState.warmup.successfulChecks >= runtimeState.warmup.requiredChecks) {
          runtimeState.warmup.isInWarmup = false;
          runtimeState.state = ServiceState.RUNNING;
          runtimeState.lastStateChange = new Date();
          console.log(`Service ${serviceId} completed warmup`);
        }
      } else if (!runtimeState.warmup.isInWarmup) {
        // Update service state based on health
        if (isHealthy && runtimeState.state === ServiceState.UNHEALTHY) {
          runtimeState.state = ServiceState.RUNNING;
          runtimeState.lastStateChange = new Date();
        } else if (!isHealthy && runtimeState.state === ServiceState.RUNNING) {
          runtimeState.state = ServiceState.UNHEALTHY;
          runtimeState.lastStateChange = new Date();
        }
      }

      // Handle circuit breaker logic
      this.updateCircuitBreaker(runtimeState, isHealthy);

      this.emit('stateChange', serviceId, runtimeState);

    } catch (error) {
      // Health check failed
      runtimeState.health = {
        isHealthy: false,
        lastCheck: new Date(),
        consecutiveFailures: runtimeState.health.consecutiveFailures + 1,
        consecutiveSuccesses: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.updateCircuitBreaker(runtimeState, false);
      this.emit('stateChange', serviceId, runtimeState);
    }
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(runtimeState: ServiceRuntimeState, isHealthy: boolean): void {
    const { circuitBreaker } = runtimeState;
    const { threshold, backoffMultiplier, maxBackoff } = this.config.circuitBreaker;

    if (circuitBreaker.state === 'closed') {
      if (!isHealthy) {
        circuitBreaker.failures++;
        if (circuitBreaker.failures >= threshold) {
          circuitBreaker.state = 'open';
          circuitBreaker.lastFailure = new Date();
          circuitBreaker.nextRetry = new Date(Date.now() + circuitBreaker.backoffSeconds * 1000);
          runtimeState.state = ServiceState.CIRCUIT_OPEN;
          runtimeState.lastStateChange = new Date();
          console.log(`Circuit breaker opened for service ${runtimeState.serviceId}`);
        }
      } else {
        circuitBreaker.failures = 0;
      }
    } else if (circuitBreaker.state === 'open') {
      if (Date.now() >= (circuitBreaker.nextRetry?.getTime() || 0)) {
        circuitBreaker.state = 'half_open';
        console.log(`Circuit breaker half-open for service ${runtimeState.serviceId}`);
      }
    } else if (circuitBreaker.state === 'half_open') {
      if (isHealthy) {
        circuitBreaker.state = 'closed';
        circuitBreaker.failures = 0;
        circuitBreaker.backoffSeconds = 1;
        runtimeState.state = ServiceState.RUNNING;
        runtimeState.lastStateChange = new Date();
        console.log(`Circuit breaker closed for service ${runtimeState.serviceId}`);
      } else {
        circuitBreaker.state = 'open';
        circuitBreaker.failures++;
        circuitBreaker.lastFailure = new Date();
        circuitBreaker.backoffSeconds = Math.min(
          circuitBreaker.backoffSeconds * backoffMultiplier,
          maxBackoff / 1000
        );
        circuitBreaker.nextRetry = new Date(Date.now() + circuitBreaker.backoffSeconds * 1000);
        runtimeState.state = ServiceState.CIRCUIT_OPEN;
        runtimeState.lastStateChange = new Date();
      }
    }
  }

  /**
   * Get process start time (simplified implementation)
   */
  private getProcessStartTime(_pid: number): Date | undefined {
    // In production, this would read from /proc/pid/stat or use ps
    // For now, return current time as approximation
    return new Date();
  }

  /**
   * Get process memory usage (simplified implementation)
   */
  private getProcessMemory(_pid: number): ProcessInfo['memory'] {
    // In production, this would read actual process memory
    // For now, return dummy data
    return {
      rss: 50 * 1024 * 1024, // 50MB
      heapTotal: 30 * 1024 * 1024,
      heapUsed: 20 * 1024 * 1024
    };
  }

  /**
   * Public method to cleanup service processes (called from API)
   */
  async cleanupServiceProcesses(serviceId: string): Promise<void> {
    const serviceConfig = findServiceById(serviceId);
    const port = serviceConfig?.port;

    console.log(`[API CLEANUP] Initiating cleanup for service ${serviceId}`);
    await this.clearServiceProcesses(serviceId, port);
    console.log(`[API CLEANUP] Cleanup completed for service ${serviceId}`);
  }

  /**
   * Ensure specific port is free (hotfix addition)
   */
  private async ensurePortFree(port: number): Promise<void> {
    try {
      const { stdout } = await execa('lsof', ['-ti', `:${port}`], {
        reject: false,
        timeout: 5000
      });

      if (stdout && stdout.trim()) {
        const pids = stdout.trim().split('\n').filter(Boolean);
        console.log(`[PORT CHECK] Found ${pids.length} process(es) using port ${port}: ${pids.join(', ')}`);

        for (const pid of pids) {
          try {
            await execa('kill', ['-9', pid], { reject: false, timeout: 3000 });
            console.log(`[PORT CHECK] Killed PID ${pid} on port ${port}`);
          } catch (error) {
            console.warn(`[PORT CHECK] Failed to kill PID ${pid}:`, error instanceof Error ? error.message : error);
          }
        }
      } else {
        console.log(`[PORT CHECK] Port ${port} is free`);
      }
    } catch (error) {
      // lsof failed, probably port is free
      console.log(`[PORT CHECK] Port ${port} appears to be free (lsof failed)`);
    }
  }

  /**
   * ✨ NEW: Reliable process kill with verification
   * Implements SIGTERM → wait → SIGKILL with periodic checks to ensure process dies
   */
  private async killProcessReliable(
    pid: number,
    serviceId: string,
    timeout: number = 5000,
    runtimeState?: ServiceRuntimeState
  ): Promise<{ success: boolean; phase: ProcessKillPhase; attempts: number }> {
    let attempts = 0;

    // Phase 1: SIGTERM (graceful)
    attempts++;
    if (runtimeState) {
      runtimeState.killTracking.phase = ProcessKillPhase.SIGTERM_SENT;
      runtimeState.killTracking.sigTermSentAt = new Date();
      runtimeState.killTracking.killAttempts = attempts;
    }

    console.log(`[KILL-${serviceId}] Attempt ${attempts}: Sending SIGTERM to PID ${pid}`);

    try {
      process.kill(pid, 'SIGTERM');
    } catch (e) {
      console.warn(`[KILL-${serviceId}] SIGTERM failed:`, e instanceof Error ? e.message : e);
    }

    // Wait with periodic checks for graceful shutdown
    const gracefulWaitTime = Math.min(timeout / 2, 3000); // Max 3 sec
    console.log(`[KILL-${serviceId}] Waiting up to ${gracefulWaitTime}ms for graceful shutdown...`);

    if (runtimeState) {
      runtimeState.killTracking.phase = ProcessKillPhase.SIGTERM_WAIT;
    }

    const gracefulDied = await this.waitForProcessDeath(pid, gracefulWaitTime);

    // Check if process died after SIGTERM
    if (!this.isProcessAlive(pid)) {
      console.log(`[KILL-${serviceId}] ✓ Process died after SIGTERM (attempt ${attempts})`);
      if (runtimeState) {
        runtimeState.killTracking.phase = ProcessKillPhase.KILLED;
      }
      return {
        success: true,
        phase: ProcessKillPhase.KILLED,
        attempts
      };
    }

    if (!gracefulDied) {
      console.log(`[KILL-${serviceId}] Process did not die gracefully after ${gracefulWaitTime}ms, sending SIGKILL...`);
    }

    // Phase 2: SIGKILL (force)
    attempts++;
    if (runtimeState) {
      runtimeState.killTracking.phase = ProcessKillPhase.SIGKILL_SENT;
      runtimeState.killTracking.sigKillSentAt = new Date();
      runtimeState.killTracking.killAttempts = attempts;
    }

    console.log(`[KILL-${serviceId}] Attempt ${attempts}: Sending SIGKILL to PID ${pid}`);

    try {
      process.kill(pid, 'SIGKILL');
    } catch (e) {
      console.warn(`[KILL-${serviceId}] SIGKILL failed:`, e instanceof Error ? e.message : e);
    }

    // Wait with periodic checks for force kill
    const forceWaitTime = Math.min(timeout / 2, 2000); // Max 2 sec
    console.log(`[KILL-${serviceId}] Waiting up to ${forceWaitTime}ms for force kill...`);
    await this.waitForProcessDeath(pid, forceWaitTime);

    // Final verification
    if (this.isProcessAlive(pid)) {
      console.error(`[KILL-${serviceId}] ✗ FAILED: Process still alive after SIGKILL! PID ${pid} may be zombie.`);
      if (runtimeState) {
        runtimeState.killTracking.phase = ProcessKillPhase.ZOMBIE;
        runtimeState.killTracking.lastKillError = `Process ${pid} could not be killed (zombie process detected)`;
      }
      return {
        success: false,
        phase: ProcessKillPhase.ZOMBIE,
        attempts
      };
    }

    console.log(`[KILL-${serviceId}] ✓ Process killed successfully after force kill (attempt ${attempts})`);
    if (runtimeState) {
      runtimeState.killTracking.phase = ProcessKillPhase.KILLED;
    }
    return {
      success: true,
      phase: ProcessKillPhase.KILLED,
      attempts
    };
  }

  /**
   * ✨ NEW: Check if process is actually alive using kill -0
   * kill -0 sends signal 0 which doesn't kill but checks if process exists
   */
  private isProcessAlive(pid: number): boolean {
    try {
      // kill -0 returns 0 if process exists, throws if it doesn't
      process.kill(pid, 0);
      return true;
    } catch (e) {
      // Process doesn't exist
      return false;
    }
  }

  /**
   * ✨ NEW: Wait for process death with periodic checks
   * Checks every 100ms instead of fixed timeout to detect death sooner
   */
  private async waitForProcessDeath(
    pid: number,
    maxWaitMs: number
  ): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 100; // ms between checks

    while (Date.now() - startTime < maxWaitMs) {
      if (!this.isProcessAlive(pid)) {
        return true; // Process died
      }
      // Sleep for a bit before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return false; // Timeout reached, process still alive
  }
}
