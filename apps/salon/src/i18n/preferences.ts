import type { SupportedLanguage } from './index'

const LANGUAGE_STORAGE_KEY = 'salon-crm-language'
const SUPPORTED_CODES = new Set<SupportedLanguage>(['en', 'pl', 'ua', 'ru'])

export const getStoredLanguagePreference = (): SupportedLanguage | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && SUPPORTED_CODES.has(stored as SupportedLanguage)) {
      return stored as SupportedLanguage
    }
  } catch (error) {
    console.warn('i18n: failed to read stored language preference', error)
  }

  return null
}
