import { EntityStatus, Subscription, SubscriptionStatus, UserRole } from '@prisma/client';
import axios from 'axios';
import { tenantPrisma } from '../prisma';

const DAY_MS = 24 * 60 * 60 * 1000;

const parseIntEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseDateEnv = (value: string | undefined): Date | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp);
};

export const BILLING_CONSTANTS = {
  basePriceCents: parseIntEnv(process.env.BILLING_BASE_PRICE_CENTS, 10000),
  staffSeatPriceCents: parseIntEnv(process.env.BILLING_STAFF_PRICE_CENTS, 2500),
  vatRateBps: parseIntEnv(process.env.BILLING_VAT_BPS, 2300),
  trialPeriodDays: parseIntEnv(process.env.BILLING_TRIAL_DAYS, 7),
  warningDaysBefore: parseIntEnv(process.env.BILLING_WARNING_DAYS, 3),
  pastDueAfterDays: parseIntEnv(process.env.BILLING_PAST_DUE_AFTER_DAYS, 3),
  blockAfterAdditionalDays: parseIntEnv(process.env.BILLING_BLOCK_AFTER_DAYS, 2),
  promotionPercent: parseIntEnv(process.env.BILLING_PROMO_PERCENT, 50),
  promotionEndsAt: parseDateEnv(process.env.BILLING_PROMO_ENDS_AT) ?? new Date('2025-12-31T22:59:59.000Z'),
};

const BILLABLE_ROLES: UserRole[] = [
  UserRole.MANAGER,
  UserRole.STAFF_MEMBER,
  UserRole.RECEPTIONIST,
  UserRole.ACCOUNTANT
];

const CRM_API_INTERNAL_URL = process.env.CRM_API_INTERNAL_URL || 'http://crm-api:6022';

export interface BillingComputation {
  basePriceCents: number;
  staffSeatPriceCents: number;
  staffSeatCount: number;
  discountPercent: number;
  discountEndsAt: Date | null;
  netAmountCents: number;
  grossAmountCents: number;
  vatRateBps: number;
}

export interface LifecycleSnapshot {
  status: SubscriptionStatus;
  warningActive: boolean;
  warningStartsAt: Date | null;
  daysUntilDue: number | null;
  limitedAccess: boolean;
  blocked: boolean;
  pastDueSince: Date | null;
  gracePeriodEndsAt: Date | null;
  nextChargeDate: Date | null;
  updates: Partial<Subscription>;
}

export async function getBillableStaffCount(tenantId: string, override?: number): Promise<number> {
  if (typeof override === 'number' && override >= 0) {
    return override;
  }
  try {
    const response = await axios.get<{ billableStaffCount: number }>(
      `${CRM_API_INTERNAL_URL}/internal/tenants/${tenantId}/billable-staff-count`,
      { timeout: 5000 }
    );
    const count = response.data?.billableStaffCount;
    if (Number.isFinite(count) && (count as number) >= 0) {
      return count as number;
    }
    return 0;
  } catch (error) {
    console.error('getBillableStaffCount (crm-api) failed, falling back to local count:', error);
    const client = tenantPrisma(tenantId);
    const count = await client.user.count({
      where: {
        tenantId,
        role: { in: BILLABLE_ROLES },
        status: EntityStatus.ACTIVE
      }
    });
    return count;
  }
}

const resolvePromotion = (now: Date) => {
  if (
    BILLING_CONSTANTS.promotionPercent > 0 &&
    BILLING_CONSTANTS.promotionEndsAt &&
    now <= BILLING_CONSTANTS.promotionEndsAt
  ) {
    return {
      percent: BILLING_CONSTANTS.promotionPercent,
      endsAt: BILLING_CONSTANTS.promotionEndsAt
    };
  }
  return {
    percent: 0,
    endsAt: null
  };
};

export function calculateBillingAmounts(staffSeatCount: number, referenceDate: Date = new Date()): BillingComputation {
  const promotion = resolvePromotion(referenceDate);
  const discountedBase = Math.round(
    BILLING_CONSTANTS.basePriceCents * (100 - promotion.percent) / 100
  );

  const staffNet = staffSeatCount * BILLING_CONSTANTS.staffSeatPriceCents;
  const netAmountCents = discountedBase + staffNet;

  const grossAmountCents = Math.round(
    netAmountCents * (10000 + BILLING_CONSTANTS.vatRateBps) / 10000
  );

  return {
    basePriceCents: BILLING_CONSTANTS.basePriceCents,
    staffSeatPriceCents: BILLING_CONSTANTS.staffSeatPriceCents,
    staffSeatCount,
    discountPercent: promotion.percent,
    discountEndsAt: promotion.endsAt,
    netAmountCents,
    grossAmountCents,
    vatRateBps: BILLING_CONSTANTS.vatRateBps
  };
}

export function deriveBillingFromRecord(subscription: Subscription): BillingComputation {
  return {
    basePriceCents: subscription.basePriceCents,
    staffSeatPriceCents: subscription.staffSeatPriceCents,
    staffSeatCount: subscription.staffSeatCount,
    discountPercent: subscription.discountPercent,
    discountEndsAt: subscription.discountEndsAt ?? null,
    netAmountCents: subscription.netAmountCents,
    grossAmountCents: subscription.grossAmountCents,
    vatRateBps: subscription.vatRateBps
  };
}

export const mapPricingToUpdate = (pricing: BillingComputation) => ({
  currency: 'PLN' as const,
  basePriceCents: pricing.basePriceCents,
  staffSeatPriceCents: pricing.staffSeatPriceCents,
  staffSeatCount: pricing.staffSeatCount,
  discountPercent: pricing.discountPercent,
  discountEndsAt: pricing.discountEndsAt,
  netAmountCents: pricing.netAmountCents,
  grossAmountCents: pricing.grossAmountCents,
  vatRateBps: pricing.vatRateBps
});

export const computeLifecycleAnchors = (periodEnd: Date | null | undefined) => {
  if (!periodEnd) {
    return {
      pastDueSince: null,
      gracePeriodEndsAt: null
    };
  }
  const pastDueSince = new Date(periodEnd.getTime() + BILLING_CONSTANTS.pastDueAfterDays * DAY_MS);
  const gracePeriodEndsAt = new Date(
    pastDueSince.getTime() + BILLING_CONSTANTS.blockAfterAdditionalDays * DAY_MS
  );
  return { pastDueSince, gracePeriodEndsAt };
};

const computeWarningStart = (periodEnd: Date | null | undefined) => {
  if (!periodEnd) return null;
  return new Date(periodEnd.getTime() - BILLING_CONSTANTS.warningDaysBefore * DAY_MS);
};

export function evaluateLifecycle(subscription: Subscription, now: Date = new Date()): LifecycleSnapshot {
  if (subscription.status === 'CANCELED') {
    return {
      status: subscription.status,
      warningActive: false,
      warningStartsAt: null,
      daysUntilDue: null,
      limitedAccess: false,
      blocked: false,
      pastDueSince: subscription.pastDueSince ?? null,
      gracePeriodEndsAt: subscription.gracePeriodEndsAt ?? null,
      nextChargeDate: subscription.currentPeriodEnd ?? null,
      updates: {}
    };
  }

  const warningStartsAt = computeWarningStart(subscription.currentPeriodEnd);
  const anchors = computeLifecycleAnchors(subscription.currentPeriodEnd ?? subscription.trialEndsAt);

  const pastDueSince = subscription.pastDueSince ?? anchors.pastDueSince;
  const gracePeriodEndsAt = subscription.gracePeriodEndsAt ?? anchors.gracePeriodEndsAt;

  let derivedStatus = subscription.status;
  const warningActive = Boolean(
    subscription.currentPeriodEnd &&
    warningStartsAt &&
    now >= warningStartsAt &&
    now < subscription.currentPeriodEnd
  );

  const daysUntilDue = subscription.currentPeriodEnd
    ? Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / DAY_MS)
    : null;

  const limitedAccess = Boolean(
    pastDueSince &&
    now >= pastDueSince &&
    (!gracePeriodEndsAt || now < gracePeriodEndsAt)
  );

  const blocked = Boolean(gracePeriodEndsAt && now >= gracePeriodEndsAt);

  if (subscription.status !== 'TRIAL') {
    if (blocked) {
      derivedStatus = 'UNPAID';
    } else if (limitedAccess && subscription.status === 'ACTIVE') {
      derivedStatus = 'PAST_DUE';
    }
  }

  const updates: Partial<Subscription> = {};
  if (derivedStatus !== subscription.status) {
    updates.status = derivedStatus;
  }
  if (pastDueSince && (!subscription.pastDueSince || subscription.pastDueSince.getTime() !== pastDueSince.getTime())) {
    updates.pastDueSince = pastDueSince;
  }
  if (gracePeriodEndsAt && (!subscription.gracePeriodEndsAt || subscription.gracePeriodEndsAt.getTime() !== gracePeriodEndsAt.getTime())) {
    updates.gracePeriodEndsAt = gracePeriodEndsAt;
  }

  return {
    status: derivedStatus,
    warningActive,
    warningStartsAt,
    daysUntilDue,
    limitedAccess,
    blocked,
    pastDueSince: pastDueSince ?? null,
    gracePeriodEndsAt: gracePeriodEndsAt ?? null,
    nextChargeDate: subscription.currentPeriodEnd ?? subscription.trialEndsAt ?? null,
    updates
  };
}

export function formatPricingForResponse(pricing: BillingComputation) {
  return {
    currency: 'PLN',
    basePriceCents: pricing.basePriceCents,
    staffSeatPriceCents: pricing.staffSeatPriceCents,
    staffSeatCount: pricing.staffSeatCount,
    discountPercent: pricing.discountPercent,
    discountEndsAt: pricing.discountEndsAt,
    netAmountCents: pricing.netAmountCents,
    grossAmountCents: pricing.grossAmountCents,
    vatRateBps: pricing.vatRateBps
  };
}
