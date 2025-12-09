import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beauty-platform/ui'
import { Building2, Users, BarChart3, Shield } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Обзор системы Beauty Platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="beauty-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего салонов</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +2 за последний месяц
            </p>
          </CardContent>
        </Card>

        <Card className="beauty-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных пользователей</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              +15% с прошлого месяца
            </p>
          </CardContent>
        </Card>

        <Card className="beauty-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Записей сегодня</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">347</div>
            <p className="text-xs text-muted-foreground">
              +23% от вчера
            </p>
          </CardContent>
        </Card>

        <Card className="beauty-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Статус системы</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">99.9%</div>
            <p className="text-xs text-muted-foreground">
              Время работы
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="beauty-card">
          <CardHeader>
            <CardTitle>Последние салоны</CardTitle>
            <CardDescription>
              Недавно зарегистрированные салоны красоты
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Salon Elite", city: "Москва", date: "2 дня назад" },
                { name: "Beauty Studio", city: "СПб", date: "3 дня назад" },
                { name: "Glam House", city: "Казань", date: "5 дней назад" },
              ].map((salon, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{salon.name}</p>
                    <p className="text-xs text-muted-foreground">{salon.city}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">{salon.date}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="beauty-card">
          <CardHeader>
            <CardTitle>Системные уведомления</CardTitle>
            <CardDescription>
              Важные события и уведомления
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { 
                  title: "Обновление безопасности", 
                  desc: "Установлены последние патчи", 
                  time: "2 часа назад",
                  type: "success"
                },
                { 
                  title: "Резервное копирование", 
                  desc: "Завершено успешно", 
                  time: "6 часов назад",
                  type: "info"
                },
                { 
                  title: "Высокая нагрузка", 
                  desc: "Пиковые значения в 14:00", 
                  time: "8 часов назад",
                  type: "warning"
                },
              ].map((event, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    event.type === 'success' ? 'bg-green-500' :
                    event.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.desc}</p>
                    <p className="text-xs text-muted-foreground">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Component - временно отключен из-за проблем импорта */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="beauty-card">
          <CardHeader>
            <CardTitle>Подписка</CardTitle>
            <CardDescription>
              Billing компоненты готовы, но есть проблема с импортом
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              BillingCard и PlanTable созданы с полной TypeScript типизацией и Zod валидацией.
              Требуется решить проблему с импортом в Admin Panel.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}