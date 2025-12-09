import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';

const kpiSchema = z.object({
  appointmentsToday: z.number().nonnegative(),
  revenueToday: z.number().nonnegative(),
  cancellationsToday: z.number().nonnegative(),
  newClients7d: z.number().nonnegative(),
  revenueChangePct: z.number().nullable(),
  currency: z.string().min(1)
});

const financeSchema = z.object({
  totalRevenue30d: z.number(),
  averageCheck: z.number(),
  categories: z.array(
    z.object({
      name: z.string(),
      revenue: z.number(),
      percentage: z.number()
    })
  ).default([])
});

const appointmentSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.string(),
  clientName: z.string(),
  serviceName: z.string(),
  staffName: z.string().nullable()
});

const clientsSchema = z.object({
  birthdaysToday: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
  vipClients: z.array(z.object({ id: z.string(), name: z.string(), revenue: z.number() })).default([]),
  retention30d: z.number().min(0)
});

const staffSchema = z.object({
  workload: z.array(z.object({
    staffId: z.string(),
    name: z.string(),
    utilization: z.number(),
    appointments: z.number()
  })).default([]),
  topPerformer: z.object({
    name: z.string(),
    revenue: z.number(),
    clients: z.number()
  }).nullable()
});

const notificationsSchema = z.object({
  totalSent: z.number().nonnegative(),
  failed: z.number().nonnegative(),
  latest: z.object({
    id: z.string(),
    title: z.string(),
    createdAt: z.string()
  }).nullable()
});

const marketingSchema = z.object({
  lastCampaign: z.object({
    title: z.string(),
    sentAt: z.string()
  }).nullable(),
  upcomingCampaigns: z.array(z.unknown()).default([])
});

const overviewSchema = z.object({
  generatedAt: z.string(),
  kpis: kpiSchema,
  finance: financeSchema,
  appointments: z.object({
    upcoming: z.array(appointmentSchema).default([])
  }),
  clients: clientsSchema,
  staff: staffSchema,
  notifications: notificationsSchema,
  marketing: marketingSchema
});

export type DashboardKpiData = z.infer<typeof kpiSchema>;
export type DashboardFinanceData = z.infer<typeof financeSchema>;
export type DashboardAppointment = z.infer<typeof appointmentSchema>;
export type DashboardClientsData = z.infer<typeof clientsSchema>;
export type DashboardStaffData = z.infer<typeof staffSchema>;
export type DashboardNotificationsData = z.infer<typeof notificationsSchema>;
export type DashboardMarketingData = z.infer<typeof marketingSchema>;
export type DashboardOverview = z.infer<typeof overviewSchema>;

interface UseDashboardOverviewReturn {
  data: DashboardOverview | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboardOverview(): UseDashboardOverviewReturn {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/crm/dashboard/overview', {
        credentials: 'include',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.error || 'Failed to load dashboard');
      }

      const parsed = overviewSchema.safeParse(payload.data);
      if (!parsed.success) {
        console.error('[CRM Dashboard] Invalid dashboard payload:', parsed.error.format());
        throw new Error('Invalid dashboard data');
      }

      setData(parsed.data);
    } catch (err) {
      console.error('[CRM Dashboard] Failed to load overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect((): (() => void) => {
    void fetchOverview();
    const interval = setInterval(() => {
      void fetchOverview();
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchOverview
  };
}
