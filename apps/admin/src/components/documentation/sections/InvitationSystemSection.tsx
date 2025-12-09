import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui';
import {
  Users,
  UserPlus,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Building,
  ArrowRight,
  Database,
  Code,
  Smartphone,
  Globe
} from 'lucide-react';

export const InvitationSystemSection: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-purple-600" />
            🎯 INVITATION SYSTEM - Система приглашений мастеров
          </CardTitle>
          <p className="text-gray-600">
            <strong>Статус:</strong> Концепция | <strong>Версия:</strong> 1.0 | <strong>Обновлено:</strong> 25 августа 2025
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Комплексная система приглашений для создания многосалонной сети мастеров. Позволяет владельцам салонов 
            приглашать мастеров, а мастерам работать в нескольких салонах одновременно с умным управлением конфликтами.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">✅ Для владельцев салонов</h4>
              <p className="text-sm text-green-800">Простое приглашение мастеров через email с автоматической интеграцией в календарь</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">🔄 Для существующих мастеров</h4>
              <p className="text-sm text-blue-800">Добавление нового салона к существующему аккаунту с переключателем салонов</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-2">🆕 Для новых мастеров</h4>
              <p className="text-sm text-orange-800">Автоматическая регистрация по приглашению с бесплатным доступом к календарю салона</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Бизнес-логика и типы мастеров */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            👥 ТИПЫ МАСТЕРОВ И БИЗНЕС-ЛОГИКА
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Типы мастеров */}
          <div>
            <h3 className="text-lg font-semibold mb-4">🎯 Классификация мастеров в системе</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Мастер-Владелец */}
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <Building className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">1. Мастер-Владелец салона</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Зарегистрировался сам</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Купил пакет €50/€70</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Полный доступ ко всему</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Может приглашать других</span>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-green-100 rounded-lg">
                  <h5 className="font-semibold text-green-900 text-sm">Права доступа:</h5>
                  <div className="text-xs text-green-800 mt-1">
                    • Клиенты, финансы, аналитика<br/>
                    • Настройки салона<br/>
                    • Управление персоналом<br/>
                    • Все функции CRM
                  </div>
                </div>
              </div>

              {/* Мастер-Сотрудник мульти */}
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">2. Мастер-Сотрудник (мульти)</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Уже имеет свой салон</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Получает приглашения</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Switcher салонов в UI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Может объединить расписания</span>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-blue-100 rounded-lg">
                  <h5 className="font-semibold text-blue-900 text-sm">Права доступа:</h5>
                  <div className="text-xs text-blue-800 mt-1">
                    <strong>Свой салон:</strong> полные права<br/>
                    <strong>Чужой салон:</strong> только календарь<br/>
                    • Просмотр своих записей<br/>
                    • Управление расписанием
                  </div>
                </div>
              </div>

              {/* Новый мастер */}
              <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-orange-900">3. Новый мастер</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>Не зарегистрирован в CRM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-600" />
                    <span>Получает email-приглашение</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-orange-600" />
                    <span>Регистрация по ссылке</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-600" />
                    <span>Может апгрейдиться</span>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-orange-100 rounded-lg">
                  <h5 className="font-semibold text-orange-900 text-sm">Права доступа:</h5>
                  <div className="text-xs text-orange-800 mt-1">
                    • Только календарь салона<br/>
                    • Просмотр своих записей<br/>
                    • Базовые уведомления<br/>
                    • Возможность купить полный пакет
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Модель оплаты */}
          <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              💰 <span>Модель оплаты</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-yellow-900 mb-3">📦 Пакеты для салонов</h4>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Basic Package</span>
                      <Badge className="bg-green-600 text-white">€50/мес</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      • До 5 сотрудников<br/>
                      • Базовый функционал CRM<br/>
                      • Email поддержка
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Premium Package</span>
                      <Badge className="bg-blue-600 text-white">€70/мес</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      • До 10 сотрудников<br/>
                      • Расширенная аналитика<br/>
                      • Приоритетная поддержка
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-yellow-900 mb-3">🎯 Принципы оплаты</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span><strong>Салон платит за всех сотрудников</strong> - независимо от того, есть ли у мастера свой салон</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span><strong>Мастер работает бесплатно</strong> как сотрудник в чужом салоне</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span><strong>Мастер платит только</strong> если хочет открыть свой салон</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                    <span><strong>Лимит сотрудников</strong> контролируется в пакете салона</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Schema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Database className="w-6 h-6 text-green-600" />
            🗄️ DATABASE SCHEMA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Основные таблицы */}
          <div>
            <h3 className="text-lg font-semibold mb-4">📋 Структура базы данных</h3>
            
            <div className="space-y-4">
              {/* Invitation Table */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Invitation - Таблица приглашений
                </h4>
                <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`model Invitation {
  id              String   @id @default(cuid())
  
  // Салон, который приглашает
  salonId         String
  salon           Salon    @relation(fields: [salonId], references: [id])
  inviterUserId   String   // Кто отправил приглашение
  inviter         User     @relation("InviterInvitations", fields: [inviterUserId], references: [id])
  
  // Данные приглашаемого мастера
  masterEmail     String
  masterPhone     String?
  masterName      String
  personalMessage String?  // Личное сообщение от владельца
  
  // Настройки доступа
  role            UserRole @default(STAFF_MEMBER)
  permissions     String[] @default(["calendar.view", "appointments.manage"])
  
  // Статус и токены
  status          InviteStatus @default(PENDING)
  token           String   @unique @default(cuid())
  expiresAt       DateTime // Срок действия (7 дней)
  
  // Timestamps
  createdAt       DateTime @default(now())
  sentAt          DateTime?
  acceptedAt      DateTime?
  declinedAt      DateTime?
  
  @@map("invitations")
}`}
                </pre>
              </div>

              {/* UserSalonAccess Table */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  UserSalonAccess - Связи мастер-салон
                </h4>
                <pre className="text-sm bg-gray-800 text-blue-400 p-3 rounded overflow-x-auto">
{`model UserSalonAccess {
  id            String   @id @default(cuid())
  
  // Связи
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  salonId       String
  salon         Salon    @relation(fields: [salonId], references: [id])
  
  // Права и роли
  role          UserRole
  permissions   String[] // Детальные разрешения
  isOwner       Boolean  @default(false)  // Владелец салона
  isActive      Boolean  @default(true)   // Активный сотрудник
  
  // Связь с приглашением
  invitationId  String?  // Ссылка на исходное приглашение
  invitation    Invitation? @relation(fields: [invitationId], references: [id])
  
  // Настройки работы
  priority      Int      @default(1)      // Приоритет салона (1 = основной)
  canSeeFinances Boolean @default(false)  // Доступ к финансам
  workingHours  Json?    // Рабочие часы в данном салоне
  
  // Timestamps
  createdAt     DateTime @default(now())
  lastActiveAt  DateTime @default(now())
  
  @@unique([userId, salonId])
  @@map("user_salon_access")
}`}
                </pre>
              </div>

              {/* Enums */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-3">📝 Enums и типы</h4>
                <pre className="text-sm bg-gray-800 text-yellow-400 p-3 rounded overflow-x-auto">
{`enum InviteStatus {
  PENDING   // Отправлено, ждем ответа
  ACCEPTED  // Принято мастером
  DECLINED  // Отклонено мастером
  EXPIRED   // Истек срок действия
  REVOKED   // Отозвано владельцем салона
}

enum UserRole {
  SUPER_ADMIN
  SALON_OWNER
  MANAGER
  STAFF_MEMBER  // Основная роль для приглашенных мастеров
  RECEPTIONIST
  ACCOUNTANT
  CLIENT
}

// Детальные разрешения (permissions)
type Permission = 
  | "calendar.view"      // Просмотр календаря
  | "calendar.edit"      // Редактирование календаря
  | "appointments.view"  // Просмотр записей
  | "appointments.manage" // Управление записями
  | "clients.view"       // Просмотр клиентов
  | "clients.manage"     // Управление клиентами
  | "services.view"      // Просмотр услуг
  | "services.manage"    // Управление услугами
  | "staff.view"         // Просмотр персонала
  | "staff.invite"       // Приглашение мастеров
  | "finances.view"      // Просмотр финансов
  | "settings.manage"    // Управление настройками`}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow процессы */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <ArrowRight className="w-6 h-6 text-blue-600" />
            🔄 WORKFLOW ПРОЦЕССЫ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Процесс приглашения */}
          <div>
            <h3 className="text-lg font-semibold mb-4">📤 Процесс отправки приглашения</h3>
            
            <div className="bg-white border rounded-lg p-4">
              <div className="space-y-4">
                {/* Шаг 1 */}
                <div className="flex items-start gap-4 p-3 bg-blue-50 rounded-lg">
                  <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900">Владелец создает приглашение</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Заходит в CRM → Команда → "Пригласить мастера" → указывает email, имя, роль
                    </p>
                    <div className="mt-2 p-2 bg-white rounded border text-xs font-mono">
                      POST /api/salons/{`{salonId}`}/invitations<br/>
                      {`{ masterEmail, masterName, role, personalMessage }`}
                    </div>
                  </div>
                </div>

                {/* Шаг 2 */}
                <div className="flex items-start gap-4 p-3 bg-yellow-50 rounded-lg">
                  <div className="bg-yellow-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900">Система проверяет мастера</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      Ищет существующего пользователя по email в базе данных
                    </p>
                    <div className="mt-2 p-2 bg-white rounded border text-xs font-mono">
                      const existingUser = await findUserByEmail(masterEmail)
                    </div>
                  </div>
                </div>

                {/* Шаг 3A */}
                <div className="flex items-start gap-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <div className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3A</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900">Мастер уже зарегистрирован</h4>
                    <p className="text-sm text-green-800 mt-1">
                      Отправляется уведомление в его CRM + email с кнопкой "Принять приглашение"
                    </p>
                    <div className="mt-2 p-2 bg-white rounded border text-xs">
                      ✉️ "Вас приглашают работать в салоне Beauty Studio"<br/>
                      🔗 Ссылка: /invitations/accept/{`{token}`}
                    </div>
                  </div>
                </div>

                {/* Шаг 3B */}
                <div className="flex items-start gap-4 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                  <div className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3B</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-900">Новый пользователь</h4>
                    <p className="text-sm text-orange-800 mt-1">
                      Отправляется email с приглашением и ссылкой на регистрацию
                    </p>
                    <div className="mt-2 p-2 bg-white rounded border text-xs">
                      ✉️ "Добро пожаловать в Beauty Platform!"<br/>
                      🔗 Ссылка: /register/invitation/{`{token}`}
                    </div>
                  </div>
                </div>

                {/* Шаг 4 */}
                <div className="flex items-start gap-4 p-3 bg-purple-50 rounded-lg">
                  <div className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900">Принятие приглашения</h4>
                    <p className="text-sm text-purple-800 mt-1">
                      Создается запись в UserSalonAccess, мастер получает доступ к календарю салона
                    </p>
                    <div className="mt-2 p-2 bg-white rounded border text-xs font-mono">
                      await createUserSalonAccess({`{`}<br/>
                      &nbsp;&nbsp;userId, salonId, role: 'STAFF_MEMBER'<br/>
                      {`}`})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conflict Management */}
          <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              ⚠️ Управление конфликтами расписания
            </h3>
            
            <div className="space-y-4">
              <div className="bg-white p-3 rounded border">
                <h4 className="font-semibold text-red-900 mb-2">Правило: Мастер не может быть записан в двух салонах одновременно</h4>
                <div className="text-sm text-red-800">
                  При создании записи система автоматически проверяет занятость мастера во всех салонах, где он работает.
                </div>
              </div>
              
              <div className="bg-gray-800 text-green-400 p-3 rounded-lg font-mono text-sm">
                <div className="mb-2 text-gray-300">// Проверка конфликтов при бронировании</div>
{`const checkMasterAvailability = async (masterId, dateTime, duration) => {
  const masterSalons = await getUserSalonAccess(masterId);
  
  for (const salon of masterSalons) {
    const conflict = await findAppointment({
      masterId,
      salonId: salon.salonId,
      startTime: dateTime,
      endTime: addMinutes(dateTime, duration)
    });
    
    if (conflict) {
      throw new ConflictError(
        \`Мастер занят в салоне "\${salon.salon.name}" 
         с \${conflict.startTime} до \${conflict.endTime}\`
      );
    }
  }
  
  return true; // Мастер свободен
};`}
              </div>
              
              <div className="bg-yellow-100 p-3 rounded border">
                <h5 className="font-semibold text-yellow-900 mb-2">Пользовательский интерфейс конфликтов:</h5>
                <div className="text-sm text-yellow-800">
                  • 🚨 Красное предупреждение: "Мастер занят в другом салоне"<br/>
                  • 🔄 Предложение альтернативного времени<br/>
                  • 👥 Предложение другого свободного мастера<br/>
                  • ⏰ Кнопка "Посмотреть расписание мастера"
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UI/UX компоненты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-indigo-600" />
            🎨 UI/UX КОМПОНЕНТЫ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Salon Switcher */}
          <div>
            <h3 className="text-lg font-semibold mb-4">🔄 Salon Switcher - Переключатель салонов</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-semibold mb-3">📱 Расположение: Header CRM приложения</h4>
              
              <div className="bg-white border rounded-lg p-4 mb-4">
                <h5 className="font-semibold text-gray-900 mb-3">Mockup интерфейса:</h5>
                <div className="bg-gray-100 p-4 rounded-lg border-2 border-dashed font-mono text-sm">
{`┌─ Beauty CRM ────────────────── [🔄 Salon Switcher ▼] ─ [👤 Profile] ─┐
│                                                                        │
│  [Dropdown открыт]                                                     │
│  ┌─────────────────────────────┐                                       │
│  │ 🏢 Мой салон "Beauty Anna"  │ ← isOwner=true (полные права)         │
│  │ 👥 Работаю в "Luxury Salon" │ ← isOwner=false (только календарь)    │
│  │ ────────────────────────────│                                       │
│  │ ➕ Создать салон            │                                       │
│  └─────────────────────────────┘                                       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘`}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-green-100 p-3 rounded border">
                  <h5 className="font-semibold text-green-900 mb-1">✅ Функциональность:</h5>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Показывает текущий активный салон в header</li>
                    <li>• Dropdown со всеми салонами пользователя</li>
                    <li>• Визуальное различие: владелец vs сотрудник</li>
                    <li>• Счетчик уведомлений по каждому салону</li>
                  </ul>
                </div>
                
                <div className="bg-blue-100 p-3 rounded border">
                  <h5 className="font-semibold text-blue-900 mb-1">🔧 Техническая реализация:</h5>
                  <div className="bg-gray-800 text-blue-400 p-2 rounded font-mono text-xs">
{`// Context для текущего салона
const SalonContext = createContext();

// Компонент переключателя
<SalonSwitcher 
  currentSalon={currentSalon}
  userSalons={userSalonAccess}
  onSalonChange={handleSalonSwitch}
/>`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invitation Form */}
          <div>
            <h3 className="text-lg font-semibold mb-4">✉️ Invitation Form - Форма приглашения</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 mb-3">📋 Форма в разделе "Команда":</h5>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="bg-gray-100 p-3 rounded">
                        <label className="block text-sm font-semibold mb-1">Email мастера *</label>
                        <input type="email" placeholder="master@example.com" className="w-full p-2 border rounded text-sm" disabled />
                      </div>
                      <div className="bg-gray-100 p-3 rounded">
                        <label className="block text-sm font-semibold mb-1">Имя мастера *</label>
                        <input type="text" placeholder="Анна Мастерова" className="w-full p-2 border rounded text-sm" disabled />
                      </div>
                      <div className="bg-gray-100 p-3 rounded">
                        <label className="block text-sm font-semibold mb-1">Роль</label>
                        <select className="w-full p-2 border rounded text-sm" disabled>
                          <option>Мастер (Staff Member)</option>
                          <option>Менеджер (Manager)</option>
                          <option>Администратор (Receptionist)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-gray-100 p-3 rounded">
                        <label className="block text-sm font-semibold mb-1">Личное сообщение</label>
                        <textarea placeholder="Приглашаю работать в нашем салоне!" className="w-full p-2 border rounded text-sm h-20" disabled></textarea>
                      </div>
                      <div className="bg-gray-100 p-3 rounded">
                        <label className="block text-sm font-semibold mb-1">Права доступа</label>
                        <div className="space-y-1 text-sm">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked disabled /> Просмотр календаря
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked disabled /> Управление записями
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" disabled /> Просмотр клиентов
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm" disabled>
                      📤 Отправить приглашение
                    </button>
                    <button className="border border-gray-300 px-4 py-2 rounded text-sm" disabled>
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invitation Email Template */}
          <div>
            <h3 className="text-lg font-semibold mb-4">📧 Email Template - Шаблон приглашения</h3>
            
            <div className="bg-white border rounded-lg p-6 max-w-2xl">
              <div className="text-center mb-6">
                <div className="bg-purple-600 text-white px-4 py-2 rounded-lg inline-block font-semibold">
                  Beauty Platform
                </div>
              </div>
              
              <h4 className="text-xl font-semibold mb-4">Вас приглашают работать мастером! 🎉</h4>
              
              <div className="space-y-4 text-sm">
                <p>Привет, <strong>Анна Мастерова</strong>!</p>
                
                <p>
                  <strong>Владелец салона "Beauty Studio Anna"</strong> приглашает вас присоединиться к команде мастеров.
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p><strong>Детали приглашения:</strong></p>
                  <ul className="mt-2 space-y-1">
                    <li>🏢 <strong>Салон:</strong> Beauty Studio Anna</li>
                    <li>👤 <strong>Роль:</strong> Мастер (Staff Member)</li>
                    <li>📅 <strong>Доступ:</strong> Календарь и управление записями</li>
                    <li>💰 <strong>Стоимость:</strong> Бесплатно для вас (оплачивает салон)</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="italic">"Приглашаю работать в нашем салоне! У нас дружный коллектив и постоянный поток клиентов."</p>
                  <p className="text-right mt-2 text-gray-600">— От владельца салона</p>
                </div>
                
                <div className="text-center py-4">
                  <button className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold" disabled>
                    ✅ Принять приглашение
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  <p>Срок действия приглашения: 7 дней</p>
                  <p>Не хотите получать такие письма? <a href="#" className="text-blue-600">Отписаться</a></p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Code className="w-6 h-6 text-purple-600" />
            🔌 API ENDPOINTS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="space-y-4">
            {/* Управление приглашениями */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-semibold text-purple-900 mb-3">📤 Управление приглашениями</h4>
              <div className="space-y-3 text-sm font-mono">
                <div className="bg-green-100 p-2 rounded">
                  <strong>POST</strong> /api/salons/{`{salonId}`}/invitations<br/>
                  <span className="text-gray-600">Создать новое приглашение</span>
                </div>
                <div className="bg-blue-100 p-2 rounded">
                  <strong>GET</strong> /api/salons/{`{salonId}`}/invitations<br/>
                  <span className="text-gray-600">Получить все приглашения салона</span>
                </div>
                <div className="bg-yellow-100 p-2 rounded">
                  <strong>PUT</strong> /api/invitations/{`{id}`}/resend<br/>
                  <span className="text-gray-600">Повторно отправить приглашение</span>
                </div>
                <div className="bg-red-100 p-2 rounded">
                  <strong>DELETE</strong> /api/invitations/{`{id}`}<br/>
                  <span className="text-gray-600">Отозвать приглашение</span>
                </div>
              </div>
            </div>

            {/* Принятие приглашений */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-semibold text-green-900 mb-3">✅ Принятие приглашений</h4>
              <div className="space-y-3 text-sm font-mono">
                <div className="bg-green-100 p-2 rounded">
                  <strong>GET</strong> /api/invitations/verify/{`{token}`}<br/>
                  <span className="text-gray-600">Проверить валидность приглашения</span>
                </div>
                <div className="bg-blue-100 p-2 rounded">
                  <strong>POST</strong> /api/invitations/{`{token}`}/accept<br/>
                  <span className="text-gray-600">Принять приглашение (существующий пользователь)</span>
                </div>
                <div className="bg-purple-100 p-2 rounded">
                  <strong>POST</strong> /api/invitations/{`{token}`}/register<br/>
                  <span className="text-gray-600">Регистрация по приглашению (новый пользователь)</span>
                </div>
                <div className="bg-orange-100 p-2 rounded">
                  <strong>POST</strong> /api/invitations/{`{token}`}/decline<br/>
                  <span className="text-gray-600">Отклонить приглашение</span>
                </div>
              </div>
            </div>

            {/* Управление доступами */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-semibold text-blue-900 mb-3">🔐 Управление доступами</h4>
              <div className="space-y-3 text-sm font-mono">
                <div className="bg-blue-100 p-2 rounded">
                  <strong>GET</strong> /api/users/{`{userId}`}/salon-access<br/>
                  <span className="text-gray-600">Получить все салоны пользователя</span>
                </div>
                <div className="bg-green-100 p-2 rounded">
                  <strong>PUT</strong> /api/salon-access/{`{id}`}/permissions<br/>
                  <span className="text-gray-600">Изменить права доступа мастера</span>
                </div>
                <div className="bg-yellow-100 p-2 rounded">
                  <strong>PUT</strong> /api/salon-access/{`{id}`}/deactivate<br/>
                  <span className="text-gray-600">Деактивировать доступ (уволить мастера)</span>
                </div>
                <div className="bg-purple-100 p-2 rounded">
                  <strong>POST</strong> /api/users/{`{userId}`}/switch-salon<br/>
                  <span className="text-gray-600">Переключить активный салон</span>
                </div>
              </div>
            </div>

            {/* Проверка конфликтов */}
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <h4 className="font-semibold text-red-900 mb-3">⚠️ Проверка конфликтов</h4>
              <div className="space-y-3 text-sm font-mono">
                <div className="bg-red-100 p-2 rounded">
                  <strong>POST</strong> /api/appointments/check-availability<br/>
                  <span className="text-gray-600">Проверить доступность мастера перед записью</span>
                </div>
                <div className="bg-orange-100 p-2 rounded">
                  <strong>GET</strong> /api/masters/{`{id}`}/schedule<br/>
                  <span className="text-gray-600">Получить расписание мастера во всех салонах</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* План реализации */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-green-600" />
            🚀 ПЛАН РЕАЛИЗАЦИИ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Phase 1 */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</div>
                Phase 1: Database Foundation (1-2 дня)
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• Создать таблицы Invitation и UserSalonAccess</li>
                <li>• Добавить enums InviteStatus и обновить UserRole</li>
                <li>• Создать Prisma миграции</li>
                <li>• Добавить базовые API endpoints для приглашений</li>
              </ul>
            </div>

            {/* Phase 2 */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <div className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</div>
                Phase 2: Email & Notification System (2-3 дня)
              </h4>
              <ul className="text-sm text-green-800 space-y-1 ml-4">
                <li>• Настроить email service (NodeMailer или SendGrid)</li>
                <li>• Создать HTML шаблоны для писем</li>
                <li>• Реализовать отправку приглашений</li>
                <li>• Добавить уведомления в CRM интерфейс</li>
              </ul>
            </div>

            {/* Phase 3 */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <div className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</div>
                Phase 3: Registration Flow (2-3 дня)
              </h4>
              <ul className="text-sm text-purple-800 space-y-1 ml-4">
                <li>• Страница принятия приглашения (/invite/{`{token}`})</li>
                <li>• Регистрация новых пользователей по приглашению</li>
                <li>• Автоматическое создание UserSalonAccess</li>
                <li>• Интеграция с существующей auth системой</li>
              </ul>
            </div>

            {/* Phase 4 */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                <div className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</div>
                Phase 4: Salon Switcher UI (3-4 дня)
              </h4>
              <ul className="text-sm text-orange-800 space-y-1 ml-4">
                <li>• Компонент SalonSwitcher в header CRM</li>
                <li>• Context для управления текущим салоном</li>
                <li>• Обновить все API вызовы с учетом tenant switching</li>
                <li>• Формы приглашения в разделе "Команда"</li>
              </ul>
            </div>

            {/* Phase 5 */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <div className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">5</div>
                Phase 5: Conflict Detection (2-3 дня)
              </h4>
              <ul className="text-sm text-red-800 space-y-1 ml-4">
                <li>• Функция checkMasterAvailability</li>
                <li>• Интеграция проверок в создание записей</li>
                <li>• UI для отображения конфликтов</li>
                <li>• Предложения альтернативного времени</li>
              </ul>
            </div>

            {/* Phase 6 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="bg-gray-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">6</div>
                Phase 6: Advanced Features (будущее)
              </h4>
              <ul className="text-sm text-gray-800 space-y-1 ml-4">
                <li>• Unified Calendar (объединенное расписание)</li>
                <li>• Mobile приложение для мастеров</li>
                <li>• Revenue sharing и статистика</li>
                <li>• Salon network и рекомендации</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-100 rounded-lg border-2 border-green-300">
            <h4 className="font-semibold text-green-900 mb-2">🎯 Общий срок реализации: 2-3 недели</h4>
            <p className="text-sm text-green-800">
              Базовая функциональность (Phase 1-4) готова за 10-12 дней. Продвинутые функции добавляются по мере необходимости.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};