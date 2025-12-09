import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui'
import { Users, Mail, Building2, Link2, UserPlus, Shield, Database, Gift, Phone, Calendar, Trophy, Star, CheckCircle, AlertCircle, Zap } from 'lucide-react'

export const ClientSystemSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-600" />
            Архитектура клиентской системы
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Глобальная система управления клиентами</strong> с email-based идентификацией,
            позволяющая одному клиенту посещать несколько салонов с единым профилем и Google OAuth авторизацией.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
            <p className="text-blue-800 font-medium">🎯 Ключевые принципы:</p>
            <ul className="list-disc pl-6 mt-2 text-blue-700 space-y-1">
              <li><strong>Email как первичный ключ</strong> - глобальная идентификация клиента</li>
              <li><strong>Multi-tenant relationships</strong> - клиент может быть связан с N салонами</li>
              <li><strong>Google OAuth support</strong> - регистрация через Google аккаунт</li>
              <li><strong>Walk-in clients</strong> - регистрация администратором салона</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-purple-900">
            <Database className="w-5 h-5 text-purple-600" />
            Визуальная архитектура
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-white rounded-md p-4 font-mono text-xs overflow-x-auto">
            <pre className="text-gray-800">
{`┌─────────────────────────────────────────────────────────────────────────┐
│                    ГЛОБАЛЬНАЯ КЛИЕНТСКАЯ СИСТЕМА                        │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  ClientProfile       │ ◄─── Глобальный профиль клиента
├──────────────────────┤
│ email (UNIQUE)       │ ◄─── Первичный ключ (john@gmail.com)
│ firstName            │
│ lastName             │
│ phone                │
│ googleId (nullable)  │ ◄─── Для OAuth регистрации
│ createdAt            │
└──────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────────────┐
│  ClientSalonRelation         │ ◄─── Связь клиента с салонами
├──────────────────────────────┤
│ id                           │
│ clientEmail ──────┐          │
│ tenantId          │          │
│ salonNotes        │          │ ◄─── Заметки конкретного салона
│ visitCount        │          │
│ createdAt         │          │
└───────────────────┼──────────┘
                    │
         ┌──────────┴─────────┬──────────────┐
         │                    │              │
         ▼                    ▼              ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Salon A         │  │ Salon B         │  │ Salon C         │
│ (tenant_id_1)   │  │ (tenant_id_2)   │  │ (tenant_id_3)   │
│                 │  │                 │  │                 │
│ Notes: "VIP"    │  │ Notes: "Аллергия│  │ Notes: "Новый"  │
│ Visits: 15      │  │        на краску"│  │ Visits: 1       │
└─────────────────┘  └─────────────────┘  └─────────────────┘


┌──────────────────────────────────────────────────────────────┐
│                    СЦЕНАРИИ РЕГИСТРАЦИИ                      │
└──────────────────────────────────────────────────────────────┘

1️⃣ Google OAuth (Client Portal):
   ┌─────────┐      ┌──────────┐      ┌────────────────┐
   │ Клиент  │─────▶│  Google  │─────▶│ ClientProfile  │
   └─────────┘      └──────────┘      │ создается      │
                                       │ автоматически  │
                                       └────────────────┘

2️⃣ Walk-in Registration (Salon CRM):
   ┌──────────┐     ┌─────────────────┐     ┌────────────────┐
   │ Админ    │────▶│ Форма создания  │────▶│ ClientProfile  │
   │ салона   │     │ клиента         │     │ + Relation     │
   └──────────┘     └─────────────────┘     └────────────────┘

3️⃣ Invitation System (Email приглашение):
   ┌──────────┐     ┌─────────────────┐     ┌────────────────┐
   │ Админ    │────▶│ ClientInvitation│────▶│ Email с ссылкой│
   │ салона   │     │ создается       │     │ на регистрацию │
   └──────────┘     └─────────────────┘     └────────────────┘
                                                     │
                                                     ▼
                                            ┌────────────────┐
                                            │ Клиент         │
                                            │ регистрируется │
                                            └────────────────┘`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5 text-orange-600" />
              Email-based идентификация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p><strong>Почему email как первичный ключ:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Уникальная глобальная идентификация клиента</li>
              <li>Автоматическое связывание между салонами</li>
              <li>Поддержка Google OAuth (email приходит от Google)</li>
              <li>Удобная система приглашений через email</li>
            </ul>
            <div className="bg-orange-50 border border-orange-200 rounded-md p-2 mt-2 text-xs">
              <p className="font-medium text-orange-800">Пример:</p>
              <p className="text-orange-700">john@gmail.com посещает 3 салона → одна запись ClientProfile + 3 записи ClientSalonRelation</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-green-600" />
              Multi-tenant отношения
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p><strong>Связь клиента с салонами:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>ClientSalonRelation хранит tenantId салона</li>
              <li>Каждый салон видит только своих клиентов</li>
              <li>Заметки (salonNotes) уникальны для каждого салона</li>
              <li>Счетчик визитов (visitCount) ведется отдельно</li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-2 text-xs">
              <p className="font-medium text-green-800">Изоляция данных:</p>
              <p className="text-green-700">Салон А не видит заметки Салона Б для одного клиента</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-indigo-200 bg-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-indigo-900">
            <Shield className="w-5 h-5 text-indigo-600" />
            Google OAuth Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-indigo-900">
          <p><strong>Процесс OAuth регистрации:</strong></p>
          <div className="space-y-2 pl-4">
            <div>
              <p className="font-medium">1. Клиент нажимает "Sign in with Google"</p>
              <p className="text-xs text-indigo-700">Client Portal → Google OAuth screen</p>
            </div>
            <div>
              <p className="font-medium">2. Google возвращает профиль (email, firstName, lastName, googleId)</p>
              <p className="text-xs text-indigo-700">Callback endpoint получает данные от Google</p>
            </div>
            <div>
              <p className="font-medium">3. Система проверяет существование ClientProfile по email</p>
              <p className="text-xs text-indigo-700">Если не существует → создаем новый профиль с googleId</p>
            </div>
            <div>
              <p className="font-medium">4. Если профиль существует без googleId → связываем</p>
              <p className="text-xs text-indigo-700">Walk-in клиент может позже войти через Google</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5 text-purple-600" />
            Invitation System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p><strong>Система приглашений клиентов:</strong></p>
          <div className="bg-white rounded-md border p-3">
            <p className="font-medium mb-2">ClientInvitation модель:</p>
            <ul className="list-disc pl-6 space-y-1 text-xs">
              <li><code>email</code> - email клиента для приглашения</li>
              <li><code>tenantId</code> - салон, который приглашает</li>
              <li><code>token</code> - уникальный токен для регистрации</li>
              <li><code>expiresAt</code> - срок действия приглашения (7 дней)</li>
              <li><code>status</code> - PENDING | ACCEPTED | EXPIRED</li>
            </ul>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mt-2">
            <p className="font-medium text-purple-800">Workflow приглашения:</p>
            <ol className="list-decimal pl-6 mt-2 text-purple-700 space-y-1 text-xs">
              <li>Админ салона вводит email клиента → создается ClientInvitation</li>
              <li>Email отправляется с уникальной ссылкой: <code>/register?token=abc123</code></li>
              <li>Клиент переходит по ссылке → автоматическое заполнение формы регистрации</li>
              <li>После регистрации: ClientProfile создается + ClientSalonRelation к салону</li>
              <li>Invitation статус меняется на ACCEPTED</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card className="border-teal-200 bg-teal-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-teal-900">
            <Link2 className="w-5 h-5 text-teal-600" />
            Database Schema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-white rounded-md p-3 font-mono text-xs overflow-x-auto">
            <pre className="text-gray-800">
{`model ClientProfile {
  email         String   @id @unique      // Первичный ключ
  firstName     String
  lastName      String

  // Phone verification (05.10.2025)
  phone         String?                   // Обязательно после регистрации
  phoneVerified Boolean  @default(false)  // SMS/WhatsApp подтверждение
  phoneVerifiedAt DateTime?

  // Personal data
  birthdate     DateTime?                 // Для birthday campaigns
  gender        String?                   // M/F/OTHER/PREFER_NOT_TO_SAY

  // OAuth
  googleId      String?  @unique          // Для Google OAuth

  // Platform tracking
  joinedPortalAt DateTime @default(now()) // Первая регистрация в системе
  source        String?                   // google/instagram/referral/walk-in
  referredBy    String?                   // Email клиента-реферера

  // Preferences
  preferredLanguage String @default("ru") // ru/en/pl
  marketingConsent  Boolean @default(false) // GDPR compliance

  // Отношения
  salonRelations ClientSalonRelation[]
  appointments   Appointment[]            // Через clientEmail

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("client_profiles")
}

model ClientSalonRelation {
  id            String   @id @default(cuid())

  // Связи
  clientEmail   String                    // FK к ClientProfile.email
  client        ClientProfile @relation(fields: [clientEmail], references: [email])

  tenantId      String                    // FK к Tenant.id
  tenant        Tenant   @relation(fields: [tenantId], references: [id])

  // Salon-specific данные
  salonNotes    String?                   // Заметки салона о клиенте

  // Visit tracking (05.10.2025)
  visitCount    Int      @default(0)      // Счетчик визитов
  lastVisitAt   DateTime?
  joinedSalonAt DateTime @default(now())  // Дата присоединения к салону

  // Loyalty system
  loyaltyTier   String   @default("BRONZE") // BRONZE/SILVER/GOLD/PLATINUM
  loyaltyPoints Int      @default(0)      // Баллы лояльности
  totalSpent    Decimal  @default(0)      // Общая сумма покупок

  // Preferences
  preferredStaff String?                  // ID предпочитаемого мастера
  notificationPrefs Json?                 // email/sms/push settings

  // Marketing
  lastContactedAt DateTime?               // Последний контакт
  marketingOptIn  Boolean @default(true)  // Согласие на рассылки

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([clientEmail, tenantId])       // Один клиент = одна связь с салоном
  @@map("client_salon_relations")
}

model ClientInvitation {
  id            String   @id @default(cuid())
  email         String                    // Email для приглашения
  tenantId      String                    // Салон-отправитель
  token         String   @unique          // Уникальный токен
  status        String   @default("PENDING") // PENDING | ACCEPTED | EXPIRED
  expiresAt     DateTime

  createdAt     DateTime @default(now())

  @@map("client_invitations")
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-amber-900">
            <Phone className="w-5 h-5 text-amber-600" />
            Phone Verification Flow (Новое 05.10.2025)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-amber-900">
          <p><strong>Обязательная верификация телефона после регистрации:</strong></p>
          <div className="space-y-2 pl-4">
            <div>
              <p className="font-medium">1. Клиент регистрируется через Google OAuth</p>
              <p className="text-xs text-amber-700">ClientProfile создается с phoneVerified = false</p>
            </div>
            <div>
              <p className="font-medium">2. Redirect на страницу "Complete Your Profile"</p>
              <p className="text-xs text-amber-700">Форма: phone (обязательно) + birthdate (опционально)</p>
            </div>
            <div>
              <p className="font-medium">3. Отправка SMS OTP кода на указанный номер</p>
              <p className="text-xs text-amber-700">Integration: Twilio или SMS.ru для отправки кода</p>
            </div>
            <div>
              <p className="font-medium">4. Клиент вводит 6-значный код</p>
              <p className="text-xs text-amber-700">Обновляем phoneVerified = true, phoneVerifiedAt = now()</p>
            </div>
            <div>
              <p className="font-medium">5. Access к Client Portal разблокирован</p>
              <p className="text-xs text-amber-700">Без верифицированного телефона - ограниченный доступ</p>
            </div>
          </div>
          <div className="bg-white rounded-md p-3 mt-3">
            <p className="font-medium text-amber-800">🔒 Безопасность:</p>
            <ul className="list-disc pl-6 mt-2 text-xs text-amber-700 space-y-1">
              <li>OTP код истекает через 5 минут</li>
              <li>Максимум 3 попытки отправки кода в час</li>
              <li>Rate limiting для защиты от спама</li>
              <li>Phone format validation (международный формат +48...)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-pink-200 bg-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-pink-900">
            <Calendar className="w-5 h-5 text-pink-600" />
            Birthday Campaigns (Новое 05.10.2025)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-pink-900">
          <p><strong>Автоматическая система поздравлений и специальных предложений:</strong></p>
          <div className="bg-white rounded-md border p-3">
            <p className="font-medium mb-2">Автоматические действия:</p>
            <ul className="list-disc pl-6 space-y-1 text-xs">
              <li>За 7 дней до ДР: email с поздравлением + промокод на скидку</li>
              <li>В день рождения: SMS с персональным предложением</li>
              <li>Неделя после ДР: reminder об истечении birthday скидки</li>
            </ul>
          </div>
          <div className="bg-white rounded-md border p-3 mt-2">
            <p className="font-medium mb-2">Типы birthday предложений:</p>
            <ul className="list-disc pl-6 space-y-1 text-xs">
              <li><strong>15% скидка</strong> - на любую услугу в месяц рождения</li>
              <li><strong>Бесплатная услуга</strong> - nail art или маска для волос</li>
              <li><strong>2x Loyalty Points</strong> - удвоенные баллы за визиты в birthday week</li>
            </ul>
          </div>
          <div className="bg-pink-100 rounded-md p-3 mt-2">
            <p className="font-medium text-pink-800">📊 Analytics:</p>
            <p className="text-xs text-pink-700">Conversion rate birthday campaigns, ROI tracking, A/B testing предложений</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-yellow-900">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Loyalty System (Новое 05.10.2025)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-yellow-900">
          <p><strong>4-уровневая система лояльности с автоматическими привилегиями:</strong></p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-100 border border-orange-300 rounded-md p-3">
              <p className="font-bold text-orange-800 flex items-center gap-2">
                <Star className="w-4 h-4" /> BRONZE (Новый клиент)
              </p>
              <p className="text-xs text-orange-700 mt-1">0-4 визита или &lt; 3 месяцев</p>
              <p className="text-xs text-orange-700">1x баллы за каждый ₽</p>
            </div>
            <div className="bg-gray-200 border border-gray-400 rounded-md p-3">
              <p className="font-bold text-gray-800 flex items-center gap-2">
                <Star className="w-4 h-4" /> SILVER (Постоянный)
              </p>
              <p className="text-xs text-gray-700 mt-1">5-14 визитов или 3-12 месяцев</p>
              <p className="text-xs text-gray-700">1.25x баллы + 5% скидка</p>
            </div>
            <div className="bg-yellow-200 border border-yellow-400 rounded-md p-3">
              <p className="font-bold text-yellow-900 flex items-center gap-2">
                <Star className="w-4 h-4" /> GOLD (VIP)
              </p>
              <p className="text-xs text-yellow-800 mt-1">15-29 визитов или &gt; 1 года</p>
              <p className="text-xs text-yellow-800">1.5x баллы + 10% скидка + priority booking</p>
            </div>
            <div className="bg-purple-200 border border-purple-400 rounded-md p-3">
              <p className="font-bold text-purple-900 flex items-center gap-2">
                <Star className="w-4 h-4" /> PLATINUM (Elite)
              </p>
              <p className="text-xs text-purple-800 mt-1">30+ визитов или totalSpent &gt; 50k ₽</p>
              <p className="text-xs text-purple-800">2x баллы + 15% скидка + VIP treatment</p>
            </div>
          </div>
          <div className="bg-white rounded-md p-3 mt-3">
            <p className="font-medium text-yellow-800">🎁 Использование баллов:</p>
            <ul className="list-disc pl-6 mt-2 text-xs text-yellow-700 space-y-1">
              <li>100 баллов = 100 ₽ скидка на следующий визит</li>
              <li>Минимум 500 баллов для использования</li>
              <li>Баллы истекают через 12 месяцев неактивности</li>
              <li>Automatic tier upgrade при достижении критериев</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-emerald-900">
            <Gift className="w-5 h-5 text-emerald-600" />
            Referral Program (Новое 05.10.2025)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-emerald-900">
          <p><strong>Программа "Приведи друга" с двусторонними бонусами:</strong></p>
          <div className="bg-white rounded-md border p-3">
            <p className="font-medium mb-2">Механика:</p>
            <ul className="list-disc pl-6 space-y-1 text-xs">
              <li>Каждый клиент получает уникальный referral code (например: ANNA2024)</li>
              <li>Друг регистрируется с кодом → поле <code>referredBy</code> = email реферера</li>
              <li><strong>Друг получает:</strong> 20% скидка на первый визит</li>
              <li><strong>Реферер получает:</strong> 500 loyalty points после первого визита друга</li>
            </ul>
          </div>
          <div className="bg-emerald-100 rounded-md p-3 mt-2">
            <p className="font-medium text-emerald-800">📈 Tracking & Rewards:</p>
            <ul className="list-disc pl-6 mt-2 text-xs text-emerald-700 space-y-1">
              <li>Dashboard с количеством приглашенных друзей</li>
              <li>Special rewards за 5, 10, 20 рефералов</li>
              <li>Leaderboard топ-рефереров в салоне</li>
              <li>Analytics: источник клиентов (source field tracking)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-600" />
            API Endpoints (обновленные)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="bg-white rounded-md border p-3">
            <p className="font-medium mb-2">Client Portal API:</p>
            <ul className="list-none space-y-1 text-xs font-mono">
              <li><span className="text-green-600">POST</span>   /api/auth/google/callback     - OAuth регистрация</li>
              <li><span className="text-green-600">POST</span>   /api/clients/verify-phone     - Отправка OTP кода</li>
              <li><span className="text-green-600">POST</span>   /api/clients/confirm-phone    - Подтверждение телефона</li>
              <li><span className="text-blue-600">GET</span>    /api/clients/me                - Профиль + loyalty info</li>
              <li><span className="text-orange-600">PUT</span>    /api/clients/me                - Обновление профиля</li>
              <li><span className="text-blue-600">GET</span>    /api/clients/me/salons         - Список салонов клиента</li>
              <li><span className="text-blue-600">GET</span>    /api/clients/me/referrals      - Статистика рефералов</li>
              <li><span className="text-blue-600">GET</span>    /api/clients/me/loyalty-history - История баллов</li>
            </ul>
          </div>
          <div className="bg-white rounded-md border p-3 mt-2">
            <p className="font-medium mb-2">Salon CRM API:</p>
            <ul className="list-none space-y-1 text-xs font-mono">
              <li><span className="text-green-600">POST</span>   /api/crm/clients               - Создание walk-in клиента</li>
              <li><span className="text-blue-600">GET</span>    /api/crm/clients               - Список клиентов (фильтры: tier, joinedSalonAt)</li>
              <li><span className="text-blue-600">GET</span>    /api/crm/clients/:email        - Детали + loyalty + visit history</li>
              <li><span className="text-orange-600">PUT</span>    /api/crm/clients/:email        - Обновление заметок салона</li>
              <li><span className="text-green-600">POST</span>   /api/crm/clients/invite        - Отправка приглашения</li>
              <li><span className="text-blue-600">GET</span>    /api/crm/invitations           - Список приглашений</li>
              <li><span className="text-green-600">POST</span>   /api/crm/loyalty/add-points    - Ручное добавление баллов</li>
              <li><span className="text-blue-600">GET</span>    /api/crm/analytics/birthdays   - Список ближайших ДР</li>
              <li><span className="text-blue-600">GET</span>    /api/crm/analytics/loyalty     - Распределение по tier</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
            <Zap className="w-5 h-5 text-blue-600" />
            GitHub Issues Status (25.10.2025)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-900">
          <div className="space-y-3">
            {/* Issue #60 - НОВЫЙ */}
            <div className="bg-white rounded-md border-2 border-green-300 p-3">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-green-900">Issue #60: Client Portal Authentication</p>
                  <p className="text-xs text-green-700 mt-0.5">Статус: ✅ ЗАКРЫТ (25.10.2025)</p>
                </div>
              </div>
              <div className="ml-7 space-y-1 text-xs text-green-800">
                <p><strong>Проблемы исправлены:</strong></p>
                <ul className="list-disc pl-4 space-y-0.5 text-green-700">
                  <li><strong>502 Bad Gateway:</strong> Read-only filesystem + nginx buffers (4KB → 16KB)</li>
                  <li><strong>Redirect Loop:</strong> ClientLayout использовал CRM endpoint (403 error)</li>
                  <li>OAuth flow работает стабильно без ошибок</li>
                  <li>Dashboard загружается без redirect loop</li>
                </ul>
                <p className="mt-1"><strong>Подтверждение пользователя:</strong></p>
                <p className="text-green-600 italic">"Да, все работает! отличная работа Клод!" - Sergio, 25.10.2025</p>
                <p className="mt-1"><strong>Документация:</strong></p>
                <ul className="list-disc pl-4 space-y-0.5 text-green-700">
                  <li>CLIENT_PORTAL_AUTH_DIAGNOSTIC_24_10_2025.md</li>
                  <li>OAUTH_502_FIX_25_10_2025.md</li>
                  <li>CLIENT_PORTAL_REDIRECT_LOOP_FIX_25_10_2025.md</li>
                </ul>
              </div>
            </div>

            {/* Issue #61 - НОВЫЙ */}
            <div className="bg-white rounded-md border-2 border-amber-300 p-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-900">Issue #61: Client Portal Notifications System</p>
                  <p className="text-xs text-amber-700 mt-0.5">Статус: 📝 СОЗДАН (25.10.2025) - Приоритет: Medium</p>
                </div>
              </div>
              <div className="ml-7 space-y-1 text-xs text-amber-800">
                <p><strong>Описание:</strong></p>
                <p>Создать отдельную систему notifications для Client Portal (независимую от CRM notifications).</p>
                <p className="mt-1"><strong>Требования:</strong></p>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-700">
                  <li>Endpoint: <code className="bg-amber-50 px-1">/api/auth/client/notifications</code></li>
                  <li>Доступ: CLIENT роль (без tenantId)</li>
                  <li>Таблица: ClientNotification (link by email)</li>
                  <li>Типы: appointment confirmations, reminders, loyalty rewards</li>
                </ul>
                <p className="mt-1"><strong>Текущий статус:</strong></p>
                <p className="text-amber-700">⚠️ Notifications временно отключены в ClientLayout (enabled: false)</p>
                <p className="mt-1"><strong>Оценка:</strong> 3-4 недели (post-MVP feature)</p>
              </div>
            </div>
            {/* Issue #50 */}
            <div className="bg-white rounded-md border-2 border-green-300 p-3">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-green-900">Issue #50: Walk-in Flow Backend</p>
                  <p className="text-xs text-green-700 mt-0.5">Статус: ✅ ЗАВЕРШЕНО</p>
                </div>
              </div>
              <div className="ml-7 space-y-1 text-xs text-green-800">
                <p><strong>Реализовано:</strong></p>
                <ul className="list-disc pl-4 space-y-0.5 text-green-700">
                  <li>GET /api/crm/clients/check-email - проверка ClientProfile по email</li>
                  <li>POST /api/crm/appointments с clientEmail flow - создание записей для новых клиентов</li>
                  <li>Email templates - приглашения и подтверждения</li>
                  <li>Avatar sync интеграция в response</li>
                </ul>
                <p className="mt-1"><strong>Документация:</strong> CODEX_HANDOFF_WALK_IN_FLOW.md</p>
              </div>
            </div>

            {/* Issue #33 */}
            <div className="bg-white rounded-md border-2 border-amber-300 p-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-900">Issue #33: Client Booking Flow</p>
                  <p className="text-xs text-amber-700 mt-0.5">Статус: 🚧 В РАЗРАБОТКЕ (30% - UI готов)</p>
                </div>
              </div>
              <div className="ml-7 space-y-1 text-xs text-amber-800">
                <p><strong>Завершено:</strong></p>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-700">
                  <li>BookingFlow.tsx - 805-line компонент (6-step UI)</li>
                  <li>Full i18n (en/pl/ru/ua), responsive design</li>
                  <li>Loyalty points integration, real-time availability</li>
                  <li>Build verification - успешно компилируется</li>
                </ul>
                <p className="mt-1"><strong>Архитектура (ПРАВИЛЬНО!):</strong></p>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-700">
                  <li>BookingFlow встраивается в <strong>MySalonsPage</strong> как модальное окно/drawer</li>
                  <li>Клиент выбирает салон в "My Salons" → кликает "Book"</li>
                  <li>Открывается модальное окно с BookingFlow (tenantId передается)</li>
                  <li>После бронирования: письма + уведомления на оба портала</li>
                </ul>
                <p className="mt-1"><strong>TODO:</strong> 1) Modal в MySalonsPage, 2) Backend API, 3) Email/notifications</p>
                <p className="text-xs text-amber-600 mt-1"><strong>Файл:</strong> apps/client-booking/src/components/BookingFlow.tsx</p>
              </div>
            </div>

            {/* Issue #31 */}
            <div className="bg-white rounded-md border-2 border-red-300 p-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-900">Issue #31: Client System Backend</p>
                  <p className="text-xs text-red-700 mt-0.5">Статус: 🚨 БЛОКИРОВАНА (40%)</p>
                </div>
              </div>
              <div className="ml-7 space-y-1 text-xs text-red-800">
                <p><strong>Завершено:</strong></p>
                <ul className="list-disc pl-4 space-y-0.5 text-red-700">
                  <li>Auth endpoints для ClientProfile (register, login, profile)</li>
                  <li>Google OAuth интеграция</li>
                  <li>SMS OTP verification через Twilio</li>
                  <li>JWT tokens с поддержкой OAuth клиентов</li>
                </ul>
                <p className="mt-1"><strong>БЛОКИРУЮЩАЯ ЗАДАЧА:</strong></p>
                <p className="text-red-600 font-medium">⚠️ Требуется Prisma migration для создания ClientProfile, ClientSalonRelation таблиц:</p>
                <code className="bg-red-100 px-2 py-1 rounded text-red-900 block mt-1">npx prisma db push</code>
                <p className="text-red-600 mt-1">БЕЗ этого все Client Portal endpoints падают с ошибками БД!</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-md p-3 mt-3">
              <p className="font-medium text-green-900 mb-2">📊 Общий прогресс (25.10.2025):</p>
              <div className="space-y-1 text-xs text-green-800">
                <p className="font-bold text-green-900">🎉 CLIENT PORTAL MVP ГОТОВ!</p>
                <p>✅ Client Portal Authentication (#60): 100% - ЗАКРЫТ</p>
                <p>✅ Walk-in Flow (#50): 100% backend готов</p>
                <p>🚧 Booking Flow (#33): 30% UI готов, нужна интеграция с My Salons + Backend API</p>
                <p>📝 Client Notifications (#61): NEW - Post-MVP feature (medium priority)</p>
                <p>⚠️ Client System (#31): 40% auth готов, ждёт Prisma migration</p>
                <p className="mt-2 font-medium text-blue-900">🎯 Следующий шаг: Prisma migration для разблокировки #31 и #33</p>
                <p className="mt-2 font-bold text-green-700">✨ Google OAuth + Dashboard работают стабильно!</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientSystemSection
