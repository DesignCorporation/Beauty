/**
 * Unified Service Registry - Type Definitions
 * Single source of truth for all Beauty Platform services
 *
 * @version 1.0.0
 * @created 26.09.2025
 */
export declare enum ServiceType {
    Frontend = "frontend",
    Gateway = "gateway",
    Core = "core",
    Business = "business",
    Media = "media",
    AI = "ai",
    Utility = "utility",
    Infrastructure = "infrastructure"
}
export declare enum ServiceCriticality {
    Critical = "critical",// 🔴 Platform won't work without it
    Important = "important",// 🟡 Major features won't work
    Optional = "optional"
}
export declare enum ServiceStatus {
    Active = "active",
    Disabled = "disabled",
    Development = "development",
    Deprecated = "deprecated"
}
export interface EnvironmentVariable {
    name: string;
    defaultValue?: string;
    description?: string;
}
/**
 * Service runtime execution configuration
 */
export interface ServiceRunConfig {
    command: string;
    args: string[];
    cwd: string;
    env?: Record<string, string>;
    managed?: 'internal' | 'external';
    autoStart?: boolean;
}
export interface ServiceConfig {
    id: string;
    name: string;
    description: string;
    port: number;
    directory: string;
    startCommand: string;
    healthEndpoint: string;
    run: ServiceRunConfig;
    type: ServiceType;
    criticality: ServiceCriticality;
    status: ServiceStatus;
    tags?: string[];
    dependencies: string[];
    startOrder?: number;
    timeout: number;
    retries: number;
    warmupTime: number;
    startDelay?: number;
    gatewayPath?: string;
    publicEndpoints?: string[];
    requiredEnvVars: string[];
    optionalEnvVars: EnvironmentVariable[];
    version?: string;
    maintainer?: string;
    documentation?: string;
}
export interface UnifiedServiceRegistry {
    services: Record<string, ServiceConfig>;
    metadata: {
        version: string;
        lastUpdated: string;
        totalServices: number;
        activeServices: number;
        schemaVersion: string;
    };
}
/**
 * Service filter criteria for queries
 */
export interface ServiceFilter {
    type?: ServiceType;
    criticality?: ServiceCriticality;
    status?: ServiceStatus;
    tags?: string[];
    hasHealthEndpoint?: boolean;
    hasGatewayIntegration?: boolean;
}
/**
 * Startup order calculation result
 */
export interface StartupOrder {
    serviceId: string;
    order: number;
    dependencies: string[];
}
//# sourceMappingURL=types.d.ts.map