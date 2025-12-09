import { Request, Response, NextFunction } from 'express';
import { ProxyRequest, GatewayMetrics, ServiceHealthStatus } from '../types/gateway';

class MetricsCollector {
  private metrics: GatewayMetrics = {
    totalRequests: 0,
    activeConnections: 0,
    averageResponseTime: 0,
    errorRate: 0,
    serviceHealth: {},
    uptime: Date.now()
  };

  private responseTimes: number[] = [];
  private maxResponseTimes = 1000; // Keep last 1000 response times

  incrementRequests() {
    this.metrics.totalRequests++;
  }

  incrementActiveConnections() {
    this.metrics.activeConnections++;
  }

  decrementActiveConnections() {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
  }

  recordResponseTime(time: number) {
    this.responseTimes.push(time);
    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes.shift();
    }
    
    // Calculate average response time
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = sum / this.responseTimes.length;
  }

  updateServiceHealth(service: string, status: ServiceHealthStatus) {
    this.metrics.serviceHealth[service] = status;
  }

  getMetrics(): GatewayMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime
    };
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      activeConnections: 0,
      averageResponseTime: 0,
      errorRate: 0,
      serviceHealth: {},
      uptime: Date.now()
    };
    this.responseTimes = [];
  }
}

export const metricsCollector = new MetricsCollector();

export const metricsMiddleware = (req: ProxyRequest, res: Response, next: NextFunction) => {
  // Record request start time
  req.proxyStartTime = Date.now();
  
  // Increment counters
  metricsCollector.incrementRequests();
  metricsCollector.incrementActiveConnections();

  // Clean up when response finishes
  res.on('finish', () => {
    metricsCollector.decrementActiveConnections();
    
    if (req.proxyStartTime) {
      const responseTime = Date.now() - req.proxyStartTime;
      metricsCollector.recordResponseTime(responseTime);
    }
  });

  next();
};

export const metricsRoute = (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: metricsCollector.getMetrics(),
    timestamp: new Date().toISOString()
  });
};