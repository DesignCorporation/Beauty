// i18n configuration для Beauty Platform Salon CRM
// Поддержка: EN (по умолчанию), PL, UA, RU

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Импорт переводов
import enTranslations from './locales/en.json'
import plTranslations from './locales/pl.json'
import uaTranslations from './locales/ua.json'
import ruTranslations from './locales/ru.json'

// Ресурсы переводов
const resources = {
  en: {
    translation: enTranslations
  },
  pl: {
    translation: plTranslations
  },
  ua: {
    translation: uaTranslations
  },
  ru: {
    translation: ruTranslations
  }
}

// Форматтер для валют (современный подход 2025)
const currencyFormatter = (value: number, lng: string, options: { currency?: string }): string | number => {
  if (typeof value !== 'number') return value
  
  const currency = options.currency || 'PLN'
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'pl': 'pl-PL',
    'ua': 'uk-UA', 
    'ru': 'ru-RU'
  }
  
  const locale = localeMap[lng] || 'pl-PL'
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value)
  } catch {
    // Fallback для неподдерживаемых валют/локалей
    const symbols: Record<string, string> = {
      'PLN': 'zł',
      'EUR': '€', 
      'USD': '$',
      'UAH': '₴'
    }
    return `${symbols[currency] || currency} ${value.toFixed(2)}`
  }
}

// Конфигурация i18n
i18n
  .use(LanguageDetector) // Автоопределение языка из браузера
  .use(initReactI18next) // Интеграция с React
void i18n.init({
  resources,

  // Fallback на английский (если язык не найден)
  fallbackLng: 'en',
  
  // Поддерживаемые языки
  supportedLngs: ['en', 'pl', 'ua', 'ru'],
  
  // Настройки обнаружения языка
  detection: {
    // Порядок проверки источников языка
    order: ['localStorage', 'navigator', 'htmlTag'],
    
    // Кэширование выбранного языка
    caches: ['localStorage'],
    
    // Ключ для localStorage
    lookupLocalStorage: 'salon-crm-language',
    
    // Исключить автообнаружение для определенных путей
    excludeCacheFor: ['cimode']
  },
  
  // Настройки интерполяции с кастомными форматтерами
  interpolation: {
    escapeValue: false, // React уже безопасен от XSS
    format: function(value, format, lng) {
      if (format === 'currency') {
        return currencyFormatter(value as number, lng || 'en', { currency: 'PLN' })
      }
      if (typeof format === 'string' && format.startsWith('currency(') && format.endsWith(')')) {
        const currency = format.slice(9, -1)
        return currencyFormatter(value as number, lng || 'en', { currency })
      }
      return value
    }
  },
  
  // Настройки отладки (только в dev режиме)
  debug: process.env.NODE_ENV === 'development',
  
  // Настройки загрузки
  load: 'languageOnly', // Загружать только язык без региона (en, а не en-US)
  
  // Пространства имен (можно расширить в будущем)
  defaultNS: 'translation',
  ns: ['translation'],
  
  // Настройки реакта
  react: {
    useSuspense: false // Отключаем Suspense для более простой интеграции
  }
})

export default i18n

// Экспорт типов для TypeScript
export type SupportedLanguage = 'en' | 'pl' | 'ua' | 'ru'

// Хелпер для смены языка
export const changeLanguage = (language: SupportedLanguage): Promise<void> => {
  return i18n.changeLanguage(language).then(() => {})
}

// Хелпер для получения текущего языка
export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage || 'en'
}

// Список доступных языков с отображаемыми названиями
export const availableLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'ua', name: 'Українська', flag: '🇺🇦' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' }
] as const
