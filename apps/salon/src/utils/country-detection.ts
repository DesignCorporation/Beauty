// Утилиты для автоопределения страны, языка и валюты

export interface CountryInfo {
  code: string;      // ISO 3166-1 alpha-2
  name: string;
  phoneCode: string; // +48, +380 и т.д.
  language: 'en' | 'pl' | 'ua' | 'ru';
  currency: 'PLN' | 'EUR' | 'USD' | 'UAH';
  flag: string;      // Emoji флаг
}

// Маппинг стран на языки и валюты
export const COUNTRIES: Record<string, CountryInfo> = {
  'PL': {
    code: 'PL',
    name: 'Poland',
    phoneCode: '+48',
    language: 'pl',
    currency: 'PLN',
    flag: '🇵🇱'
  },
  'UA': {
    code: 'UA', 
    name: 'Ukraine',
    phoneCode: '+380',
    language: 'ua',
    currency: 'UAH',
    flag: '🇺🇦'
  },
  'US': {
    code: 'US',
    name: 'United States', 
    phoneCode: '+1',
    language: 'en',
    currency: 'USD',
    flag: '🇺🇸'
  },
  'GB': {
    code: 'GB',
    name: 'United Kingdom',
    phoneCode: '+44', 
    language: 'en',
    currency: 'EUR',
    flag: '🇬🇧'
  },
  'DE': {
    code: 'DE',
    name: 'Germany',
    phoneCode: '+49',
    language: 'en',
    currency: 'EUR', 
    flag: '🇩🇪'
  },
  'FR': {
    code: 'FR',
    name: 'France',
    phoneCode: '+33',
    language: 'en',
    currency: 'EUR',
    flag: '🇫🇷'
  },
  'RU': {
    code: 'RU',
    name: 'Russia',
    phoneCode: '+7',
    language: 'ru',
    currency: 'EUR', // Не поддерживаем рубли
    flag: '🇷🇺'
  },
  'CZ': {
    code: 'CZ',
    name: 'Czech Republic',
    phoneCode: '+420',
    language: 'en',
    currency: 'EUR',
    flag: '🇨🇿'
  }
};

const DEFAULT_COUNTRY = COUNTRIES['PL'] as CountryInfo;
const USA_COUNTRY = COUNTRIES['US'] as CountryInfo;

// Определение страны по IP (fallback на Польшу)
export const detectCountryByIP = async (): Promise<CountryInfo> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const response = await fetch('/api/auth/ip-geo', {
      signal: controller.signal,
      credentials: 'include'
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`IP geo endpoint failed: ${response.status}`)
    }

    const data = await response.json()
    const countryCode = data?.country?.code?.toUpperCase?.() ?? data?.country_code?.toUpperCase?.()

    if (countryCode) {
      const matchedCountry = COUNTRIES[countryCode]
      if (matchedCountry) {
        return matchedCountry
      }
    }

    return DEFAULT_COUNTRY
  } catch (error) {
    console.warn('Не удалось определить страну по IP:', error)
    return DEFAULT_COUNTRY
  }
};

// Определение страны по временной зоне браузера
export const detectCountryByTimezone = (): CountryInfo => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Маппинг основных временных зон на страны
    const timezoneMap: Record<string, string> = {
      'Europe/Warsaw': 'PL',
      'Europe/Kiev': 'UA',
      'Europe/Kyiv': 'UA',
      'America/New_York': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US', 
      'America/Los_Angeles': 'US',
      'Europe/London': 'GB',
      'Europe/Berlin': 'DE',
      'Europe/Paris': 'FR',
      'Europe/Moscow': 'RU',
      'Europe/Prague': 'CZ'
    };
    
    const mappedCode = timezoneMap[timezone];
    if (mappedCode) {
      const mappedCountry = COUNTRIES[mappedCode];
      if (mappedCountry) {
        return mappedCountry;
      }
    }
    
    // Если точного соответствия нет, пробуем по континенту
    if (timezone.startsWith('Europe/')) {
      return DEFAULT_COUNTRY; // Польша по умолчанию для Европы
    } else if (timezone.startsWith('America/')) {
      return USA_COUNTRY; // США для Америки
    }
    
    // Fallback на Польшу
    return DEFAULT_COUNTRY;
  } catch (error) {
    console.warn('Не удалось определить страну по временной зоне:', error);
    return DEFAULT_COUNTRY;
  }
};

// Определение языка браузера
export const detectLanguageFromBrowser = (): 'en' | 'pl' | 'ua' | 'ru' => {
  try {
    const languages = navigator.languages || [navigator.language];
    
    for (const lang of languages) {
      const [langBase] = lang.split('-');
      const langCode = (langBase ?? lang).toLowerCase();
      
      if (langCode === 'pl') return 'pl';
      if (langCode === 'uk') return 'ua'; // Ukrainian
      if (langCode === 'ru') return 'ru';
      if (langCode === 'en') return 'en';
    }
    
    // Fallback на английский
    return 'en';
  } catch (error) {
    console.warn('Не удалось определить язык браузера:', error);
    return 'en';
  }
};

// Комплексное определение страны (несколько методов)
export const detectUserCountry = async (): Promise<CountryInfo> => {
  try {
    // 1. Сначала пробуем по IP (наиболее точно)
    const ipCountry = await detectCountryByIP();
    
    // 2. Сверяем с временной зоной
    const timezoneCountry = detectCountryByTimezone();
    
    // 3. Сверяем с языком браузера
    const browserLang = detectLanguageFromBrowser();
    
    // Если IP и временная зона совпадают - используем их
    if (ipCountry.code === timezoneCountry.code) {
      return ipCountry;
    }
    
    // Если язык браузера совпадает с IP - используем IP
    if (ipCountry.language === browserLang) {
      return ipCountry;
    }
    
    // Если язык браузера совпадает с временной зоной - используем временную зону
    if (timezoneCountry.language === browserLang) {
      return timezoneCountry;
    }
    
    // В остальных случаях используем IP (наиболее надежно)
    return ipCountry;
  } catch (error) {
    console.warn('Ошибка при определении страны:', error);
    return DEFAULT_COUNTRY; // Fallback на Польшу
  }
};

// Форматирование номера телефона с кодом страны
export const formatPhoneWithCountryCode = (phone: string, countryInfo: CountryInfo): string => {
  // Убираем все нецифровые символы кроме +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Если уже есть +, оставляем как есть
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Если начинается с кода страны без +, добавляем +
  if (cleaned.startsWith(countryInfo.phoneCode.slice(1))) {
    return '+' + cleaned;
  }
  
  // Добавляем код страны
  return countryInfo.phoneCode + cleaned;
};

// Получить список всех стран для селекта
export const getAllCountries = (): CountryInfo[] => {
  return Object.values(COUNTRIES).sort((a, b) => a.name.localeCompare(b.name));
};
