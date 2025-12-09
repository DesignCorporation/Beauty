import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, CreditCard, AlertTriangle, Lock, Clock, Info } from 'lucide-react'
import {
  Subscription,
  SubscriptionResponse,
  getStatusBadgeVariant,
  getStatusText,
  formatDate,
  formatPrice
} from '../../types/billing'
import { cn } from '../../lib/utils'

interface SubscriptionStatusCardProps {
  className?: string
  apiBaseUrl?: string
}

export function SubscriptionStatusCard({
  className,
  apiBaseUrl = '/api/subscriptions'
}: SubscriptionStatusCardProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trialEnsured, setTrialEnsured] = useState(false)

  // Загрузка подписки
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`${apiBaseUrl}/me`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data: SubscriptionResponse = await response.json()

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch subscription')
        }

        setSubscription(data.subscription)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Failed to fetch subscription:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [apiBaseUrl])

  // Если подписки нет — пробуем тихо создать триал и обновить статус
  useEffect(() => {
    const ensureTrial = async () => {
      if (loading || error || subscription || trialEnsured) return
      try {
        await fetch(`${apiBaseUrl}/start-trial`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ plan: 'BASIC' })
        })
        const res = await fetch(`${apiBaseUrl}/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
        if (res.ok) {
          const data: SubscriptionResponse = await res.json()
          if (data.success) {
            setSubscription(data.subscription)
          }
        }
      } catch (e) {
        console.warn('ensureTrial: unable to start trial', e)
      } finally {
        setTrialEnsured(true)
      }
    }
    void ensureTrial()
  }, [apiBaseUrl, loading, error, subscription, trialEnsured])

  if (loading) {
    return (
      <Card className={cn("beauty-card", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Загрузка подписки...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("beauty-card", className)}>
        <CardHeader>
          <CardTitle>Ошибка подписки</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!subscription || !subscription.billing) {
    return (
      <Card className={cn("beauty-card", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Подписка</CardTitle>
            </div>
            <Badge variant="outline">TRIAL</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Пробный период активирован автоматически при создании салона. Отслеживайте статус ниже.
          </p>
        </CardContent>
      </Card>
    )
  }

  const billing = subscription.billing
  const lifecycle = subscription.lifecycle
  const currency = billing?.currency ?? 'PLN'

  const basePriceCents = billing?.basePriceCents ?? 0
  const seatPriceCents = billing?.staffSeatPriceCents ?? 0
  const seats = billing?.staffSeatCount ?? 0
  const subtotalCents = basePriceCents + seatPriceCents * seats
  const discountCents = Math.max(0, subtotalCents - (billing?.netAmountCents ?? subtotalCents))
  const vatCents = Math.max(0, (billing?.grossAmountCents ?? 0) - (billing?.netAmountCents ?? 0))
  const periodStart = subscription.currentPeriodStart
  const periodEnd = subscription.currentPeriodEnd || subscription.trialEndsAt
  const nextChargeDate = lifecycle?.nextChargeDate || subscription.currentPeriodEnd

  return (
    <Card className={cn("beauty-card", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Ваша подписка</CardTitle>
          </div>
          <Badge variant={getStatusBadgeVariant(subscription.status)}>
            {getStatusText(subscription.status)}
          </Badge>
        </div>
        <CardDescription>
          План: {subscription.plan} • Валюта: {currency}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Period overview */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2 border border-border/60">
          <div className="flex justify-between">
            <span>Текущий период:</span>
            <span className="font-medium">
              {periodStart ? formatDate(periodStart) : '—'} → {periodEnd ? formatDate(periodEnd) : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Следующее списание:</span>
            <span className="font-medium">
              {nextChargeDate ? formatDate(nextChargeDate) : '—'}
            </span>
          </div>
          {subscription.status === 'TRIAL' && subscription.trialEndsAt && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Пробный период до:</span>
              <span className="font-semibold">{formatDate(subscription.trialEndsAt)}</span>
            </div>
          )}
        </div>

        {/* Lifecycle Alerts */}
        {lifecycle?.blocked && (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              🚨 <strong>Аккаунт заблокирован</strong> из-за просрочки платежа.
              Пожалуйста, обновите платежные реквизиты немедленно.
              {lifecycle.gracePeriodEndsAt && (
                <div className="mt-2 text-xs">
                  Деблокировка возможна до: {formatDate(lifecycle.gracePeriodEndsAt)}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {lifecycle?.limitedAccess && !lifecycle?.blocked && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ <strong>Доступ ограничен</strong> — платеж просрочен.
              {lifecycle.daysUntilDue ? (
                <div className="mt-1">
                  Осталось дней: <strong>{lifecycle.daysUntilDue}</strong>
                </div>
              ) : null}
            </AlertDescription>
          </Alert>
        )}

        {lifecycle?.warningActive && !lifecycle?.limitedAccess && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              📢 <strong>Платеж просрочен</strong> — требуется срочное обновление платежных данных.
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Breakdown */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Базовая цена (салон):</span>
            <span className="font-medium">{formatPrice(basePriceCents / 100, currency)}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <div className="flex flex-col">
              <span>Дополнительные сотрудники</span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Владелец включен в базовую цену, оплачиваются только доп. сотрудники.
              </span>
            </div>
            <span className="font-medium">{seats}</span>
          </div>
          <div className="flex justify-between">
            <span>Доп. сумма ({seats} × {formatPrice(seatPriceCents / 100, currency)}):</span>
            <span className="font-medium">{formatPrice((seatPriceCents * seats) / 100, currency)}</span>
          </div>

          {billing.discountPercent > 0 && (
            <>
              <div className="flex justify-between text-green-600">
                <span>Скидка ({billing.discountPercent}%):</span>
                <span className="font-medium">
                  -{formatPrice(discountCents / 100, currency)}
                </span>
              </div>
              {billing.discountEndsAt && (
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  Скидка действует до: {formatDate(billing.discountEndsAt)}
                </div>
              )}
            </>
          )}

          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Итого за месяц (нетто):</span>
            <span className="text-lg text-primary">
              {formatPrice((billing.netAmountCents ?? 0) / 100, currency)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>+ НДС ({billing.vatRateBps / 100}%):</span>
            <span>{formatPrice(vatCents / 100, currency)}</span>
          </div>
          <div className="bg-blue-50 rounded p-2 border border-blue-200 flex justify-between font-semibold text-blue-900">
            <span>К оплате (брутто):</span>
            <span>{formatPrice((billing.grossAmountCents ?? 0) / 100, currency)}</span>
          </div>
        </div>

        {/* Next Charge Info */}
        {nextChargeDate && subscription.status === 'ACTIVE' && (
          <div className="text-sm text-muted-foreground bg-blue-50 rounded p-3 border border-blue-200">
            <span className="block mb-1">🔄 Следующее автоматическое списание:</span>
            <span className="font-semibold text-blue-900">{formatDate(nextChargeDate)}</span>
          </div>
        )}

        {/* Trial Info */}
        {subscription.status === 'TRIAL' && subscription.trialEndsAt && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            Пробный период: {formatDate(subscription.trialEndsAt)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
