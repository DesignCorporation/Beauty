// Конфигурация сервисов для мониторинга
// Разделена на категории для лучшего отображения в админке

export interface ServiceConfig {
  name: string;
  url: string;
  healthEndpoint: string;
  critical: boolean;
  timeout: number;
  expectedStatus: number;
  category: 'gateway-routed' | 'direct-access' | 'infrastructure';
  gatewayPath?: string; // Путь через API Gateway
  description: string;
  orchestratorId?: string; // Идентификатор сервиса в новом оркестраторе
}

// 🚀 Сервисы, маршрутизируемые через API Gateway
export const GATEWAY_ROUTED_SERVICES: ServiceConfig[] = [
  {
    name: 'Auth Service',
    url: process.env.AUTH_SERVICE_URL || 'http://nginx-auth-lb',
    healthEndpoint: '/health',
    critical: true,
    timeout: 5000,
    expectedStatus: 200,
    category: 'gateway-routed',
    gatewayPath: '/api/auth/*',
    description: 'JWT authentication and authorization service',
    orchestratorId: 'auth-service'
  },
  {
    name: 'Salon API',
    url: process.env.SALON_API_URL || 'http://salon-api:6022',
    healthEndpoint: '/health',
    critical: true,
    timeout: 5000,
    expectedStatus: 200,
    category: 'gateway-routed',
    gatewayPath: '/api/salon/*',
    description: 'Salon API for appointments and clients',
    orchestratorId: 'salon-api'
  },
  {
    name: 'MCP Server',
    url: process.env.MCP_SERVER_URL || 'http://mcp-server:6025',
    healthEndpoint: '/health',
    critical: false,
    timeout: 5000,
    expectedStatus: 200,
    category: 'gateway-routed',
    gatewayPath: '/api/mcp/*',
    description: 'AI context and documentation auto-sync',
    orchestratorId: 'mcp-server'
  },
  {
    name: 'Images API',
    url: process.env.IMAGES_API_URL || 'http://images-api:6026',
    healthEndpoint: '/health',
    critical: true,
    timeout: 10000,
    expectedStatus: 200,
    category: 'gateway-routed',
    gatewayPath: '/api/images/*',
    description: 'Images API with local/S3 storage',
    orchestratorId: 'images-api'
  },
  {
    name: 'Backup Service',
    url: process.env.BACKUP_SERVICE_URL || 'http://backup-service:6027',
    healthEndpoint: '/health',
    critical: false,
    timeout: 10000,
    expectedStatus: 200,
    category: 'gateway-routed',
    gatewayPath: '/api/backup/*',
    description: 'Automated backups and restores',
    orchestratorId: 'backup-service'
  }
];

// 🌐 Сервисы с прямым доступом через nginx
export const DIRECT_ACCESS_SERVICES: ServiceConfig[] = [
  {
    name: 'Admin Panel',
    url: process.env.ADMIN_PANEL_URL || 'http://admin-panel:6002',
    healthEndpoint: '/',
    critical: false,
    timeout: 10000,
    expectedStatus: 200,
    category: 'direct-access',
    description: 'React admin panel for platform management',
    orchestratorId: 'admin-panel'
  },
  {
    name: 'Salon CRM',
    url: process.env.CRM_UI_URL || 'http://salon-crm:6001',
    healthEndpoint: '/',
    critical: false,
    timeout: 10000,
    expectedStatus: 200,
    category: 'direct-access',
    description: 'CRM system for beauty salons',
    orchestratorId: 'salon-crm'
  },
  {
    name: 'Client Portal',
    url: process.env.CLIENT_PORTAL_URL || 'http://client-booking:6003',
    healthEndpoint: '/',
    critical: false,
    timeout: 10000,
    expectedStatus: 200,
    category: 'direct-access',
    description: 'Portal for salon clients',
    orchestratorId: 'client-booking'
  },
  {
    name: 'Landing Page',
    url: process.env.LANDING_URL || 'http://landing-page:6004',
    healthEndpoint: '/',
    critical: false,
    timeout: 10000,
    expectedStatus: 200,
    category: 'direct-access',
    description: 'Public landing page and marketing site',
    orchestratorId: 'landing-page'
  }
];

// 🛠️ Инфраструктурные сервисы
export const INFRASTRUCTURE_SERVICES: ServiceConfig[] = [
  {
    name: 'VS Code Server',
    url: process.env.MONITORING_URL || 'http://monitoring-service:6080',
    healthEndpoint: '/',
    critical: false,
    timeout: 15000,
    expectedStatus: 200,
    category: 'infrastructure',
    description: 'Cloud-based VS Code development environment'
  }
];

// Объединенная конфигурация для обратной совместимости
export const SERVICES_CONFIG: ServiceConfig[] = [
  ...GATEWAY_ROUTED_SERVICES,
  ...DIRECT_ACCESS_SERVICES,
  ...INFRASTRUCTURE_SERVICES
];
