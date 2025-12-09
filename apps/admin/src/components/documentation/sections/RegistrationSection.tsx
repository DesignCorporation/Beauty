import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beauty-platform/ui';
import { UserPlus, CheckCircle, Shield, Zap, Target } from 'lucide-react';

export const RegistrationSection: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🚀 Многоступенчатая регистрация - ПОЛНОСТЬЮ ПЕРЕРАБОТАНА (2025-08-16)
        </h1>
        <p className="text-xl text-gray-600 leading-relaxed">
          Революционная система с автоопределением страны, языка и валюты. Полноширинный дизайн, умный селектор телефона и оптимизированная UX.
        </p>
      </div>

      {/* Статус проекта */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            🚀 Статус: РЕВОЛЮЦИОННЫЕ УЛУЧШЕНИЯ ЗАВЕРШЕНЫ (16 августа 2025)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">🌍 Автоопределение и локализация:</h4>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• 8 стран: PL, UA, US, GB, DE, FR, RU, CZ</li>
                <li>• IP + timezone + browser language detection</li>
                <li>• Автовыбор языка (PL→pl, UA→ua, US→en)</li>
                <li>• Автовыбор валюты (PL→PLN, UA→UAH)</li>
                <li>• Fallback на Польшу при ошибках</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-700 mb-2">📱 UX и дизайн:</h4>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• Полноширинные формы (max-w-2xl)</li>
                <li>• Селектор телефона с флагами</li>
                <li>• Пакеты в 2 ряда на desktop</li>
                <li>• Убраны декоративные колонки</li>
                <li>• Автоформатирование телефонов</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Схема регистрации */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Схема регистрации (6 шагов)
          </CardTitle>
          <CardDescription>
            Пошаговый процесс создания салона с прогресс-баром
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Прогресс-бар */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>

            {/* Шаги */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-green-700">✅ /register/owner - Данные владельца</h4>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• Имя, фамилия, email, телефон</li>
                  <li>• Язык интерфейса (4 языка)</li>
                  <li>• Минималистичный дизайн login-02</li>
                </ul>
                <div className="text-xs text-green-600 mt-2">✅ ЗАВЕРШЕНО: URL /register/owner</div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-green-700">✅ /register/salon - Данные салона</h4>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• Название салона, веб-сайт</li>
                  <li>• Тип работы (салон/мобильный/дом)</li>
                  <li>• Двухколоночный grid layout</li>
                </ul>
                <div className="text-xs text-green-600 mt-2">✅ ЗАВЕРШЕНО: URL /register/salon</div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-green-700">✅ /register/location - Локация</h4>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• Автоопределение страны по IP</li>
                  <li>• Исключена Россия из списка</li>
                  <li>• Адрес + карта (опционально)</li>
                </ul>
                <div className="text-xs text-green-600 mt-2">✅ ЗАВЕРШЕНО: URL /register/location</div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-green-700">✅ /register/services - Услуги</h4>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• Категории услуг (до 5)</li>
                  <li>• Размер команды, специализация</li>
                  <li>• Форма расширена до max-w-lg</li>
                </ul>
                <div className="text-xs text-green-600 mt-2">✅ ЗАВЕРШЕНО: URL /register/services</div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-green-700">✅ /register/pricing - Тарифы</h4>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• 4 тарифа: €0→€70/месяц</li>
                  <li>• 7 дней бесплатно для всех</li>
                  <li>• Черно-белый дизайн карточек</li>
                </ul>
                <div className="text-xs text-green-600 mt-2">✅ ЗАВЕРШЕНО: URL /register/pricing</div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-green-700">✅ /register/activation - Активация</h4>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• Email подтверждение</li>
                  <li>• SMS верификация ОТКЛЮЧЕНА</li>
                  <li>• Упрощенная активация</li>
                </ul>
                <div className="text-xs text-green-600 mt-2">✅ ЗАВЕРШЕНО: URL /register/activation</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ключевые улучшения */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Ключевые улучшения против Fresha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-700 mb-3">✅ Наши преимущества:</h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Данные владельца:</strong> Имя, фамилия, телефон (чего нет у Fresha)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Автоопределение валюты:</strong> По выбранной стране</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Гибкая тарификация:</strong> 7 дней бесплатно для всех</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Мобильные мастера:</strong> Поддержка работы на дому</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Упрощенная активация:</strong> SMS отключена (по требованию)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Семантические URL:</strong> /register/owner вместо /register/1</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Дизайн login-02:</strong> Минималистичный черно-белый стиль</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 mb-3">📊 Что оставили как у Fresha:</h4>
              <ul className="text-sm space-y-2 text-gray-600">
                <li>• Прогресс-бар с процентами</li>
                <li>• По одному вопросу на экран</li>
                <li>• Визуальные иконки для выбора</li>
                <li>• Простые и понятные заголовки</li>
                <li>• Возможность вернуться назад</li>
                <li>• Современный дизайн форм</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Тарифные планы */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Тарифные планы Beauty Platform
          </CardTitle>
          <CardDescription>
            Гибкая система ценообразования с пробным периодом
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg">🆓 STARTER</h3>
                <div className="text-2xl font-bold text-green-600">Бесплатно</div>
                <div className="text-sm text-gray-500">7 дней, потом €20/мес</div>
              </div>
              <ul className="text-sm space-y-1">
                <li>✅ 1 владелец + 2 мастера</li>
                <li>✅ Базовый календарь</li>
                <li>✅ До 50 клиентов</li>
                <li>✅ Email поддержка</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4 bg-blue-50 border-blue-300">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg">👥 TEAM</h3>
                <div className="text-2xl font-bold text-blue-600">€20</div>
                <div className="text-sm text-gray-500">в месяц</div>
              </div>
              <ul className="text-sm space-y-1">
                <li>✅ До 5 сотрудников</li>
                <li>✅ Полный календарь</li>
                <li>✅ Неограниченно клиентов</li>
                <li>✅ SMS уведомления</li>
                <li>✅ Базовая аналитика</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4 bg-purple-50">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg">🏢 BUSINESS</h3>
                <div className="text-2xl font-bold text-purple-600">€50</div>
                <div className="text-sm text-gray-500">в месяц</div>
              </div>
              <ul className="text-sm space-y-1">
                <li>✅ До 10 сотрудников</li>
                <li>✅ Продвинутая аналитика</li>
                <li>✅ Интеграции с соцсетями</li>
                <li>✅ Онлайн запись</li>
                <li>✅ Многофилиальность</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4 bg-orange-50">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg">🏭 ENTERPRISE</h3>
                <div className="text-2xl font-bold text-orange-600">€70</div>
                <div className="text-sm text-gray-500">в месяц</div>
              </div>
              <ul className="text-sm space-y-1">
                <li>✅ До 25 сотрудников</li>
                <li>✅ API доступ</li>
                <li>✅ Персональный менеджер</li>
                <li>✅ Кастомные интеграции</li>
                <li>✅ White-label решения</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Техническая архитектура */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Техническая архитектура
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-3">🔧 Frontend URL Structure (НОВАЯ):</h4>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`✅ ОБНОВЛЕНЫ URLs на семантические:
/register/owner      # Шаг 1: Данные владельца
/register/salon      # Шаг 2: Данные салона  
/register/location   # Шаг 3: Локация и валюта
/register/services   # Шаг 4: Услуги и команда
/register/pricing    # Шаг 5: Выбор тарифа
/register/activation # Шаг 6: Финальная активация

# Backend API (без изменений):
POST /api/register/*   # Соответствующие endpoints`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-3">🗃️ Database Schema (новые поля):</h4>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`model RegistrationSession {
  id          String   @id @default(cuid())
  userId      String?  
  step        Int      @default(1)
  data        Json     // Временные данные регистрации
  expiresAt   DateTime
}

enum BusinessType {
  SALON   // Клиенты приходят в салон
  MOBILE  // Мобильный мастер (выезжаю к клиентам)
  HOME    // Работаю на дому
  ONLINE  // Онлайн консультации
}

enum TeamSize {
  SOLO    // 1 человек
  SMALL   // 2-5 человек  
  MEDIUM  // 6-15 человек
  LARGE   // 16+ человек
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-3">⚛️ Frontend компоненты (ОБНОВЛЕНЫ):</h4>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`✅ ВСЕ КОМПОНЕНТЫ ПЕРЕДЕЛАНЫ В СТИЛЕ login-02:

<MultiStepRegistration />  # Основной контейнер
  ├── <RegistrationLayout />   # Двухколоночный grid layout
  ├── <OwnerStep />           # /register/owner
  ├── <SalonStep />           # /register/salon  
  ├── <LocationStep />        # /register/location
  ├── <ServicesStep />        # /register/services
  ├── <PricingStep />         # /register/pricing
  └── <ActivationStep />      # /register/activation

# НОВЫЕ ОСОБЕННОСТИ:
✅ Минималистичный черно-белый дизайн
✅ Формы расширены до max-w-lg
✅ Автоопределение страны по IP
✅ SMS подтверждение отключено
✅ Исключена Россия из списка стран`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Чеклист разработки */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">
            📋 Чеклист разработки (7-10 дней)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-orange-700 mb-3">🎨 Frontend (2-3 дня):</h4>
              <ul className="text-sm space-y-1">
                <li>☐ MultiStepRegistration компонент + роутинг</li>
                <li>☐ 6 компонентов шагов регистрации</li>
                <li>☐ Вспомогательные UI компоненты</li>
                <li>☐ Responsive дизайн</li>
                <li>☐ Переводы на 4 языка</li>
                <li>☐ Валидация форм в реальном времени</li>
                <li>☐ Анимации переходов между шагами</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-orange-700 mb-3">🔧 Backend (2-3 дня):</h4>
              <ul className="text-sm space-y-1">
                <li>☐ 7 API endpoints для регистрации</li>
                <li>☐ Middleware управления сессией</li>
                <li>☐ Валидация с Zod схемами</li>
                <li>☐ Миграция Prisma для новых полей</li>
                <li>☐ Rate limiting защита от спама</li>
                <li>☐ Seed данные стран и валют</li>
                <li>☐ Индексы БД для оптимизации</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-orange-700 mb-3">📱 Интеграции (1-2 дня):</h4>
              <ul className="text-sm space-y-1">
                <li>☐ Email сервис (SendGrid/AWS SES)</li>
                <li>☐ SMS сервис (Twilio/MessageBird)</li>
                <li>☐ Геокодирование адресов</li>
                <li>☐ Интеграция с картами</li>
                <li>☐ API курсов валют (опционально)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-orange-700 mb-3">🧪 Тестирование (1 день):</h4>
              <ul className="text-sm space-y-1">
                <li>☐ Unit тесты API endpoints</li>
                <li>☐ E2E тесты полного flow</li>
                <li>☐ Тестирование мобильной версии</li>
                <li>☐ Нагрузочное тестирование</li>
                <li>☐ Безопасность и защита от атак</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-orange-100 rounded">
            <h4 className="font-semibold text-orange-700 mb-2">🎯 Цели проекта:</h4>
            <ul className="text-sm text-orange-600 space-y-1">
              <li>• <strong>Конверсия:</strong> 45%+ (vs 30% у конкурентов)</li>
              <li>• <strong>Время регистрации:</strong> менее 5 минут</li>
              <li>• <strong>Мобильная версия:</strong> 90%+ usability score</li>
              <li>• <strong>Безопасность:</strong> 0 уязвимостей</li>
              <li>• <strong>Производительность:</strong> загрузка менее 3 сек</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Следующие шаги */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">
            🚀 Следующие шаги
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">📋 Ближайшие задачи:</h4>
              <ol className="text-sm text-green-600 space-y-1 list-decimal list-inside">
                <li>Создать базовые React компоненты (MultiStepRegistration, ProgressBar)</li>
                <li>Настроить API endpoints и Prisma миграции</li>
                <li>Интегрировать SMS и Email сервисы</li>
                <li>Добавить интерактивные карты и геокодирование</li>
                <li>Провести тестирование и оптимизацию</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-semibold text-green-700 mb-2">🔮 Будущие улучшения:</h4>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• AI чат-бот для помощи в регистрации</li>
                <li>• PWA мобильное приложение</li>
                <li>• Социальная регистрация (Google/Facebook)</li>
                <li>• Персонализация под тип салона</li>
                <li>• ML предсказания лучшего тарифа</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationSection;