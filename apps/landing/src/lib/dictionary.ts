import 'server-only'
import { pl } from '@/dictionaries/pl'
import { en } from '@/dictionaries/en'
import { ru } from '@/dictionaries/ru'
import { ua } from '@/dictionaries/ua'

const dictionaries = {
  pl: () => Promise.resolve(pl),
  en: () => Promise.resolve(en),
  ru: () => Promise.resolve(ru),
  ua: () => Promise.resolve(ua),
}

export type Locale = keyof typeof dictionaries

export const getDictionary = async (locale: Locale) => {
  return dictionaries[locale]?.() ?? dictionaries.pl()
}
