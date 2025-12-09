import { z } from 'zod';

// 🏷️ Базовые типы
export type SubscriptionPlan = 'BASIC' | 'PRO' | 'ENTERPRISE';
export type BillingPlanId = SubscriptionPlan | 'TRIAL';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';

// 📊 Zod схемы для runtime валидации
export const SubscriptionPlanSchema = z.enum(['BASIC', 'PRO', 'ENTERPRISE']);
export const SubscriptionStatusSchema = z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID']);

export const SubscriptionBillingSchema = z.object({
  currency: z.string(),
  basePriceCents: z.number(),
  staffSeatPriceCents: z.number(),
  staffSeatCount: z.number(),
  discountPercent: z.number(),
  discountEndsAt: z.string().nullable().optional(),
  netAmountCents: z.number(),
  grossAmountCents: z.number(),
  vatRateBps: z.number()
});

export const SubscriptionLifecycleSchema = z.object({
  warningActive: z.boolean(),
  warningStartsAt: z.string().nullable().optional(),
  daysUntilDue: z.number().nullable(),
  limitedAccess: z.boolean(),
  blocked: z.boolean(),
  pastDueSince: z.string().nullable().optional(),
  gracePeriodEndsAt: z.string().nullable().optional(),
  nextChargeDate: z.string().nullable().optional()
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  plan: SubscriptionPlanSchema,
  status: SubscriptionStatusSchema,
  currentPeriodStart: z.string().optional(),
  currentPeriodEnd: z.string().optional(),
  trialEndsAt: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  billing: SubscriptionBillingSchema.optional(),
  lifecycle: SubscriptionLifecycleSchema.optional(),
});

export const SubscriptionResponseSchema = z.object({
  subscription: SubscriptionSchema.nullable(),
  success: z.boolean(),
  message: z.string().optional(),
});

export const CreateSubscriptionRequestSchema = z.object({
  staffSeats: z.number().int().min(0).max(200).optional(),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
  plan: SubscriptionPlanSchema.optional()
});

export const CreateSubscriptionResponseSchema = z.object({
  url: z.string(),
  sessionId: z.string().optional(),
  subscriptionId: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
});

// 🎨 TypeScript интерфейсы (инferred от Zod схем)
export type SubscriptionBilling = z.infer<typeof SubscriptionBillingSchema>;
export type SubscriptionLifecycle = z.infer<typeof SubscriptionLifecycleSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;
export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;
export type CreateSubscriptionResponse = z.infer<typeof CreateSubscriptionResponseSchema>;

// 💰 План интерфейс
export interface Plan {
  id: BillingPlanId;
  name: string;
  description: string;
  price: number;
  currency: string;
  popular?: boolean;
  features: string[];
}

// 📋 Константы планов
export const PLAN_DETAILS: Record<BillingPlanId, Plan> = {
  TRIAL: {
    id: 'TRIAL',
    name: 'Trial',
    description: '14-дневный пробный период',
    price: 0,
    currency: 'EUR',
    features: ['Все функции', 'Без ограничений', '14 дней бесплатно']
  },
  BASIC: {
    id: 'BASIC',
    name: 'Basic',
    description: 'Идеально для небольших салонов',
    price: 30,
    currency: 'EUR',
    features: [
      'До 3 мастеров',
      'Онлайн-запись',
      'CRM клиентов (до 500)',
      'Базовая аналитика',
      'Email поддержка'
    ]
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    description: 'Для растущих салонов',
    price: 75,
    currency: 'EUR',
    popular: true,
    features: [
      'До 10 мастеров',
      'Все функции Basic',
      'SMS уведомления',
      'ИИ-аналитика',
      'Мобильное приложение',
      'Приоритетная поддержка'
    ]
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Для крупных салонов и сетей',
    price: 150,
    currency: 'EUR',
    features: [
      'Безлимит мастеров',
      'Все функции Pro',
      'Мультифилиальность',
      'API доступ',
      'Персональный менеджер',
      'SLA 99.9%'
    ]
  }
};

// 🎨 Утилиты для UI
export const getStatusBadgeVariant = (status: SubscriptionStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'TRIAL':
      return 'secondary';
    case 'ACTIVE':
      return 'default';
    case 'PAST_DUE':
    case 'CANCELED':
    case 'UNPAID':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const getStatusText = (status: SubscriptionStatus): string => {
  switch (status) {
    case 'TRIAL':
      return 'Пробный период';
    case 'ACTIVE':
      return 'Активна';
    case 'CANCELED':
      return 'Отменена';
    case 'PAST_DUE':
      return 'Просрочена';
    case 'UNPAID':
      return 'Не оплачена';
    default:
      return 'Неизвестно';
  }
};

export const formatPrice = (price: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
  }).format(price);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const isTrialExpiringSoon = (subscription: Subscription, daysThreshold: number = 3): boolean => {
  if (subscription.status !== 'TRIAL' || !subscription.trialEndsAt) {
    return false;
  }

  const trialEnd = new Date(subscription.trialEndsAt);
  const now = new Date();
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return daysLeft <= daysThreshold && daysLeft > 0;
};

export const canUpgradeTo = (currentPlan: SubscriptionPlan, targetPlan: SubscriptionPlan): boolean => {
  const planOrder: Record<SubscriptionPlan, number> = {
    BASIC: 1,
    PRO: 2,
    ENTERPRISE: 3
  };

  const currentRank = planOrder[currentPlan] ?? 0;
  const targetRank = planOrder[targetPlan] ?? 0;

  return targetRank > currentRank;
};
