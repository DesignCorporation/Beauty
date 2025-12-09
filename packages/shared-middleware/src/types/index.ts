/**
 * @fileoverview Shared type definitions for middleware
 * @description Central export point for all type definitions
 */

export type { JWTPayload } from './express';

// Ensure express.d.ts is loaded for global declarations
import './express';
