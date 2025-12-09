/**
 * Utility functions for normalizing null/undefined values
 * Converts null → undefined for DTO/HTTP responses with exactOptionalPropertyTypes
 */

/**
 * Normalize optional value: null → undefined
 * Usage: field: normalizeOptional(data.field)
 */
export function normalizeOptional<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Build object with conditional properties (never include undefined)
 * Usage: { ...buildOptional('field', value) }
 */
export function buildOptional<K extends string, T>(
  key: K,
  value: T | null | undefined
): Partial<Record<K, T>> {
  if (value == null) {
    return {};
  }
  const result: Partial<Record<K, T>> = {};
  result[key] = value;
  return result;
}

/**
 * Normalize entire object: all null values → undefined
 * Removes properties that are undefined
 * Usage: normalizeObject({ name: 'John', email: null, phone: undefined })
 * Returns: { name: 'John' }
 */
export function normalizeObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key as keyof T] = value;
    }
  }

  return result;
}

/**
 * Create DTO with normalized optional fields
 * Converts null to undefined, removes undefined properties
 * Usage:
 * const dto = createNormalizedDTO({
 *   clientName: client.name,
 *   email: client.email, // может быть null
 *   phone: client.phone  // может быть null
 * })
 */
export function createNormalizedDTO<T extends Record<string, any>>(data: T): Partial<T> {
  return normalizeObject(data);
}

/**
 * Type guard for optional string
 * Checks if value is non-empty string (not null, not undefined, not empty string)
 */
export function isValidString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Get string value or undefined (never null)
 * Usage: const email = getStringOrUndefined(data.email)
 */
export function getStringOrUndefined(value: string | null | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
