import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beauty-platform/ui'
import { Users } from 'lucide-react'

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Пользователи</h2>
        <p className="text-muted-foreground">
          Управление пользователями системы
        </p>
      </div>

      <Card className="beauty-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Пользователи системы
          </CardTitle>
          <CardDescription>
            Здесь будет список всех пользователей
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Страница в разработке
          </p>
        </CardContent>
      </Card>
    </div>
  )
}