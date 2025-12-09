/**
 * Unified Service Registry - Utility Functions
 * Helper functions for service management and querying
 *
 * @version 1.0.0
 * @created 26.09.2025
 */
import { ServiceConfig, ServiceType, ServiceCriticality, ServiceStatus, ServiceFilter, StartupOrder } from './types';
/**
 * Find service by ID
 * @param serviceId - Service identifier
 * @returns ServiceConfig or null if not found
 */
export declare function findServiceById(serviceId: string): ServiceConfig | null;
/**
 * Get all services as array
 * @returns Array of all service configurations
 */
export declare function getAllServices(): ServiceConfig[];
/**
 * Filter services by criteria
 * @param filter - Filter criteria
 * @returns Filtered array of services
 */
export declare function filterServices(filter: ServiceFilter): ServiceConfig[];
/**
 * Get services by type
 * @param type - Service type
 * @returns Array of services of specified type
 */
export declare function getServicesByType(type: ServiceType): ServiceConfig[];
/**
 * Get services by criticality
 * @param criticality - Service criticality level
 * @returns Array of services with specified criticality
 */
export declare function getServicesByCriticality(criticality: ServiceCriticality): ServiceConfig[];
/**
 * Get services by status
 * @param status - Service status
 * @returns Array of services with specified status
 */
export declare function getServicesByStatus(status: ServiceStatus): ServiceConfig[];
/**
 * Get services by tags
 * @param tags - Array of tags (service must have ALL tags)
 * @returns Array of services that have all specified tags
 */
export declare function getServicesByTags(tags: string[]): ServiceConfig[];
/**
 * Get active services (status = active)
 * @returns Array of active services
 */
export declare function getActiveServices(): ServiceConfig[];
/**
 * Get critical services (criticality = critical)
 * @returns Array of critical services
 */
export declare function getCriticalServices(): ServiceConfig[];
/**
 * Get frontend services
 * @returns Array of frontend services
 */
export declare function getFrontendServices(): ServiceConfig[];
/**
 * Get backend services
 * @returns Array of backend services
 */
export declare function getBackendServices(): ServiceConfig[];
/**
 * Calculate startup order based on dependencies
 * Performs topological sort to determine correct startup sequence
 * @returns Array of services in startup order
 */
export declare function calculateStartupOrder(): StartupOrder[];
/**
 * Validate service configuration
 * @param service - Service configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export declare function validateServiceConfig(service: ServiceConfig): string[];
/**
 * Get services that depend on a given service
 * @param serviceId - Service ID to check dependents for
 * @returns Array of services that depend on the given service
 */
export declare function getServiceDependents(serviceId: string): ServiceConfig[];
/**
 * Check if service has circular dependencies
 * @param serviceId - Service ID to check
 * @returns true if circular dependency detected
 */
export declare function hasCircularDependency(serviceId: string): boolean;
/**
 * Get service dependency chain
 * @param serviceId - Service ID
 * @returns Array of service IDs in dependency order (dependencies first)
 */
export declare function getServiceDependencyChain(serviceId: string): string[];
/**
 * Get services configured for API Gateway
 * Returns only active services with gatewayPath configured
 * @returns Array of services suitable for gateway routing
 */
export declare function getGatewayServices(): ServiceConfig[];
/**
 * Convert service registry to legacy gateway config format
 * @returns Object compatible with existing API Gateway services config
 */
export declare function convertToLegacyGatewayConfig(): Record<string, any>;
/**
 * Get registry statistics
 * @returns Registry metadata with current statistics
 */
export declare function getRegistryStats(): {
    totalServices: number;
    activeServices: number;
    servicesByType: {
        frontend: number;
        gateway: number;
        core: number;
        business: number;
        media: number;
        ai: number;
        utility: number;
        infrastructure: number;
    };
    servicesByCriticality: {
        critical: number;
        important: number;
        optional: number;
    };
    version: string;
    lastUpdated: string;
    schemaVersion: string;
};
/**
 * Get services that can be managed internally by orchestrator
 * @returns Array of services with run.managed === 'internal'
 */
export declare function getInternallyManagedServices(): ServiceConfig[];
/**
 * Get services that are managed externally (not by orchestrator)
 * @returns Array of services with run.managed === 'external'
 */
export declare function getExternallyManagedServices(): ServiceConfig[];
/**
 * Get services by command type
 * @param command - Command name (e.g., 'pnpm', 'node')
 * @returns Array of services using specified command
 */
export declare function getServicesByCommand(command: string): ServiceConfig[];
/**
 * Check if service is externally managed
 * @param serviceId - Service ID
 * @returns true if service is managed externally
 */
export declare function isExternallyManaged(serviceId: string): boolean;
/**
 * Get full working directory path for service
 * @param service - Service configuration
 * @param projectRoot - Project root path
 * @returns Absolute path to service working directory
 */
export declare function getServiceWorkingDirectory(service: ServiceConfig, projectRoot: string): string;
/**
 * Build environment for service execution
 * CRITICAL: Reads env vars LAZILY from current process.env to pick up dotenv-loaded values
 *
 * @param service - Service configuration
 * @param baseEnv - Base environment variables (usually process.env)
 * @returns Combined environment variables
 */
export declare function buildServiceEnvironment(service: ServiceConfig, baseEnv?: Record<string, string | undefined>): Record<string, string>;
//# sourceMappingURL=utils.d.ts.map