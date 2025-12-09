import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beauty-platform/ui';
import { Globe, DollarSign, Settings, Zap, Shield, Lightbulb } from 'lucide-react';

export const LocalizationSection: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🌍 Локализация и мультивалютность
        </h1>
        <p className="text-xl text-gray-600 leading-relaxed">
          Полная система интернационализации Beauty Platform с поддержкой 4 языков и 4 валют, 
          готовая к международному расширению.
        </p>
      </div>

      {/* Статус реализации */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            ✅ Статус: ПОЛНОСТЬЮ РЕАЛИЗОВАНО
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">🌍 Локализация завершена:</h4>
              <ul className="text-sm text-green-600 space-y-1">
                <li>✅ 4 языка: EN, PL, UA, RU</li>
                <li>✅ i18next + react-i18next</li>
                <li>✅ 176 переводов на каждый язык</li>
                <li>✅ Автоопределение из браузера</li>
                <li>✅ LanguageSwitcher с флагами</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-700 mb-2">💱 Мультивалютность завершена:</h4>
              <ul className="text-sm text-green-600 space-y-1">
                <li>✅ 4 валюты: PLN, EUR, USD, UAH</li>
                <li>✅ Intl.NumberFormat локализация</li>
                <li>✅ i18next форматтеры (подход 2025)</li>
                <li>✅ CurrencySwitcher с флагами</li>
                <li>✅ Реактивные цены во всех компонентах</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Архитектура локализации */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Архитектура локализации
          </CardTitle>
          <CardDescription>
            Техническая реализация системы переводов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">📁 Структура файлов:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`apps/salon-crm/src/i18n/
├── index.ts              # Конфигурация i18next
├── locales/
│   ├── en.json          # Английский (по умолчанию)
│   ├── pl.json          # Польский (основной рынок)
│   ├── ua.json          # Украинский
│   └── ru.json          # Русский
└── components/
    └── LanguageSwitcher.tsx`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">⚙️ Конфигурация i18next:</h4>
              <div className="bg-gray-100 p-3 rounded text-sm">
                <code>
                  • Автоопределение языка из браузера<br/>
                  • Fallback на английский<br/>
                  • Сохранение выбора в localStorage<br/>
                  • 176 строк переводов на каждый язык<br/>
                  • Кастомные форматтеры для валют
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Архитектура мультивалютности */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Архитектура мультивалютности
          </CardTitle>
          <CardDescription>
            Современная система управления валютами
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">💰 Поддерживаемые валюты:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded text-center">
                  <div className="text-2xl mb-1">🇵🇱</div>
                  <div className="font-semibold">PLN</div>
                  <div className="text-xs text-gray-600">По умолчанию</div>
                </div>
                <div className="bg-blue-50 p-3 rounded text-center">
                  <div className="text-2xl mb-1">🇪🇺</div>
                  <div className="font-semibold">EUR</div>
                  <div className="text-xs text-gray-600">Европа</div>
                </div>
                <div className="bg-blue-50 p-3 rounded text-center">
                  <div className="text-2xl mb-1">🇺🇸</div>
                  <div className="font-semibold">USD</div>
                  <div className="text-xs text-gray-600">Международные</div>
                </div>
                <div className="bg-blue-50 p-3 rounded text-center">
                  <div className="text-2xl mb-1">🇺🇦</div>
                  <div className="font-semibold">UAH</div>
                  <div className="text-xs text-gray-600">Украина</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">🔧 Техническая реализация:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`// Основные функции системы
export const useCurrency = () => {
  const { currency, formatPrice, changeCurrency } = useCurrency()
  
  // Форматирование с локализацией
  formatPrice(150) → "150,00 zł" (PL)
                   → "€33.25" (EUR)
                   → "$36.42" (USD)
}

// i18next форматтеры (подход 2025)
t('Price: {{amount, currency(PLN)}}', { amount: 150 })
// → "Cena: 150,00 zł"`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Логика международного расширения */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Логика международного расширения
          </CardTitle>
          <CardDescription>
            Стратегия масштабирования на новые страны
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Автоопределение валюты по стране */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center">
                <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
                💡 Планируемая фича: Автоопределение валюты при регистрации
              </h4>
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Идея:</strong> При регистрации салона владелец выбирает страну → система автоматически определяет валюту по умолчанию.
                </p>
                <pre className="bg-yellow-100 p-2 rounded text-xs">
{`// Планируемая логика
const countryToCurrency = {
  'Poland': 'PLN',
  'Italy': 'EUR', 
  'Germany': 'EUR',
  'Ukraine': 'UAH',
  'USA': 'USD'
}

// При создании салона
salon.currency = countryToCurrency[salon.country] || 'EUR'`}
                </pre>
              </div>
            </div>

            {/* Сценарии расширения */}
            <div>
              <h4 className="font-semibold mb-3">🌍 Сценарии международного расширения:</h4>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h5 className="font-medium text-blue-700">🇮🇹 Сценарий: Салоны в Италии</h5>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>• Страна: Italy → Валюта: EUR (автоматически)</li>
                    <li>• Цены: €65 маникюр, €85 педикюр</li>
                    <li>• Клиенты видят привычные евро</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h5 className="font-medium text-green-700">🌐 Мультивалютные салоны</h5>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>• Основная валюта: EUR</li>
                    <li>• Дополнительные: USD, PLN (для туристов)</li>
                    <li>• Автоконвертация по курсу в реальном времени</li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h5 className="font-medium text-purple-700">🔄 Динамические курсы валют</h5>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>• Интеграция с банковскими API</li>
                    <li>• Обновление курсов через админку</li>
                    <li>• Конвертация цен в реальном времени</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Управление через админку */}
            <div>
              <h4 className="font-semibold mb-3">⚙️ Управление валютами через админку:</h4>
              <div className="bg-gray-50 p-4 rounded">
                <pre className="text-sm">
{`// Планируемые возможности для Super Admin:

1. 🏢 Управление салонами:
   • Выбор страны салона
   • Автоматическое определение валюты
   • Ручная корректировка валюты
   
2. 💱 Управление курсами:
   • Настройка курсов валют
   • Автообновление через API
   • История изменений курсов
   
3. 🌍 Аналитика по странам:
   • Доходы по валютам
   • Популярность валют
   • Конверсия клиентов`}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Технические детали */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Технические детали и best practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">🔧 Prisma Schema:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`// Обновленная схема валют
enum Currency {
  PLN // Польский злотый (по умолчанию)
  EUR // Евро
  USD // Доллар США  
  UAH // Украинская гривна
}

model Tenant {
  currency Currency @default(PLN) // Валюта салона
  country  String?                // Страна для автоопределения
  // ...
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">⚡ Производительность:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Intl.NumberFormat использует нативные браузерные API</li>
                <li>• Кэширование форматированных цен</li>
                <li>• Ленивая загрузка локалей</li>
                <li>• localStorage для сохранения выбора пользователя</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">🛡️ Безопасность:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Валидация валют через Prisma enum</li>
                <li>• Tenant isolation для валютных настроек</li>
                <li>• Проверка прав доступа при смене валюты</li>
                <li>• Защита от XSS в переводах (React escape)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Следующие шаги */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">
            🚀 Следующие шаги развития
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">📋 Ближайшие задачи:</h4>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• Добавить выбор страны при регистрации салона</li>
                <li>• Реализовать автоопределение валюты по стране</li>
                <li>• Создать управление валютами в админке</li>
                <li>• Добавить курсы валют и конвертацию</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">🔮 Долгосрочные планы:</h4>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• Интеграция с банковскими API для курсов</li>
                <li>• Добавление новых языков (IT, DE, FR)</li>
                <li>• Система налогов по странам (НДС, VAT)</li>
                <li>• Локальные способы оплаты по странам</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalizationSection;