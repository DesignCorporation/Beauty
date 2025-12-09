/**
 * @deprecated This is legacy code. Use Prisma models instead.
 * @fileoverview Salon Domain Entity
 * @description Основная доменная сущность - Салон красоты (deprecated)
 * NOTE: This is legacy code. Direct imports are deprecated.
 */

// import { z } from 'zod'; // TODO: Uncomment when zod resolution is fixed
// import { BaseEntity } from './BaseEntity';

// Validation schemas (deprecated - use Prisma instead)
// export const SalonPropsSchema = z.object({...});

// Legacy type definition (for backwards compatibility only)
export type SalonProps = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  domain?: string;
  logoUrl?: string;
  baseCurrency: string;
  supportedLanguages: string[];
  defaultLanguage: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * @deprecated This is legacy code. Use Prisma models (Tenant) instead.
 * Salon - Корневая доменная сущность (Aggregate Root) - DEPRECATED
 * Представляет салон красоты в системе
 */

// Legacy implementation removed - use Prisma models instead
// class Salon extends BaseEntity {
//   Legacy code commented out - use @beauty-platform/database for models
// }