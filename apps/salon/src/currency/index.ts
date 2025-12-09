// Currency management system для Beauty Platform Salon CRM
// Поддержка: USD, EUR, PLN, UAH (без RUB согласно проектной политике)

export interface Currency {
  code: string
  name: string
  symbol: string
  flag: string
  defaultLocale: string
}

// Поддерживаемые валюты - соответствует Prisma enum Currency
export const supportedCurrencies: Currency[] = [
  {
    code: 'PLN',
    name: 'Polish Zloty',
    symbol: 'zł',
    flag: '🇵🇱',
    defaultLocale: 'pl-PL'
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    defaultLocale: 'en-EU'
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    defaultLocale: 'en-US'
  },
  {
    code: 'UAH',
    name: 'Ukrainian Hryvnia',
    symbol: '₴',
    flag: '🇺🇦',
    defaultLocale: 'uk-UA'
  }
]

export type SupportedCurrency = 'PLN' | 'EUR' | 'USD' | 'UAH'

// Ключ для localStorage
const CURRENCY_STORAGE_KEY = 'salon-crm-currency'

// Получение валюты по умолчанию (PLN для старта в Польше)
export const getDefaultCurrency = (): SupportedCurrency => 'PLN'

// Получение текущей валюты из localStorage или по умолчанию
export const getCurrentCurrency = (): SupportedCurrency => {
  if (typeof window === 'undefined') return getDefaultCurrency()
  
  const saved = localStorage.getItem(CURRENCY_STORAGE_KEY)
  if (saved && supportedCurrencies.find(c => c.code === saved)) {
    return saved as SupportedCurrency
  }
  
  return getDefaultCurrency()
}

// Установка валюты
export const setCurrency = (currency: SupportedCurrency): void => {
  if (typeof window === 'undefined') return
  
  localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
  
  // Генерируем событие для реактивного обновления
  window.dispatchEvent(new CustomEvent('currency-changed', { 
    detail: { currency } 
  }))
}

// Получение данных валюты
export const getCurrencyData = (code?: SupportedCurrency): Currency => {
  const currencyCode = code || getCurrentCurrency()
  const matchedCurrency =
    supportedCurrencies.find(c => c.code === currencyCode) ??
    supportedCurrencies.find(c => c.code === getDefaultCurrency()) ??
    supportedCurrencies[0]

  return matchedCurrency ?? {
    code: 'PLN',
    name: 'Polish Zloty',
    symbol: 'zł',
    flag: '🇵🇱',
    defaultLocale: 'pl-PL'
  }
}

// Форматирование суммы с учетом текущей локали из i18next
export const formatPrice = (
  amount: number,
  currency?: SupportedCurrency,
  options?: Intl.NumberFormatOptions
): string => {
  const currencyData = getCurrencyData(currency)

  // Используем текущую локаль из i18next если доступно
  let locale = currencyData.defaultLocale
  if (typeof window !== 'undefined') {
    const i18next = (window as unknown as Record<string, unknown>).i18next as { language?: string } | undefined
    if (i18next?.language) {
      // Мапинг языков i18next на локали для валют
      const localeMap: Record<string, string> = {
        'en': 'en-US',
        'pl': 'pl-PL',
        'ua': 'uk-UA',
        'ru': 'ru-RU'
      }
      locale = localeMap[i18next.language] || currencyData.defaultLocale
    }
  }
  
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currencyData.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  }
  
  try {
    return new Intl.NumberFormat(locale, formatOptions).format(amount)
  } catch {
    // Fallback для случаев когда Intl.NumberFormat не поддерживает локаль
    return `${currencyData.symbol}${amount.toFixed(2)}`
  }
}

// Хук для реактивной работы с валютой
export const useCurrency = (): {
  currency: SupportedCurrency;
  currencyData: Currency;
  changeCurrency: (newCurrency: SupportedCurrency) => void;
  formatPrice: (amount: number, options?: Intl.NumberFormatOptions) => string;
  supportedCurrencies: Currency[];
} => {
  const [currency, setCurrencyState] = React.useState<SupportedCurrency>(getCurrentCurrency())

  React.useEffect(() => {
    const handleCurrencyChange = (event: CustomEvent<{ currency: SupportedCurrency }>) => {
      setCurrencyState(event.detail.currency)
    }

    window.addEventListener('currency-changed', handleCurrencyChange as EventListener)
    return () => {
      window.removeEventListener('currency-changed', handleCurrencyChange as EventListener)
    }
  }, [])

  const changeCurrency = (newCurrency: SupportedCurrency) => {
    setCurrency(newCurrency)
    setCurrencyState(newCurrency)
  }

  return {
    currency,
    currencyData: getCurrencyData(currency),
    changeCurrency,
    formatPrice: (amount: number, options?: Intl.NumberFormatOptions) =>
      formatPrice(amount, currency, options),
    supportedCurrencies
  }
}

// Импорт React для хука
import React from 'react'

export default {
  supportedCurrencies,
  getCurrentCurrency,
  setCurrency,
  getCurrencyData,
  formatPrice,
  useCurrency
}
