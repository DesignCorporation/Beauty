/**
 * @fileoverview Beauty Platform Core - Main entry point
 * @description Центральная точка экспорта для всего ядра системы
 */

// Shared types and utilities
export * from '../shared/src';

// Database utilities
export * from '../database/src';

// NOTE: Legacy domain modules (domain/entities, domain/services, domain/events, etc.)
// have been deprecated and removed. Use imports directly from shared/ or database/ instead.