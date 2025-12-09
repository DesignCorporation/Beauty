import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { tenantPrisma } from '../prisma';
// @ts-ignore - No types available for currency.js module
import { normalizeAndValidateCurrency, currencyForProvider } from '../utils/currency';
import { createStripePaymentIntent, createPayPalOrder } from '../providers/paymentProviders';
import { emitPaymentCompleted } from '../emitters';
import crypto from 'crypto';

const router: Router = Router();

const resolvePublishableKey = () => {
  const key = process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  return typeof key === 'string' ? key.trim() : '';
};

router.get('/config', (_req: Request, res: Response) => {
  try {
    const publishableKey = resolvePublishableKey();
    const stripeEnabled = publishableKey.startsWith('pk_');

    res.status(200).json({
      success: true,
      data: {
        stripe: {
          enabled: stripeEnabled,
          publishableKey: stripeEnabled ? publishableKey : null,
          mode: publishableKey.startsWith('pk_live_') ? 'live' : publishableKey.startsWith('pk_test_') ? 'test' : 'unknown'
        },
        cash: {
          enabled: true
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[PAYMENTS] Failed to provide payment config:', error);
    res.status(500).json({
      error: 'CONFIG_UNAVAILABLE',
      message: 'Unable to provide payment configuration',
      timestamp: new Date().toISOString()
    });
  }
});

// 💳 Payments API - Stage 6: Multi-currency support

// Zod schema for payment intent creation
const createPaymentIntentSchema = z.object({
  amount: z.number().int().positive('Amount must be positive'),
  currency: z.string().optional(), // Will be normalized/validated by currency utils
  provider: z.enum(['stripe', 'paypal']),
  customerId: z.string().min(1, 'Customer ID is required'),
  description: z.string().optional()
});

const manualPaymentSchema = z.object({
  amount: z.number().int().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  customerId: z.string().optional(),
  description: z.string().optional(),
  method: z.enum(['CASH']).default('CASH')
});

const updatePaymentSchema = z.object({
  appointmentId: z.string().optional(),
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED']).optional(),
  paymentMethod: z.enum(['CARD', 'CASH']).optional()
});

/**
 * POST /payments/intents
 * Create payment intent with multi-currency support
 */
router.post('/intents', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    // Validate required headers
    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing x-tenant-id header',
        code: 'MISSING_TENANT_ID'
      });
    }

    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'Missing Idempotency-Key header',
        code: 'MISSING_IDEMPOTENCY_KEY'
      });
    }

    // Validate request body
    const validation = createPaymentIntentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors
      });
    }

    const { amount, provider, customerId, description } = validation.data;

    // 💰 CURRENCY NORMALIZATION AND VALIDATION
    let normalizedCurrency;
    try {
      normalizedCurrency = normalizeAndValidateCurrency({
        input: validation.data.currency,
        tenantId
      });
    } catch (currencyError: any) {
      return res.status(currencyError.status || 400).json({
        error: currencyError.message,
        code: currencyError.code || 'CURRENCY_ERROR'
      });
    }

    const currency = normalizedCurrency.currency; // Uppercase for DB/response
    const providerCurrency = currencyForProvider(currency); // Lowercase for SDK

    const prisma = tenantPrisma(tenantId);

    // Generate request hash for idempotency
    const requestData = {
      method: 'POST',
      path: '/payments/intents',
      body: { ...req.body, currency } // Normalize currency in hash
    };
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(requestData))
      .digest('hex');

    // Check for existing idempotency key
    const existingIdempotency = await prisma.idempotencyKey.findUnique({
      where: {
        key: idempotencyKey
      }
    });

    if (existingIdempotency) {
      // Check if request hash matches
      if (existingIdempotency.requestHash !== requestHash) {
        return res.status(409).json({
          error: 'Idempotency key conflict',
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Same idempotency key used for different request'
        });
      }

      // Return cached response
      return res.status(201).json(existingIdempotency.response);
    }

    // Generate payment ID
    const paymentId = `pay_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Real provider integration via SDKs
    let providerResult: any;

    try {
      if (provider === 'stripe') {
        // Create real Stripe PaymentIntent
        const stripeArgs: any = {
          amount,
          currency: providerCurrency, // lowercase for Stripe
          customerId
        };
        if (description) {
          stripeArgs.description = description;
        }
        providerResult = await createStripePaymentIntent(stripeArgs);

        console.log(`[STRIPE] PaymentIntent created: ${providerResult.id} (${providerResult.status})`);

      } else if (provider === 'paypal') {
        // Create real PayPal Order
        const paypalArgs: any = {
          amount,
          currency: providerCurrency // uppercase for PayPal
        };
        if (description) {
          paypalArgs.description = description;
        }
        providerResult = await createPayPalOrder(paypalArgs);

        console.log(`[PAYPAL] Order created: ${providerResult.id} (${providerResult.status})`);
      }
    } catch (providerError: any) {
      console.error(`[${provider.toUpperCase()}] Provider error:`, providerError.message);

      return res.status(502).json({
        error: 'Payment provider error',
        code: 'PROVIDER_ERROR',
        message: providerError.message
      });
    }

    // Create Payment record
    const payment = await prisma.payment.create({
      data: {
        id: paymentId,
        tenantId,
        customerId,
        provider,
        providerId: providerResult.id,
        amount: amount,
        currency: currency, // Store in uppercase
        status: 'PENDING',
        metadata: {
          description,
          providerResponse: providerResult,
          createdViaAPI: true
        }
      }
    });

    // Log payment creation event
    await prisma.paymentEvent.create({
      data: {
        tenantId,
        provider,
        eventType: 'payment.created',
        eventId: `payment_${provider}_${paymentId}_${Date.now()}`,
        paymentId,
        payload: {
          paymentId,
          providerId: providerResult.id,
          amount,
          currency,
          providerResult
        },
        processed: true
      }
    });

    // Prepare response
    const response = {
      id: payment.id,
      provider: payment.provider,
      providerId: payment.providerId,
      amount: payment.amount,
      currency: payment.currency, // Uppercase in response
      status: payment.status,
      customerId: payment.customerId,
      createdAt: payment.createdAt.toISOString(),
      providerData: {
        ...(provider === 'stripe' && {
          clientSecret: providerResult.client_secret
        }),
        ...(provider === 'paypal' && {
          approvalUrl: providerResult.links.find((l: any) => l.rel === 'approve')?.href
        })
      }
    };

    // Cache the response for idempotency (24h TTL)
    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        tenantId,
        requestHash,
        response: response,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    console.log(`[PAYMENTS] Created payment ${paymentId}: ${amount} ${currency} via ${provider} (Provider: ${providerCurrency})`);

    res.status(201).json(response);

  } catch (error) {
    console.error('[PAYMENTS] Error creating payment intent:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'PAYMENT_CREATION_FAILED'
    });
  }
  return undefined;
});

/**
 * POST /payments/manual
 * Создать платеж для оффлайн-оплаты (наличные, терминал)
 */
router.post('/manual', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing x-tenant-id header',
        code: 'MISSING_TENANT_ID'
      });
    }

    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'Missing Idempotency-Key header',
        code: 'MISSING_IDEMPOTENCY_KEY'
      });
    }

    const validation = manualPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors
      });
    }

    const prisma = tenantPrisma(tenantId);

    const normalizedCurrency = normalizeAndValidateCurrency({
      input: validation.data.currency,
      tenantId
    });

    const requestData = {
      method: 'POST',
      path: '/payments/manual',
      body: { ...validation.data, currency: normalizedCurrency.currency }
    };
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(requestData))
      .digest('hex');

    const existingIdempotency = await prisma.idempotencyKey.findUnique({
      where: {
        key: idempotencyKey
      }
    });

    if (existingIdempotency) {
      if (existingIdempotency.requestHash !== requestHash) {
        return res.status(409).json({
          error: 'Idempotency key conflict',
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Same idempotency key used for different request'
        });
      }

      return res.status(201).json(existingIdempotency.response);
    }

    const paymentId = `pay_cash_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    const payment = await prisma.payment.create({
      data: {
        id: paymentId,
        tenantId,
        provider: 'cash',
        providerId: null,
        customerId: validation.data.customerId ?? null,
        amount: validation.data.amount,
        currency: normalizedCurrency.currency,
        status: 'PENDING',
        metadata: {
          description: validation.data.description ?? null,
          method: 'CASH',
          createdViaAPI: true
        }
      }
    });

    await prisma.paymentEvent.create({
      data: {
        tenantId,
        provider: 'cash',
        eventType: 'payment.manual.created',
        eventId: `payment_cash_${paymentId}_${Date.now()}`,
        paymentId,
        payload: {
          paymentId,
          amount: validation.data.amount,
          currency: normalizedCurrency.currency,
          description: validation.data.description
        },
        processed: true
      }
    });

    const responsePayload = {
      id: payment.id,
      provider: payment.provider,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      customerId: payment.customerId,
      createdAt: payment.createdAt.toISOString()
    };

    const response = {
      success: true,
      data: responsePayload,
      message: 'Manual payment created'
    };

    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        tenantId,
        requestHash,
        response,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    // 🔔 Отправляем WebSocket событие завершения платежа (асинхронно)
    try {
      const customerId = validation.data.customerId || 'cash-customer';
      await emitPaymentCompleted({
        paymentId: payment.id,
        amount: validation.data.amount,
        currency: normalizedCurrency.currency,
        tenantId,
        clientName: customerId
      });
    } catch (error) {
      console.error('[PAYMENTS] Failed to emit paymentCompleted event for manual payment:', error);
      // Не блокируем response если эмиссия не сработает
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('[PAYMENTS] Error creating manual payment:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'PAYMENT_CREATION_FAILED'
    });
  }
  return undefined;
});

/**
 * GET /payments/:paymentId
 * Получить информацию о платеже
 */
router.get('/:paymentId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing x-tenant-id header',
        code: 'MISSING_TENANT_ID'
      });
    }

    const paymentId = req.params.paymentId;
    if (!paymentId) {
      return res.status(400).json({
        error: 'Missing paymentId parameter',
        code: 'MISSING_PAYMENT_ID'
      });
    }

    const prisma = tenantPrisma(tenantId);
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId }
    });

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('[PAYMENTS] Error fetching payment:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'PAYMENT_FETCH_FAILED'
    });
  }
  return undefined;
});

/**
 * PATCH /payments/:paymentId
 * Обновить платеж (связать с записью, изменить статус)
 */
router.patch('/:paymentId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing x-tenant-id header',
        code: 'MISSING_TENANT_ID'
      });
    }

    const paymentId = req.params.paymentId;
    if (!paymentId) {
      return res.status(400).json({
        error: 'Missing paymentId parameter',
        code: 'MISSING_PAYMENT_ID'
      });
    }

    const validation = updatePaymentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors
      });
    }

    const prisma = tenantPrisma(tenantId);
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId }
    });

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    const updateData: any = {};

    if (validation.data.appointmentId) {
      updateData.appointmentId = validation.data.appointmentId;
    }

    if (validation.data.status) {
      updateData.status = validation.data.status;
    }

    if (validation.data.paymentMethod) {
      updateData.metadata = {
        ...(typeof payment.metadata === 'object' && payment.metadata ? (payment.metadata as any) : {}),
        paymentMethod: validation.data.paymentMethod
      };
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No valid fields provided to update',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: updateData
    });

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Payment updated'
    });
  } catch (error) {
    console.error('[PAYMENTS] Error updating payment:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'PAYMENT_UPDATE_FAILED'
    });
  }
  return undefined;
});

export default router;
