import axios, { AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import pino from 'pino';
import { ServiceConfig } from '../config/monitoring';

type Logger = ReturnType<typeof pino>;

export interface HealthCheckResult {
  service: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: Date;
  metadata?: {
    headers?: Record<string, string>;
    version?: string;
    uptime?: number;
    memory?: any;
  };
}

export interface ServiceMetrics {
  service: string;
  availability: number; // percentage
  averageResponseTime: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  lastHealthy: Date | null;
  lastUnhealthy: Date | null;
  currentStreak: number; // consecutive successes/failures
  incidents: number; // total incidents today
}

export class HealthChecker extends EventEmitter {
  private services: ServiceConfig[];
  private metrics: Map<string, ServiceMetrics> = new Map();
  private logger: Logger;
  private checkInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(services: ServiceConfig[], logger: Logger) {
    super();
    this.services = services;
    this.logger = logger;
    
    // Initialize metrics for each service
    this.services.forEach(service => {
      this.metrics.set(service.name, {
        service: service.name,
        availability: 100,
        averageResponseTime: 0,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        lastHealthy: null,
        lastUnhealthy: null,
        currentStreak: 0,
        incidents: 0
      });
    });
  }

  async checkService(service: ServiceConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      service: service.name,
      url: service.url + service.healthEndpoint,
      status: 'unhealthy',
      responseTime: 0,
      timestamp: new Date()
    };

    try {
      const response: AxiosResponse = await axios.get(
        service.url + service.healthEndpoint,
        {
          timeout: service.timeout,
          headers: {
            'User-Agent': 'Beauty-Platform-Monitor/1.0',
            'Accept': 'application/json'
          },
          validateStatus: (status) => status < 500 // Accept 4xx as valid responses
        }
      );

      result.responseTime = Date.now() - startTime;
      result.statusCode = response.status;

      // Determine health status
      if (response.status === service.expectedStatusCode) {
        result.status = 'healthy';
      } else if (response.status >= 200 && response.status < 400) {
        result.status = 'degraded';
      } else {
        result.status = 'unhealthy';
      }

      // Extract metadata if available
      if (response.data && typeof response.data === 'object') {
        result.metadata = {
          headers: response.headers as Record<string, string>,
          version: response.data.version,
          uptime: response.data.uptime,
          memory: response.data.memory
        };
      }

      this.logger.debug(`Health check completed for ${service.name}`, {
        status: result.status,
        responseTime: result.responseTime,
        statusCode: result.statusCode
      });

    } catch (error: any) {
      result.responseTime = Date.now() - startTime;
      result.error = error.message;
      result.status = 'unhealthy';

      if (error.code === 'ECONNREFUSED') {
        result.error = 'Connection refused - service may be down';
      } else if (error.code === 'ENOTFOUND') {
        result.error = 'Host not found - DNS issue or service unavailable';
      } else if (error.code === 'ETIMEDOUT') {
        result.error = 'Request timeout - service may be overloaded';
      }

      this.logger.warn(`Health check failed for ${service.name}`, {
        error: result.error,
        responseTime: result.responseTime
      });
    }

    // Update metrics
    this.updateMetrics(service.name, result);

    return result;
  }

  private updateMetrics(serviceName: string, result: HealthCheckResult): void {
    const metrics = this.metrics.get(serviceName);
    if (!metrics) return;

    metrics.totalChecks++;
    
    // Update response time average
    const previousAverage = metrics.averageResponseTime;
    metrics.averageResponseTime = (
      (previousAverage * (metrics.totalChecks - 1) + result.responseTime) / 
      metrics.totalChecks
    );

    if (result.status === 'healthy') {
      metrics.successfulChecks++;
      metrics.lastHealthy = result.timestamp;
      
      // Reset streak if this is first success after failures
      if (metrics.currentStreak < 0) {
        metrics.currentStreak = 1;
      } else {
        metrics.currentStreak++;
      }
    } else {
      metrics.failedChecks++;
      metrics.lastUnhealthy = result.timestamp;
      
      // Increment incident counter if this is start of a new failure
      if (metrics.currentStreak > 0) {
        metrics.incidents++;
      }
      
      // Update failure streak
      if (metrics.currentStreak > 0) {
        metrics.currentStreak = -1;
      } else {
        metrics.currentStreak--;
      }
    }

    // Update availability percentage
    metrics.availability = (metrics.successfulChecks / metrics.totalChecks) * 100;

    this.metrics.set(serviceName, metrics);
  }

  async checkAllServices(): Promise<HealthCheckResult[]> {
    const results = await Promise.allSettled(
      this.services.map(service => this.checkService(service))
    );

    const healthResults: HealthCheckResult[] = [];

    results.forEach((result, index) => {
      const service = this.services[index];
      if (!service) return; // Skip if service not found

      if (result.status === 'fulfilled') {
        healthResults.push(result.value);

        // Emit events for alerting
        if (result.value.status === 'unhealthy' && service.critical) {
          this.emit('criticalServiceDown', result.value);
        } else if (result.value.status === 'healthy' && service.critical) {
          this.emit('criticalServiceRestored', result.value);
        } else if (result.value.status === 'degraded') {
          this.emit('serviceDegraded', result.value);
        }
      } else {
        // Handle unexpected errors in health check
        const errorResult: HealthCheckResult = {
          service: service.name,
          url: service.url + service.healthEndpoint,
          status: 'unhealthy',
          responseTime: 0,
          timestamp: new Date(),
          error: `Unexpected error: ${result.reason}`
        };

        healthResults.push(errorResult);
        this.updateMetrics(service.name, errorResult);

        if (service.critical) {
          this.emit('criticalServiceDown', errorResult);
        }
      }
    });

    return healthResults;
  }

  start(intervalMs: number = 30000): void {
    if (this.isRunning) {
      this.logger.warn('Health checker is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info(`Starting health checker with ${intervalMs}ms interval`);

    // Perform initial check
    this.checkAllServices().catch(error => {
      this.logger.error('Error in initial health check', error);
    });

    // Set up recurring checks
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAllServices();
      } catch (error) {
        this.logger.error('Error in scheduled health check', error);
      }
    }, intervalMs);

    this.emit('started');
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.logger.info('Health checker stopped');
    this.emit('stopped');
  }

  getMetrics(): Record<string, ServiceMetrics> {
    const result: Record<string, ServiceMetrics> = {};
    this.metrics.forEach((metrics, serviceName) => {
      result[serviceName] = { ...metrics };
    });
    return result;
  }

  getServiceMetrics(serviceName: string): ServiceMetrics | null {
    return this.metrics.get(serviceName) || null;
  }

  resetMetrics(serviceName?: string): void {
    if (serviceName) {
      const service = this.services.find(s => s.name === serviceName);
      if (service) {
        this.metrics.set(serviceName, {
          service: serviceName,
          availability: 100,
          averageResponseTime: 0,
          totalChecks: 0,
          successfulChecks: 0,
          failedChecks: 0,
          lastHealthy: null,
          lastUnhealthy: null,
          currentStreak: 0,
          incidents: 0
        });
      }
    } else {
      // Reset all metrics
      this.services.forEach(service => {
        this.metrics.set(service.name, {
          service: service.name,
          availability: 100,
          averageResponseTime: 0,
          totalChecks: 0,
          successfulChecks: 0,
          failedChecks: 0,
          lastHealthy: null,
          lastUnhealthy: null,
          currentStreak: 0,
          incidents: 0
        });
      });
    }
    
    this.logger.info(`Metrics reset for ${serviceName || 'all services'}`);
  }

  isHealthy(): boolean {
    const criticalServices = this.services.filter(s => s.critical);
    
    return criticalServices.every(service => {
      const metrics = this.metrics.get(service.name);
      return metrics && metrics.currentStreak > 0; // Currently healthy
    });
  }

  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    healthyServices: number;
    totalServices: number;
    criticalIssues: string[];
  } {
    const totalServices = this.services.length;
    let healthyServices = 0;
    const criticalIssues: string[] = [];

    this.services.forEach(service => {
      const metrics = this.metrics.get(service.name);
      if (metrics && metrics.currentStreak > 0) {
        healthyServices++;
      } else if (service.critical) {
        criticalIssues.push(service.name);
      }
    });

    let status: 'healthy' | 'degraded' | 'critical';
    
    if (criticalIssues.length > 0) {
      status = 'critical';
    } else if (healthyServices < totalServices) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      healthyServices,
      totalServices,
      criticalIssues
    };
  }
}