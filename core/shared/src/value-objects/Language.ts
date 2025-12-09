/**
 * @deprecated This is legacy code. Use Prisma enums instead.
 * @fileoverview Language Value Object
 * @description Представляет язык в системе (deprecated)
 * NOTE: Legacy domain code. Use Prisma enums instead.
 */

// Supported languages
export const SUPPORTED_LANGUAGES = ['ru', 'pl', 'en', 'uk'] as const;
export type LanguageCode = typeof SUPPORTED_LANGUAGES[number];

// Language metadata
export const LANGUAGE_METADATA: Record<LanguageCode, {
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}> = {
  ru: {
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    rtl: false
  },
  pl: {
    name: 'Polish',
    nativeName: 'Polski',
    flag: '🇵🇱',
    rtl: false
  },
  en: {
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    rtl: false
  },
  uk: {
    name: 'Ukrainian',
    nativeName: 'Українська',
    flag: '🇺🇦',
    rtl: false
  }
};

// Legacy Language class - deprecated, use Prisma enums instead
