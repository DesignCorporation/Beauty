// Refund Providers for Stage 5 - Real SDK Integration with Fallback
import Stripe from 'stripe';
// @ts-ignore - No types available for @paypal/checkout-server-sdk
import { core, _orders, payments } from '@paypal/checkout-server-sdk';
import crypto from 'crypto';

// ========================================
// STRIPE REFUNDS PROVIDER
// ========================================

// Check if we have a real Stripe secret key
const isRealStripeKey = process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY.startsWith('sk_') &&
  !process.env.STRIPE_SECRET_KEY.includes('placeholder');

let stripe: Stripe | null = null;

if (isRealStripeKey) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
  });
  console.log('[STRIPE REFUNDS] Real API integration enabled');
} else {
  console.warn('[STRIPE REFUNDS] Using mock implementation - set STRIPE_SECRET_KEY for live API');
}

interface StripeRefundResult {
  id: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: number;
  currency: string;
  errorMessage?: string;
  providerRefundId?: string;
  metadata?: any;
}

export async function createStripeRefund({
  paymentIntentId,
  amount,
  reason = 'requested_by_customer'
}: {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}): Promise<StripeRefundResult> {

  // Real Stripe API call if we have valid API key
  if (stripe && isRealStripeKey) {
    try {
      console.log(`[STRIPE REFUNDS] Creating real refund for ${paymentIntentId}, amount: ${amount ? amount/100 : 'full'}`);

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: reason as Stripe.RefundCreateParams.Reason
      };

      if (amount) {
        refundParams.amount = amount;
      }

      const refund = await stripe.refunds.create(refundParams);

      console.log(`[STRIPE REFUNDS] Refund created: ${refund.id} (${refund.status})`);

      return {
        id: refund.id,
        status: mapStripeRefundStatus(refund.status as any),
        amount: refund.amount,
        currency: refund.currency,
        providerRefundId: refund.id,
        metadata: {
          stripeRefund: refund,
          provider: 'stripe',
          realAPI: true
        }
      };

    } catch (error: any) {
      console.error('[STRIPE REFUNDS] Error creating refund:', error.message);

      // Handle specific Stripe errors
      if (error.type === 'StripeCardError' || error.code) {
        return {
          id: `mock_refund_error_${Date.now()}`,
          status: 'failed',
          amount: amount || 0,
          currency: 'eur',
          errorMessage: error.message,
          metadata: {
            provider: 'stripe',
            error: error,
            realAPI: true
          }
        };
      }

      throw error; // Re-throw unexpected errors
    }
  }

  // Mock implementation when no valid API keys
  console.warn(`[STRIPE REFUNDS] Using mock refund for ${paymentIntentId} (no valid API key)`);

  const mockRefundId = `mock_refund_stripe_${crypto.randomBytes(6).toString('hex')}`;

  return {
    id: mockRefundId,
    status: 'pending',
    amount: amount || 0,
    currency: 'eur',
    providerRefundId: mockRefundId,
    metadata: {
      provider: 'stripe',
      mockRefund: true,
      originalPaymentIntent: paymentIntentId,
      reason
    }
  };
}

function mapStripeRefundStatus(stripeStatus: string): 'pending' | 'succeeded' | 'failed' {
  switch (stripeStatus) {
    case 'succeeded':
      return 'succeeded';
    case 'pending':
      return 'pending';
    case 'failed':
    case 'canceled':
      return 'failed';
    default:
      console.warn(`[STRIPE REFUNDS] Unknown status: ${stripeStatus}, defaulting to pending`);
      return 'pending';
  }
}

// ========================================
// PAYPAL REFUNDS PROVIDER
// ========================================

// Check for real PayPal credentials
const isRealPaypalCredentials = process.env.PAYPAL_CLIENT_ID &&
  process.env.PAYPAL_SECRET &&
  !process.env.PAYPAL_CLIENT_ID.includes('placeholder') &&
  !process.env.PAYPAL_SECRET.includes('placeholder');

let paypalClient: core.PayPalHttpClient | null = null;

if (isRealPaypalCredentials) {
  // Determine environment: sandbox or production
  const environment = process.env.NODE_ENV === 'production'
    ? new core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET)
    : new core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET);

  paypalClient = new core.PayPalHttpClient(environment);
  console.log('[PAYPAL REFUNDS] Real API integration enabled');
} else {
  console.warn('[PAYPAL REFUNDS] Using mock implementation - set PAYPAL_CLIENT_ID and PAYPAL_SECRET for live API');
}

interface PayPalRefundResult {
  id: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: number;
  currency: string;
  errorMessage?: string;
  providerRefundId?: string;
  metadata?: any;
}

export async function createPayPalRefund({
  captureId,
  orderId,
  amount,
  currency = 'EUR',
  note
}: {
  captureId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  note?: string;
}): Promise<PayPalRefundResult> {

  // Real PayPal API call if we have valid credentials
  if (paypalClient && isRealPaypalCredentials) {
    try {
      // Priority: use captureId if available (more specific), otherwise orderId
      if (captureId) {
        console.log(`[PAYPAL REFUNDS] Creating real capture refund for ${captureId}, amount: ${amount || 'full'} ${currency}`);

        const request = new payments.CapturesRefundRequest(captureId);
        request.requestBody({
          amount: amount ? {
            value: (amount / 100).toFixed(2), // Convert cents to currency units
            currency_code: currency.toUpperCase()
          } : undefined,
          note_to_payer: note || 'Refund requested',
        });

        const refund = await paypalClient.execute(request);

        console.log(`[PAYPAL REFUNDS] Capture refund created: ${refund.result.id} (${refund.result.status})`);

        return {
          id: refund.result.id,
          status: mapPayPalRefundStatus(refund.result.status),
          amount: amount || 0,
          currency: currency.toLowerCase(),
          providerRefundId: refund.result.id,
          metadata: {
            paypalRefund: refund.result,
            provider: 'paypal',
            refundType: 'capture',
            realAPI: true
          }
        };

      } else if (orderId) {
        // Note: PayPal doesn't support direct order refunds - need to refund captures
        // This is a fallback for when we only have orderId
        console.log(`[PAYPAL REFUNDS] Order refund not directly supported, using mock for ${orderId}`);

        const mockRefundId = `mock_refund_paypal_order_${crypto.randomBytes(6).toString('hex')}`;

        return {
          id: mockRefundId,
          status: 'pending',
          amount: amount || 0,
          currency: currency.toLowerCase(),
          providerRefundId: mockRefundId,
          errorMessage: 'PayPal order refunds require capture ID - using mock refund',
          metadata: {
            provider: 'paypal',
            refundType: 'order_mock',
            originalOrderId: orderId,
            realAPI: false
          }
        };
      }

      throw new Error('Either captureId or orderId must be provided');

    } catch (error: any) {
      console.error('[PAYPAL REFUNDS] Error creating refund:', error.message);

      return {
        id: `mock_refund_paypal_error_${Date.now()}`,
        status: 'failed',
        amount: amount || 0,
        currency: currency.toLowerCase(),
        errorMessage: error.message,
        metadata: {
          provider: 'paypal',
          error: error,
          realAPI: true
        }
      };
    }
  }

  // Mock implementation when no valid credentials
  const mockRefundId = `mock_refund_paypal_${crypto.randomBytes(6).toString('hex')}`;
  const paymentId = captureId || orderId || 'unknown';

  console.warn(`[PAYPAL REFUNDS] Using mock refund for ${paymentId} (no valid API credentials)`);

  return {
    id: mockRefundId,
    status: 'pending',
    amount: amount || 0,
    currency: currency.toLowerCase(),
    providerRefundId: mockRefundId,
    metadata: {
      provider: 'paypal',
      mockRefund: true,
      originalPaymentId: paymentId,
      refundType: captureId ? 'capture' : 'order',
      note
    }
  };
}

function mapPayPalRefundStatus(paypalStatus: string): 'pending' | 'succeeded' | 'failed' {
  switch (paypalStatus?.toUpperCase()) {
    case 'COMPLETED':
      return 'succeeded';
    case 'PENDING':
      return 'pending';
    case 'FAILED':
    case 'CANCELLED':
    case 'DENIED':
      return 'failed';
    default:
      console.warn(`[PAYPAL REFUNDS] Unknown status: ${paypalStatus}, defaulting to pending`);
      return 'pending';
  }
}