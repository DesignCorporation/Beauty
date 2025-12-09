/**
 * @deprecated This is legacy code. Use Prisma Decimal type instead.
 * @fileoverview Money Value Object
 * @description Представляет денежную сумму с валютой (deprecated)
 * NOTE: Legacy domain code. Use Prisma Decimal type instead.
 */

// Supported currencies
export const SUPPORTED_CURRENCIES = ['EUR', 'PLN', 'UAH', 'USD', 'GBP', 'CZK'] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];

// Legacy Money class - deprecated, use Prisma Decimal type instead
