"use strict";
/**
 * Unified Service Registry - Service Data
 * Complete registry of all Beauty Platform services
 *
 * @version 1.0.0
 * @created 26.09.2025
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIFIED_REGISTRY = void 0;
// CRITICAL: Load environment variables FIRST before reading process.env
require("./env-loader");
const types_1 = require("./types");
/**
 * Complete service configurations for Beauty Platform
 */
const services = {
    // FRONTEND APPLICATIONS
    'landing-page': {
        id: 'landing-page',
        name: 'Landing Page',
        description: 'SEO-optimized marketing landing page for beauty salons',
        port: 6004,
        directory: 'apps/landing-page', // deprecated - use run.cwd
        startCommand: 'PORT=6004 pnpm dev', // deprecated - use run
        healthEndpoint: '/',
        run: {
            command: 'pnpm',
            args: ['dev'],
            cwd: 'apps/landing-page',
            env: { PORT: '6004' },
            managed: 'internal',
            autoStart: true
        },
        type: types_1.ServiceType.Frontend,
        criticality: types_1.ServiceCriticality.Optional,
        status: types_1.ServiceStatus.Active,
        tags: ['ui', 'marketing', 'seo'],
        dependencies: ['api-gateway'],
        timeout: 30000,
        retries: 2,
        warmupTime: 10,
        requiredEnvVars: ['PORT'],
        optionalEnvVars: [
            { name: 'NODE_ENV', defaultValue: 'development', description: 'Application environment' },
            { name: 'NEXT_PUBLIC_API_URL', defaultValue: 'http://localhost:6020', description: 'API Gateway URL for client-side requests' }
        ],
        version: '1.0.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/frontend/landing-page'
    },
    'salon-crm': {
        id: 'salon-crm',
        name: 'Salon CRM',
        description: 'Main CRM application for beauty salon management',
        port: 6001,
        directory: 'apps/salon-crm', // deprecated - use run.cwd
        startCommand: 'VITE_API_URL=/api pnpm dev', // deprecated - use run
        healthEndpoint: '/',
        run: {
            command: 'pnpm',
            args: ['dev'],
            cwd: 'apps/salon-crm',
            env: { VITE_API_URL: '/api' },
            managed: 'internal'
        },
        type: types_1.ServiceType.Frontend,
        criticality: types_1.ServiceCriticality.Critical,
        status: types_1.ServiceStatus.Active,
        tags: ['ui', 'crm', 'tenant-aware', 'business-critical'],
        dependencies: ['salon-api', 'auth-service'],
        timeout: 30000,
        retries: 3,
        warmupTime: 15,
        requiredEnvVars: ['VITE_API_URL'],
        optionalEnvVars: [
            { name: 'VITE_APP_NAME', defaultValue: 'Beauty Platform CRM', description: 'Application display name' },
            { name: 'VITE_DEBUG', defaultValue: 'false', description: 'Enable debug mode' }
        ],
        version: '2.1.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/frontend/salon-crm'
    },
    'admin-panel': {
        id: 'admin-panel',
        name: 'Admin Panel',
        description: 'Administrative dashboard with system monitoring and documentation',
        port: 6002,
        directory: 'apps/admin-panel', // deprecated - use run.cwd
        startCommand: 'pnpm preview', // deprecated - use run
        healthEndpoint: '/',
        run: {
            command: 'pnpm',
            args: ['preview', '--host', '0.0.0.0', '--port', '6002', '--strictPort'],
            cwd: 'apps/admin-panel',
            managed: 'internal'
        },
        type: types_1.ServiceType.Frontend,
        criticality: types_1.ServiceCriticality.Critical,
        status: types_1.ServiceStatus.Active,
        tags: ['ui', 'admin', 'monitoring', 'documentation'],
        dependencies: ['api-gateway', 'auth-service'],
        timeout: 30000,
        retries: 3,
        warmupTime: 15,
        requiredEnvVars: [],
        optionalEnvVars: [
            { name: 'VITE_API_URL', defaultValue: '/api', description: 'API Gateway URL' },
            { name: 'VITE_MONITORING_ENABLED', defaultValue: 'true', description: 'Enable system monitoring features' }
        ],
        version: '1.5.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/frontend/admin-panel'
    },
    'client-booking': {
        id: 'client-booking',
        name: 'Client Portal',
        description: 'Public booking portal for salon clients',
        port: 6003,
        directory: 'apps/client-booking', // deprecated - use run.cwd
        startCommand: 'pnpm dev', // deprecated - use run
        healthEndpoint: '/',
        run: {
            command: 'pnpm',
            args: ['dev'],
            cwd: 'apps/client-booking',
            managed: 'internal',
            autoStart: true
        },
        type: types_1.ServiceType.Frontend,
        criticality: types_1.ServiceCriticality.Optional,
        status: types_1.ServiceStatus.Active,
        tags: ['ui', 'client-facing', 'booking', 'tenant-aware'],
        dependencies: ['api-gateway', 'auth-service'],
        timeout: 30000,
        retries: 2,
        warmupTime: 10,
        requiredEnvVars: [],
        optionalEnvVars: [
            { name: 'VITE_API_URL', defaultValue: '/api', description: 'API Gateway URL' },
            { name: 'VITE_BOOKING_ENABLED', defaultValue: 'true', description: 'Enable booking functionality' }
        ],
        version: '1.2.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/frontend/client-portal'
    },
    // BACKEND SERVICES
    'api-gateway': {
        id: 'api-gateway',
        name: 'API Gateway',
        description: 'Central API gateway handling routing, authentication, and rate limiting',
        port: 6020,
        directory: 'services/api-gateway', // deprecated - use run.cwd
        startCommand: 'pnpm dev', // deprecated - use run
        healthEndpoint: '/health',
        run: {
            command: 'pnpm',
            args: ['start'],
            cwd: 'services/api-gateway',
            // env object REMOVED - using lazy evaluation in buildServiceEnvironment()
            managed: 'internal'
        },
        type: types_1.ServiceType.Gateway,
        criticality: types_1.ServiceCriticality.Critical,
        status: types_1.ServiceStatus.Active,
        tags: ['gateway', 'routing', 'auth', 'rate-limiting'],
        dependencies: [], // Gateway is the orchestrator
        timeout: 15000,
        retries: 3,
        warmupTime: 5,
        // Gateway itself
        publicEndpoints: ['/health', '/api/*', '/auth/*', '/mcp/*'],
        requiredEnvVars: [],
        optionalEnvVars: [
            { name: 'API_GATEWAY_PORT', defaultValue: '6020', description: 'Gateway server port' },
            { name: 'API_GATEWAY_HOST', defaultValue: '0.0.0.0', description: 'Gateway bind host' },
            { name: 'CORS_ORIGINS', defaultValue: 'http://localhost:6001,http://localhost:6002', description: 'Allowed CORS origins' }
        ],
        version: '1.3.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/services/api-gateway'
    },
    'auth-service': {
        id: 'auth-service',
        name: 'Auth Service',
        description: 'Authentication and authorization service with MFA support',
        port: 6021,
        directory: 'services/auth-service', // deprecated - use run.cwd
        startCommand: 'pnpm start', // deprecated - use run
        healthEndpoint: '/health',
        run: {
            command: 'pnpm',
            args: ['start'],
            cwd: 'services/auth-service',
            // env object REMOVED - using lazy evaluation in buildServiceEnvironment()
            // All env vars now read from process.env at runtime + optionalEnvVars defaults
            managed: 'internal'
        },
        type: types_1.ServiceType.Core,
        criticality: types_1.ServiceCriticality.Critical,
        status: types_1.ServiceStatus.Active,
        tags: ['auth', 'mfa', 'jwt', 'tenant-aware'],
        dependencies: ['postgresql'],
        timeout: 30000,
        retries: 3,
        warmupTime: 8,
        gatewayPath: '/auth',
        publicEndpoints: ['/health', '/login', '/register', '/mfa/*'],
        requiredEnvVars: ['MFA_MASTER_KEY', 'DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'],
        optionalEnvVars: [
            { name: 'ACCESS_TOKEN_TTL', defaultValue: '43200', description: 'Access token TTL in seconds (12h)' },
            { name: 'REFRESH_TOKEN_TTL', defaultValue: '604800', description: 'Refresh token TTL in seconds (7d)' },
            { name: 'MFA_TOKEN_TTL', defaultValue: '300', description: 'MFA token TTL in seconds (5min)' },
            { name: 'GOOGLE_CLIENT_ID', defaultValue: 'your-client-id-here', description: 'Google OAuth 2.0 Client ID' },
            { name: 'GOOGLE_CLIENT_SECRET', defaultValue: 'your-client-secret-here', description: 'Google OAuth 2.0 Client Secret' }
        ],
        version: '2.0.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/services/auth-service'
    },
    'salon-api': {
        id: 'salon-api',
        name: 'Salon API',
        description: 'Core salon business logic API for appointments, clients, and services',
        port: 6022,
        directory: 'services/salon-api', // deprecated - use run.cwd
        startCommand: 'pnpm dev', // deprecated - use run
        healthEndpoint: '/health',
        run: {
            command: 'pnpm',
            args: ['start'],
            cwd: 'services/salon-api',
            managed: 'internal'
        },
        type: types_1.ServiceType.Core,
        criticality: types_1.ServiceCriticality.Critical,
        status: types_1.ServiceStatus.Active,
        tags: ['salon', 'business-logic', 'tenant-aware', 'appointments'],
        dependencies: ['postgresql', 'auth-service'],
        timeout: 30000,
        retries: 3,
        warmupTime: 10,
        gatewayPath: '/salon',
        publicEndpoints: ['/health', '/api/appointments', '/api/clients', '/api/services', '/api/staff'],
        requiredEnvVars: ['DATABASE_URL'],
        optionalEnvVars: [
            { name: 'JWT_SECRET', defaultValue: 'shared-secret', description: 'JWT verification secret' },
            { name: 'LOG_LEVEL', defaultValue: 'info', description: 'Application log level' }
        ],
        version: '2.5.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/services/salon-api'
    },
    'mcp-server': {
        id: 'mcp-server',
        name: 'MCP Server',
        description: 'Model Context Protocol server for AI integrations and documentation',
        port: 6025,
        directory: 'services/mcp-server', // deprecated - use run.cwd
        startCommand: 'pnpm dev', // deprecated - use run
        healthEndpoint: '/health',
        run: {
            command: 'pnpm',
            args: ['dev'],
            cwd: 'services/mcp-server',
            managed: 'internal',
            autoStart: true
        },
        type: types_1.ServiceType.AI,
        criticality: types_1.ServiceCriticality.Optional,
        status: types_1.ServiceStatus.Active,
        tags: ['ai', 'mcp', 'documentation', 'context'],
        dependencies: [],
        timeout: 15000,
        retries: 2,
        warmupTime: 5,
        gatewayPath: '/mcp',
        publicEndpoints: ['/health', '/mcp/*', '/docs/*'],
        requiredEnvVars: [],
        optionalEnvVars: [
            { name: 'MCP_PORT', defaultValue: '6025', description: 'MCP server port' },
            { name: 'DOCS_PATH', defaultValue: './docs', description: 'Path to documentation files' }
        ],
        version: '1.1.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/services/mcp-server'
    },
    'images-api': {
        id: 'images-api',
        name: 'Images API',
        description: 'Image upload, processing, and serving service',
        port: 6026,
        directory: 'services/images-api', // deprecated - use run.cwd
        startCommand: 'pnpm dev', // deprecated - use run
        healthEndpoint: '/health',
        run: {
            command: 'pnpm',
            args: ['dev'],
            cwd: 'services/images-api',
            managed: 'internal',
            autoStart: true
        },
        type: types_1.ServiceType.Media,
        criticality: types_1.ServiceCriticality.Optional,
        status: types_1.ServiceStatus.Active,
        tags: ['media', 'images', 'upload', 'processing'],
        dependencies: [],
        timeout: 60000, // Image processing can take time
        retries: 2,
        warmupTime: 8,
        gatewayPath: '/images', // Gateway будет слушать /api/images через router
        publicEndpoints: ['/health', '/upload', '/serve/*'],
        requiredEnvVars: [],
        optionalEnvVars: [
            { name: 'UPLOAD_MAX_SIZE', defaultValue: '10485760', description: 'Max file size in bytes (10MB)' },
            { name: 'UPLOAD_PATH', defaultValue: './uploads', description: 'File upload directory' },
            { name: 'IMAGE_QUALITY', defaultValue: '85', description: 'Default image compression quality' }
        ],
        version: '1.0.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/services/images-api'
    },
    'notification-service': {
        id: 'notification-service',
        name: 'Notification Service',
        description: 'Email, SMS, and push notification delivery service',
        port: 6028,
        directory: 'services/notification-service', // deprecated - use run.cwd
        startCommand: 'pnpm start', // deprecated - use run
        healthEndpoint: '/health',
        run: {
            command: 'pnpm',
            args: ['start'],
            cwd: 'services/notification-service',
            managed: 'internal',
            autoStart: true,
            env: {
                NODE_ENV: process.env.NODE_ENV ?? 'development',
                JWT_SECRET: process.env.JWT_SECRET ?? 'your-development-jwt-secret-key',
                DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://beauty_platform_user:secure_password@localhost:6100/beauty_platform_new',
                SMTP_HOST: process.env.SMTP_HOST ?? '',
                SMTP_PORT: process.env.SMTP_PORT ?? '587',
                SMTP_SECURE: process.env.SMTP_SECURE ?? 'false',
                SMTP_USER: process.env.SMTP_USER ?? '',
                SMTP_PASS: process.env.SMTP_PASS ?? '',
                EMAIL_FROM: process.env.EMAIL_FROM ?? 'Beauty Platform <noreply@designcorp.eu>'
            }
        },
        type: types_1.ServiceType.Core,
        criticality: types_1.ServiceCriticality.Optional,
        status: types_1.ServiceStatus.Active,
        tags: ['notifications', 'email', 'sms', 'tenant-aware'],
        dependencies: ['postgresql'],
        timeout: 20000,
        retries: 2,
        warmupTime: 6,
        gatewayPath: '/notifications',
        publicEndpoints: ['/health', '/api/send', '/api/status'],
        requiredEnvVars: ['DATABASE_URL', 'JWT_SECRET'],
        optionalEnvVars: [
            { name: 'SMTP_HOST', defaultValue: 'localhost', description: 'SMTP server host' },
            { name: 'SMTP_PORT', defaultValue: '587', description: 'SMTP server port' },
            { name: 'FROM_EMAIL', defaultValue: 'noreply@beauty-platform.com', description: 'Default sender email' }
        ],
        version: '1.2.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/services/notification-service'
    },
    'payment-service': {
        id: 'payment-service',
        name: 'Payment Service',
        description: 'Payment processing with Stripe/PayPal integration and invoice generation',
        port: 6029,
        directory: 'services/payment-service', // deprecated - use run.cwd
        startCommand: 'pnpm dev', // deprecated - use run
        healthEndpoint: '/health',
        run: {
            command: 'pnpm',
            args: ['dev'],
            cwd: 'services/payment-service',
            managed: 'internal',
            autoStart: true
        },
        type: types_1.ServiceType.Business,
        criticality: types_1.ServiceCriticality.Optional,
        status: types_1.ServiceStatus.Active,
        tags: ['payments', 'stripe', 'paypal', 'invoices', 'tenant-aware'],
        dependencies: ['postgresql', 'notification-service'],
        timeout: 45000,
        retries: 3,
        warmupTime: 12,
        gatewayPath: '/payments',
        publicEndpoints: ['/health', '/api/payments', '/webhooks/*', '/api/invoices'],
        requiredEnvVars: ['DATABASE_URL'],
        optionalEnvVars: [
            { name: 'STRIPE_SECRET_KEY', defaultValue: '', description: 'Stripe secret key for live payments' },
            { name: 'PAYPAL_CLIENT_ID', defaultValue: '', description: 'PayPal client ID' },
            { name: 'SUPPORTED_CURRENCIES', defaultValue: 'EUR,USD,PLN,GBP', description: 'Comma-separated list of supported currencies' },
            { name: 'DEFAULT_CURRENCY', defaultValue: 'EUR', description: 'Default platform currency' }
        ],
        version: '1.6.0',
        maintainer: 'Design Corporation',
        documentation: '/docs/services/payment-service'
    },
    // INFRASTRUCTURE & DISABLED SERVICES
    'postgresql': {
        id: 'postgresql',
        name: 'PostgreSQL Database',
        description: 'Primary database with multi-tenant support',
        port: 6100,
        directory: 'external', // deprecated - use run.cwd
        startCommand: 'systemctl start postgresql', // deprecated - use run
        healthEndpoint: '/custom-health',
        run: {
            command: '',
            args: [],
            cwd: '.',
            managed: 'external'
        },
        type: types_1.ServiceType.Infrastructure,
        criticality: types_1.ServiceCriticality.Critical,
        status: types_1.ServiceStatus.Active,
        tags: ['database', 'postgresql', 'tenant-isolation'],
        dependencies: [],
        timeout: 10000,
        retries: 5,
        warmupTime: 30,
        requiredEnvVars: [],
        optionalEnvVars: [
            { name: 'POSTGRES_DB', defaultValue: 'beauty_platform_new', description: 'Database name' },
            { name: 'POSTGRES_USER', defaultValue: 'beauty_platform_user', description: 'Database user' },
            { name: 'POSTGRES_PASSWORD', defaultValue: 'secure_password', description: 'Database password' }
        ],
        version: '16.0',
        maintainer: 'System Admin',
        documentation: '/docs/infrastructure/postgresql'
    },
    'backup-service': {
        id: 'backup-service',
        name: 'Backup Service',
        description: 'Automated database and file backup service',
        port: 6027,
        directory: 'services/backup-service', // deprecated - use run.cwd
        startCommand: 'pnpm dev', // deprecated - use run
        healthEndpoint: '/health',
        run: {
            command: 'pnpm',
            args: ['dev'],
            cwd: 'services/backup-service',
            managed: 'internal',
            autoStart: true
        },
        type: types_1.ServiceType.Utility,
        criticality: types_1.ServiceCriticality.Optional,
        status: types_1.ServiceStatus.Active,
        tags: ['backup', 'automation', 'database'],
        dependencies: ['postgresql'],
        timeout: 60000, // Backup operations can take time
        retries: 2,
        warmupTime: 15,
        gatewayPath: '/backup',
        publicEndpoints: ['/health', '/api/backup', '/api/restore'],
        requiredEnvVars: ['DATABASE_URL'],
        optionalEnvVars: [
            { name: 'BACKUP_SCHEDULE', defaultValue: '0 3 * * *', description: 'Cron schedule for automatic backups' },
            { name: 'BACKUP_RETENTION', defaultValue: '30', description: 'Days to retain backups' }
        ],
        version: '1.0.0',
        maintainer: 'System Admin',
        documentation: '/docs/services/backup-service'
    }
};
/**
 * Unified Service Registry instance
 */
exports.UNIFIED_REGISTRY = {
    services,
    metadata: {
        version: '1.0.0',
        lastUpdated: '2025-09-26T11:00:00Z',
        totalServices: Object.keys(services).length,
        activeServices: Object.values(services).filter(s => s.status === types_1.ServiceStatus.Active).length,
        schemaVersion: '1.0'
    }
};
exports.default = exports.UNIFIED_REGISTRY;
//# sourceMappingURL=registry.js.map
