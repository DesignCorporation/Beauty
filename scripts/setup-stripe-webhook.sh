#!/bin/bash

# 🎣 Stripe Webhook Setup Guide
# Настройка webhook secret для Payment Service

echo "🎣 Stripe Webhook Setup"
echo "======================================"
echo

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Есть 2 способа настроить Stripe webhook:"
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ВАРИАНТ 1: Stripe CLI (рекомендуется для dev)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "1. Установить Stripe CLI (если еще не установлен):"
echo "   ${BLUE}https://stripe.com/docs/stripe-cli${NC}"
echo
echo "2. Авторизоваться в Stripe:"
echo "   ${BLUE}stripe login${NC}"
echo
echo "3. Запустить webhook forwarding:"
echo "   ${BLUE}stripe listen --forward-to localhost:6029/webhooks/stripe${NC}"
echo
echo "4. Скопировать webhook secret (начинается с ${YELLOW}whsec_...${NC})"
echo "   Пример: ${YELLOW}whsec_abc123def456...${NC}"
echo
echo "5. Добавить в .env:"
echo "   ${GREEN}STRIPE_WEBHOOK_SECRET=\"whsec_abc123def456...\"${NC}"
echo
echo "6. Перезапустить Payment Service:"
echo "   ${BLUE}pkill -f payment-service && cd /root/projects/beauty/services/payment-service && pnpm dev &${NC}"
echo
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 ВАРИАНТ 2: Stripe Dashboard (для production)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "1. Открыть Stripe Dashboard:"
echo "   ${BLUE}https://dashboard.stripe.com/test/webhooks${NC}"
echo
echo "2. Нажать \"Add endpoint\""
echo
echo "3. Endpoint URL:"
echo "   Test: ${YELLOW}https://dev-api.beauty.designcorp.eu/webhooks/stripe${NC}"
echo "   Prod: ${YELLOW}https://api.beauty.designcorp.eu/webhooks/stripe${NC}"
echo
echo "4. Select events to listen to:"
echo "   ✅ payment_intent.succeeded"
echo "   ✅ payment_intent.payment_failed"
echo "   ✅ charge.refunded"
echo "   ✅ refund.created"
echo "   ✅ refund.updated"
echo "   ✅ customer.subscription.created"
echo "   ✅ customer.subscription.updated"
echo "   ✅ customer.subscription.deleted"
echo "   ✅ invoice.payment_succeeded"
echo "   ✅ invoice.payment_failed"
echo
echo "5. После создания endpoint, скопировать \"Signing secret\""
echo "   Пример: ${YELLOW}whsec_xyz789...${NC}"
echo
echo "6. Добавить в production .env на сервере:"
echo "   ${GREEN}STRIPE_WEBHOOK_SECRET=\"whsec_xyz789...\"${NC}"
echo
echo "7. Перезапустить Payment Service на production"
echo
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 ТЕСТИРОВАНИЕ WEBHOOK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "После настройки webhook secret:"
echo
echo "1. Stripe CLI (тестовые события):"
echo "   ${BLUE}stripe trigger payment_intent.succeeded${NC}"
echo "   ${BLUE}stripe trigger charge.refunded${NC}"
echo
echo "2. Или создать реальный PaymentIntent:"
echo "   ${BLUE}bash /root/projects/beauty/scripts/test-stripe-payment.sh${NC}"
echo
echo "3. Проверить логи Payment Service:"
echo "   ${BLUE}tail -f /tmp/payment-service.log | grep webhook${NC}"
echo
echo "   Должны увидеть:"
echo "   ${GREEN}✅ Stripe webhook verified: payment_intent.succeeded${NC}"
echo
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 STRIPE DASHBOARD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Test Mode Dashboard:"
echo "  💳 Payments: ${BLUE}https://dashboard.stripe.com/test/payments${NC}"
echo "  🎣 Webhooks: ${BLUE}https://dashboard.stripe.com/test/webhooks${NC}"
echo "  🔑 API Keys: ${BLUE}https://dashboard.stripe.com/test/apikeys${NC}"
echo
echo "Production Dashboard:"
echo "  💳 Payments: ${BLUE}https://dashboard.stripe.com/payments${NC}"
echo "  🎣 Webhooks: ${BLUE}https://dashboard.stripe.com/webhooks${NC}"
echo "  🔑 API Keys: ${BLUE}https://dashboard.stripe.com/apikeys${NC}"
echo
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CHECKLIST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "[ ] 1. Получен STRIPE_WEBHOOK_SECRET"
echo "[ ] 2. Добавлен в /root/projects/beauty/.env"
echo "[ ] 3. Payment Service перезапущен"
echo "[ ] 4. Протестирован test event (stripe trigger)"
echo "[ ] 5. Проверены логи (webhook verified)"
echo
echo

echo "${GREEN}✓ Webhook Setup Guide Complete!${NC}"
echo
echo "💡 Tip: Для быстрого теста используйте Stripe CLI (Вариант 1)"
echo "    Для production используйте Dashboard (Вариант 2)"
echo
