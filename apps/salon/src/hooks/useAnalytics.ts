import { useState, useEffect } from 'react'
import { CRMApiService } from '../services/crmApiNew'
import { useTenant } from '../contexts/AuthContext'
import { getCurrentCurrency, type SupportedCurrency } from '../currency'

interface CalendarAppointment {
  start?: string
  end?: string
  extendedProps?: {
    client?: { id?: string | null }
    services?: Array<{ id?: string; name?: string | null; price?: number | string | null }>
    staffMembers?: Array<{ id?: string; firstName?: string | null; lastName?: string | null }>
    totalPrice?: number | string | null
    currency?: string | null
  }
}

export interface AnalyticsMetrics {
  revenueThisMonth: number
  appointmentsThisMonth: number
  newClientsThisMonth: number
  averageBill: number
  revenueLastMonth: number
  appointmentsLastMonth: number
  revenueGrowth: number
  appointmentsGrowth: number
  currency: SupportedCurrency
  staffMetrics: Array<{
    staffId: string
    staffName: string
    appointments: number
    revenue: number
    workload: number // percentage
  }>
  popularServices: Array<{
    serviceId: string
    serviceName: string
    count: number
    revenue: number
    percentage: number
  }>
}

type AnalyticsHook = { metrics: AnalyticsMetrics | null; loading: boolean; error: string | null }

export function useAnalytics(): AnalyticsHook {
  const { salonId } = useTenant()
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toNumber = (value: unknown): number => {
    const num = typeof value === 'string' || typeof value === 'number' ? Number(value) : 0
    return Number.isFinite(num) ? num : 0
  }

  useEffect(() => {
    if (!salonId) return;

    const loadAnalytics = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        // Получаем валюту из localStorage (как в дашборде)
        const currency = getCurrentCurrency();

        // Получаем даты для текущего и прошлого месяца
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const currentMonthEnd = new Date(nextMonth.getTime() - 1);

        // Загружаем записи за текущий месяц
        const thisMonthResponse = await CRMApiService.getCalendarAppointments(
          currentMonth.toISOString(),
          currentMonthEnd.toISOString()
        );

        // Загружаем записи за прошлый месяц
        const lastMonthEnd = new Date(currentMonth.getTime() - 1);
        const lastMonthResponse = await CRMApiService.getCalendarAppointments(
          lastMonth.toISOString(),
          lastMonthEnd.toISOString()
        );

        const thisMonthAppointments = (thisMonthResponse.appointments ?? []) as CalendarAppointment[]
        const lastMonthAppointments = (lastMonthResponse.appointments ?? []) as CalendarAppointment[]

        // Вычисляем метрики за текущий месяц
        let revenueThisMonth = 0;
        let newClientsThisMonth = 0;
        const staffMap = new Map<string, { appointments: number; revenue: number; name: string }>();
        const serviceMap = new Map<string, { count: number; revenue: number; name: string }>();
        const clientsThisMonth = new Set<string>();

        thisMonthAppointments.forEach((apt) => {
          const services = apt.extendedProps?.services ?? [];
          const staffMembers = apt.extendedProps?.staffMembers ?? [];
          const appointmentRevenue =
            apt.extendedProps?.totalPrice !== undefined && apt.extendedProps?.totalPrice !== null
              ? toNumber(apt.extendedProps.totalPrice)
              : services.reduce((sum, svc) => sum + toNumber(svc.price), 0);

          revenueThisMonth += appointmentRevenue;

          const clientId = apt.extendedProps?.client?.id ?? null;
          if (clientId && !clientsThisMonth.has(clientId)) {
            clientsThisMonth.add(clientId);
            newClientsThisMonth++;
          }

          staffMembers.forEach((staff) => {
            if (!staff?.id) return;
            const staffName = `${staff.firstName ?? ''} ${staff.lastName ?? ''}`.trim() || 'Сотрудник';
            const existing = staffMap.get(staff.id) || { appointments: 0, revenue: 0, name: staffName };
            staffMap.set(staff.id, {
              appointments: existing.appointments + 1,
              revenue: existing.revenue + appointmentRevenue,
              name: staffName
            });
          });

          (services as Array<{ id?: string; name?: string | null; price?: number | string | null }>).forEach((service) => {
            const key = service.id ?? service.name ?? 'Услуга';
            const serviceName = service.name ?? 'Услуга';
            const existing = serviceMap.get(key) || { count: 0, revenue: 0, name: serviceName };
            serviceMap.set(key, {
              count: existing.count + 1,
              revenue: existing.revenue + appointmentRevenue,
              name: serviceName
            });
          });
        });

        // Вычисляем метрики за прошлый месяц
        let revenueLastMonth = 0;
        lastMonthAppointments.forEach((apt) => {
          const services = apt.extendedProps?.services ?? [];
          const appointmentRevenue =
            apt.extendedProps?.totalPrice !== undefined && apt.extendedProps?.totalPrice !== null
              ? toNumber(apt.extendedProps.totalPrice)
              : services.reduce((sum, svc) => sum + toNumber(svc.price), 0);
          revenueLastMonth += appointmentRevenue;
        });

        // Средняя сумма чека
        const averageBill = thisMonthAppointments.length > 0 
          ? revenueThisMonth / thisMonthAppointments.length 
          : 0;

        // Рост (сравнение с прошлым месяцем)
        const revenueGrowth = revenueLastMonth > 0
          ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
          : 0;
        
        const appointmentsGrowth = lastMonthAppointments.length > 0
          ? ((thisMonthAppointments.length - lastMonthAppointments.length) / lastMonthAppointments.length) * 100
          : 0;

        // Форматируем метрики мастеров
        const maxAppointments = Math.max(...Array.from(staffMap.values()).map(s => s.appointments), 1);
        const staffMetrics = Array.from(staffMap.entries()).map(([staffId, data]) => ({
          staffId,
          staffName: data.name,
          appointments: data.appointments,
          revenue: data.revenue,
          workload: (data.appointments / maxAppointments) * 100
        }));

        // Форматируем популярные услуги
        const totalServiceCount = Array.from(serviceMap.values()).reduce((sum, s) => sum + s.count, 0);
        const popularServices = Array.from(serviceMap.entries())
          .map(([serviceId, data]) => ({
            serviceId,
            serviceName: data.name,
            count: data.count,
            revenue: data.revenue,
            percentage: totalServiceCount > 0 ? (data.count / totalServiceCount) * 100 : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);


        setMetrics({
          revenueThisMonth,
          appointmentsThisMonth: thisMonthAppointments.length,
          newClientsThisMonth,
          averageBill: Math.round(averageBill * 100) / 100,
          revenueLastMonth,
          appointmentsLastMonth: lastMonthAppointments.length,
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
          appointmentsGrowth: Math.round(appointmentsGrowth * 10) / 10,
          currency,
          staffMetrics,
          popularServices
        });
      } catch (err) {
        setError('Не удалось загрузить аналитику');
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
  }, [salonId]);

  return { metrics, loading, error };
}
