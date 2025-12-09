// Payment Providers - Real SDK Integration with Fallback
import Stripe from 'stripe';
// @ts-ignore - No types available for @paypal/checkout-server-sdk
import { core, orders } from '@paypal/checkout-server-sdk';
import crypto from 'crypto';

// ========================================
// STRIPE PAYMENT INTENTS PROVIDER
// ========================================

// Check if we have a real Stripe secret key
const isRealStripeKey = process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY.startsWith('sk_') &&
  !process.env.STRIPE_SECRET_KEY.includes('placeholder');

let stripe: Stripe | null = null;

if (isRealStripeKey) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
    typescript: true
  });
  console.log('[STRIPE PAYMENTS] ✅ Real API integration enabled');
  console.log(`[STRIPE PAYMENTS] Mode: ${process.env.STRIPE_SECRET_KEY!.startsWith('sk_test_') ? 'TEST' : 'LIVE'}`);
} else {
  console.warn('[STRIPE PAYMENTS] ⚠️  Using mock implementation - set STRIPE_SECRET_KEY for live API');
}

export interface StripePaymentResult {
  id: string;
  status: string;
  amount: number;
  currency: string;
  client_secret?: string;
  metadata?: any;
}

/**
 * Create Stripe Payment Intent
 *
 * @param amount - Amount in cents (e.g., 2500 = €25.00)
 * @param currency - Currency code (lowercase for Stripe API)
 * @param customerId - Customer identifier
 * @param description - Payment description
 * @returns Stripe PaymentIntent result
 */
export async function createStripePaymentIntent({
  amount,
  currency,
  customerId,
  description
}: {
  amount: number;
  currency: string;
  customerId: string;
  description?: string;
}): Promise<StripePaymentResult> {

  // Real Stripe API call if we have valid API key
  if (stripe && isRealStripeKey) {
    try {
      console.log(`[STRIPE PAYMENTS] Creating real PaymentIntent: ${amount} ${currency}`);

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: currency.toLowerCase(), // Stripe expects lowercase
        description: description || 'Beauty Platform Service',
        metadata: {
          customerId,
          platform: 'beauty-platform',
          createdViaAPI: 'true'
        },
        // Enable automatic payment methods
        automatic_payment_methods: {
          enabled: true
        }
      });

      console.log(`[STRIPE PAYMENTS] ✅ PaymentIntent created: ${paymentIntent.id} (${paymentIntent.status})`);

      const result: StripePaymentResult = {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: {
          stripePaymentIntent: paymentIntent,
          provider: 'stripe',
          realAPI: true,
          mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live'
        }
      };

      if (paymentIntent.client_secret) {
        result.client_secret = paymentIntent.client_secret;
      }

      return result;

    } catch (error: any) {
      console.error('[STRIPE PAYMENTS] ❌ Error creating PaymentIntent:', error.message);

      // Handle specific Stripe errors
      if (error.type === 'StripeInvalidRequestError' || error.code) {
        throw new Error(`Stripe API Error: ${error.message}`);
      }

      throw error; // Re-throw unexpected errors
    }
  }

  // Mock implementation when no valid API keys
  console.warn(`[STRIPE PAYMENTS] ⚠️  Using mock PaymentIntent (no valid API key)`);

  const mockPaymentIntentId = `pi_mock_${crypto.randomBytes(12).toString('hex')}`;

  return {
    id: mockPaymentIntentId,
    status: 'requires_payment_method',
    amount: amount,
    currency: currency.toLowerCase(),
    client_secret: `${mockPaymentIntentId}_secret_${crypto.randomBytes(16).toString('hex')}`,
    metadata: {
      provider: 'stripe',
      mockPayment: true,
      customerId,
      description
    }
  };
}

// ========================================
// PAYPAL ORDERS PROVIDER
// ========================================

// Check for real PayPal credentials
const isRealPaypalCredentials = process.env.PAYPAL_CLIENT_ID &&
  process.env.PAYPAL_SECRET &&
  !process.env.PAYPAL_CLIENT_ID.includes('placeholder') &&
  !process.env.PAYPAL_SECRET.includes('placeholder');

let paypalClient: core.PayPalHttpClient | null = null;

if (isRealPaypalCredentials) {
  // Determine environment: sandbox or production
  // @ts-ignore - PayPal SDK types issue
  const environment = process.env.NODE_ENV === 'production'
    ? new core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID!, process.env.PAYPAL_SECRET!)
    : new core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID!, process.env.PAYPAL_SECRET!);

  // @ts-ignore - PayPal SDK types issue
  paypalClient = new core.PayPalHttpClient(environment);
  console.log('[PAYPAL PAYMENTS] ✅ Real API integration enabled');
  console.log(`[PAYPAL PAYMENTS] Mode: ${process.env.NODE_ENV === 'production' ? 'LIVE' : 'SANDBOX'}`);
} else {
  console.warn('[PAYPAL PAYMENTS] ⚠️  Using mock implementation - set PAYPAL_CLIENT_ID and PAYPAL_SECRET for live API');
}

export interface PayPalPaymentResult {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
  links: Array<{ rel: string; href: string }>;
  metadata?: any;
}

/**
 * Create PayPal Order
 *
 * @param amount - Amount in cents (e.g., 2500 = €25.00)
 * @param currency - Currency code (uppercase for PayPal API)
 * @param description - Order description
 * @returns PayPal Order result
 */
export async function createPayPalOrder({
  amount,
  currency,
  description
}: {
  amount: number;
  currency: string;
  description?: string;
}): Promise<PayPalPaymentResult> {

  // Real PayPal API call if we have valid credentials
  if (paypalClient && isRealPaypalCredentials) {
    try {
      // Convert cents to currency units (25.00)
      const amountValue = (amount / 100).toFixed(2);

      console.log(`[PAYPAL PAYMENTS] Creating real Order: ${amountValue} ${currency}`);

      // @ts-ignore - PayPal SDK types issue
      const request = new orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency.toUpperCase(),
            value: amountValue
          },
          description: description || 'Beauty Platform Service'
        }]
      });

      const order = await paypalClient.execute(request);

      console.log(`[PAYPAL PAYMENTS] ✅ Order created: ${order.result.id} (${order.result.status})`);

      return {
        id: order.result.id,
        status: order.result.status,
        amount: {
          value: amountValue,
          currency_code: currency.toUpperCase()
        },
        links: order.result.links || [],
        metadata: {
          paypalOrder: order.result,
          provider: 'paypal',
          realAPI: true,
          mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'
        }
      };

    } catch (error: any) {
      console.error('[PAYPAL PAYMENTS] ❌ Error creating Order:', error.message);
      throw new Error(`PayPal API Error: ${error.message}`);
    }
  }

  // Mock implementation when no valid credentials
  console.warn(`[PAYPAL PAYMENTS] ⚠️  Using mock Order (no valid API credentials)`);

  const mockOrderId = `paypal_order_${crypto.randomBytes(12).toString('hex')}`;
  const amountValue = (amount / 100).toFixed(2);

  return {
    id: mockOrderId,
    status: 'CREATED',
    amount: {
      value: amountValue,
      currency_code: currency.toUpperCase()
    },
    links: [
      { rel: 'approve', href: `https://paypal.mock/approve/${mockOrderId}` },
      { rel: 'self', href: `https://paypal.mock/order/${mockOrderId}` }
    ],
    metadata: {
      provider: 'paypal',
      mockPayment: true,
      description
    }
  };
}
