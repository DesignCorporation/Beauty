import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { tenantPrisma } from '../prisma';
import { createStripeRefund, createPayPalRefund } from '../providers/refundProviders';
import crypto from 'crypto';

const router: Router = Router();

const isJsonRecord = (value: Prisma.JsonValue | null | undefined): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const getJsonString = (record: Record<string, unknown>, key: string): string | undefined => {
  const raw = record[key];
  return typeof raw === 'string' ? raw : undefined;
};

const serializeJson = <T>(data: T): Prisma.InputJsonValue => {
  try {
    return JSON.parse(JSON.stringify(data ?? null)) as Prisma.InputJsonValue;
  } catch {
    return JSON.stringify(data) as unknown as Prisma.InputJsonValue;
  }
};

// 🔄 Refunds API - Stage 5

// Zod schema for refund creation
const createRefundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().int().positive().optional(), // Optional for partial refunds
  reason: z.string().optional()
});

/**
 * POST /refunds
 * Create a refund with mandatory Idempotency-Key
 */
router.post('/', async (req: Request, res: Response) => {
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
    const validation = createRefundSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors
      });
    }

    const { paymentId, amount, reason } = validation.data;

    // Get tenant-isolated Prisma client
    const prisma = tenantPrisma(tenantId);

    // Generate request hash for idempotency
    const requestData = {
      method: 'POST',
      path: '/refunds',
      body: req.body
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
      // Check if request hash matches (prevent different requests with same key)
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

    // Find the payment
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        tenantId
      }
    });

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    // Validate payment status (only succeeded payments can be refunded)
    if (payment.status !== 'SUCCEEDED') {
      return res.status(400).json({
        error: 'Payment cannot be refunded',
        code: 'INVALID_PAYMENT_STATUS',
        message: `Payment status is ${payment.status}, expected SUCCEEDED`
      });
    }

    // Calculate refund amount (default to full payment amount)
    const refundAmount = amount || Number(payment.amount * 100); // Convert to cents

    // Validate refund amount doesn't exceed payment amount
    if (refundAmount > Number(payment.amount * 100)) {
      return res.status(400).json({
        error: 'Refund amount exceeds payment amount',
        code: 'INVALID_REFUND_AMOUNT',
        message: `Refund amount ${refundAmount} exceeds payment amount ${Number(payment.amount * 100)}`
      });
    }

    // Check existing refunds to prevent over-refunding
    const existingRefunds = await prisma.refund.findMany({
      where: {
        paymentId,
        tenantId,
        status: { in: ['pending', 'succeeded'] }
      }
    });

    const totalRefunded = existingRefunds.reduce((sum, refund) => sum + refund.amount, 0);
    if (totalRefunded + refundAmount > Number(payment.amount * 100)) {
      return res.status(400).json({
        error: 'Total refund amount would exceed payment amount',
        code: 'EXCESSIVE_REFUND_AMOUNT',
        message: `Total refunds ${totalRefunded + refundAmount} would exceed payment amount ${Number(payment.amount * 100)}`
      });
    }

    // Determine provider and provider payment ID
    const paymentMetadata = isJsonRecord(payment.metadata);
    const providerRaw = getJsonString(paymentMetadata, 'provider');
    const provider = providerRaw === 'paypal' ? 'paypal' : 'stripe';
    const providerId = payment.providerId ?? getJsonString(paymentMetadata, 'providerId');

    if (!providerId) {
      return res.status(400).json({
        error: 'Provider payment ID not found',
        code: 'MISSING_PROVIDER_ID',
        message: `Payment ${paymentId} missing provider ID for ${provider} refund`
      });
    }

    let providerRefundResult;

    try {
      // Create refund through provider
      if (provider === 'stripe') {
        providerRefundResult = await createStripeRefund({
          paymentIntentId: providerId,
          amount: refundAmount,
          reason: reason || 'requested_by_customer'
        });
      } else if (provider === 'paypal') {
        // For PayPal, try to use capture ID from metadata, fallback to order ID
        const captureId = getJsonString(paymentMetadata, 'captureId');
        const orderId = getJsonString(paymentMetadata, 'orderId') || providerId;

        const paypalRefundData: Parameters<typeof createPayPalRefund>[0] = {
          amount: refundAmount,
          currency: payment.currency,
          note: reason || 'Customer request',
          ...(captureId && { captureId }),
          ...(orderId && { orderId })
        };

        providerRefundResult = await createPayPalRefund(paypalRefundData);
      } else {
        return res.status(400).json({
          error: 'Unsupported payment provider',
          code: 'UNSUPPORTED_PROVIDER',
          message: `Provider ${provider} not supported for refunds`
        });
      }

      // Handle provider errors (status: failed)
      if (providerRefundResult.status === 'failed') {
        // Create failed refund record
        const failedRefundData = {
          tenantId,
          paymentId,
          provider,
          amount: refundAmount,
          currency: payment.currency,
          status: 'failed' as const,
          reason: reason || 'Customer request',
          metadata: serializeJson({
            createdViaAPI: true,
            originalPaymentAmount: Number(payment.amount * 100),
            providerError: providerRefundResult.errorMessage,
            providerMetadata: providerRefundResult.metadata
          }),
          ...(providerRefundResult.providerRefundId && { providerRefundId: providerRefundResult.providerRefundId })
        };

        const refund = await prisma.refund.create({
          data: failedRefundData as any
        });

        // Log failure event
        await prisma.paymentEvent.create({
          data: {
            tenantId,
            provider,
            eventType: 'refund.failed',
            eventId: `refund_${provider}_${refund.id}_${Date.now()}`,
            paymentId,
            refundId: refund.id,
            payload: serializeJson({
              refundId: refund.id,
              error: providerRefundResult.errorMessage,
              providerResult: providerRefundResult
            }),
            processed: true
          }
        });

        return res.status(502).json({
          error: 'Provider refund failed',
          code: 'PROVIDER_REFUND_FAILED',
          message: providerRefundResult.errorMessage,
          refund: {
            id: refund.id,
            paymentId: refund.paymentId,
            amount: refund.amount,
            currency: refund.currency,
            status: refund.status,
            reason: refund.reason,
            createdAt: refund.createdAt.toISOString()
          }
        });
      }

      // Create successful/pending refund record
      const successRefundData = {
        tenantId,
        paymentId,
        provider,
        amount: refundAmount,
        currency: payment.currency,
        status: providerRefundResult.status,
        reason: reason || 'Customer request',
        metadata: serializeJson({
          createdViaAPI: true,
          originalPaymentAmount: Number(payment.amount * 100),
          providerMetadata: providerRefundResult.metadata
        }),
        ...(providerRefundResult.providerRefundId && { providerRefundId: providerRefundResult.providerRefundId })
      };

      const refund = await prisma.refund.create({
        data: successRefundData as any
      });

      // Log refund creation event
      await prisma.paymentEvent.create({
        data: {
          tenantId,
          provider,
          eventType: providerRefundResult.status === 'succeeded' ? 'refund.succeeded' : 'refund.created',
          eventId: `refund_${provider}_${refund.id}_${Date.now()}`,
          paymentId,
          refundId: refund.id,
          payload: serializeJson({
            refundId: refund.id,
            providerRefundId: providerRefundResult.providerRefundId,
            amount: refundAmount,
            status: providerRefundResult.status,
            providerResult: providerRefundResult
          }),
          processed: true
        }
      });

      // Prepare response
      const response = {
        id: refund.id,
        paymentId: refund.paymentId,
        provider: refund.provider,
        providerRefundId: refund.providerRefundId,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        createdAt: refund.createdAt.toISOString()
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

      console.log(`[REFUNDS] Created refund ${refund.id} for payment ${paymentId}: ${refundAmount/100} ${payment.currency} (${providerRefundResult.status})`);

      res.status(201).json(response);

    } catch (providerError: any) {
      console.error('[REFUNDS] Provider error during refund creation:', providerError);

      // Return 502 for provider communication errors
      res.status(502).json({
        error: 'Provider communication error',
        code: 'PROVIDER_ERROR',
        message: 'Failed to communicate with payment provider'
      });
    }

  } catch (error) {
    console.error('[REFUNDS] Error creating refund:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'REFUND_CREATION_FAILED'
    });
  }
  return undefined;
});

/**
 * GET /refunds/:id
 * Get refund details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing x-tenant-id header',
        code: 'MISSING_TENANT_ID'
      });
    }

    const prisma = tenantPrisma(tenantId);

    const refund = await prisma.refund.findFirst({
      where: {
        id,
        tenantId
      } as any,
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true
          }
        }
      }
    }) as any;

    if (!refund) {
      return res.status(404).json({
        error: 'Refund not found',
        code: 'REFUND_NOT_FOUND'
      });
    }

    res.json({
      id: refund.id,
      paymentId: refund.paymentId,
      provider: refund.provider,
      providerRefundId: refund.providerRefundId,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
      createdAt: refund.createdAt.toISOString(),
      updatedAt: refund.updatedAt.toISOString(),
      payment: refund.payment
    });

  } catch (error) {
    console.error('[REFUNDS] Error fetching refund:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'REFUND_FETCH_FAILED'
    });
  }
  return undefined;
});

export default router;
