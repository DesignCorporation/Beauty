/**
 * Issue #79: Appointment calculation utilities
 * Helpers for endAt, totalPrice, totalDuration calculations
 */

import { type TenantRequest } from '../middleware/tenant';
import type { ServiceDurationAndPrice } from '../types/appointment';

/**
 * Calculate endAt timestamp based on startAt and total service duration
 * @param startAt - ISO datetime string (UTC)
 * @param totalDurationMinutes - Sum of all service durations
 * @returns ISO datetime string (UTC)
 */
export function calculateEndAt(startAt: string, totalDurationMinutes: number): Date {
  const start = new Date(startAt);
  if (isNaN(start.getTime())) {
    throw new Error(`Invalid startAt datetime: ${startAt}`);
  }
  return new Date(start.getTime() + totalDurationMinutes * 60 * 1000);
}

/**
 * Calculate total price from services
 * @param services - Array of services with price info
 * @returns Sum of prices as number
 */
export function calculateTotalPrice(services: ServiceDurationAndPrice[]): number {
  if (services.length === 0) {
    return 0;
  }
  return services.reduce((sum, service) => sum + (service.price || 0), 0);
}

/**
 * Calculate total duration from services
 * @param services - Array of services with duration info
 * @returns Sum of durations in minutes
 */
export function calculateTotalDuration(services: ServiceDurationAndPrice[]): number {
  if (services.length === 0) {
    return 0;
  }
  return services.reduce((sum, service) => sum + (service.duration || 0), 0);
}

/**
 * Get currency from services
 * Assumes all services in one appointment use the same currency
 * @param services - Array of services
 * @returns Currency code (e.g., 'EUR', 'PLN')
 */
export function getCurrency(services: ServiceDurationAndPrice[], defaultCurrency = 'PLN'): string {
  if (services.length === 0) {
    return defaultCurrency;
  }
  // Use currency from first service, assume all are same
  return services[0]?.currency || defaultCurrency;
}

/**
 * Validate appointment times
 * @param startAt - ISO datetime string
 * @param endAt - ISO datetime string
 * @throws Error if invalid
 */
export function validateAppointmentTimes(startAt: string, endAt: string): void {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (isNaN(start.getTime())) {
    throw new Error(`Invalid startAt datetime: ${startAt}`);
  }

  if (isNaN(end.getTime())) {
    throw new Error(`Invalid endAt datetime: ${endAt}`);
  }

  if (end <= start) {
    throw new Error('endAt must be after startAt');
  }
}

/**
 * Format appointment times for response
 * @param startAt - Date object
 * @param endAt - Date object
 * @returns Object with ISO strings
 */
export function formatAppointmentTimes(startAt: Date, endAt: Date) {
  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString()
  };
}

/**
 * Check for appointment time conflicts
 * Used to detect overlapping appointments for the same staff member
 */
export function hasTimeConflict(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date
): boolean {
  // Appointments conflict if they overlap at all
  return newStart < existingEnd && newEnd > existingStart;
}

/**
 * Normalize Prisma Decimal to number
 * @param value - Decimal or number
 * @returns number
 */
export function toNumber(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return parseFloat(value);
  }
  if (value?.toNumber) {
    return value.toNumber();
  }
  return Number(value) || 0;
}
