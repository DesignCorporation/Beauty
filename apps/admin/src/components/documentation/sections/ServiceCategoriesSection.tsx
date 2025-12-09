import React from 'react';
import { Card } from '@beauty-platform/ui';
import { FolderTree, Tags, BookOpen, Database, Zap, CheckCircle2, Code } from 'lucide-react';

export const ServiceCategoriesSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Service Categories System</h1>
        <p className="text-muted-foreground">
          Полная система категорий услуг для организации и структурирования сервисов салонов
        </p>
      </div>

      {/* Status Badge */}
      <Card className="p-4 border-success/50 bg-success/5">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">Статус: Production-Ready (Issues #56-#58 завершены)</span>
        </div>
      </Card>

      {/* Overview */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <FolderTree className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">Обзор системы</h2>
            <p className="text-muted-foreground mb-4">
              Service Categories System — это трёхуровневая иерархическая система организации услуг,
              которая позволяет владельцам салонов структурировать свои сервисы для лучшего управления
              и представления клиентам.
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5">•</div>
                <div>
                  <span className="font-medium">9 предустановленных типов салонов</span>
                  <div className="text-sm text-muted-foreground">
                    Hair, Nails, Massage, SPA, Beauty, Barbershop, Cosmetics, Tattoo, Lashes
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5">•</div>
                <div>
                  <span className="font-medium">Предустановленные категории и услуги</span>
                  <div className="text-sm text-muted-foreground">
                    Каждый тип салона имеет готовый набор типичных категорий и услуг
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5">•</div>
                <div>
                  <span className="font-medium">Tenant isolation</span>
                  <div className="text-sm text-muted-foreground">
                    Категории и услуги изолированы по салонам для мультитенантности
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Architecture */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">Архитектура данных</h2>

            <div className="space-y-4">
              <div className="border-l-2 border-primary pl-4">
                <h3 className="font-semibold mb-2">ServiceCategory</h3>
                <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto">
{`model ServiceCategory {
  id           String   @id @default(cuid())
  tenantId     String
  name         String
  icon         String?
  order        Int      @default(0)
  isDefault    Boolean  @default(false)

  subcategories ServiceSubcategory[]
  services     Service[]
}`}
                </pre>
              </div>

              <div className="border-l-2 border-primary pl-4">
                <h3 className="font-semibold mb-2">ServiceSubcategory</h3>
                <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto">
{`model ServiceSubcategory {
  id           String   @id @default(cuid())
  categoryId   String
  name         String
  order        Int      @default(0)
  isDefault    Boolean  @default(false)

  category     ServiceCategory @relation(...)
  services     Service[]
}`}
                </pre>
              </div>

              <div className="border-l-2 border-primary pl-4">
                <h3 className="font-semibold mb-2">Service</h3>
                <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto">
{`model Service {
  id             String   @id @default(cuid())
  tenantId       String
  name           String
  description    String?
  duration       Int
  price          Decimal
  categoryId     String?  // FK → ServiceCategory
  subcategoryId  String?  // FK → ServiceSubcategory
  status         String   @default("ACTIVE")
  isDefault      Boolean  @default(false)
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* API Endpoints */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <Code className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">API Endpoints</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Публичные Endpoints (без аутентификации)</h3>
                <div className="space-y-3">
                  <div className="border rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-mono rounded">GET</span>
                      <code className="text-sm">/api/salon-types</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Получить список всех типов салонов</p>
                    <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
{`// Response
{
  "success": true,
  "salonTypes": [
    {
      "id": "HAIR_SALON",
      "salonType": "HAIR",
      "label": "Hair Salon",
      "description": "Haircuts, coloring, styling",
      "icon": "haircut",
      "defaultCategories": 3,
      "defaultServices": 6
    }
    // ... 8 more types
  ]
}`}
                    </pre>
                  </div>

                  <div className="border rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-mono rounded">GET</span>
                      <code className="text-sm">/api/service-presets/:salonType</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Получить предустановленные категории и услуги для типа салона
                    </p>
                    <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
{`// Example: /api/service-presets/HAIR_SALON
{
  "success": true,
  "categories": [
    {
      "name": "Стрижки",
      "icon": "haircut",
      "order": 1,
      "subcategories": [
        { "name": "Мужские стрижки", "order": 1 },
        { "name": "Женские стрижки", "order": 2 }
      ],
      "services": [
        {
          "name": "Стрижка мужская",
          "duration": 30,
          "price": 25,
          "subcategoryKey": "mens-haircuts"
        }
      ]
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">CRM Endpoints (требуют аутентификации)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-mono rounded">GET</span>
                    <code>/api/crm/service-categories</code>
                    <span className="text-muted-foreground">- Список категорий салона</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-600 text-xs font-mono rounded">POST</span>
                    <code>/api/crm/service-categories</code>
                    <span className="text-muted-foreground">- Создать категорию</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 text-xs font-mono rounded">PUT</span>
                    <code>/api/crm/service-categories/:id</code>
                    <span className="text-muted-foreground">- Обновить категорию</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-500/10 text-red-600 text-xs font-mono rounded">DELETE</span>
                    <code>/api/crm/service-categories/:id</code>
                    <span className="text-muted-foreground">- Удалить категорию</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Onboarding Flow */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">Onboarding Flow</h2>
            <p className="text-muted-foreground mb-4">
              Процесс выбора типа салона и предустановленных услуг при регистрации:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Выбор типа салона</h4>
                  <p className="text-sm text-muted-foreground">
                    StepServices.tsx отображает grid из 9 карточек типов салонов
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Загрузка пресетов</h4>
                  <p className="text-sm text-muted-foreground">
                    Автоматически загружаются предустановленные категории и услуги для выбранного типа
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Выбор услуг</h4>
                  <p className="text-sm text-muted-foreground">
                    Владелец выбирает нужные услуги через checkbox или добавляет свои кастомные
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Seed при регистрации</h4>
                  <p className="text-sm text-muted-foreground">
                    Auth-service создаёт выбранные категории и услуги в tenant-изолированной БД
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Salon Types */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <Tags className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">9 типов салонов</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { type: 'HAIR', name: 'Hair Salon', desc: 'Haircuts, coloring, styling', categories: 3, services: 6 },
                { type: 'NAILS', name: 'Nail Salon', desc: 'Manicure, pedicure, nail design', categories: 3, services: 4 },
                { type: 'MASSAGE', name: 'Massage & SPA', desc: 'Massage therapy and wellness', categories: 2, services: 3 },
                { type: 'SPA', name: 'SPA & Wellness', desc: 'Full wellness experience', categories: 3, services: 5 },
                { type: 'BEAUTY', name: 'Beauty Salon', desc: 'Full beauty services', categories: 4, services: 8 },
                { type: 'BARBERSHOP', name: 'Barbershop', desc: 'Men\'s grooming', categories: 2, services: 4 },
                { type: 'COSMETICS', name: 'Cosmetics Studio', desc: 'Makeup and skincare', categories: 2, services: 4 },
                { type: 'TATTOO', name: 'Tattoo Studio', desc: 'Tattoo and piercing', categories: 2, services: 3 },
                { type: 'LASHES', name: 'Lash & Brow Studio', desc: 'Lash extensions, brow shaping', categories: 2, services: 4 },
              ].map((salon) => (
                <div key={salon.type} className="border rounded-md p-3">
                  <h4 className="font-semibold mb-1">{salon.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{salon.desc}</p>
                  <div className="flex gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {salon.categories} категорий
                    </span>
                    <span className="text-muted-foreground">
                      {salon.services} услуг
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Documentation */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">Документация</h2>

            <div className="space-y-2">
              <div>
                <h4 className="font-semibold text-sm mb-1">Отчёт верификации</h4>
                <p className="text-sm text-muted-foreground mb-1">
                  Полный отчёт о проделанной работе и исправлениях
                </p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  /docs/reports/ISSUES_56-58_VERIFICATION_REPORT.md
                </code>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">Спецификация onboarding</h4>
                <p className="text-sm text-muted-foreground mb-1">
                  Подробное описание процесса регистрации салона
                </p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  /docs/ISSUE_58_ONBOARDING_SPEC.md
                </code>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">API Usage Guide</h4>
                <p className="text-sm text-muted-foreground mb-1">
                  Быстрая справка по использованию API endpoints
                </p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  /docs/guides/ONBOARDING_API_USAGE.md
                </code>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* GitHub Issues */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">GitHub Issues</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <a
              href="https://github.com/DesignCorporation/Beauty-Platform/issues/56"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
            >
              Issue #56: Backend Service Categories System
            </a>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <a
              href="https://github.com/DesignCorporation/Beauty-Platform/issues/57"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
            >
              Issue #57: Salon Types & Service Presets API
            </a>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <a
              href="https://github.com/DesignCorporation/Beauty-Platform/issues/58"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
            >
              Issue #58: Frontend Onboarding Integration
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
};
