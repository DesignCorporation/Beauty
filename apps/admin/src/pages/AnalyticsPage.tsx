import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beauty-platform/ui'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Аналитика</h2>
        <p className="text-muted-foreground">
          Аналитика и отчеты по системе
        </p>
      </div>

      <Card className="beauty-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Отчеты и метрики
          </CardTitle>
          <CardDescription>
            Здесь будут графики и чарты
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