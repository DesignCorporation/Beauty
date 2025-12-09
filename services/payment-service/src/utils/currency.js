/**
 * 💰 Currency validation and tenant defaults
 *
 * Environment variables:
 * - SUPPORTED_CURRENCIES="EUR,USD,PLN,GBP" (CSV)
 * - DEFAULT_CURRENCY="EUR"
 * - TENANT_DEFAULT_CURRENCY="TENANT_A=EUR,TENANT_B=USD"
 *
 * Policy: request → tenant map → default → 'EUR'
 */

const FALLBACK_DEFAULT_CURRENCY = 'EUR';

/**
 * Parse supported currencies from CSV string
 * @param {string} csvString - "EUR,USD,PLN,GBP"
 * @returns {Set<string>} - Set of uppercase currency codes
 */
function parseSupportedCurrencies(csvString) {
  if (!csvString || typeof csvString !== 'string') {
    return new Set(['EUR', 'USD', 'PLN', 'GBP']); // Default set
  }

  return new Set(
    csvString
      .split(',')
      .map(c => c.trim().toUpperCase())
      .filter(c => c.length === 3) // ISO currency codes are 3 chars
  );
}

/**
 * Parse tenant currency mapping from ENV
 * @param {string} mapString - "TENANT_A=EUR,TENANT_B=USD"
 * @returns {Object} - { [tenantId]: currency }
 */
function parseTenantCurrencyMap(mapString) {
  const map = {};

  if (!mapString || typeof mapString !== 'string') {
    return map;
  }

  mapString.split(',').forEach(pair => {
    const [tenantId, currency] = pair.split('=').map(s => s.trim());
    if (tenantId && currency && currency.length === 3) {
      map[tenantId] = currency.toUpperCase();
    }
  });

  return map;
}

/**
 * Get default currency for tenant
 * @param {string} tenantId - Tenant identifier
 * @returns {string} - Uppercase currency code
 */
function getTenantDefaultCurrency(tenantId) {
  // Parse tenant mapping each time (could be cached for performance)
  const tenantMap = parseTenantCurrencyMap(process.env.TENANT_DEFAULT_CURRENCY);

  return tenantMap[tenantId] ||
         process.env.DEFAULT_CURRENCY?.toUpperCase() ||
         FALLBACK_DEFAULT_CURRENCY;
}

/**
 * Normalize and validate currency input
 * @param {Object} options
 * @param {string} options.input - Currency from request (can be undefined)
 * @param {string} options.tenantId - Tenant ID for default lookup
 * @returns {Object} - { currency: 'USD' } or throws error
 * @throws {Error} - 400 validation error
 */
function normalizeAndValidateCurrency({ input, tenantId }) {
  const supportedCurrencies = parseSupportedCurrencies(process.env.SUPPORTED_CURRENCIES);

  let currency;

  if (input) {
    // Explicit currency provided - validate
    currency = input.toUpperCase();

    if (!supportedCurrencies.has(currency)) {
      const error = new Error(`Unsupported currency: ${currency}. Supported currencies: ${Array.from(supportedCurrencies).join(', ')}`);
      error.status = 400;
      error.code = 'UNSUPPORTED_CURRENCY';
      throw error;
    }
  } else {
    // No currency provided - use tenant default
    currency = getTenantDefaultCurrency(tenantId);

    // Double-check tenant default is supported
    if (!supportedCurrencies.has(currency)) {
      console.warn(`[CURRENCY] Tenant ${tenantId} default currency ${currency} not in supported list, falling back to EUR`);
      currency = FALLBACK_DEFAULT_CURRENCY;
    }
  }

  return { currency };
}

/**
 * Convert currency to lowercase for provider SDKs
 * @param {string} currency - Uppercase currency ('USD')
 * @returns {string} - Lowercase currency ('usd')
 */
function currencyForProvider(currency) {
  return currency.toLowerCase();
}

module.exports = {
  parseSupportedCurrencies,
  parseTenantCurrencyMap,
  getTenantDefaultCurrency,
  normalizeAndValidateCurrency,
  currencyForProvider
};