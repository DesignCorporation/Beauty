import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { tenantPrisma } from '../prisma';
import { sendPaymentReceiptEmail } from '../utils/paymentEmailSender';
import {
  emitPaymentCompleted,
  emitPaymentFailed,
  emitRefundProcessed
} from '../emitters';
import {
  BILLING_CONSTANTS,
  BillingComputation,
  calculateBillingAmounts,
  computeLifecycleAnchors,
  evaluateLifecycle,
  getBillableStaffCount,
  mapPricingToUpdate
} from '../utils/billing';

const router: Router = Router();

type SubscriptionRepository = {
  upsert: (...args: any[]) => Promise<any>;
  updateMany: (...args: any[]) => Promise<any>;
  findFirst?: (...args: any[]) => Promise<any>;
};

const getSubscriptionRepository = (prismaClient: unknown): SubscriptionRepository | null => {
  const repo = (prismaClient as { subscription?: SubscriptionRepository }).subscription;
  if (!repo) {
    console.warn('⚠️ Prisma subscription model is not available on tenantPrisma client.');
    return null;
  }
  return repo;
};

const serializeStripeObject = <T>(data: T): Prisma.JsonValue => {
  try {
    return JSON.parse(JSON.stringify(data)) as Prisma.JsonValue;
  } catch {
    return JSON.stringify(data) as unknown as Prisma.JsonValue;
  }
};

// 🔐 Инициализация Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const mapStripeSubscriptionStatus = (
  status?: Stripe.Subscription.Status | null
): SubscriptionStatus => {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'canceled':
      return 'CANCELED';
    case 'unpaid':
      return 'UNPAID';
    case 'past_due':
    case 'incomplete':
    case 'incomplete_expired':
      return 'PAST_DUE';
    default:
      return 'TRIAL';
  }
};

const parseMetadataNumber = (
  metadata: Stripe.Metadata | null | undefined,
  key: string
): number | null => {
  if (!metadata) return null;
  const raw = metadata[key];
  if (typeof raw === 'undefined' || raw === null) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const billingFromMetadata = (metadata: Stripe.Metadata | null | undefined): BillingComputation | null => {
  const staffSeatCount = parseMetadataNumber(metadata, 'staffSeatCount');
  if (staffSeatCount === null) return null;

  const basePriceCents = parseMetadataNumber(metadata, 'basePriceCents') ?? BILLING_CONSTANTS.basePriceCents;
  const staffSeatPriceCents = parseMetadataNumber(metadata, 'staffSeatPriceCents') ?? BILLING_CONSTANTS.staffSeatPriceCents;
  const discountPercent = parseMetadataNumber(metadata, 'discountPercent') ?? 0;
  const netAmountCents = parseMetadataNumber(metadata, 'netAmountCents');
  const grossAmountCents = parseMetadataNumber(metadata, 'grossAmountCents');

  const computedNet = netAmountCents ?? (staffSeatCount * staffSeatPriceCents + basePriceCents);
  const computedGross = grossAmountCents ?? Math.round(
    computedNet * (10000 + BILLING_CONSTANTS.vatRateBps) / 10000
  );

  return {
    basePriceCents,
    staffSeatPriceCents,
    staffSeatCount,
    discountPercent,
    discountEndsAt: BILLING_CONSTANTS.promotionPercent > 0 ? BILLING_CONSTANTS.promotionEndsAt : null,
    netAmountCents: computedNet,
    grossAmountCents: computedGross,
    vatRateBps: BILLING_CONSTANTS.vatRateBps
  };
};

// 🎣 POST /webhooks/stripe - обработка Stripe событий (RAW BODY!)
// ВАЖНО: Этот endpoint должен быть смонтирован с express.raw() middleware
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    // 🔐 Валидация Stripe signature (КРИТИЧНО!)
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log(`✅ Stripe webhook verified: ${event.type}`);
  } catch (err) {
    console.error(`❌ Webhook signature verification failed:`, err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  try {
    // 🎯 Обработка различных типов событий
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      // 🔄 Refund events (Stage 5)
      case 'charge.refunded':
        await handleChargeRefunded(event);
        break;

      case 'refund.created':
        await handleRefundCreated(event);
        break;

      case 'refund.updated':
        await handleRefundUpdated(event);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`🔔 Unhandled Stripe event type: ${event.type}`);
    }

    // Всегда возвращаем 200 для Stripe
    res.status(200).json({ received: true });

  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
  return undefined;
});

// 🎣 POST /webhooks/paypal - DISABLED FOR SECURITY (Issue #TASK-002)
// ⚠️  PayPal webhook signature verification is NOT implemented
// This route is disabled to prevent exploitation of unsigned webhooks
// TODO: Implement PayPal signature verification using validateWebhookSignature SDK
// See: https://developer.paypal.com/docs/api-basics/notifications/webhooks/verify-webhook/
//
// Temporary route returns 501 Not Implemented
router.post('/paypal', (_req: Request, res: Response) => {
  console.warn('⚠️ PayPal webhook endpoint is disabled for security - signature verification not implemented');
  res.status(501).json({
    error: 'Not Implemented',
    message: 'PayPal webhook signature verification is not yet implemented. This endpoint is disabled for security.',
    code: 'PAYPAL_WEBHOOKS_DISABLED'
  });
  return undefined;
});

// 📋 Обработчики событий

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`💳 Checkout completed: ${session.id}`);

  const tenantId = session.metadata?.tenantId;
  const plan = session.metadata?.plan;

  if (!tenantId) {
    console.error('❌ No tenantId in checkout session metadata');
    return;
  }

  try {
    const prisma = tenantPrisma(tenantId);
    const subscriptionRepo = getSubscriptionRepository(prisma);

    if (!subscriptionRepo) {
      return;
    }

    // Получаем подписку от Stripe
    if (session.subscription && subscriptionRepo) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const normalizedStatus = mapStripeSubscriptionStatus(subscription.status);

      await subscriptionRepo.upsert({
        where: { tenantId },
        create: {
          tenantId,
          plan: plan || 'BASIC',
          status: normalizedStatus,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        update: {
          status: normalizedStatus,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      });

      console.log(`✅ Subscription activated for tenant ${tenantId}`);
    }
  } catch (error) {
    console.error('❌ Error handling checkout completed:', error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`🆕 Subscription created: ${subscription.id}`);

  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    console.error('❌ No tenantId in subscription metadata');
    return;
  }

  try {
    const prisma = tenantPrisma(tenantId);
    const subscriptionRepo = getSubscriptionRepository(prisma);

    if (!subscriptionRepo) {
      return;
    }

    const normalizedStatus = mapStripeSubscriptionStatus(subscription.status);
    const periodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : new Date();
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;
    const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
    const anchors = computeLifecycleAnchors(periodEnd ?? trialEndsAt);
    const metadataPricing = billingFromMetadata(subscription.metadata);
    const pricing =
      metadataPricing ?? calculateBillingAmounts(await getBillableStaffCount(tenantId));

    await subscriptionRepo.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan: 'BASIC',
        status: normalizedStatus,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEndsAt,
        pastDueSince: anchors.pastDueSince,
        gracePeriodEndsAt: anchors.gracePeriodEndsAt,
        ...mapPricingToUpdate(pricing)
      },
      update: {
        status: normalizedStatus,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEndsAt,
        pastDueSince: anchors.pastDueSince,
        gracePeriodEndsAt: anchors.gracePeriodEndsAt,
        ...mapPricingToUpdate(pricing)
      }
    });

    const latest = await subscriptionRepo.findFirst?.({ where: { tenantId } });
    if (latest) {
      const lifecycle = evaluateLifecycle(latest);
      if (lifecycle.updates && Object.keys(lifecycle.updates).length > 0) {
        await subscriptionRepo.updateMany({
          where: { tenantId },
          data: lifecycle.updates
        });
      }
    }

    console.log(`✅ Subscription record created for tenant ${tenantId}`);
  } catch (error) {
    console.error('❌ Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`🔄 Subscription updated: ${subscription.id}`);

  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    console.error('❌ No tenantId in subscription metadata');
    return;
  }

  try {
    const prisma = tenantPrisma(tenantId);
    const subscriptionRepo = getSubscriptionRepository(prisma);

    if (!subscriptionRepo) {
      return;
    }

    const status = mapStripeSubscriptionStatus(subscription.status);
    const periodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : new Date();
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;
    const anchors = computeLifecycleAnchors(periodEnd);
    const metadataPricing = billingFromMetadata(subscription.metadata);
    const pricing =
      metadataPricing ?? calculateBillingAmounts(await getBillableStaffCount(tenantId));

    await subscriptionRepo.updateMany({
      where: {
        tenantId,
        stripeSubscriptionId: subscription.id
      },
      data: {
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        pastDueSince: anchors.pastDueSince,
        gracePeriodEndsAt: anchors.gracePeriodEndsAt,
        ...mapPricingToUpdate(pricing)
      }
    });

    const latest = await subscriptionRepo.findFirst?.({ where: { tenantId } });
    if (latest) {
      const lifecycle = evaluateLifecycle(latest);
      if (lifecycle.updates && Object.keys(lifecycle.updates).length > 0) {
        await subscriptionRepo.updateMany({
          where: { tenantId },
          data: lifecycle.updates
        });
      }
    }

    console.log(`✅ Subscription updated for tenant ${tenantId}, status: ${status}`);
  } catch (error) {
    console.error('❌ Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`🗑️ Subscription deleted: ${subscription.id}`);

  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    console.error('❌ No tenantId in subscription metadata');
    return;
  }

  try {
    const prisma = tenantPrisma(tenantId);

    const subscriptionRepo = getSubscriptionRepository(prisma);

    if (!subscriptionRepo) {
      return;
    }

    await subscriptionRepo.updateMany({
      where: {
        tenantId,
        stripeSubscriptionId: subscription.id
      },
      data: {
        status: 'CANCELED',
      }
    });

    console.log(`✅ Subscription cancelled for tenant ${tenantId}`);
  } catch (error) {
    console.error('❌ Error handling subscription deleted:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`💰 Invoice payment succeeded: ${invoice.id}`);

  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const tenantId = subscription.metadata?.tenantId;

    if (!tenantId) {
      console.error('❌ No tenantId in subscription metadata');
      return;
    }

    const prisma = tenantPrisma(tenantId);

    // Записываем успешный платеж
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        provider: 'stripe',
        providerId: invoice.id,
        amount: (invoice.amount_paid || 0) / 100, // Convert from cents
        currency: invoice.currency?.toUpperCase() || 'EUR',
        status: 'SUCCEEDED',
        metadata: {
          invoiceId: invoice.id,
          subscriptionId: subscription.id,
          periodStart: subscription.current_period_start,
          periodEnd: subscription.current_period_end,
        }
      }
    });

    console.log(`✅ Payment recorded for tenant ${tenantId}, amount: ${invoice.amount_paid}`);

    // 🔔 Отправляем WebSocket событие завершения платежа (асинхронно)
    try {
      const customerName = invoice.customer_name || 'Клиент';
      await emitPaymentCompleted({
        paymentId: payment.id,
        amount: (invoice.amount_paid || 0) / 100,
        currency: invoice.currency?.toUpperCase() || 'EUR',
        tenantId,
        clientName: customerName
      });
    } catch (error) {
      console.error('[WEBHOOKS] Failed to emit paymentCompleted event:', error);
      // Не блокируем webhook если эмиссия не сработает
    }

    // 📧 Phase 2.2: Send Payment Receipt email to customer
    // Получаем email клиента из invoice или customer
    try {
      // Безопасное получение email из invoice.customer (может быть Customer | DeletedCustomer | string)
      let customerEmail = invoice.customer_email || null;
      if (!customerEmail && typeof invoice.customer === 'object' && invoice.customer && 'email' in invoice.customer) {
        customerEmail = invoice.customer.email;
      }

      if (customerEmail) {
        console.log(`[PAYMENT RECEIPT] Sending receipt email to ${customerEmail}...`);

        // Получаем tenant name для сообщения
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true }
        });

        // Форматируем данные для Payment Receipt
        const receiptData = {
          customerName: invoice.customer_name || 'Клиент',
          customerEmail,
          receiptNumber: invoice.number || 'N/A',
          transactionId: invoice.id,
          paymentDate: new Date(invoice.created * 1000).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          serviceName: subscription.metadata?.plan || 'Subscription',
          amount: Number(invoice.amount_paid) / 100, // Convert from cents
          currency: invoice.currency?.toUpperCase() || 'EUR',
          paymentMethod: 'stripe' as 'stripe',
          salonName: tenant?.name || 'Beauty Platform',
          notes: `Subscription period: ${new Date(subscription.current_period_start * 1000).toLocaleDateString('ru-RU')} - ${new Date(subscription.current_period_end * 1000).toLocaleDateString('ru-RU')}`
        };

        // Отправляем email через Notification Service (async, не блокируем webhook response)
        sendPaymentReceiptEmail(customerEmail, receiptData).catch(err => {
          console.error('[PAYMENT RECEIPT] Error sending receipt email:', err);
        });

        console.log(`[PAYMENT RECEIPT] ✅ Payment Receipt email queued for ${customerEmail}`);
      } else {
        console.log('[PAYMENT RECEIPT] ⚠️ No customer email found, skipping receipt email');
      }
    } catch (emailError) {
      console.error('[PAYMENT RECEIPT] Error preparing receipt email:', emailError);
      // Не падаем если email не отправился - webhook должен вернуть 200
    }

    const subscriptionRepo = getSubscriptionRepository(prisma);
    if (subscriptionRepo) {
      const periodStart = subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : new Date();
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null;
      const anchors = computeLifecycleAnchors(periodEnd);

      await subscriptionRepo.updateMany({
        where: {
          tenantId,
          stripeSubscriptionId: subscription.id
        },
        data: {
          status: 'ACTIVE',
          lastBillingDate: new Date(),
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          pastDueSince: anchors.pastDueSince,
          gracePeriodEndsAt: anchors.gracePeriodEndsAt
        }
      });

      const latest = await subscriptionRepo.findFirst?.({ where: { tenantId } });
      if (latest) {
        const lifecycle = evaluateLifecycle(latest);
        if (lifecycle.updates && Object.keys(lifecycle.updates).length > 0) {
          await subscriptionRepo.updateMany({
            where: { tenantId },
            data: lifecycle.updates
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`❌ Invoice payment failed: ${invoice.id}`);

  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const tenantId = subscription.metadata?.tenantId;

    if (!tenantId) {
      console.error('❌ No tenantId in subscription metadata');
      return;
    }

    const prisma = tenantPrisma(tenantId);

    // Записываем неудачный платеж
    const failedPayment = await prisma.payment.create({
      data: {
        tenantId,
        provider: 'stripe',
        providerId: invoice.id,
        amount: (invoice.amount_due || 0) / 100, // Convert from cents
        currency: invoice.currency?.toUpperCase() || 'EUR',
        status: 'FAILED',
        metadata: {
          invoiceId: invoice.id,
          subscriptionId: subscription.id,
          failureReason: 'payment_failed',
        }
      }
    });

    // 🔔 Отправляем WebSocket событие ошибки платежа (асинхронно)
    try {
      const customerName = invoice.customer_name || 'Клиент';
      const failureReason = invoice.attempted ? 'Платеж отклонен. Проверьте данные карты' : 'Платеж не был выполнен';

      await emitPaymentFailed({
        paymentId: failedPayment.id,
        amount: (invoice.amount_due || 0) / 100,
        currency: invoice.currency?.toUpperCase() || 'EUR',
        reason: failureReason,
        tenantId,
        clientName: customerName
      });
    } catch (error) {
      console.error('[WEBHOOKS] Failed to emit paymentFailed event:', error);
      // Не блокируем webhook если эмиссия не сработает
    }

    // Обновляем статус подписки
    const subscriptionRepo = getSubscriptionRepository(prisma);

    if (subscriptionRepo) {
      const failureStatus: SubscriptionStatus =
        invoice.status === 'uncollectible' ? 'UNPAID' : 'PAST_DUE';
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null;
      const anchors = computeLifecycleAnchors(periodEnd);

      await subscriptionRepo.updateMany({
        where: {
          tenantId,
          stripeSubscriptionId: subscription.id
        },
        data: {
          status: failureStatus,
          pastDueSince: anchors.pastDueSince,
          gracePeriodEndsAt: anchors.gracePeriodEndsAt
        }
      });

      const latest = await subscriptionRepo.findFirst?.({ where: { tenantId } });
      if (latest) {
        const lifecycle = evaluateLifecycle(latest);
        if (lifecycle.updates && Object.keys(lifecycle.updates).length > 0) {
          await subscriptionRepo.updateMany({
            where: { tenantId },
            data: lifecycle.updates
          });
        }
      }
    }

    console.log(`⚠️ Payment failure recorded for tenant ${tenantId}`);
  } catch (error) {
    console.error('❌ Error handling invoice payment failed:', error);
  }
}

// ========================================
// 🔄 REFUND EVENT HANDLERS (Stage 5)
// ========================================

async function handleChargeRefunded(event: Stripe.Event) {
  console.log(`🔄 Charge refunded: ${event.id}`);

  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = charge.payment_intent as string;

  if (!paymentIntentId) {
    console.error('❌ No payment_intent in charge.refunded event');
    return;
  }

  // Process each refund in the charge
  for (const refund of charge.refunds?.data || []) {
    await processStripeRefundEvent(event.id, 'charge.refunded', refund, paymentIntentId);
  }
}

async function handleRefundCreated(event: Stripe.Event) {
  console.log(`🔄 Refund created: ${event.id}`);

  const refund = event.data.object as Stripe.Refund;
  const paymentIntentId = refund.payment_intent as string;

  await processStripeRefundEvent(event.id, 'refund.created', refund, paymentIntentId);
}

async function handleRefundUpdated(event: Stripe.Event) {
  console.log(`🔄 Refund updated: ${event.id}`);

  const refund = event.data.object as Stripe.Refund;
  const paymentIntentId = refund.payment_intent as string;

  await processStripeRefundEvent(event.id, 'refund.updated', refund, paymentIntentId);
}

async function processStripeRefundEvent(
  eventId: string,
  eventType: string,
  refund: Stripe.Refund,
  paymentIntentId: string
) {
  try {
    // Find payment across all tenants (global lookup)
    const { PrismaClient } = require('@prisma/client');
    const globalPrisma = new PrismaClient();

    const payment = await globalPrisma.payment.findFirst({
      where: {
        stripePaymentIntentId: paymentIntentId
      }
    });

    await globalPrisma.$disconnect();

    if (!payment) {
      console.error(`❌ Payment not found for payment_intent: ${paymentIntentId}`);
      return;
    }

    // Use tenant-specific Prisma client
    const prisma = tenantPrisma(payment.tenantId);

    // Check for duplicate event (dedupe by eventId)
    const existingEvent = await prisma.paymentEvent.findFirst({
      where: { eventId }
    });

    if (existingEvent) {
      console.log(`⚠️ Duplicate Stripe refund event ${eventId}, skipping`);
      return;
    }

    // Find or create refund record
    let dbRefund = await prisma.refund.findFirst({
      where: {
        tenantId: payment.tenantId,
        providerRefundId: refund.id
      }
    });

    const refundStatus = mapStripeRefundStatus(refund.status as any);

    if (!dbRefund) {
      // Create new refund record from webhook
      dbRefund = await prisma.refund.create({
        data: {
          tenantId: payment.tenantId,
          paymentId: payment.id,
          provider: 'stripe',
          providerRefundId: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refundStatus,
          reason: refund.reason || 'stripe_webhook',
          metadata: {
            createdViaWebhook: true,
            stripeRefund: serializeStripeObject(refund)
          }
        }
      });
    } else {
      // Update existing refund status
      dbRefund = await prisma.refund.update({
        where: { id: dbRefund.id },
        data: {
          status: refundStatus,
          metadata: {
            ...(dbRefund.metadata as Prisma.JsonObject | null ?? {}),
            updatedViaWebhook: true,
            stripeRefund: serializeStripeObject(refund)
          }
        }
      });
    }

    // Create payment event (with unique eventId for deduplication)
    await prisma.paymentEvent.create({
      data: {
        tenantId: payment.tenantId,
        provider: 'stripe',
        eventType,
        eventId,
        paymentId: payment.id,
        refundId: dbRefund.id,
        payload: {
          eventId,
          eventType,
          refundId: refund.id,
          paymentIntentId,
          amount: refund.amount,
          status: refund.status,
          refundObject: refund as any
        },
        processed: true
      }
    });

    // Update payment aggregated status if fully refunded
    if (refundStatus === 'succeeded') {
      const totalRefunded = await prisma.refund.aggregate({
        where: {
          paymentId: payment.id,
          status: 'succeeded'
        },
        _sum: { amount: true }
      });

      const paymentAmountCents = Math.round(Number(payment.amount) * 100);
      const totalRefundedCents = totalRefunded._sum.amount || 0;

      if (totalRefundedCents >= paymentAmountCents) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' }
        });

        console.log(`✅ Payment ${payment.id} marked as fully REFUNDED`);
      }
    }

    console.log(`✅ Stripe refund event processed: ${eventType} for ${refund.id} (${refundStatus})`);

  } catch (error: any) {
    // Handle duplicate key error (eventId unique constraint)
    if (error.code === 'P2002' && error.meta?.target?.includes('eventId')) {
      console.log(`⚠️ Duplicate Stripe refund event ${eventId} (unique constraint), skipping`);
      return;
    }

    console.error(`❌ Error processing Stripe refund event ${eventId}:`, error);
  }
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
      console.warn(`⚠️ Unknown Stripe refund status: ${stripeStatus}, defaulting to pending`);
      return 'pending';
  }
}

// ========================================
// 🔄 PAYPAL REFUND EVENT HANDLERS (Stage 5)
// ========================================

async function handlePayPalCaptureRefunded(event: any) {
  console.log(`🔄 PayPal capture refunded: ${event.id}`);

  const resource = event.resource;
  const captureId = resource.links?.find((link: any) => link.rel === 'up')?.href?.split('/').pop();

  if (!captureId) {
    console.error('❌ Cannot extract capture ID from PayPal refund event');
    return;
  }

  await processPayPalRefundEvent(event.id, 'PAYMENT.CAPTURE.REFUNDED', resource, captureId);
}

async function handlePayPalCapturePending(event: any) {
  console.log(`🔄 PayPal capture pending: ${event.id}`);

  const resource = event.resource;
  const captureId = resource.id;

  // Only process if this is a refund-related pending event
  if (resource.status === 'PENDING' && resource.reason_code === 'REFUND') {
    await processPayPalRefundEvent(event.id, 'PAYMENT.CAPTURE.PENDING', resource, captureId);
  }
}

async function handlePayPalCaptureDenied(event: any) {
  console.log(`🔄 PayPal capture denied: ${event.id}`);

  const resource = event.resource;
  const captureId = resource.id;

  await processPayPalRefundEvent(event.id, 'PAYMENT.CAPTURE.DENIED', resource, captureId);
}

async function processPayPalRefundEvent(
  eventId: string,
  eventType: string,
  resource: any,
  captureId: string
) {
  try {
    // Find payment across all tenants (global lookup)
    const { PrismaClient } = require('@prisma/client');
    const globalPrisma = new PrismaClient();

    const payment = await globalPrisma.payment.findFirst({
      where: {
        OR: [
          { metadata: { path: ['captureId'], equals: captureId } },
          { metadata: { path: ['orderId'], equals: captureId } },
          { stripePaymentIntentId: captureId } // fallback for mixed metadata
        ]
      }
    });

    await globalPrisma.$disconnect();

    if (!payment) {
      console.error(`❌ Payment not found for PayPal capture: ${captureId}`);
      return;
    }

    // Use tenant-specific Prisma client
    const prisma = tenantPrisma(payment.tenantId);

    // Check for duplicate event (dedupe by eventId)
    const existingEvent = await prisma.paymentEvent.findFirst({
      where: { eventId }
    });

    if (existingEvent) {
      console.log(`⚠️ Duplicate PayPal refund event ${eventId}, skipping`);
      return;
    }

    const refundStatus = mapPayPalRefundStatus(eventType, resource.status);

    // Find existing refund or create new one
    let dbRefund = await prisma.refund.findFirst({
      where: {
        tenantId: payment.tenantId,
        paymentId: payment.id,
        provider: 'paypal'
      }
    });

    if (!dbRefund) {
      // Create new refund record from webhook
      dbRefund = await prisma.refund.create({
        data: {
          tenantId: payment.tenantId,
          paymentId: payment.id,
          provider: 'paypal',
          providerRefundId: resource.id || `paypal_${captureId}_${Date.now()}`,
          amount: resource.amount ? Math.round(parseFloat(resource.amount.value) * 100) : 0,
          currency: resource.amount?.currency_code?.toLowerCase() || 'eur',
          status: refundStatus,
          reason: resource.reason_code || 'paypal_webhook',
          metadata: {
            createdViaWebhook: true,
            paypalResource: resource,
            captureId
          }
        }
      });
    } else {
      // Update existing refund status
      dbRefund = await prisma.refund.update({
        where: { id: dbRefund.id },
        data: {
          status: refundStatus,
          metadata: {
            ...dbRefund.metadata as object,
            updatedViaWebhook: true,
            paypalResource: resource
          }
        }
      });
    }

    // Create payment event (with unique eventId for deduplication)
    await prisma.paymentEvent.create({
      data: {
        tenantId: payment.tenantId,
        provider: 'paypal',
        eventType,
        eventId,
        paymentId: payment.id,
        refundId: dbRefund.id,
        payload: {
          eventId,
          captureId,
          refundId: resource.id,
          status: resource.status,
          paypalEvent: resource
        },
        processed: true
      }
    });

    // Update payment aggregated status if fully refunded
    if (refundStatus === 'succeeded') {
      const totalRefunded = await prisma.refund.aggregate({
        where: {
          paymentId: payment.id,
          status: 'succeeded'
        },
        _sum: { amount: true }
      });

      const paymentAmountCents = Math.round(Number(payment.amount) * 100);
      const totalRefundedCents = totalRefunded._sum.amount || 0;

      if (totalRefundedCents >= paymentAmountCents) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' }
        });

        console.log(`✅ Payment ${payment.id} marked as fully REFUNDED`);
      }
    }

    console.log(`✅ PayPal refund event processed: ${eventType} for ${captureId} (${refundStatus})`);

  } catch (error: any) {
    // Handle duplicate key error (eventId unique constraint)
    if (error.code === 'P2002' && error.meta?.target?.includes('eventId')) {
      console.log(`⚠️ Duplicate PayPal refund event ${eventId} (unique constraint), skipping`);
      return;
    }

    console.error(`❌ Error processing PayPal refund event ${eventId}:`, error);
  }
}

function mapPayPalRefundStatus(eventType: string, resourceStatus?: string): 'pending' | 'succeeded' | 'failed' {
  switch (eventType) {
    case 'PAYMENT.CAPTURE.REFUNDED':
      return 'succeeded';
    case 'PAYMENT.CAPTURE.PENDING':
      return 'pending';
    case 'PAYMENT.CAPTURE.DENIED':
      return 'failed';
    default:
      // Fallback to resource status
      switch (resourceStatus?.toUpperCase()) {
        case 'COMPLETED':
          return 'succeeded';
        case 'PENDING':
          return 'pending';
        case 'DENIED':
        case 'FAILED':
          return 'failed';
        default:
          console.warn(`⚠️ Unknown PayPal refund status: ${eventType}/${resourceStatus}, defaulting to pending`);
          return 'pending';
      }
  }
}

export default router;
