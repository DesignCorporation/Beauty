import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, CreditCard, ArrowRight, AlertCircle } from 'lucide-react';
import { PLAN_DETAILS, getStatusBadgeVariant, getStatusText, formatDate, formatPrice, canUpgradeTo, isTrialExpiringSoon } from '../../types/billing';
import { cn } from '../../lib/utils';
export function BillingCard({ className, apiBaseUrl = '/api/subscriptions', onUpgradeClick }) {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [upgradeLoading, setUpgradeLoading] = useState(null);
    // Загрузка текущей подписки
    useEffect(() => {
        const fetchSubscription = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`${apiBaseUrl}/me`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Failed to fetch subscription');
                }
                setSubscription(data.subscription);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
                setError(errorMessage);
                console.error('Failed to fetch subscription:', err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchSubscription();
    }, [apiBaseUrl]);
    // Обработка upgrade подписки
    const handleUpgrade = async (targetPlan) => {
        try {
            setUpgradeLoading(targetPlan);
            setError(null);
            // Внешний обработчик
            if (onUpgradeClick) {
                onUpgradeClick(targetPlan);
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
            console.error('Failed to upgrade subscription:', err);
        }
        finally {
            setUpgradeLoading(null);
        }
    };
    // Loading state
    if (loading) {
        return (_jsx(Card, { className: cn("beauty-card", className), children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-center space-x-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsx("span", { className: "text-sm text-muted-foreground", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438..." })] }) }) }));
    }
    // Error state
    if (error) {
        return (_jsx(Card, { className: cn("beauty-card", className), children: _jsx(CardContent, { className: "p-6", children: _jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsxs(AlertDescription, { children: ["\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438: ", error] })] }) }) }));
    }
    // No subscription state
    if (!subscription) {
        return (_jsxs(Card, { className: cn("beauty-card", className), children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center space-x-2", children: [_jsx(CreditCard, { className: "h-5 w-5" }), _jsx("span", { children: "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430" })] }), _jsx(CardDescription, { children: "\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438" })] }), _jsx(CardContent, { className: "space-y-4", children: _jsxs("div", { className: "grid gap-2", children: [_jsxs(Button, { onClick: () => handleUpgrade('BASIC'), disabled: upgradeLoading !== null, className: "w-full", children: [upgradeLoading === 'BASIC' ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" })) : null, "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u043B\u0430\u043D Basic"] }), _jsxs(Button, { onClick: () => handleUpgrade('PRO'), disabled: upgradeLoading !== null, variant: "default", className: "w-full", children: [upgradeLoading === 'PRO' ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" })) : null, "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u043B\u0430\u043D Pro", _jsx(ArrowRight, { className: "h-4 w-4 ml-2" })] })] }) })] }));
    }
    const currentPlan = PLAN_DETAILS[subscription.plan];
    const isTrialExpiring = isTrialExpiringSoon(subscription);
    return (_jsxs(Card, { className: cn("beauty-card", className), children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(CreditCard, { className: "h-5 w-5" }), _jsx("span", { children: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u043B\u0430\u043D" })] }), _jsx(Badge, { variant: getStatusBadgeVariant(subscription.status), children: getStatusText(subscription.status) })] }), _jsx(CardDescription, { children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u043E\u0439 Beauty Platform" })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "p-4 bg-muted/50 rounded-lg", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h3", { className: "font-semibold text-lg", children: currentPlan.name }), _jsxs("span", { className: "text-2xl font-bold", children: [formatPrice(currentPlan.price), "/\u043C\u0435\u0441"] })] }), _jsx("p", { className: "text-sm text-muted-foreground mb-3", children: currentPlan.description }), _jsxs("div", { className: "space-y-1 text-sm", children: [subscription.trialEndsAt && subscription.status === 'TRIAL' && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u041F\u0440\u043E\u0431\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434 \u0434\u043E:" }), _jsx("span", { className: isTrialExpiring ? 'text-orange-600 font-medium' : '', children: formatDate(subscription.trialEndsAt) })] })), subscription.currentPeriodEnd && subscription.status === 'ACTIVE' && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043F\u043B\u0430\u0442\u0435\u0436:" }), _jsx("span", { children: formatDate(subscription.currentPeriodEnd) })] }))] })] }), isTrialExpiring && (_jsxs(Alert, { children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: "\u0412\u0430\u0448 \u043F\u0440\u043E\u0431\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0441\u043A\u043E\u0440\u043E. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043B\u0430\u043D \u0434\u043B\u044F \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0435\u043D\u0438\u044F \u0440\u0430\u0431\u043E\u0442\u044B." })] })), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-sm font-medium text-muted-foreground mb-2", children: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F:" }), ['BASIC', 'PRO', 'ENTERPRISE']
                                .filter(plan => canUpgradeTo(subscription.plan, plan))
                                .map((plan) => {
                                const planDetails = PLAN_DETAILS[plan];
                                const isLoading = upgradeLoading === plan;
                                return (_jsxs(Button, { onClick: () => handleUpgrade(plan), disabled: upgradeLoading !== null, variant: plan === 'PRO' ? 'default' : 'outline', className: "w-full justify-between", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [isLoading && _jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsxs("span", { children: ["\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043D\u0430 ", planDetails.name] }), planDetails.popular && (_jsx(Badge, { variant: "secondary", className: "text-xs", children: "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0439" }))] }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsxs("span", { className: "font-semibold", children: [formatPrice(planDetails.price), "/\u043C\u0435\u0441"] }), _jsx(ArrowRight, { className: "h-4 w-4" })] })] }, plan));
                            })] }), ['BASIC', 'PRO', 'ENTERPRISE'].every(plan => !canUpgradeTo(subscription.plan, plan)) && (_jsx("div", { className: "text-center py-4", children: _jsx("p", { className: "text-sm text-muted-foreground", children: "\u0423 \u0432\u0430\u0441 \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043B\u0430\u043D. \u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u0434\u043E\u0432\u0435\u0440\u0438\u0435! \uD83C\uDF89" }) }))] })] }));
}
