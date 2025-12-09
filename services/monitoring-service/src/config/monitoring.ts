import { config } from 'dotenv';
config();

export interface MonitoringConfig {
  // Service Configuration
  port: number;
  host: string;
  environment: string;
  
  // Database
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  
  // Redis (for caching metrics)
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  
  // Services to Monitor
  services: ServiceConfig[];
  
  // Alerting Configuration
  alerting: {
    telegram: {
      enabled: boolean;
      botToken: string;
      chatId: string;
    };
    discord: {
      enabled: boolean;
      webhookUrl: string;
    };
    slack: {
      enabled: boolean;
      token: string;
      channel: string;
    };
  };
  
  // Monitoring Thresholds
  thresholds: {
    responseTime: number; // ms
    errorRate: number; // percentage
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    diskUsage: number; // percentage
  };
  
  // Health Check Intervals
  intervals: {
    healthCheck: number; // ms
    metricsCollection: number; // ms
    alertCheck: number; // ms
  };
}

export interface ServiceConfig {
  name: string;
  url: string;
  healthEndpoint: string;
  critical: boolean;
  timeout: number;
  expectedStatusCode: number;
}

export const MONITORING_CONFIG: MonitoringConfig = {
  port: parseInt(process.env.MONITORING_PORT || '6027'),
  host: process.env.MONITORING_HOST || '0.0.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'beauty_platform_new',
    username: process.env.DB_USER || 'beauty_crm_user',
    password: process.env.DB_PASS || 'your_secure_password_123',
  },
  
  redis: (() => {
    const redisConfig: { host: string; port: number; password?: string } = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };
    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }
    return redisConfig;
  })(),
  
  services: [
    {
      name: 'API Gateway',
      url: 'http://localhost:6020',
      healthEndpoint: '/health',
      critical: true,
      timeout: 5000,
      expectedStatusCode: 200
    },
    {
      name: 'Auth Service',
      url: 'http://localhost:6021',
      healthEndpoint: '/health',
      critical: true,
      timeout: 5000,
      expectedStatusCode: 200
    },
    {
      name: 'Admin Panel',
      url: 'http://localhost:6002',
      healthEndpoint: '/health',
      critical: false,
      timeout: 10000,
      expectedStatusCode: 200
    },
    {
      name: 'Salon CRM',
      url: 'http://localhost:6001',
      healthEndpoint: '/health',
      critical: false,
      timeout: 10000,
      expectedStatusCode: 200
    },
    {
      name: 'Client Portal',
      url: 'http://localhost:6003',
      healthEndpoint: '/health',
      critical: false,
      timeout: 10000,
      expectedStatusCode: 200
    },
    {
      name: 'Images API',
      url: 'http://localhost:6026',
      healthEndpoint: '/health',
      critical: false,
      timeout: 15000,
      expectedStatusCode: 200
    },
    {
      name: 'MCP Server',
      url: 'http://localhost:6025',
      healthEndpoint: '/health',
      critical: false,
      timeout: 5000,
      expectedStatusCode: 200
    }
  ],
  
  alerting: {
    telegram: {
      enabled: process.env.TELEGRAM_ENABLED === 'true',
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
    },
    discord: {
      enabled: process.env.DISCORD_ENABLED === 'true',
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
    },
    slack: {
      enabled: process.env.SLACK_ENABLED === 'true',
      token: process.env.SLACK_TOKEN || '',
      channel: process.env.SLACK_CHANNEL || 'alerts',
    },
  },
  
  thresholds: {
    responseTime: parseInt(process.env.THRESHOLD_RESPONSE_TIME || '5000'), // 5 seconds
    errorRate: parseFloat(process.env.THRESHOLD_ERROR_RATE || '5'), // 5%
    cpuUsage: parseFloat(process.env.THRESHOLD_CPU || '80'), // 80%
    memoryUsage: parseFloat(process.env.THRESHOLD_MEMORY || '85'), // 85%
    diskUsage: parseFloat(process.env.THRESHOLD_DISK || '90'), // 90%
  },
  
  intervals: {
    healthCheck: parseInt(process.env.INTERVAL_HEALTH_CHECK || '30000'), // 30 seconds
    metricsCollection: parseInt(process.env.INTERVAL_METRICS || '60000'), // 1 minute
    alertCheck: parseInt(process.env.INTERVAL_ALERTS || '60000'), // 1 minute
  },
};

// Production URLs для внешних проверок
export const PRODUCTION_SERVICES = [
  {
    name: 'Admin Panel (Production)',
    url: 'https://test-admin.beauty.designcorp.eu',
    healthEndpoint: '/health',
    critical: true,
    timeout: 15000,
    expectedStatusCode: 200
  },
  {
    name: 'Salon CRM (Production)',
    url: 'https://test-crm.beauty.designcorp.eu',
    healthEndpoint: '/health',
    critical: true,
    timeout: 15000,
    expectedStatusCode: 200
  },
  {
    name: 'Client Portal (Production)',
    url: 'https://client.beauty.designcorp.eu',
    healthEndpoint: '/health',
    critical: true,
    timeout: 15000,
    expectedStatusCode: 200
  }
];