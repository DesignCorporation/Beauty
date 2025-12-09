import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  BillingCard,
  PlanTable
} from '@beauty-platform/ui'

type AppWindow = Window & {
  __APP_CONFIG__?: {
    subscriptionsApiBaseUrl?: string
  }
}

const resolveSubscriptionsApiBase = () => {
  if (typeof window !== 'undefined') {
    const appWindow = window as AppWindow
    const fromConfig = appWindow.__APP_CONFIG__?.subscriptionsApiBaseUrl
    if (fromConfig) return fromConfig as string
  }
  return '/api/payments/subscriptions'
}

const SUBSCRIPTIONS_API_BASE = resolveSubscriptionsApiBase()

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">Подписка и тарифы</h2>
        <p className="text-muted-foreground">
          Online-доступ к статусу подписки, Stripe checkout и истории платежей
        </p>
      </header>

      <div className="space-y-6">
        {/* Billing Calculator */}
        <BillingCard
          apiBaseUrl={SUBSCRIPTIONS_API_BASE}
          calculatorMode={true}
        />

        {/* Tenant Subscriptions Overview */}
        <Card className="beauty-card">
          <CardHeader>
            <CardTitle>Статус подписок по салонам</CardTitle>
            <CardDescription>
              Список всех салонов с текущим статусом платежей и просрочками
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Таблица загружается из GET /api/payments/subscriptions/admin/overview
              (требуется реализовать в payment-service)
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="beauty-card">
        <CardHeader>
          <CardTitle>Интеграция платежей</CardTitle>
          <CardDescription>
            Payment Service (порт 6029) синхронизирован с UI компонентами и Stripe Checkout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-semibold text-foreground">API маршруты</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><code>/api/subscriptions/me</code> — статус подписки + последние платежи</li>
              <li><code>/api/subscriptions/create-subscription</code> — Stripe Checkout Session</li>
            </ul>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h5 className="font-semibold text-foreground">Провайдер</h5>
              <p>Stripe API v2023-10-16, секреты загружаются из сервисного .env.</p>
            </div>
            <div>
              <h5 className="font-semibold text-foreground">Следующие шаги</h5>
              <ul className="list-disc list-inside space-y-1">
                <li>Подключить PayPal webhook (опционально)</li>
                <li>Добавить мониторинг подписок в Admin Analytics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
