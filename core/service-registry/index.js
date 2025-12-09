"use strict";
/**
 * Unified Service Registry - Main Entry Point
 * Единая точка входа для всех компонентов реестра сервисов
 *
 * @version 1.0.0
 * @created 26.09.2025
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BEAUTY_SERVICES = exports.buildServiceEnvironment = exports.getServiceWorkingDirectory = exports.isExternallyManaged = exports.getServicesByCommand = exports.getExternallyManagedServices = exports.getInternallyManagedServices = exports.convertToLegacyGatewayConfig = exports.getGatewayServices = exports.getRegistryStats = exports.validateServiceConfig = exports.hasCircularDependency = exports.getServiceDependencyChain = exports.getServiceDependents = exports.calculateStartupOrder = exports.getBackendServices = exports.getFrontendServices = exports.getCriticalServices = exports.getActiveServices = exports.getServicesByTags = exports.getServicesByStatus = exports.getServicesByCriticality = exports.getServicesByType = exports.filterServices = exports.getAllServices = exports.findServiceById = exports.UNIFIED_REGISTRY = exports.CONNECTION_MAP_PATH = exports.resolveConnectionMap = exports.validateConnectionMap = exports.loadRawConnectionMap = exports.loadConnectionMap = exports.ServiceStatus = exports.ServiceCriticality = exports.ServiceType = void 0;
var types_1 = require("./types");
Object.defineProperty(exports, "ServiceType", { enumerable: true, get: function () { return types_1.ServiceType; } });
Object.defineProperty(exports, "ServiceCriticality", { enumerable: true, get: function () { return types_1.ServiceCriticality; } });
Object.defineProperty(exports, "ServiceStatus", { enumerable: true, get: function () { return types_1.ServiceStatus; } });
var connection_map_1 = require("./connection-map");
Object.defineProperty(exports, "loadConnectionMap", { enumerable: true, get: function () { return connection_map_1.loadConnectionMap; } });
Object.defineProperty(exports, "loadRawConnectionMap", { enumerable: true, get: function () { return connection_map_1.loadRawConnectionMap; } });
Object.defineProperty(exports, "validateConnectionMap", { enumerable: true, get: function () { return connection_map_1.validateConnectionMap; } });
Object.defineProperty(exports, "resolveConnectionMap", { enumerable: true, get: function () { return connection_map_1.resolveConnectionMap; } });
Object.defineProperty(exports, "CONNECTION_MAP_PATH", { enumerable: true, get: function () { return connection_map_1.CONNECTION_MAP_PATH; } });
// Экспорт данных реестра
var registry_1 = require("./registry");
Object.defineProperty(exports, "UNIFIED_REGISTRY", { enumerable: true, get: function () { return registry_1.UNIFIED_REGISTRY; } });
// Экспорт helper функций
var utils_1 = require("./utils");
// Поиск и получение сервисов
Object.defineProperty(exports, "findServiceById", { enumerable: true, get: function () { return utils_1.findServiceById; } });
Object.defineProperty(exports, "getAllServices", { enumerable: true, get: function () { return utils_1.getAllServices; } });
Object.defineProperty(exports, "filterServices", { enumerable: true, get: function () { return utils_1.filterServices; } });
// Фильтрация по типам
Object.defineProperty(exports, "getServicesByType", { enumerable: true, get: function () { return utils_1.getServicesByType; } });
Object.defineProperty(exports, "getServicesByCriticality", { enumerable: true, get: function () { return utils_1.getServicesByCriticality; } });
Object.defineProperty(exports, "getServicesByStatus", { enumerable: true, get: function () { return utils_1.getServicesByStatus; } });
Object.defineProperty(exports, "getServicesByTags", { enumerable: true, get: function () { return utils_1.getServicesByTags; } });
// Удобные shortcuts
Object.defineProperty(exports, "getActiveServices", { enumerable: true, get: function () { return utils_1.getActiveServices; } });
Object.defineProperty(exports, "getCriticalServices", { enumerable: true, get: function () { return utils_1.getCriticalServices; } });
Object.defineProperty(exports, "getFrontendServices", { enumerable: true, get: function () { return utils_1.getFrontendServices; } });
Object.defineProperty(exports, "getBackendServices", { enumerable: true, get: function () { return utils_1.getBackendServices; } });
// Управление зависимостями
Object.defineProperty(exports, "calculateStartupOrder", { enumerable: true, get: function () { return utils_1.calculateStartupOrder; } });
Object.defineProperty(exports, "getServiceDependents", { enumerable: true, get: function () { return utils_1.getServiceDependents; } });
Object.defineProperty(exports, "getServiceDependencyChain", { enumerable: true, get: function () { return utils_1.getServiceDependencyChain; } });
Object.defineProperty(exports, "hasCircularDependency", { enumerable: true, get: function () { return utils_1.hasCircularDependency; } });
// Валидация и статистика
Object.defineProperty(exports, "validateServiceConfig", { enumerable: true, get: function () { return utils_1.validateServiceConfig; } });
Object.defineProperty(exports, "getRegistryStats", { enumerable: true, get: function () { return utils_1.getRegistryStats; } });
// API Gateway интеграция
Object.defineProperty(exports, "getGatewayServices", { enumerable: true, get: function () { return utils_1.getGatewayServices; } });
Object.defineProperty(exports, "convertToLegacyGatewayConfig", { enumerable: true, get: function () { return utils_1.convertToLegacyGatewayConfig; } });
// Run config helpers (NEW)
Object.defineProperty(exports, "getInternallyManagedServices", { enumerable: true, get: function () { return utils_1.getInternallyManagedServices; } });
Object.defineProperty(exports, "getExternallyManagedServices", { enumerable: true, get: function () { return utils_1.getExternallyManagedServices; } });
Object.defineProperty(exports, "getServicesByCommand", { enumerable: true, get: function () { return utils_1.getServicesByCommand; } });
Object.defineProperty(exports, "isExternallyManaged", { enumerable: true, get: function () { return utils_1.isExternallyManaged; } });
Object.defineProperty(exports, "getServiceWorkingDirectory", { enumerable: true, get: function () { return utils_1.getServiceWorkingDirectory; } });
Object.defineProperty(exports, "buildServiceEnvironment", { enumerable: true, get: function () { return utils_1.buildServiceEnvironment; } });
// Re-export константы для удобства
exports.BEAUTY_SERVICES = {
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
};
//# sourceMappingURL=index.js.map
