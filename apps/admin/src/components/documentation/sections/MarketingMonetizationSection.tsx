import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui'
import { DollarSign, Megaphone, Globe, BarChart3, Zap, Target, Crown, TrendingUp, Mail, Gift, Share2, Calendar } from 'lucide-react'

export const MarketingMonetizationSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="w-5 h-5 text-purple-600" />
            Marketing-as-a-Service Концепция
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Превращаем маркетинговые инструменты в источник дохода</strong> - предлагаем салонам
            профессиональные маркетинговые решения как дополнительную платную услугу.
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mt-2">
            <p className="text-purple-800 font-medium">🎯 Бизнес-модель:</p>
            <ul className="list-disc pl-6 mt-2 text-purple-700 space-y-1">
              <li><strong>Basic Plan</strong> - бесплатная CRM без маркетинга</li>
              <li><strong>Marketing Plan</strong> - платные маркетинговые инструменты</li>
              <li><strong>Premium Plan</strong> - полная автоматизация + персональный сайт</li>
              <li><strong>Enterprise Plan</strong> - white-label решения для сетей салонов</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Тарифные планы с маркетинговыми возможностями
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* BASIC */}
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">BASIC</h3>
                  <p className="text-xs text-gray-600">Бесплатно</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <p className="font-medium text-gray-700">Включено:</p>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>CRM система</li>
                  <li>Календарь записей</li>
                  <li>До 100 клиентов</li>
                  <li>Базовые отчеты</li>
                </ul>
                <p className="font-medium text-red-600 pt-2">❌ БЕЗ маркетинга</p>
              </div>
            </div>

            {/* MARKETING */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-4 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                ПОПУЛЯРНЫЙ
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">MARKETING</h3>
                  <p className="text-xs text-blue-700">€29.90/мес</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <p className="font-medium text-blue-800">Все из BASIC +</p>
                <ul className="list-disc pl-4 space-y-1 text-blue-700">
                  <li>Loyalty программа</li>
                  <li>Birthday campaigns</li>
                  <li>Email automation</li>
                  <li>SMS рассылки (500/мес)</li>
                  <li>Referral система</li>
                  <li>Analytics dashboard</li>
                  <li>До 500 клиентов</li>
                </ul>
              </div>
            </div>

            {/* PREMIUM */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-400 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-purple-900">PREMIUM</h3>
                  <p className="text-xs text-purple-700">€59.90/мес</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <p className="font-medium text-purple-800">Все из MARKETING +</p>
                <ul className="list-disc pl-4 space-y-1 text-purple-700">
                  <li>Персональный сайт</li>
                  <li>SEO оптимизация</li>
                  <li>Конструктор акций</li>
                  <li>SMS unlimited</li>
                  <li>Push notifications</li>
                  <li>A/B testing</li>
                  <li>WhatsApp integration</li>
                  <li>Unlimited клиенты</li>
                </ul>
              </div>
            </div>

            {/* ENTERPRISE */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-yellow-900">ENTERPRISE</h3>
                  <p className="text-xs text-yellow-700">От €150/мес</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <p className="font-medium text-yellow-800">Все из PREMIUM +</p>
                <ul className="list-disc pl-4 space-y-1 text-yellow-700">
                  <li>White-label решение</li>
                  <li>Multi-location</li>
                  <li>Custom domain</li>
                  <li>Dedicated support</li>
                  <li>Custom integrations</li>
                  <li>Advanced analytics</li>
                  <li>API access</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-green-900">
            <Globe className="w-5 h-5 text-green-600" />
            Salon Website Builder (Premium/Enterprise)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-green-900">
          <p><strong>Персональный сайт для каждого салона с автоматической синхронизацией:</strong></p>
          <div className="bg-white rounded-md p-3 font-mono text-xs overflow-x-auto">
            <pre className="text-gray-800">
{`┌─────────────────────────────────────────────────────────────────┐
│          SALON WEBSITE BUILDER - АРХИТЕКТУРА                    │
└─────────────────────────────────────────────────────────────────┘

Уникальный URL для каждого салона:
  https://beauty-salon-anna.beauty.designcorp.eu
  https://glam-studio-moscow.beauty.designcorp.eu

┌──────────────────────┐
│  CRM Admin Panel     │ ◄─── Владелец салона управляет
└──────────────────────┘
         │
         │ Автосинхронизация
         ▼
┌──────────────────────────────────────────────────────────────┐
│  Персональный сайт салона                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📸 ГЛАВНАЯ СТРАНИЦА                                         │
│  • Logo + Фото салона (галерея)                             │
│  • Описание + Преимущества                                   │
│  • Контакты + Карта                                          │
│  • Call-to-action: "Записаться онлайн"                      │
│                                                              │
│  💅 УСЛУГИ                                                    │
│  • Автоматический импорт из CRM                             │
│  • Цены + Длительность                                       │
│  • Фото до/после                                             │
│  • Кнопка "Записаться" на каждую услугу                     │
│                                                              │
│  👥 НАШИ МАСТЕРА                                             │
│  • Профили staff из CRM                                      │
│  • Фото + Опыт + Специализация                              │
│  • Портфолио работ                                           │
│  • Выбор мастера при записи                                  │
│                                                              │
│  📅 ОНЛАЙН ЗАПИСЬ                                            │
│  • Интеграция с календарем CRM                               │
│  • Выбор услуги → мастера → даты/времени                    │
│  • Instant booking подтверждение                             │
│  • Google Calendar sync                                      │
│                                                              │
│  🎁 АКЦИИ И СКИДКИ                                           │
│  • Текущие промокоды                                         │
│  • Birthday offers                                           │
│  • Loyalty program info                                      │
│  • Referral program                                          │
│                                                              │
│  ⭐ ОТЗЫВЫ                                                    │
│  • Реальные отзывы клиентов                                 │
│  • Рейтинг 5 звезд                                          │
│  • Фото работ от клиентов                                    │
│  • Google Reviews integration                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘`}
            </pre>
          </div>
          <div className="bg-green-100 rounded-md p-3 mt-3">
            <p className="font-medium text-green-800">🎨 Customization Options:</p>
            <ul className="list-disc pl-6 mt-2 text-xs text-green-700 space-y-1">
              <li>Выбор из 10+ готовых шаблонов (modern/classic/luxury)</li>
              <li>Custom цветовая схема (brand colors)</li>
              <li>Upload своего logo, фото, видео</li>
              <li>Редактор контента (no-code visual editor)</li>
              <li>Мобильная адаптация автоматически</li>
              <li>SEO настройки (meta tags, keywords)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-orange-900">
            <Gift className="w-5 h-5 text-orange-600" />
            Self-Service Campaign Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-orange-900">
          <p><strong>Конструктор маркетинговых кампаний для владельцев салонов:</strong></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-md border p-3">
              <p className="font-bold text-orange-800 mb-2">📧 Email Campaigns</p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-orange-700">
                <li>Drag-and-drop email builder</li>
                <li>Готовые шаблоны (10+ designs)</li>
                <li>Персонализация (имя, tier, история)</li>
                <li>A/B testing subject lines</li>
                <li>Schedule отправки</li>
                <li>Analytics: open rate, click rate</li>
              </ul>
            </div>

            <div className="bg-white rounded-md border p-3">
              <p className="font-bold text-orange-800 mb-2">💬 SMS Campaigns</p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-orange-700">
                <li>Quick SMS composer (160 chars)</li>
                <li>Emoji support 😊💅✨</li>
                <li>Bulk отправка по фильтрам</li>
                <li>Scheduled campaigns</li>
                <li>Opt-out management</li>
                <li>Delivery tracking</li>
              </ul>
            </div>

            <div className="bg-white rounded-md border p-3">
              <p className="font-bold text-orange-800 mb-2">🎫 Promo Codes</p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-orange-700">
                <li>Генератор промокодов</li>
                <li>Типы: % скидка, fixed amount, freebies</li>
                <li>Условия: минимальная сумма, tier</li>
                <li>Срок действия + usage limits</li>
                <li>Tracking использования</li>
                <li>Auto-apply для birthday</li>
              </ul>
            </div>

            <div className="bg-white rounded-md border p-3">
              <p className="font-bold text-orange-800 mb-2">🎯 Targeted Campaigns</p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-orange-700">
                <li>Фильтры: tier, visits, last visit</li>
                <li>Segment builder (AND/OR logic)</li>
                <li>Re-engagement (inactive clients)</li>
                <li>Win-back campaigns</li>
                <li>VIP exclusive offers</li>
                <li>Campaign ROI tracking</li>
              </ul>
            </div>
          </div>
          <div className="bg-orange-100 rounded-md p-3 mt-3">
            <p className="font-medium text-orange-800">🤖 Готовые кампании (templates):</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div className="bg-white rounded p-2">
                <p className="font-medium">🎂 Birthday Week Special</p>
                <p className="text-orange-600">15% скидка в месяц рождения</p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="font-medium">😴 Wake Up Sleeping Clients</p>
                <p className="text-orange-600">30 дней без визита → 20% off</p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="font-medium">👑 VIP Appreciation</p>
                <p className="text-orange-600">GOLD/PLATINUM only offers</p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="font-medium">🎄 Holiday Season</p>
                <p className="text-orange-600">Новый год, 8 марта, etc.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-indigo-200 bg-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-indigo-900">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Marketing Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-indigo-900">
          <p><strong>ROI tracking для обоснования стоимости Marketing Plan:</strong></p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-md border-2 border-green-300 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-green-800">Campaign ROI</p>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">+247%</p>
              <p className="text-xs text-green-700 mt-1">За последний месяц</p>
              <div className="mt-2 text-xs">
                <p className="text-gray-600">Потрачено: €29.90</p>
                <p className="text-green-700">Заработано: €103.50</p>
              </div>
            </div>

            <div className="bg-white rounded-md border-2 border-blue-300 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-blue-800">Email Performance</p>
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Open Rate:</span>
                  <span className="font-bold text-blue-600">42%</span>
                </div>
                <div className="flex justify-between">
                  <span>Click Rate:</span>
                  <span className="font-bold text-blue-600">18%</span>
                </div>
                <div className="flex justify-between">
                  <span>Conversions:</span>
                  <span className="font-bold text-green-600">12%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-md border-2 border-purple-300 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-purple-800">Client Acquisition</p>
                <Share2 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Referrals:</span>
                  <span className="font-bold text-purple-600">23</span>
                </div>
                <div className="flex justify-between">
                  <span>Website:</span>
                  <span className="font-bold text-purple-600">41</span>
                </div>
                <div className="flex justify-between">
                  <span>CAC:</span>
                  <span className="font-bold text-purple-600">€1.27</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-md p-3 mt-3">
            <p className="font-medium text-indigo-800 mb-2">📊 Ключевые метрики:</p>
            <ul className="list-disc pl-6 text-xs text-indigo-700 space-y-1">
              <li><strong>Campaign Performance:</strong> sent, opened, clicked, converted</li>
              <li><strong>Revenue Attribution:</strong> какая кампания принесла сколько денег</li>
              <li><strong>Customer Lifetime Value:</strong> LTV до vs после маркетинга</li>
              <li><strong>Retention Rate:</strong> как маркетинг влияет на удержание</li>
              <li><strong>Best Performing Campaigns:</strong> какие кампании работают лучше</li>
              <li><strong>Channel Comparison:</strong> Email vs SMS vs Push эффективность</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-yellow-900">
            <Target className="w-5 h-5 text-yellow-600" />
            Campaign Marketplace (Будущее развитие)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-yellow-900">
          <p><strong>Marketplace готовых маркетинговых кампаний от экспертов:</strong></p>
          <div className="bg-white rounded-md border p-3">
            <p className="font-medium mb-2">Концепция:</p>
            <ul className="list-disc pl-6 space-y-1 text-xs text-yellow-700">
              <li>Профессиональные маркетологи создают ready-to-use кампании</li>
              <li>Салоны покупают кампании за €4.90-€9.90 (one-time)</li>
              <li>Beauty Platform берет 30% комиссии</li>
              <li>Категории: Birthday, Win-back, VIP, Seasonal, etc.</li>
              <li>Рейтинги и отзывы от других салонов</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-white rounded-md border p-3">
              <p className="font-bold text-sm">💅 "Ultimate Spring Makeover"</p>
              <p className="text-xs text-gray-600 mt-1">5-email серия + SMS + promo codes</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs">⭐ 4.8 (234 отзыва)</span>
                <span className="font-bold text-yellow-700">690 ₽</span>
              </div>
            </div>
            <div className="bg-white rounded-md border p-3">
              <p className="font-bold text-sm">🎂 "Birthday Bliss Campaign"</p>
              <p className="text-xs text-gray-600 mt-1">Automated birthday flow (3 emails)</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs">⭐ 4.9 (512 отзывов)</span>
                <span className="font-bold text-yellow-700">490 ₽</span>
              </div>
            </div>
          </div>
          <div className="bg-yellow-100 rounded-md p-3 mt-3">
            <p className="font-medium text-yellow-800">💰 Дополнительная монетизация:</p>
            <ul className="list-disc pl-6 mt-2 text-xs text-yellow-700 space-y-1">
              <li><strong>Recurring revenue:</strong> салоны платят ежемесячно за Marketing Plan</li>
              <li><strong>One-time sales:</strong> покупка premium кампаний из marketplace</li>
              <li><strong>Usage-based:</strong> доп. SMS пакеты при превышении лимита</li>
              <li><strong>Professional services:</strong> настройка кампаний экспертами (от €50)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-200 bg-rose-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-rose-900">
            <Zap className="w-5 h-5 text-rose-600" />
            Automation vs Manual Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-rose-900">
          <p><strong>Гибкость для владельцев салонов - выбирают сами:</strong></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-md border-2 border-green-300 p-3">
              <p className="font-bold text-green-800 mb-2">🤖 ПОЛНАЯ АВТОМАТИЗАЦИЯ</p>
              <p className="text-xs text-gray-600 mb-2">Включить все автоматические кампании:</p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-green-700">
                <li>✅ Birthday emails (7 дней до, день ДР, 7 дней после)</li>
                <li>✅ Re-engagement (30/60/90 дней неактивности)</li>
                <li>✅ Loyalty tier upgrades</li>
                <li>✅ Referral rewards</li>
                <li>✅ Post-visit thank you emails</li>
                <li>✅ Review requests (после визита)</li>
              </ul>
              <div className="bg-green-100 rounded p-2 mt-2">
                <p className="text-xs font-medium text-green-800">Подходит для:</p>
                <p className="text-xs text-green-700">Занятых владельцев, хотят "set and forget"</p>
              </div>
            </div>

            <div className="bg-white rounded-md border-2 border-blue-300 p-3">
              <p className="font-bold text-blue-800 mb-2">🎨 РУЧНОЙ КОНТРОЛЬ</p>
              <p className="text-xs text-gray-600 mb-2">Создавать кампании самостоятельно:</p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-blue-700">
                <li>🎯 Выбор целевой аудитории (custom segments)</li>
                <li>🎯 Свои тексты и дизайны писем</li>
                <li>🎯 Timing кампаний (день недели, время)</li>
                <li>🎯 Custom promo codes</li>
                <li>🎯 A/B testing вариантов</li>
                <li>🎯 Budget control (сколько SMS отправить)</li>
              </ul>
              <div className="bg-blue-100 rounded p-2 mt-2">
                <p className="text-xs font-medium text-blue-800">Подходит для:</p>
                <p className="text-xs text-blue-700">Маркетинг-савви владельцев, хотят креатива</p>
              </div>
            </div>
          </div>
          <div className="bg-rose-100 rounded-md p-3 mt-3">
            <p className="font-medium text-rose-800">💡 Best Practice:</p>
            <p className="text-xs text-rose-700">Рекомендуем комбинировать: автоматизация базовых кампаний + ручные специальные акции</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Projected Revenue Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="bg-white rounded-md border p-4">
            <p className="font-bold mb-3">📊 Расчет потенциального дохода:</p>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-4 gap-2 font-bold bg-gray-100 p-2 rounded">
                <div>План</div>
                <div>Цена/мес</div>
                <div>Салоны</div>
                <div>MRR</div>
              </div>
              <div className="grid grid-cols-4 gap-2 p-2">
                <div>BASIC</div>
                <div>€0</div>
                <div>200</div>
                <div className="font-bold">€0</div>
              </div>
              <div className="grid grid-cols-4 gap-2 p-2 bg-blue-50">
                <div>MARKETING</div>
                <div>€29.90</div>
                <div>80</div>
                <div className="font-bold text-blue-600">€2,392</div>
              </div>
              <div className="grid grid-cols-4 gap-2 p-2 bg-purple-50">
                <div>PREMIUM</div>
                <div>€59.90</div>
                <div>30</div>
                <div className="font-bold text-purple-600">€1,797</div>
              </div>
              <div className="grid grid-cols-4 gap-2 p-2 bg-yellow-50">
                <div>ENTERPRISE</div>
                <div>€150</div>
                <div>5</div>
                <div className="font-bold text-yellow-700">€750</div>
              </div>
              <div className="grid grid-cols-4 gap-2 p-2 bg-green-100 font-bold">
                <div>ИТОГО</div>
                <div>-</div>
                <div>315 салонов</div>
                <div className="text-green-700">€4,939/мес</div>
              </div>
            </div>
            <div className="mt-4 bg-green-50 rounded-md p-3">
              <p className="font-bold text-green-800">💰 Annual Recurring Revenue (ARR):</p>
              <p className="text-2xl font-bold text-green-600 mt-1">€59,268/год</p>
              <p className="text-xs text-green-700 mt-2">+ Marketplace комиссии + SMS overages + Professional services</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MarketingMonetizationSection
