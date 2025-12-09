import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Check, ArrowRight, Star, AlertCircle } from 'lucide-react';
import { PLAN_DETAILS, formatPrice, canUpgradeTo } from '../../types/billing';
import { cn } from '../../lib/utils';
export function PlanTable({ className, currentPlan = null, apiBaseUrl = '/api/subscriptions', onPlanSelect, showCurrentPlanBadge = true, highlightUpgrades = true }) {
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState(null);
    // Обработка выбора плана
    const handlePlanSelect = async (targetPlan) => {
        try {
            setLoading(targetPlan);
            setError(null);
            // Внешний обработчик
            if (onPlanSelect) {
                onPlanSelect(targetPlan);
                return;
            }
            // Стандартный API запрос
            const requestData = {
                plan: targetPlan,
                successUrl: `${window.location.origin}/billing/success`,
                cancelUrl: `${window.location.origin}/billing/cancel`
            };
            const response = await fetch(`${apiBaseUrl}/create-subscription`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to create subscription');
            }
            // Redirect к Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            console.error('Failed to select plan:', err);
        }
        finally {
            setLoading(null);
        }
    };
    // Определение является ли план upgrade
    const isPlanUpgrade = (plan) => {
        if (!currentPlan)
            return false;
        return canUpgradeTo(currentPlan, plan);
    };
    // Определение кнопки для плана
    const getPlanButtonProps = (plan) => {
        const planDetails = PLAN_DETAILS[plan];
        const isCurrentPlan = currentPlan === plan;
        const isUpgrade = isPlanUpgrade(plan);
        const isLoading = loading === plan;
        if (isCurrentPlan) {
            return {
                variant: 'outline',
                disabled: true,
                children: (_jsxs(_Fragment, { children: [_jsx(Check, { className: "h-4 w-4 mr-2" }), "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u043B\u0430\u043D"] }))
            };
        }
        if (isUpgrade) {
            return {
                variant: 'default',
                disabled: isLoading || loading !== null,
                children: (_jsxs(_Fragment, { children: [isLoading && _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }), "Upgrade \u0434\u043E ", planDetails.name, _jsx(ArrowRight, { className: "h-4 w-4 ml-2" })] }))
            };
        }
        return {
            variant: 'outline',
            disabled: isLoading || loading !== null,
            children: (_jsxs(_Fragment, { children: [isLoading && _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }), "\u0412\u044B\u0431\u0440\u0430\u0442\u044C ", planDetails.name] }))
        };
    };
    const plans = ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'];
    return (_jsxs("div", { className: cn("space-y-6", className), children: [error && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsxs(AlertDescription, { children: ["\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u0431\u043E\u0440\u0430 \u043F\u043B\u0430\u043D\u0430: ", error] })] })), _jsx("div", { className: "hidden lg:grid lg:grid-cols-4 gap-6", children: plans.map((plan) => {
                    const planDetails = PLAN_DETAILS[plan];
                    const isCurrentPlan = currentPlan === plan;
                    const isUpgrade = isPlanUpgrade(plan);
                    const buttonProps = getPlanButtonProps(plan);
                    return (_jsxs(Card, { className: cn("beauty-card relative", planDetails.popular && "border-primary shadow-lg scale-105", isCurrentPlan && "border-green-500 bg-green-50/50", isUpgrade && highlightUpgrades && "border-blue-500 bg-blue-50/50"), children: [planDetails.popular && (_jsx("div", { className: "absolute -top-3 left-1/2 transform -translate-x-1/2", children: _jsxs(Badge, { className: "bg-primary text-primary-foreground px-3 py-1", children: [_jsx(Star, { className: "h-3 w-3 mr-1" }), "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0439"] }) })), isCurrentPlan && showCurrentPlanBadge && (_jsx("div", { className: "absolute -top-3 right-4", children: _jsx(Badge, { variant: "outline", className: "bg-green-100 text-green-700 border-green-300", children: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439" }) })), _jsxs(CardHeader, { className: "text-center pb-4", children: [_jsx(CardTitle, { className: "text-xl", children: planDetails.name }), _jsx(CardDescription, { className: "min-h-[40px]", children: planDetails.description }), _jsxs("div", { className: "pt-2", children: [_jsx("span", { className: "text-3xl font-bold", children: formatPrice(planDetails.price) }), _jsx("span", { className: "text-muted-foreground", children: "/\u043C\u0435\u0441\u044F\u0446" })] })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx("ul", { className: "space-y-2 text-sm", children: planDetails.features.map((feature, index) => (_jsxs("li", { className: "flex items-start space-x-2", children: [_jsx(Check, { className: "h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" }), _jsx("span", { children: feature })] }, index))) }), _jsx(Button, { ...buttonProps, onClick: () => handlePlanSelect(plan), className: "w-full mt-6" })] })] }, plan));
                }) }), _jsx("div", { className: "lg:hidden space-y-4", children: plans.map((plan) => {
                    const planDetails = PLAN_DETAILS[plan];
                    const isCurrentPlan = currentPlan === plan;
                    const isUpgrade = isPlanUpgrade(plan);
                    const buttonProps = getPlanButtonProps(plan);
                    return (_jsx(Card, { className: cn("beauty-card", planDetails.popular && "border-primary", isCurrentPlan && "border-green-500 bg-green-50/50", isUpgrade && highlightUpgrades && "border-blue-500 bg-blue-50/50"), children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center space-x-2 mb-1", children: [_jsx("h3", { className: "text-lg font-semibold", children: planDetails.name }), planDetails.popular && (_jsxs(Badge, { className: "bg-primary text-primary-foreground text-xs", children: [_jsx(Star, { className: "h-3 w-3 mr-1" }), "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0439"] })), isCurrentPlan && showCurrentPlanBadge && (_jsx(Badge, { variant: "outline", className: "bg-green-100 text-green-700 border-green-300 text-xs", children: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439" }))] }), _jsx("p", { className: "text-sm text-muted-foreground mb-2", children: planDetails.description })] }), _jsxs("div", { className: "text-right", children: [_jsx("span", { className: "text-2xl font-bold", children: formatPrice(planDetails.price) }), _jsx("div", { className: "text-xs text-muted-foreground", children: "/\u043C\u0435\u0441\u044F\u0446" })] })] }), _jsx("div", { className: "mb-4", children: _jsxs("div", { className: "grid grid-cols-1 gap-1 text-sm", children: [planDetails.features.slice(0, 3).map((feature, index) => (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Check, { className: "h-3 w-3 text-green-500 flex-shrink-0" }), _jsx("span", { className: "truncate", children: feature })] }, index))), planDetails.features.length > 3 && (_jsxs("div", { className: "text-xs text-muted-foreground mt-1", children: ["+", planDetails.features.length - 3, " \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0444\u0443\u043D\u043A\u0446\u0438\u0439"] }))] }) }), _jsx(Button, { ...buttonProps, onClick: () => handlePlanSelect(plan), className: "w-full", size: "sm" })] }) }, plan));
                }) }), _jsxs("div", { className: "text-center text-sm text-muted-foreground pt-4 border-t", children: [_jsxs("p", { children: ["\u0412\u0441\u0435 \u043F\u043B\u0430\u043D\u044B \u0432\u043A\u043B\u044E\u0447\u0430\u044E\u0442 14-\u0434\u043D\u0435\u0432\u043D\u044B\u0439 \u043F\u0440\u043E\u0431\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434.", ' ', _jsx("span", { className: "font-medium", children: "\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u0430\u044F \u043E\u043F\u043B\u0430\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 Stripe." })] }), _jsx("p", { className: "mt-1", children: "\u041C\u043E\u0436\u0435\u0442\u0435 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443 \u0432 \u043B\u044E\u0431\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0431\u0435\u0437 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0439." })] })] }));
}
