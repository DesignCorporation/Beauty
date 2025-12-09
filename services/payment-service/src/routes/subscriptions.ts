import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { tenantPrisma } from '../prisma';
import { tenantAuth, requireRole } from '../middleware/tenantAuth';
import { assertAuth } from '@beauty/shared';
import {
  BILLING_CONSTANTS,
  calculateBillingAmounts,
  deriveBillingFromRecord,
  evaluateLifecycle,
  formatPricingForResponse,
  getBillableStaffCount,
  mapPricingToUpdate
} from '../utils/billing';

const router: Router = Router();

// 🔐 Инициализация Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const adminPrisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SUCCESS_URL =
  process.env.BILLING_SUCCESS_URL || 'https://dev-admin.beauty.designcorp.eu/billing/success';
const DEFAULT_CANCEL_URL =
  process.env.BILLING_CANCEL_URL || 'https://dev-admin.beauty.designcorp.eu/billing/cancel';

// 📦 Repository helper для tenant-isolated subscription
const getSubscriptionRepository = (tenantId: string) => (tenantPrisma(tenantId) as any).subscription;

// 📝 Validation schemas
const CreateSubscriptionSchema = z.object({
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  staffSeats: z.number().int().min(0).max(200).optional(),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional()
});
const StartTrialSchema = z.object({
  staffSeats: z.number().int().min(0).max(200).optional(),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional()
});

const fetchSubscriptionWithRelations = (tenantId: string) =>
  getSubscriptionRepository(tenantId).findFirst({
    where: {
      status: {
        in: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELED']
      }
    },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

// 💳 GET /subscriptions/me - получить активную подписку
router.get('/me', tenantAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'Invalid authentication'
      });
    }

    console.log(`🔍 Getting subscription for tenant: ${tenantId}`);

    const repository = getSubscriptionRepository(tenantId);
    const reload = async () => fetchSubscriptionWithRelations(tenantId);

    let subscription = await reload();
    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        status: 'NO_SUBSCRIPTION',
        message: 'No active subscription found',
        recentPayments: []
      });
    }

    let lifecycleSnapshot = evaluateLifecycle(subscription);
    let stabilized = false;

    while (!stabilized) {
      stabilized = true;

      const staffSeatCount = await getBillableStaffCount(tenantId);
      if (
        subscription.staffSeatCount !== staffSeatCount ||
        subscription.currency !== 'PLN'
      ) {
        const pricing = calculateBillingAmounts(staffSeatCount);
        await repository.updateMany({
          where: { tenantId },
          data: mapPricingToUpdate(pricing)
        });
        subscription = await reload();
        lifecycleSnapshot = evaluateLifecycle(subscription);
        stabilized = false;
        continue;
      }

      if (lifecycleSnapshot.updates && Object.keys(lifecycleSnapshot.updates).length > 0) {
        await repository.updateMany({
          where: { tenantId },
          data: lifecycleSnapshot.updates
        });
        subscription = await reload();
        lifecycleSnapshot = evaluateLifecycle(subscription);
        stabilized = false;
      }
    }

    const pricingPayload = formatPricingForResponse(deriveBillingFromRecord(subscription));

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: lifecycleSnapshot.status,
        currency: subscription.currency,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
        billing: pricingPayload,
        lifecycle: {
          warningActive: lifecycleSnapshot.warningActive,
          warningStartsAt: lifecycleSnapshot.warningStartsAt,
          daysUntilDue: lifecycleSnapshot.daysUntilDue,
          limitedAccess: lifecycleSnapshot.limitedAccess,
          blocked: lifecycleSnapshot.blocked,
          pastDueSince: lifecycleSnapshot.pastDueSince,
          gracePeriodEndsAt: lifecycleSnapshot.gracePeriodEndsAt,
          nextChargeDate: lifecycleSnapshot.nextChargeDate
        }
      },
      pricing: pricingPayload,
      recentPayments: subscription.payments
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch subscription'
    });
  }
  return undefined;
});

// 💳 POST /subscriptions/start-trial - автозапуск триала без Stripe Checkout
router.post('/start-trial', tenantAuth, requireRole(['SALON_OWNER', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const auth = assertAuth(req);
    const tenantId = req.tenantId ?? auth.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Authentication required',
        message: 'Invalid user or tenant'
      });
    }

    const validationResult = StartTrialSchema.safeParse(req.body || {});
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const { staffSeats, plan } = validationResult.data;
    const repository = getSubscriptionRepository(tenantId);

    const existing = await repository.findFirst({
      where: {
        status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'UNPAID'] }
      }
    });

    if (existing) {
      return res.json({
        success: true,
        subscription: existing,
        message: 'Subscription already exists'
      });
    }

    const staffSeatCount = await getBillableStaffCount(tenantId, staffSeats);
    const pricing = calculateBillingAmounts(staffSeatCount);

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + BILLING_CONSTANTS.trialPeriodDays * DAY_MS);
    const pastDueSince = new Date(trialEndsAt.getTime() + BILLING_CONSTANTS.pastDueAfterDays * DAY_MS);
    const gracePeriodEndsAt = new Date(
      pastDueSince.getTime() + BILLING_CONSTANTS.blockAfterAdditionalDays * DAY_MS
    );

    const subscription = await repository.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan: plan ?? 'BASIC',
        status: 'TRIAL',
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        pastDueSince,
        gracePeriodEndsAt,
        ...mapPricingToUpdate(pricing)
      },
      update: {
        plan: plan ?? 'BASIC',
        status: 'TRIAL',
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        pastDueSince,
        gracePeriodEndsAt,
        ...mapPricingToUpdate(pricing)
      }
    });

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        billing: formatPricingForResponse(pricing)
      }
    });
  } catch (error) {
    console.error('Error starting trial:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to start trial'
    });
  }
  return undefined;
});

// 💳 POST /create-subscription - создать Stripe Checkout Session
router.post('/create-subscription', tenantAuth, requireRole(['SALON_OWNER', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const auth = assertAuth(req);
    const tenantId = req.tenantId ?? auth.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Authentication required',
        message: 'Invalid user or tenant'
      });
    }

    const validationResult = CreateSubscriptionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const { successUrl, cancelUrl, staffSeats } = validationResult.data;

    console.log(`💳 Creating subscription for tenant ${tenantId}`);

    const repository = getSubscriptionRepository(tenantId);

    const existingSubscription = await repository.findFirst({
      where: {
        status: {
          in: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'UNPAID']
        }
      }
    });

    if (existingSubscription && existingSubscription.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Subscription exists',
        message: 'Active subscription already exists'
      });
    }

    const staffSeatCount = await getBillableStaffCount(tenantId, staffSeats);
    const pricing = calculateBillingAmounts(staffSeatCount);

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + BILLING_CONSTANTS.trialPeriodDays * DAY_MS);
    const pastDueSince = new Date(trialEndsAt.getTime() + BILLING_CONSTANTS.pastDueAfterDays * DAY_MS);
    const gracePeriodEndsAt = new Date(
      pastDueSince.getTime() + BILLING_CONSTANTS.blockAfterAdditionalDays * DAY_MS
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'pln',
          product_data: {
            name: 'Beauty Platform Subscription',
            description: `Салон + ${pricing.staffSeatCount} сотрудников`
          },
          unit_amount: pricing.grossAmountCents,
          recurring: { interval: 'month' }
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl || DEFAULT_SUCCESS_URL,
      cancel_url: cancelUrl || DEFAULT_CANCEL_URL,
      customer_email: auth.email,
      metadata: {
        tenantId,
        userId: auth.userId ?? '',
        staffSeatCount: pricing.staffSeatCount.toString(),
        netAmountCents: pricing.netAmountCents.toString(),
        grossAmountCents: pricing.grossAmountCents.toString(),
        discountPercent: pricing.discountPercent.toString()
      },
      subscription_data: {
        trial_period_days: BILLING_CONSTANTS.trialPeriodDays,
        metadata: {
          tenantId,
          staffSeatCount: pricing.staffSeatCount.toString(),
          basePriceCents: pricing.basePriceCents.toString(),
          staffSeatPriceCents: pricing.staffSeatPriceCents.toString(),
          netAmountCents: pricing.netAmountCents.toString(),
          grossAmountCents: pricing.grossAmountCents.toString(),
          discountPercent: pricing.discountPercent.toString()
        }
      }
    } as any);

    const subscription = await repository.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan: 'BASIC',
        status: 'TRIAL',
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        pastDueSince,
        gracePeriodEndsAt,
        ...mapPricingToUpdate(pricing)
      },
      update: {
        status: 'TRIAL',
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        pastDueSince,
        gracePeriodEndsAt,
        ...mapPricingToUpdate(pricing)
      }
    });

    console.log(`✅ Checkout session created: ${session.id} for tenant ${tenantId}`);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      checkoutUrl: session.url,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        billing: formatPricingForResponse(pricing)
      }
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create subscription'
    });
  }
  return undefined;
});

router.get('/admin/overview', tenantAuth, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);

    const where = statusFilter && ['TRIAL', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELED'].includes(statusFilter)
      ? { status: statusFilter as SubscriptionStatus }
      : undefined;

    const records = await adminPrisma.subscription.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            salonNumber: true,
            status: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: limit
    });

    const items = records.map(record => {
      const lifecycle = evaluateLifecycle(record);
      const billing = formatPricingForResponse(deriveBillingFromRecord(record));

      return {
        id: record.id,
        tenant: record.tenant,
        status: lifecycle.status,
        updatedAt: record.updatedAt,
        billing,
        lifecycle: {
          warningActive: lifecycle.warningActive,
          limitedAccess: lifecycle.limitedAccess,
          blocked: lifecycle.blocked,
          pastDueSince: lifecycle.pastDueSince,
          gracePeriodEndsAt: lifecycle.gracePeriodEndsAt,
          nextChargeDate: lifecycle.nextChargeDate
        }
      };
    });

    res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Admin subscription overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to load subscriptions overview'
    });
  }
  return undefined;
});

// 💳 GET /subscriptions/current - получить текущую подписку (OWNER только)
router.get('/current', tenantAuth, async (req: Request, res: Response) => {
  try {
    const auth = assertAuth(req);
    const tenantId = req.tenantId ?? auth.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Authentication required',
        message: 'Invalid user or tenant'
      });
    }

    // Проверяем, что пользователь это OWNER (не STAFF)
    if (!auth.role || !['SALON_OWNER', 'SUPER_ADMIN'].includes(auth.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only salon owner can view subscription'
      });
    }

    const repository = getSubscriptionRepository(tenantId);
    const subscription = await repository.findFirst({
      where: {
        status: {
          in: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELED']
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'NO_SUBSCRIPTION',
        message: 'No active subscription found for this salon'
      });
    }

    // Получаем invoices для этой подписки
    const invoices = await (tenantPrisma(tenantId) as any).invoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Фактическое число платных сотрудников (через crm-api)
    let seats = subscription.staffSeatCount;
    try {
      seats = await getBillableStaffCount(tenantId);
    } catch (countError) {
      console.warn('Failed to sync billable staff count, fallback to stored value', countError);
    }

    // Расчет pricing
    const basePrice = subscription.basePriceCents / 100;
    const seatPrice = subscription.staffSeatPriceCents / 100;
    const discountPercent = subscription.discountPercent;

    const subtotal = basePrice + (seats * seatPrice);
    const discountAmount = subtotal * (discountPercent / 100);
    const netAmount = subtotal - discountAmount;
    const vatRate = subscription.vatRateBps / 10000; // Convert basis points to percentage
    const vat = netAmount * vatRate;
    const total = netAmount + vat;

    res.json({
      success: true,
      data: {
        status: subscription.status,
        plan: subscription.plan,
        currency: subscription.currency,
        pricing: {
          basePrice: basePrice.toFixed(2),
          seatPrice: seatPrice.toFixed(2),
          seats,
          discountPercent,
          discountAmount: discountAmount.toFixed(2),
          subtotal: subtotal.toFixed(2),
          vat: vat.toFixed(2),
          total: total.toFixed(2)
        },
        dates: {
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          nextBillingDate: subscription.currentPeriodEnd
        },
        invoices: invoices.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.createdAt,
          amount: inv.totalAmount,
          status: inv.status,
          pdfUrl: inv.pdfUrl
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch subscription'
    });
  }
  return undefined;
});

// 📄 GET /subscriptions/invoices/:id/pdf - редирект на PDF (OWNER только)
router.get('/invoices/:id/pdf', tenantAuth, async (req: Request, res: Response) => {
  try {
    const auth = assertAuth(req);
    const tenantId = req.tenantId ?? auth.tenantId;
    const { id } = req.params;

    if (!tenantId || !id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Missing tenantId or invoice ID'
      });
    }

    // Проверяем, что пользователь это OWNER
    if (!auth.role || !['SALON_OWNER', 'SUPER_ADMIN'].includes(auth.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only salon owner can download invoices'
      });
    }

    // Получаем invoice из БД
    const invoice = await (tenantPrisma(tenantId) as any).invoice.findFirst({
      where: {
        id,
        tenantId // Verify tenant isolation
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Invoice not found'
      });
    }

    // Если есть локальный PDF URL - редирект туда
    if (invoice.pdfUrl) {
      return res.redirect(302, invoice.pdfUrl);
    }

    // Если есть Stripe invoice ID в метаданных - запросить у Stripe
    // (опционально, по ТЗ это уже должно быть сохранено в pdfUrl)
    return res.status(404).json({
      success: false,
      error: 'PDF not available',
      message: 'Invoice PDF is not yet generated'
    });
  } catch (error) {
    console.error('Error fetching invoice PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch invoice PDF'
    });
  }
  return undefined;
});

// 🔧 PUT /admin/subscriptions/:tenantId - обновить скидку и цены (SUPER_ADMIN только)
const UpdateSubscriptionSchema = z.object({
  discountPercent: z.number().int().min(0).max(100).optional(),
  basePriceCents: z.number().int().min(0).optional(),
  staffSeatPriceCents: z.number().int().min(0).optional()
});

router.put('/admin/subscriptions/:tenantId', tenantAuth, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Missing tenantId'
      });
    }

    // Валидируем request body
    const validationResult = UpdateSubscriptionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const { discountPercent, basePriceCents, staffSeatPriceCents } = validationResult.data;
    const repository = getSubscriptionRepository(tenantId);

    // Получаем текущую подписку
    const subscription = await repository.findFirst({
      where: {
        status: {
          in: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'UNPAID']
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'No active subscription found for this tenant'
      });
    }

    // Подготавливаем обновления
    const updateData: any = {};
    if (discountPercent !== undefined) {
      updateData.discountPercent = discountPercent;
    }
    if (basePriceCents !== undefined) {
      updateData.basePriceCents = basePriceCents;
    }
    if (staffSeatPriceCents !== undefined) {
      updateData.staffSeatPriceCents = staffSeatPriceCents;
    }

    // Обновляем в БД
    const updatedSubscription = await repository.update({
      where: { tenantId },
      data: updateData
    });

    // Опционально синхронизируем со Stripe (если нужно)
    // TODO: Если нужна синхронизация с Stripe - добавить здесь
    if (subscription.stripeSubscriptionId && discountPercent !== undefined) {
      console.log(`📌 Note: Stripe subscription ${subscription.stripeSubscriptionId} discount will be applied on next billing cycle`);
    }

    // Возвращаем актуализированную подписку
    const pricing = calculateBillingAmounts(updatedSubscription.staffSeatCount);

    res.json({
      success: true,
      data: {
        id: updatedSubscription.id,
        tenantId: updatedSubscription.tenantId,
        plan: updatedSubscription.plan,
        status: updatedSubscription.status,
        currency: updatedSubscription.currency,
        pricing: formatPricingForResponse(pricing),
        discountPercent: updatedSubscription.discountPercent,
        basePriceCents: updatedSubscription.basePriceCents,
        staffSeatPriceCents: updatedSubscription.staffSeatPriceCents,
        updatedAt: updatedSubscription.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update subscription'
    });
  }
  return undefined;
});

export default router;
