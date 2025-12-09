// Temporary fix to start Auth Service with proper Prisma config
process.env.ENABLE_TRACING = 'false';
process.env.MFA_MASTER_KEY = '49dd29bc186073af4bdb05f6fd074317a6045409f1ef540696ed05ad09b38c1b';
process.env.NODE_ENV = 'development';
process.env.PORT = '6021';

// Set Prisma engine flags to prevent crash
process.env.PRISMA_ENGINE_PROTOCOL = 'json';
process.env.PRISMA_TELEMETRY_DISABLED = 'true';

require('tsx/esm').register();
require('./src/server.ts');