import type { Request, Response } from 'express';

export interface ProxyRequest extends Request {
  proxyStartTime?: number;
  targetService?: string;
}

export interface ProxyResponse extends Response {
  proxyEndTime?: number;
}

export interface ServiceHealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  responseTime?: number;
  error?: string;
  lastCheck: Date;
}

export interface GatewayMetrics {
  totalRequests: number;
  activeConnections: number;
  averageResponseTime: number;
  errorRate: number;
  serviceHealth: Record<string, ServiceHealthStatus>;
  uptime: number;
}

export interface ProxyOptions {
  target: string;
  changeOrigin: boolean;
  pathRewrite?: Record<string, string>;
  timeout?: number;
  retries?: number;
  onError?: (err: any, req: ProxyRequest, res: ProxyResponse) => void;
  onProxyReq?: (proxyReq: any, req: ProxyRequest, res: ProxyResponse) => void;
  onProxyRes?: (proxyRes: any, req: ProxyRequest, res: ProxyResponse) => void;
}