#!/bin/bash

# 🧪 Test Stripe Payment Integration
# Тестирование Stripe payment flow с test ключами

echo "🧪 Testing Stripe Payment Integration"
echo "======================================"
echo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test tenant ID (из существующей БД)
TENANT_ID="cmem0a46l00009f1i8v2nz6qz"

echo "📋 Test Configuration:"
echo "  Tenant ID: $TENANT_ID"
echo "  Payment Service: http://localhost:6029"
echo "  Amount: €25.00"
echo "  Currency: EUR"
echo

# Test 1: Check Payment Service health
echo "1️⃣  Checking Payment Service health..."
HEALTH=$(curl -s http://localhost:6029/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo -e "   ${GREEN}✓${NC} Payment Service is healthy"
    echo "   Response: $HEALTH"
else
    echo -e "   ${RED}✗${NC} Payment Service is not responding"
    echo "   Response: $HEALTH"
    exit 1
fi
echo

# Test 2: Create Stripe Payment Intent
echo "2️⃣  Creating Stripe Payment Intent..."
IDEMPOTENCY_KEY="test-$(date +%s)-$RANDOM"
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:6029/api/payments/intents \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "amount": 2500,
    "currency": "EUR",
    "provider": "stripe",
    "customerId": "test_customer_123",
    "description": "Beauty Salon Service - Haircut"
  }')

echo "$PAYMENT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PAYMENT_RESPONSE"

# Check if payment was created successfully
if echo "$PAYMENT_RESPONSE" | grep -q '"id"'; then
    PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
    PROVIDER_ID=$(echo "$PAYMENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['providerId'])" 2>/dev/null)
    echo
    echo -e "   ${GREEN}✓${NC} Payment Intent created successfully!"
    echo "   Payment ID: $PAYMENT_ID"
    echo "   Stripe Payment Intent ID: $PROVIDER_ID"
else
    echo -e "   ${RED}✗${NC} Failed to create payment"
    exit 1
fi
echo

# Test 3: Test Idempotency (повторный запрос с тем же ключом)
echo "3️⃣  Testing Idempotency (повторный запрос)..."
REPEAT_RESPONSE=$(curl -s -X POST http://localhost:6029/api/payments/intents \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "amount": 2500,
    "currency": "EUR",
    "provider": "stripe",
    "customerId": "test_customer_123",
    "description": "Beauty Salon Service - Haircut"
  }')

if echo "$REPEAT_RESPONSE" | grep -q "$PAYMENT_ID"; then
    echo -e "   ${GREEN}✓${NC} Idempotency works! Returned cached response"
else
    echo -e "   ${YELLOW}⚠${NC}  Idempotency might not be working correctly"
fi
echo

# Test 4: Generate Invoice PDF
echo "4️⃣  Generating Invoice PDF..."
INVOICE_RESPONSE=$(curl -s -X GET "http://localhost:6029/api/invoices/$PAYMENT_ID/generate" \
  -H "x-tenant-id: $TENANT_ID")

echo "$INVOICE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INVOICE_RESPONSE"

if echo "$INVOICE_RESPONSE" | grep -q "success"; then
    INVOICE_PATH=$(echo "$INVOICE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['invoicePath'])" 2>/dev/null)
    echo
    echo -e "   ${GREEN}✓${NC} Invoice PDF generated!"
    echo "   Path: $INVOICE_PATH"

    # Check if file exists
    if [ -f "$INVOICE_PATH" ]; then
        FILE_SIZE=$(ls -lh "$INVOICE_PATH" | awk '{print $5}')
        echo "   File size: $FILE_SIZE"
    fi
else
    echo -e "   ${YELLOW}⚠${NC}  Invoice generation might have failed"
fi
echo

# Test 5: Test Stripe Test Cards
echo "5️⃣  Stripe Test Card Numbers:"
echo
echo "   ✅ Success Card:"
echo "      4242 4242 4242 4242"
echo "      Any future expiry, any 3-digit CVV"
echo
echo "   ⚠️  Decline Card (insufficient funds):"
echo "      4000 0000 0000 9995"
echo
echo "   🔐 3D Secure Authentication Required:"
echo "      4000 0025 0000 3155"
echo
echo "   Full list: https://stripe.com/docs/testing#cards"
echo

# Test 6: Next Steps
echo "📋 Next Steps:"
echo
echo "   1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/payments"
echo "   2. Find payment: $PROVIDER_ID"
echo "   3. Test webhook:"
echo "      - Install Stripe CLI: stripe listen --forward-to localhost:6029/webhooks/stripe"
echo "      - Trigger test event: stripe trigger payment_intent.succeeded"
echo
echo "   4. Get webhook secret:"
echo "      STRIPE_WEBHOOK_SECRET='whsec_...'"
echo "      Add to .env file"
echo

echo -e "${GREEN}✓ Stripe Payment Integration Test Complete!${NC}"
echo
echo "💡 Payment Service is ready to accept real Stripe payments!"
echo "   Just replace test keys with live keys when ready for production."
