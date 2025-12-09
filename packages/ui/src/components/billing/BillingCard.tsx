import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, CreditCard, ArrowRight, AlertCircle } from 'lucide-react'
import {
  Subscription,
  SubscriptionResponse,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  SubscriptionPlan,
  PLAN_DETAILS,
  getStatusBadgeVariant,
  getStatusText,
  formatDate,
  formatPrice,
  canUpgradeTo,
  isTrialExpiringSoon
} from '../../types/billing'
import { cn } from '../../lib/utils'

interface BillingCardProps {
  className?: string
  apiBaseUrl?: string
  onUpgradeClick?: (plan: SubscriptionPlan) => void
  calculatorMode?: boolean  // Новый режим: калькулятор вместо планов
}

export function BillingCard({
  className,
  apiBaseUrl = '/api/subscriptions',
  onUpgradeClick,
  calculatorMode = false
}: BillingCardProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgradeLoading, setUpgradeLoading] = useState<SubscriptionPlan | null>(null)
  const [staffCount, setStaffCount] = useState(0)  // Для калькулятора

  // Загрузка текущей подписки
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

  // Обработка upgrade подписки
  const handleUpgrade = async (targetPlan: SubscriptionPlan) => {
    try {
      setUpgradeLoading(targetPlan)
      setError(null)

      // Внешний обработчик
      if (onUpgradeClick) {
        onUpgradeClick(targetPlan)
        return
      }

      // Стандартный API запрос
      const requestData: CreateSubscriptionRequest = {
        plan: targetPlan,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing/cancel`
      }

      const response = await fetch(`${apiBaseUrl}/create-subscription`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: CreateSubscriptionResponse = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to create subscription')
      }

      // Redirect к Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Failed to upgrade subscription:', err)
    } finally {
      setUpgradeLoading(null)
    }
  }

  // Loading state
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

  // Error state
  if (error) {
    return (
      <Card className={cn("beauty-card", className)}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ошибка загрузки подписки: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // No subscription state
  if (!subscription) {
    return (
      <Card className={cn("beauty-card", className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Подписка</span>
          </CardTitle>
          <CardDescription>
            У вас нет активной подписки
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Button
              onClick={() => handleUpgrade('BASIC')}
              disabled={upgradeLoading !== null}
              className="w-full"
            >
              {upgradeLoading === 'BASIC' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Выбрать план Basic
            </Button>
            <Button
              onClick={() => handleUpgrade('PRO')}
              disabled={upgradeLoading !== null}
              variant="default"
              className="w-full"
            >
              {upgradeLoading === 'PRO' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Выбрать план Pro
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Режим калькулятора для админ-панели
  if (calculatorMode) {
    return (
      <Card className={cn("beauty-card", className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Калькулятор стоимости подписки</span>
          </CardTitle>
          <CardDescription>
            100 PLN за салон + 25 PLN за сотрудника (со скидкой 50% до конца года)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Staff Count Input */}
          <div>
            <label className="text-sm font-medium block mb-3">
              Количество платных сотрудников
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="100"
                value={staffCount}
                onChange={(e) => setStaffCount(Number(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-3xl font-bold text-primary w-12 text-right">
                {staffCount}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              MANAGER, STAFF_MEMBER, RECEPTIONIST, ACCOUNTANT
            </p>
          </div>

          {/* Pricing Calculation */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Базовая цена (салон):</span>
              <span className="font-medium">100 PLN</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Дополнительно ({staffCount} сотрудников × 25 PLN):</span>
              <span className="font-medium">{(staffCount * 25).toFixed(2)} PLN</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Скидка (50% до 31.12.2025):</span>
              <span className="font-medium text-green-600">
                -{((100 + staffCount * 25) * 0.5).toFixed(2)} PLN
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold">Итого нетто:</span>
              <span className="text-lg font-bold text-primary">
                {((100 + staffCount * 25) * 0.5).toFixed(2)} PLN
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>+ НДС (23%):</span>
              <span>{(((100 + staffCount * 25) * 0.5) * 0.23).toFixed(2)} PLN</span>
            </div>
            <div className="border-t pt-3 flex justify-between bg-green-50/50 rounded p-2">
              <span className="font-semibold">Итого к оплате:</span>
              <span className="text-lg font-bold text-green-600">
                {(((100 + staffCount * 25) * 0.5) * 1.23).toFixed(2)} PLN
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>🔄 Автоматическое списание каждый месяц</p>
            <p>⏳ 7-дневный бесплатный пробный период для новых салонов</p>
            <p>⚠️ Warning за 3 дня просрочки, блокировка через 5 дней</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentPlan = PLAN_DETAILS[subscription.plan as SubscriptionPlan]
  const isTrialExpiring = isTrialExpiringSoon(subscription)

  return (
    <Card className={cn("beauty-card", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Текущий статус подписки</span>
          </div>
          <Badge variant={getStatusBadgeVariant(subscription.status)}>
            {getStatusText(subscription.status)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Управление подпиской Beauty Platform
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Plan Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
            <span className="text-2xl font-bold">
              {formatPrice(currentPlan.price)}/мес
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {currentPlan.description}
          </p>

          {/* Subscription Details */}
          <div className="space-y-1 text-sm">
            {subscription.trialEndsAt && subscription.status === 'TRIAL' && (
              <div className="flex justify-between">
                <span>Пробный период до:</span>
                <span className={isTrialExpiring ? 'text-orange-600 font-medium' : ''}>
                  {formatDate(subscription.trialEndsAt)}
                </span>
              </div>
            )}
            {subscription.currentPeriodEnd && subscription.status === 'ACTIVE' && (
              <div className="flex justify-between">
                <span>Следующий платеж:</span>
                <span>{formatDate(subscription.currentPeriodEnd)}</span>
              </div>
            )}

            {/* Billing Details (новые поля) */}
            {subscription.billing && (
              <>
                {subscription.billing.staffSeatCount > 0 && (
                  <div className="flex justify-between">
                    <span>Платные сотрудники:</span>
                    <span className="font-medium">{subscription.billing.staffSeatCount}</span>
                  </div>
                )}
                {subscription.billing.discountPercent > 0 && (
                  <div className="flex justify-between">
                    <span>Скидка:</span>
                    <span className="text-green-600 font-medium">{subscription.billing.discountPercent}%</span>
                  </div>
                )}
                {subscription.billing.discountEndsAt && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Скидка до:</span>
                    <span>{formatDate(subscription.billing.discountEndsAt)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Lifecycle Warnings */}
        {subscription.lifecycle?.blocked && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ Ваша подписка заблокирована из-за просрочки платежа. Пожалуйста, обновите платежную информацию срочно.
            </AlertDescription>
          </Alert>
        )}

        {subscription.lifecycle?.limitedAccess && !subscription.lifecycle?.blocked && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ Доступ ограничен. У вас осталось несколько дней для погашения задолженности.
            </AlertDescription>
          </Alert>
        )}

        {subscription.lifecycle?.warningActive && !subscription.lifecycle?.limitedAccess && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              📢 Напоминание: Платёж просрочен. Пожалуйста, обновите платежные реквизиты в ближайшее время.
            </AlertDescription>
          </Alert>
        )}

        {/* Trial Expiring Warning */}
        {isTrialExpiring && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ваш пробный период заканчивается скоро. Выберите план для продолжения работы.
            </AlertDescription>
          </Alert>
        )}

        {/* Upgrade Buttons */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Доступные обновления:
          </div>

          {(['BASIC', 'PRO', 'ENTERPRISE'] as SubscriptionPlan[])
            .filter(plan => canUpgradeTo(subscription.plan, plan))
            .map((plan) => {
              const planDetails = PLAN_DETAILS[plan]
              const isLoading = upgradeLoading === plan

              return (
                <Button
                  key={plan}
                  onClick={() => handleUpgrade(plan)}
                  disabled={upgradeLoading !== null}
                  variant={plan === 'PRO' ? 'default' : 'outline'}
                  className="w-full justify-between"
                >
                  <div className="flex items-center space-x-2">
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Перейти на {planDetails.name}</span>
                    {planDetails.popular && (
                      <Badge variant="secondary" className="text-xs">
                        Популярный
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold">
                      {formatPrice(planDetails.price)}/мес
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Button>
              )
            })}
        </div>

        {/* No Upgrades Available */}
        {['BASIC', 'PRO', 'ENTERPRISE'].every(plan => !canUpgradeTo(subscription.plan, plan as SubscriptionPlan)) && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              У вас максимальный план. Спасибо за доверие! 🎉
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}