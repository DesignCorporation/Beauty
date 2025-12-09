/**
 * Unified Service Registry - Main Entry Point
 * Единая точка входа для всех компонентов реестра сервисов
 *
 * @version 1.0.0
 * @created 26.09.2025
 */
export type { ServiceConfig, UnifiedServiceRegistry, EnvironmentVariable, ServiceFilter, StartupOrder, ServiceRunConfig } from './types';
export { ServiceType, ServiceCriticality, ServiceStatus } from './types';
export type { ConnectionMap, ConnectionRoute, ConnectionService, ConnectionWebSocket, ConnectionServiceType } from './connection-map';
export { loadConnectionMap, loadRawConnectionMap, validateConnectionMap, resolveConnectionMap, CONNECTION_MAP_PATH } from './connection-map';
export { UNIFIED_REGISTRY } from './registry';
export { findServiceById, getAllServices, filterServices, getServicesByType, getServicesByCriticality, getServicesByStatus, getServicesByTags, getActiveServices, getCriticalServices, getFrontendServices, getBackendServices, calculateStartupOrder, getServiceDependents, getServiceDependencyChain, hasCircularDependency, validateServiceConfig, getRegistryStats, getGatewayServices, convertToLegacyGatewayConfig, getInternallyManagedServices, getExternallyManagedServices, getServicesByCommand, isExternallyManaged, getServiceWorkingDirectory, buildServiceEnvironment } from './utils';
export declare const BEAUTY_SERVICES: {
    readonly LANDING_PAGE: "landing-page";
    readonly SALON_CRM: "salon-crm";
    readonly ADMIN_PANEL: "admin-panel";
    readonly CLIENT_BOOKING: "client-booking";
    readonly API_GATEWAY: "api-gateway";
    readonly AUTH_SERVICE: "auth-service";
    readonly CRM_API: "crm-api";
    readonly MCP_SERVER: "mcp-server";
    readonly IMAGES_API: "images-api";
    readonly NOTIFICATION_SERVICE: "notification-service";
    readonly PAYMENT_SERVICE: "payment-service";
    readonly POSTGRESQL: "postgresql";
    readonly BACKUP_SERVICE: "backup-service";
};
//# sourceMappingURL=index.d.ts.map