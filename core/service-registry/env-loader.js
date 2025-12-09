"use strict";
/**
 * Environment Loader
 * CRITICAL: This must be imported FIRST in registry.ts
 * Loads .env files before service-registry reads process.env
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const node_path_1 = __importDefault(require("node:path"));
// Determine project root (3 levels up from core/service-registry/)
const projectRoot = node_path_1.default.resolve(__dirname, '..', '..');
// Load .env files in priority order
(0, dotenv_1.config)({ path: node_path_1.default.join(projectRoot, '.env') });
(0, dotenv_1.config)({ path: node_path_1.default.join(projectRoot, '.env.development') });
(0, dotenv_1.config)(); // Also load from current directory
// Log loaded status for debugging
console.log('[env-loader] Environment variables loaded from:', node_path_1.default.join(projectRoot, '.env'));
console.log('[env-loader] GOOGLE_CLIENT_ID available:', !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-client-id-here');
//# sourceMappingURL=env-loader.js.map