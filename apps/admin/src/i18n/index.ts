// i18n configuration для Beauty Platform Admin Panel
// Поддержка: RU (по умолчанию), EN, PL, UA

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Импорт переводов
import ruTranslations from './locales/ru.json'
import enTranslations from './locales/en.json'
import plTranslations from './locales/pl.json'
import uaTranslations from './locales/ua.json'

// Ресурсы переводов
const resources = {
  ru: {
    translation: ruTranslations
  },
  en: {
    translation: enTranslations
  },
  pl: {
    translation: plTranslations
  },
  ua: {
    translation: uaTranslations
  }
}

// Конфигурация i18n
i18n
  .use(LanguageDetector) // Автоопределение языка из браузера
  .use(initReactI18next) // Интеграция с React
  .init({
    resources,
    
    // Язык по умолчанию
    lng: 'ru',
    fallbackLng: 'ru', // Fallback на русский
    
    // Поддерживаемые языки
    supportedLngs: ['ru', 'en', 'pl', 'ua'],
    
    // Настройки обнаружения языка
    detection: {
      // Порядок проверки источников языка
      order: ['localStorage', 'navigator', 'htmlTag'],
      
      // Кэширование выбранного языка
      caches: ['localStorage'],
      
      // Ключ для localStorage
      lookupLocalStorage: 'beauty-platform-language',
      
      // Исключить автообнаружение для определенных путей
      excludeCacheFor: ['cimode']
    },
    
    // Настройки интерполяции
    interpolation: {
      escapeValue: false // React уже безопасен от XSS
    },
    
    // Настройки отладки (только в dev режиме)
    debug: false, // typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
    
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
export type SupportedLanguage = 'ru' | 'en' | 'pl' | 'ua'

// Хелпер для смены языка
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(language)
}

// Хелпер для получения текущего языка
export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage || 'ru'
}

// Список доступных языков с отображаемыми названиями
export const availableLanguages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'ua', name: 'Українська', flag: '🇺🇦' }
] as const