/**
 * Environment Loader
 * CRITICAL: This must be imported FIRST in registry.ts
 * Loads .env files before service-registry reads process.env
 */

import { config } from 'dotenv';
import path from 'node:path';

// Determine project root (3 levels up from core/service-registry/)
const projectRoot = path.resolve(__dirname, '..', '..');

// Load .env files in priority order
config({ path: path.join(projectRoot, '.env') });
config({ path: path.join(projectRoot, '.env.development') });
config();  // Also load from current directory

// Log loaded status for debugging
console.log('[env-loader] Environment variables loaded from:', path.join(projectRoot, '.env'));
console.log('[env-loader] GOOGLE_CLIENT_ID available:', !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-client-id-here');
