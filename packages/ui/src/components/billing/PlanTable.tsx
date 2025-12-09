import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { Loader2, Check, ArrowRight, Star, AlertCircle } from 'lucide-react'
import {
  SubscriptionPlan,
  BillingPlanId,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  PLAN_DETAILS,
  formatPrice,
  canUpgradeTo
} from '../../types/billing'
import { cn } from '../../lib/utils'

interface PlanTableProps {
  className?: string
  currentPlan?: SubscriptionPlan | null
  apiBaseUrl?: string
  onPlanSelect?: (plan: SubscriptionPlan) => void
  showCurrentPlanBadge?: boolean
  highlightUpgrades?: boolean
}

export function PlanTable({
  className,
  currentPlan = null,
  apiBaseUrl = '/api/subscriptions',
  onPlanSelect,
  showCurrentPlanBadge = true,
  highlightUpgrades = true
}: PlanTableProps) {
  const [loading, setLoading] = useState<SubscriptionPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Обработка выбора плана
  const handlePlanSelect = async (targetPlan: SubscriptionPlan) => {
    try {
      setLoading(targetPlan)
      setError(null)

      // Внешний обработчик
      if (onPlanSelect) {
        onPlanSelect(targetPlan)
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
      console.error('Failed to select plan:', err)
    } finally {
      setLoading(null)
    }
  }


  // Определение является ли план upgrade
  const isPlanUpgrade = (plan: SubscriptionPlan): boolean => {
    if (!currentPlan) return false
    return canUpgradeTo(currentPlan, plan)
  }

  // Определение кнопки для плана
  const getPlanButtonProps = (plan: SubscriptionPlan) => {
    const planDetails = PLAN_DETAILS[plan]
    const isCurrentPlan = currentPlan === plan
    const isUpgrade = isPlanUpgrade(plan)
    const isLoading = loading === plan

    if (isCurrentPlan) {
      return {
        variant: 'outline' as const,
        disabled: true,
        children: (
          <>
            <Check className="h-4 w-4 mr-2" />
            Текущий план
          </>
        )
      }
    }

    if (isUpgrade) {
      return {
        variant: 'default' as const,
        disabled: isLoading || loading !== null,
        children: (
          <>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Upgrade до {planDetails.name}
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )
      }
    }

    return {
      variant: 'outline' as const,
      disabled: isLoading || loading !== null,
      children: (
        <>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Выбрать {planDetails.name}
        </>
      )
    }
  }

  const selectablePlans: SubscriptionPlan[] = ['BASIC', 'PRO', 'ENTERPRISE']
  const displayPlans: BillingPlanId[] = ['TRIAL', ...selectablePlans]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ошибка выбора плана: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-6">
        {displayPlans.map((plan) => {
          const planDetails = PLAN_DETAILS[plan]
          const isTrialPlan = plan === 'TRIAL'
          const isCurrentPlan = !isTrialPlan && currentPlan === plan
          const isUpgrade = !isTrialPlan && isPlanUpgrade(plan)
          const buttonProps = !isTrialPlan ? getPlanButtonProps(plan) : null

          return (
            <Card
              key={plan}
              className={cn(
                "beauty-card relative",
                planDetails.popular && "border-primary shadow-lg scale-105",
                isCurrentPlan && "border-green-500 bg-green-50/50",
                isUpgrade && highlightUpgrades && "border-blue-500 bg-blue-50/50"
              )}
            >
              {/* Popular Badge */}
              {planDetails.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Популярный
                  </Badge>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && showCurrentPlanBadge && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    Текущий
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{planDetails.name}</CardTitle>
                <CardDescription className="min-h-[40px]">
                  {planDetails.description}
                </CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">
                    {formatPrice(planDetails.price)}
                  </span>
                  <span className="text-muted-foreground">/месяц</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features List */}
                <ul className="space-y-2 text-sm">
                  {planDetails.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                {isTrialPlan ? (
                  <Button variant="outline" disabled className="w-full mt-6">
                    Доступно всем новым салонам
                  </Button>
                ) : (
                  <Button
                    {...(buttonProps ?? {})}
                    onClick={() => handlePlanSelect(plan)}
                    className="w-full mt-6"
                  />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-4">
        {displayPlans.map((plan) => {
          const planDetails = PLAN_DETAILS[plan]
          const isTrialPlan = plan === 'TRIAL'
          const isCurrentPlan = !isTrialPlan && currentPlan === plan
          const isUpgrade = !isTrialPlan && isPlanUpgrade(plan)
          const buttonProps = !isTrialPlan ? getPlanButtonProps(plan) : null

          return (
            <Card
              key={plan}
              className={cn(
                "beauty-card",
                planDetails.popular && "border-primary",
                isCurrentPlan && "border-green-500 bg-green-50/50",
                isUpgrade && highlightUpgrades && "border-blue-500 bg-blue-50/50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold">{planDetails.name}</h3>

                      {/* Badges */}
                      {planDetails.popular && (
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Популярный
                        </Badge>
                      )}

                      {isCurrentPlan && showCurrentPlanBadge && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                          Текущий
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {planDetails.description}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-bold">
                      {formatPrice(planDetails.price)}
                    </span>
                    <div className="text-xs text-muted-foreground">/месяц</div>
                  </div>
                </div>

                {/* Features - Compact Mobile View */}
                <div className="mb-4">
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    {planDetails.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                    {planDetails.features.length > 3 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        +{planDetails.features.length - 3} дополнительных функций
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                {isTrialPlan ? (
                  <Button variant="outline" disabled className="w-full" size="sm">
                    14 дней бесплатно
                  </Button>
                ) : (
                  <Button
                    {...(buttonProps ?? {})}
                    onClick={() => handlePlanSelect(plan)}
                    className="w-full"
                    size="sm"
                  />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Additional Info */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <p>
          Все планы включают 14-дневный пробный период.{' '}
          <span className="font-medium">Безопасная оплата через Stripe.</span>
        </p>
        <p className="mt-1">
          Можете отменить подписку в любое время без комиссий.
        </p>
      </div>
    </div>
  )
}
