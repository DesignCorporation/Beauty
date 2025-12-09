// Main export file for @beauty-platform/shared-middleware
export { AuthMiddleware } from './auth';
export * from './types';

// Convenience exports for common use cases
import { AuthMiddleware } from './auth';

/**
 * Create a pre-configured auth middleware instance
 * @param serviceName - Name of the service using this middleware
 * @param logPath - Optional path for auth logs
 * @returns Configured AuthMiddleware instance
 */
export function createAuthMiddleware(serviceName: string, logPath?: string): AuthMiddleware {
  return new AuthMiddleware({
    serviceName,
    logPath: logPath || `/root/beauty-platform/logs/${serviceName}-auth.log`,
    enableLogging: true
  });
}

/**
 * Quick setup for standard microservice authentication
 * @param serviceName - Name of the service
 * @returns Object with commonly used middleware functions
 */
export function setupAuth(serviceName: string) {
  const auth = createAuthMiddleware(serviceName);

  return {
    authenticate: auth.authenticate,
    optionalAuth: auth.optionalAuth,
    requireTenant: auth.requireTenant,
    validateTenantAccess: auth.validateTenantAccess,
    // Combined middleware for tenant-isolated endpoints
    requireTenantAuth: [auth.authenticate, auth.requireTenant],
    // Combined middleware for strict tenant validation
    strictTenantAuth: [auth.authenticate, auth.requireTenant, auth.validateTenantAccess]
  };
}