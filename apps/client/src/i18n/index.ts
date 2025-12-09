import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import pl from './locales/pl.json'
import ru from './locales/ru.json'
import ua from './locales/ua.json'

const resources = {
  en: { translation: en },
  pl: { translation: pl },
  ru: { translation: ru },
  ua: { translation: ua }
}

export type SupportedLanguage = 'en' | 'pl' | 'ru' | 'ua'

export const availableLanguages: { code: SupportedLanguage; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'pl', name: 'Polski' },
  { code: 'ua', name: 'Українська' },
  { code: 'ru', name: 'Русский' }
]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'client-booking-language'
    },
    supportedLngs: availableLanguages.map(l => l.code)
  })

export const changeLanguage = (language: SupportedLanguage) => i18n.changeLanguage(language)
export const getCurrentLanguage = (): SupportedLanguage =>
  (i18n.language?.split('-')[0] as SupportedLanguage) || 'ru'

export default i18n
