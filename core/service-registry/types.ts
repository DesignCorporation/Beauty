/**
 * Unified Service Registry - Type Definitions
 * Single source of truth for all Beauty Platform services
 *
 * @version 1.0.0
 * @created 26.09.2025
 */

export enum ServiceType {
  Frontend = 'frontend',
  Gateway = 'gateway',
  Core = 'core',
  Business = 'business',
  Media = 'media',
  AI = 'ai',
  Utility = 'utility',
  Infrastructure = 'infrastructure'
}

export enum ServiceCriticality {
  Critical = 'critical',      // 🔴 Platform won't work without it
  Important = 'important',    // 🟡 Major features won't work
  Optional = 'optional'       // 🔶 Nice to have, degraded experience
}

export enum ServiceStatus {
  Active = 'active',
  Disabled = 'disabled',
  Development = 'development',
  Deprecated = 'deprecated'
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
  command: string;                     // Executable command (e.g., 'pnpm', 'node', 'systemctl')
  args: string[];                      // Command arguments (e.g., ['dev'], ['src/server.js'])
  cwd: string;                         // Working directory relative to project root
  env?: Record<string, string>;        // Additional environment variables
  managed?: 'internal' | 'external';   // Management type - default 'internal'
  autoStart?: boolean;                // Should the orchestrator auto-start this service on init
}

export interface ServiceConfig {
  // Identity
  id: string;                    // Unique service identifier (kebab-case)
  name: string;                  // Human readable name
  description: string;           // Brief description of service purpose

  // Runtime Configuration
  port: number;                  // Service port
  directory: string;             // Relative path from project root (deprecated - use run.cwd)
  startCommand: string;          // Command to start service (deprecated - use run)
  healthEndpoint: string;        // Health check endpoint path
  run: ServiceRunConfig;         // Service execution configuration

  // Classification & Tagging
  type: ServiceType;             // Service category
  criticality: ServiceCriticality; // How critical for platform operation
  status: ServiceStatus;         // Current operational status
  tags?: string[];               // Custom tags for filtering (e.g., ['ui', 'tenant-aware'])

  // Dependencies & Ordering
  dependencies: string[];        // Service IDs this service depends on
  startOrder?: number;           // Optional startup priority (auto-calculated if not provided)

  // Health & Monitoring
  timeout: number;              // Health check timeout (ms)
  retries: number;              // Health check retry attempts
  warmupTime: number;           // Seconds to wait after start before health checks
  startDelay?: number;          // Seconds to wait before starting service (for dependency timing)

  // Gateway Integration (if applicable)
  gatewayPath?: string;         // API Gateway route prefix
  publicEndpoints?: string[];   // Public endpoints exposed through gateway

  // Environment Variables
  requiredEnvVars: string[];           // Required environment variables
  optionalEnvVars: EnvironmentVariable[]; // Optional env vars with defaults and descriptions

  // Metadata
  version?: string;             // Service version
  maintainer?: string;          // Team/person responsible
  documentation?: string;       // Link to service documentation
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
