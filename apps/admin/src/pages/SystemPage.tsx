import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beauty-platform/ui'
import { Database } from 'lucide-react'

export default function SystemPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Система</h2>
        <p className="text-muted-foreground">
          Настройки системы и мониторинг
        </p>
      </div>

      <Card className="beauty-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Мониторинг системы
          </CardTitle>
          <CardDescription>
            Состояние серверов и сервисов
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