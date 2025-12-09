/**
 * Unified Service Registry - Main Entry Point
 * Единая точка входа для всех компонентов реестра сервисов
 *
 * @version 1.0.0
 * @created 26.09.2025
 */

// Экспорт типов
export type {
  ServiceConfig,
  UnifiedServiceRegistry,
  EnvironmentVariable,
  ServiceFilter,
  StartupOrder,
  ServiceRunConfig
} from './types';

export {
  ServiceType,
  ServiceCriticality,
  ServiceStatus
} from './types';

// Connection map types and loader
export type {
  ConnectionMap,
  ConnectionRoute,
  ConnectionService,
  ConnectionWebSocket,
  ConnectionServiceType
} from './connection-map';

export {
  loadConnectionMap,
  loadRawConnectionMap,
  validateConnectionMap,
  resolveConnectionMap,
  CONNECTION_MAP_PATH
} from './connection-map';

// Экспорт данных реестра
export {
  UNIFIED_REGISTRY
} from './registry';

// Экспорт helper функций
export {
  // Поиск и получение сервисов
  findServiceById,
  getAllServices,
  filterServices,

  // Фильтрация по типам
  getServicesByType,
  getServicesByCriticality,
  getServicesByStatus,
  getServicesByTags,

  // Удобные shortcuts
  getActiveServices,
  getCriticalServices,
  getFrontendServices,
  getBackendServices,

  // Управление зависимостями
  calculateStartupOrder,
  getServiceDependents,
  getServiceDependencyChain,
  hasCircularDependency,

  // Валидация и статистика
  validateServiceConfig,
  getRegistryStats,

  // API Gateway интеграция
  getGatewayServices,
  convertToLegacyGatewayConfig,

  // Run config helpers (NEW)
  getInternallyManagedServices,
  getExternallyManagedServices,
  getServicesByCommand,
  isExternallyManaged,
  getServiceWorkingDirectory,
  buildServiceEnvironment
} from './utils';

// Re-export константы для удобства
export const BEAUTY_SERVICES = {
  // Frontend Apps
  LANDING_PAGE: 'landing-page',
  SALON_CRM: 'salon-crm',
  ADMIN_PANEL: 'admin-panel',
  CLIENT_BOOKING: 'client-booking',

  // Backend Services
  API_GATEWAY: 'api-gateway',
  AUTH_SERVICE: 'auth-service',
  SALON_API: 'salon-api',
  MCP_SERVER: 'mcp-server',
  IMAGES_API: 'images-api',
  NOTIFICATION_SERVICE: 'notification-service',
  PAYMENT_SERVICE: 'payment-service',

  // Infrastructure
  POSTGRESQL: 'postgresql',
  BACKUP_SERVICE: 'backup-service'
} as const;
