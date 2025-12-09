"use strict";
/**
 * Unified Service Registry - Utility Functions
 * Helper functions for service management and querying
 *
 * @version 1.0.0
 * @created 26.09.2025
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findServiceById = findServiceById;
exports.getAllServices = getAllServices;
exports.filterServices = filterServices;
exports.getServicesByType = getServicesByType;
exports.getServicesByCriticality = getServicesByCriticality;
exports.getServicesByStatus = getServicesByStatus;
exports.getServicesByTags = getServicesByTags;
exports.getActiveServices = getActiveServices;
exports.getCriticalServices = getCriticalServices;
exports.getFrontendServices = getFrontendServices;
exports.getBackendServices = getBackendServices;
exports.calculateStartupOrder = calculateStartupOrder;
exports.validateServiceConfig = validateServiceConfig;
exports.getServiceDependents = getServiceDependents;
exports.hasCircularDependency = hasCircularDependency;
exports.getServiceDependencyChain = getServiceDependencyChain;
exports.getGatewayServices = getGatewayServices;
exports.convertToLegacyGatewayConfig = convertToLegacyGatewayConfig;
exports.getRegistryStats = getRegistryStats;
exports.getInternallyManagedServices = getInternallyManagedServices;
exports.getExternallyManagedServices = getExternallyManagedServices;
exports.getServicesByCommand = getServicesByCommand;
exports.isExternallyManaged = isExternallyManaged;
exports.getServiceWorkingDirectory = getServiceWorkingDirectory;
exports.buildServiceEnvironment = buildServiceEnvironment;
const node_path_1 = __importDefault(require("node:path"));
const node_process_1 = __importDefault(require("node:process"));
const types_1 = require("./types");
const registry_1 = require("./registry");
/**
 * Find service by ID
 * @param serviceId - Service identifier
 * @returns ServiceConfig or null if not found
 */
function findServiceById(serviceId) {
    return registry_1.UNIFIED_REGISTRY.services[serviceId] || null;
}
/**
 * Get all services as array
 * @returns Array of all service configurations
 */
function getAllServices() {
    return Object.values(registry_1.UNIFIED_REGISTRY.services);
}
/**
 * Filter services by criteria
 * @param filter - Filter criteria
 * @returns Filtered array of services
 */
function filterServices(filter) {
    return getAllServices().filter(service => {
        // Type filter
        if (filter.type && service.type !== filter.type) {
            return false;
        }
        // Criticality filter
        if (filter.criticality && service.criticality !== filter.criticality) {
            return false;
        }
        // Status filter
        if (filter.status && service.status !== filter.status) {
            return false;
        }
        // Tags filter (service must have ALL specified tags)
        if (filter.tags && filter.tags.length > 0) {
            if (!service.tags || !filter.tags.every(tag => service.tags.includes(tag))) {
                return false;
            }
        }
        // Health endpoint filter
        if (filter.hasHealthEndpoint !== undefined) {
            const hasHealth = service.healthEndpoint !== '';
            if (filter.hasHealthEndpoint !== hasHealth) {
                return false;
            }
        }
        // Gateway integration filter
        if (filter.hasGatewayIntegration !== undefined) {
            const hasGateway = service.gatewayPath !== undefined;
            if (filter.hasGatewayIntegration !== hasGateway) {
                return false;
            }
        }
        return true;
    });
}
/**
 * Get services by type
 * @param type - Service type
 * @returns Array of services of specified type
 */
function getServicesByType(type) {
    return filterServices({ type });
}
/**
 * Get services by criticality
 * @param criticality - Service criticality level
 * @returns Array of services with specified criticality
 */
function getServicesByCriticality(criticality) {
    return filterServices({ criticality });
}
/**
 * Get services by status
 * @param status - Service status
 * @returns Array of services with specified status
 */
function getServicesByStatus(status) {
    return filterServices({ status });
}
/**
 * Get services by tags
 * @param tags - Array of tags (service must have ALL tags)
 * @returns Array of services that have all specified tags
 */
function getServicesByTags(tags) {
    return filterServices({ tags });
}
/**
 * Get active services (status = active)
 * @returns Array of active services
 */
function getActiveServices() {
    return getServicesByStatus(types_1.ServiceStatus.Active);
}
/**
 * Get critical services (criticality = critical)
 * @returns Array of critical services
 */
function getCriticalServices() {
    return getServicesByCriticality(types_1.ServiceCriticality.Critical);
}
/**
 * Get frontend services
 * @returns Array of frontend services
 */
function getFrontendServices() {
    return getServicesByType(types_1.ServiceType.Frontend);
}
/**
 * Get backend services
 * @returns Array of backend services
 */
function getBackendServices() {
    const backendTypes = [types_1.ServiceType.Gateway, types_1.ServiceType.Core, types_1.ServiceType.Business];
    return getAllServices().filter(service => backendTypes.includes(service.type));
}
/**
 * Calculate startup order based on dependencies
 * Performs topological sort to determine correct startup sequence
 * @returns Array of services in startup order
 */
function calculateStartupOrder() {
    const services = getAllServices();
    const serviceMap = new Map(services.map(s => [s.id, s]));
    const visited = new Set();
    const visiting = new Set();
    const result = [];
    let currentOrder = 0;
    function visit(serviceId) {
        if (visited.has(serviceId))
            return;
        if (visiting.has(serviceId)) {
            throw new Error(`Circular dependency detected involving service: ${serviceId}`);
        }
        visiting.add(serviceId);
        const service = serviceMap.get(serviceId);
        if (service) {
            // Visit all dependencies first
            for (const depId of service.dependencies) {
                if (serviceMap.has(depId)) {
                    visit(depId);
                }
            }
        }
        visiting.delete(serviceId);
        visited.add(serviceId);
        if (service) {
            result.push({
                serviceId,
                order: service.startOrder || currentOrder++,
                dependencies: service.dependencies
            });
        }
    }
    // Visit all services
    for (const service of services) {
        visit(service.id);
    }
    // Sort by order (manual startOrder takes precedence over calculated)
    return result.sort((a, b) => a.order - b.order);
}
/**
 * Validate service configuration
 * @param service - Service configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
function validateServiceConfig(service) {
    const errors = [];
    // Required fields
    if (!service.id.trim())
        errors.push('Service ID is required');
    if (!service.name.trim())
        errors.push('Service name is required');
    if (!service.description.trim())
        errors.push('Service description is required');
    if (!service.directory.trim())
        errors.push('Service directory is required');
    if (!service.startCommand.trim())
        errors.push('Start command is required');
    // Run config validation
    if (!service.run) {
        errors.push('Run configuration is required');
    }
    else {
        if (!service.run.cwd?.trim())
            errors.push('Run.cwd is required');
        if (service.run.managed === 'internal' && !service.run.command?.trim()) {
            errors.push('Run.command is required for internally managed services');
        }
        if (service.run.managed !== 'internal' && service.run.managed !== 'external') {
            errors.push('Run.managed must be either "internal" or "external"');
        }
    }
    // Port validation
    if (service.port < 1 || service.port > 65535) {
        errors.push('Port must be between 1 and 65535');
    }
    // Timeout validation
    if (service.timeout <= 0) {
        errors.push('Timeout must be positive');
    }
    // Retries validation
    if (service.retries < 0) {
        errors.push('Retries cannot be negative');
    }
    // Warmup time validation
    if (service.warmupTime < 0) {
        errors.push('Warmup time cannot be negative');
    }
    // Health endpoint validation
    if (service.healthEndpoint && !service.healthEndpoint.startsWith('/')) {
        errors.push('Health endpoint must start with /');
    }
    // Gateway path validation
    if (service.gatewayPath && !service.gatewayPath.startsWith('/')) {
        errors.push('Gateway path must start with /');
    }
    // ID format validation (kebab-case)
    if (!/^[a-z0-9-]+$/.test(service.id)) {
        errors.push('Service ID must be kebab-case (lowercase letters, numbers, hyphens only)');
    }
    return errors;
}
/**
 * Get services that depend on a given service
 * @param serviceId - Service ID to check dependents for
 * @returns Array of services that depend on the given service
 */
function getServiceDependents(serviceId) {
    return getAllServices().filter(service => service.dependencies.includes(serviceId));
}
/**
 * Check if service has circular dependencies
 * @param serviceId - Service ID to check
 * @returns true if circular dependency detected
 */
function hasCircularDependency(serviceId) {
    try {
        calculateStartupOrder();
        return false;
    }
    catch (error) {
        return error instanceof Error && error.message.includes(serviceId);
    }
}
/**
 * Get service dependency chain
 * @param serviceId - Service ID
 * @returns Array of service IDs in dependency order (dependencies first)
 */
function getServiceDependencyChain(serviceId) {
    const service = findServiceById(serviceId);
    if (!service)
        return [];
    const chain = [];
    const visited = new Set();
    function addDependencies(currentId) {
        if (visited.has(currentId))
            return;
        visited.add(currentId);
        const currentService = findServiceById(currentId);
        if (currentService) {
            // Add dependencies first
            for (const depId of currentService.dependencies) {
                addDependencies(depId);
            }
            // Then add current service
            if (!chain.includes(currentId)) {
                chain.push(currentId);
            }
        }
    }
    addDependencies(serviceId);
    return chain;
}
/**
 * Get services configured for API Gateway
 * Returns only active services with gatewayPath configured
 * @returns Array of services suitable for gateway routing
 */
function getGatewayServices() {
    return filterServices({
        status: types_1.ServiceStatus.Active,
        hasGatewayIntegration: true
    });
}
/**
 * Convert service registry to legacy gateway config format
 * @returns Object compatible with existing API Gateway services config
 */
function convertToLegacyGatewayConfig() {
    const gatewayServices = getGatewayServices();
    const legacyConfig = {};
    for (const service of gatewayServices) {
        if (service.gatewayPath) {
            legacyConfig[service.id] = {
                name: service.name,
                url: `http://localhost:${service.port}`,
                path: service.gatewayPath,
                timeout: service.timeout,
                retries: service.retries,
                healthCheck: service.healthEndpoint
            };
        }
    }
    return legacyConfig;
}
/**
 * Get registry statistics
 * @returns Registry metadata with current statistics
 */
function getRegistryStats() {
    const services = getAllServices();
    const activeServices = getActiveServices();
    return {
        ...registry_1.UNIFIED_REGISTRY.metadata,
        totalServices: services.length,
        activeServices: activeServices.length,
        servicesByType: {
            [types_1.ServiceType.Frontend]: getServicesByType(types_1.ServiceType.Frontend).length,
            [types_1.ServiceType.Gateway]: getServicesByType(types_1.ServiceType.Gateway).length,
            [types_1.ServiceType.Core]: getServicesByType(types_1.ServiceType.Core).length,
            [types_1.ServiceType.Business]: getServicesByType(types_1.ServiceType.Business).length,
            [types_1.ServiceType.Media]: getServicesByType(types_1.ServiceType.Media).length,
            [types_1.ServiceType.AI]: getServicesByType(types_1.ServiceType.AI).length,
            [types_1.ServiceType.Utility]: getServicesByType(types_1.ServiceType.Utility).length,
            [types_1.ServiceType.Infrastructure]: getServicesByType(types_1.ServiceType.Infrastructure).length,
        },
        servicesByCriticality: {
            [types_1.ServiceCriticality.Critical]: getCriticalServices().length,
            [types_1.ServiceCriticality.Important]: getServicesByCriticality(types_1.ServiceCriticality.Important).length,
            [types_1.ServiceCriticality.Optional]: getServicesByCriticality(types_1.ServiceCriticality.Optional).length,
        }
    };
}
// ========== NEW RUN CONFIG HELPERS ==========
/**
 * Get services that can be managed internally by orchestrator
 * @returns Array of services with run.managed === 'internal'
 */
function getInternallyManagedServices() {
    return getAllServices().filter(service => service.run?.managed !== 'external');
}
/**
 * Get services that are managed externally (not by orchestrator)
 * @returns Array of services with run.managed === 'external'
 */
function getExternallyManagedServices() {
    return getAllServices().filter(service => service.run?.managed === 'external');
}
/**
 * Get services by command type
 * @param command - Command name (e.g., 'pnpm', 'node')
 * @returns Array of services using specified command
 */
function getServicesByCommand(command) {
    return getAllServices().filter(service => service.run?.command === command);
}
/**
 * Check if service is externally managed
 * @param serviceId - Service ID
 * @returns true if service is managed externally
 */
function isExternallyManaged(serviceId) {
    const service = findServiceById(serviceId);
    return service?.run?.managed === 'external';
}
/**
 * Get full working directory path for service
 * @param service - Service configuration
 * @param projectRoot - Project root path
 * @returns Absolute path to service working directory
 */
function getServiceWorkingDirectory(service, projectRoot) {
    const cwd = service.run?.cwd || service.directory; // fallback to legacy directory
    return node_path_1.default.resolve(projectRoot, cwd);
}
/**
 * Build environment for service execution
 * CRITICAL: Reads env vars LAZILY from current process.env to pick up dotenv-loaded values
 *
 * @param service - Service configuration
 * @param baseEnv - Base environment variables (usually process.env)
 * @returns Combined environment variables
 */
function buildServiceEnvironment(service, baseEnv = node_process_1.default.env) {
    const env = {
        ...baseEnv,
        PORT: service.port.toString()
    };
    // Apply optional env vars with defaults (read LAZILY from current process.env)
    // This ensures we pick up values loaded by dotenv AFTER module import
    if (service.optionalEnvVars) {
        for (const envVar of service.optionalEnvVars) {
            const currentValue = baseEnv[envVar.name];
            if (!currentValue && envVar.defaultValue) {
                env[envVar.name] = envVar.defaultValue;
            }
            else if (currentValue) {
                env[envVar.name] = currentValue;
            }
        }
    }
    // DO NOT use service.run.env as it contains "baked-in" values from module import time
    // Instead, we rely on baseEnv (current process.env) + optionalEnvVars defaults
    return env;
}
//# sourceMappingURL=utils.js.map