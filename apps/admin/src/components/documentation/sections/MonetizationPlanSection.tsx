import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui'
import { DollarSign, TrendingUp, Target, Zap, Calendar, BarChart3, Rocket } from 'lucide-react'

export const MonetizationPlanSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-yellow-600" />
            💰 План монетизации Beauty Platform
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              БУДУЩИЕ ПЛАНЫ
            </Badge>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              После завершения MVP
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Текущие активы */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-green-600" />
              🎯 Текущие активы (что у нас есть)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <span className="text-green-600">✅</span>
                <span>Огненный лендинг - beauty.designcorp.eu</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <span className="text-green-600">✅</span>
                <span>Рабочая CRM - test-crm.beauty.designcorp.eu</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <span className="text-green-600">✅</span>
                <span>Админка - test-admin.beauty.designcorp.eu</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <span className="text-green-600">✅</span>
                <span>Multi-tenant архитектура</span>
              </div>
            </div>
          </div>

          {/* Модель подписок */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              💸 Модель монетизации - SaaS подписки
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Стартер */}
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="text-center mb-3">
                    <h4 className="font-semibold">🥉 СТАРТЕР</h4>
                    <div className="text-2xl font-bold text-blue-600">€29/месяц</div>
                    <div className="text-sm text-gray-600">Маржа: ~85% (€25 чистых)</div>
                  </div>
                  <ul className="text-sm space-y-1">
                    <li>✅ До 3 мастеров</li>
                    <li>✅ Онлайн-запись</li>
                    <li>✅ CRM клиентов (до 500)</li>
                    <li>✅ Базовая аналитика</li>
                    <li>✅ Email поддержка</li>
                  </ul>
                  <div className="mt-3 text-xs text-gray-500">
                    <strong>Аудитория:</strong> Мини-салоны, 1-3 мастера
                  </div>
                </CardContent>
              </Card>

              {/* Профи */}
              <Card className="border-2 border-yellow-400 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="text-center mb-3">
                    <div className="flex items-center justify-center gap-2">
                      <h4 className="font-semibold">🥈 ПРОФИ</h4>
                      <Badge className="bg-yellow-500 text-white text-xs">ПОПУЛЯРНЫЙ</Badge>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">€79/месяц</div>
                    <div className="text-sm text-gray-600">Маржа: ~80% (€63 чистых)</div>
                  </div>
                  <ul className="text-sm space-y-1">
                    <li>✅ До 10 мастеров</li>
                    <li>✅ Все функции Стартер</li>
                    <li>✅ SMS уведомления</li>
                    <li>✅ ИИ-аналитика</li>
                    <li>✅ Мобильное приложение</li>
                    <li>✅ Приоритетная поддержка</li>
                  </ul>
                  <div className="mt-3 text-xs text-gray-500">
                    <strong>Аудитория:</strong> Средние салоны, 4-10 мастеров
                  </div>
                </CardContent>
              </Card>

              {/* Энтерпрайз */}
              <Card className="border border-purple-200">
                <CardContent className="p-4">
                  <div className="text-center mb-3">
                    <h4 className="font-semibold">🥇 ЭНТЕРПРАЙЗ</h4>
                    <div className="text-2xl font-bold text-purple-600">€199/месяц</div>
                    <div className="text-sm text-gray-600">Маржа: ~75% (€149 чистых)</div>
                  </div>
                  <ul className="text-sm space-y-1">
                    <li>✅ Безлимит мастеров</li>
                    <li>✅ Все функции Профи</li>
                    <li>✅ API интеграции</li>
                    <li>✅ Белый лейбл</li>
                    <li>✅ Персональный менеджер</li>
                    <li>✅ 24/7 поддержка</li>
                  </ul>
                  <div className="mt-3 text-xs text-gray-500">
                    <strong>Аудитория:</strong> Сети салонов, франшизы
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Финансовый прогноз */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              📊 Финансовый прогноз (консервативный)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left">Месяц</th>
                    <th className="border border-gray-300 p-2 text-left">Салоны</th>
                    <th className="border border-gray-300 p-2 text-left">MRR</th>
                    <th className="border border-gray-300 p-2 text-left">Затраты</th>
                    <th className="border border-gray-300 p-2 text-left">Прибыль</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2">1</td>
                    <td className="border border-gray-300 p-2">15</td>
                    <td className="border border-gray-300 p-2">€1,200</td>
                    <td className="border border-gray-300 p-2">€800</td>
                    <td className="border border-gray-300 p-2 text-green-600 font-semibold">€400</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">3</td>
                    <td className="border border-gray-300 p-2">50</td>
                    <td className="border border-gray-300 p-2">€4,000</td>
                    <td className="border border-gray-300 p-2">€1,500</td>
                    <td className="border border-gray-300 p-2 text-green-600 font-semibold">€2,500</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2">6</td>
                    <td className="border border-gray-300 p-2">120</td>
                    <td className="border border-gray-300 p-2">€9,500</td>
                    <td className="border border-gray-300 p-2">€3,000</td>
                    <td className="border border-gray-300 p-2 text-green-600 font-semibold">€6,500</td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 p-2 font-semibold">12</td>
                    <td className="border border-gray-300 p-2 font-semibold">300</td>
                    <td className="border border-gray-300 p-2 font-semibold">€24,000</td>
                    <td className="border border-gray-300 p-2 font-semibold">€8,000</td>
                    <td className="border border-gray-300 p-2 text-green-600 font-bold">€16,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Дополнительные доходы */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600" />
              💡 Дополнительные источники дохода
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">🔌 Интеграции</h4>
                  <div className="text-sm space-y-1">
                    <div>💳 Платежные системы - €5-15/мес</div>
                    <div>📧 Email-сервисы - €5-10/мес</div>
                    <div>📱 SMS-шлюзы - €10-20/мес</div>
                    <div>📊 Аналитика - €5-15/мес</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">🎓 Обучение</h4>
                  <div className="text-sm space-y-1">
                    <div>📚 Курсы - €99-299</div>
                    <div>👨‍💼 Консультации - €100/час</div>
                    <div>🏆 Сертификация - €49</div>
                    <div>📝 Шаблоны - €9-29</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">🏪 Маркетплейс</h4>
                  <div className="text-sm space-y-1">
                    <div>💄 Каталог мастеров - 3-5%</div>
                    <div>🛍️ Продажа косметики - 10-15%</div>
                    <div>📱 Мобильные услуги - 5-10%</div>
                    <div>🎨 Дизайн услуги - комиссия</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Итоговые цели */}
          <Card className="border-2 border-green-400 bg-green-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                🎯 Итоговые цели на год
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">600</div>
                  <div className="text-sm text-gray-600">Салонов</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">€48,000</div>
                  <div className="text-sm text-gray-600">MRR</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">€36,000</div>
                  <div className="text-sm text-gray-600">Прибыль/мес</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">300%+</div>
                  <div className="text-sm text-gray-600">ROI</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Что нужно сделать сначала */}
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" />
                🚨 ЧТО НУЖНО СДЕЛАТЬ СНАЧАЛА
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">❌</span>
                  <span>Исправить MFA проблемы (много QR кодов)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600">❌</span>
                  <span>Починить Images API (скриншоты не загружаются)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600">❌</span>
                  <span>Завершить основной функционал CRM</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600">❌</span>
                  <span>Тестирование системы с реальными данными</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600">❌</span>
                  <span>Создать billing систему</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                <p className="text-sm font-medium">
                  💡 <strong>Сначала продукт, потом продажи!</strong> Этот план реализуется после завершения MVP.
                </p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

export default MonetizationPlanSection