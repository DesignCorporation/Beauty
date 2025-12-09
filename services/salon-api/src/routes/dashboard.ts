import express, { type Response, type Router, type NextFunction } from 'express';
import { tenantPrisma } from '@beauty-platform/database';
import type { Appointment, Prisma } from '@prisma/client';
import { assertAuth } from '@beauty/shared';
import type { TenantRequest } from '../middleware/tenant';

const router: Router = express.Router();

const wrapTenantRoute =
  (handler: (req: TenantRequest, res: Response) => Promise<void>) =>
  async (req: express.Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req as TenantRequest, res);
    } catch (error) {
      next(error);
    }
  };

const AUTH_REQUIRED_ERROR = 'Authentication required';

const requireTenantContext = (
  req: TenantRequest,
  res: Response
): { tenantId: string; tenantClient: ReturnType<typeof tenantPrisma> } | null => {
  try {
    const auth = assertAuth(req);
    const tenantId = (req.tenantId ?? auth.tenantId) as string | undefined;

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant context is required'
      });
      return null;
    }

    return { tenantId, tenantClient: tenantPrisma(tenantId) };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return null;
    }
    throw error;
  }
};

// Статусы, которые считаем как выручку/запланированные услуги (включая PENDING бронирования)
const REVENUE_STATUSES = new Set(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']);
const REVENUE_ELIGIBLE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']);
const ACTIVE_APPOINTMENT_STATUSES = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS']);

const startOfDayUtc = (date: Date): Date => {
  const copy = new Date(date.getTime());
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};

const endOfDayUtc = (date: Date): Date => {
  const copy = new Date(date.getTime());
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
};

// Получаем начало/конец дня в часовой зоне салона, чтобы корректно считать "сегодня"
const getTenantDayRange = (date: Date, timeZone: string): { start: Date; end: Date } => {
  // Формируем дату в нужной таймзоне через Intl
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
    .formatToParts(date)
    .reduce<Record<string, number>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = Number(part.value);
      }
      return acc;
    }, {});

  const year = parts.year ?? date.getUTCFullYear();
  const month = (parts.month ?? date.getUTCMonth() + 1) - 1; // JS months are 0-based
  const day = parts.day ?? date.getUTCDate();

  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  return { start, end };
};

const addDaysUtc = (date: Date, days: number): Date => {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

const minutesBetween = (start: Date, end: Date): number =>
  Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));

type AppointmentWithDetails = Appointment & {
  service?: {
    id: string;
    name: string | null;
    price?: Prisma.Decimal | number | null;
    category?: {
      id: string;
      name: string;
    } | null;
  } | null;
  appointmentServices: Array<{
    id: string;
    name: string | null;
    price: Prisma.Decimal | number | null;
    duration: number;
    currency: string | null;
    service: {
      id: string;
      name: string | null;
      category: {
        id: string;
        name: string;
      } | null;
    } | null;
  }>;
  staffMembers: Array<{
    staffId: string;
    sequenceOrder: number;
    role: string | null;
    staff: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      color?: string | null;
    } | null;
  }>;
  client: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  assignedTo: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color?: string | null;
  } | null;
};

const toNumber = (value: Prisma.Decimal | number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'object' && 'toString' in value ? Number(value.toString()) : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const sumAppointmentPrice = (appointment: AppointmentWithDetails): number => {
  if (appointment.totalPrice !== null && appointment.totalPrice !== undefined) {
    return toNumber(appointment.totalPrice as any);
  }
  if (appointment.appointmentServices?.length) {
    return appointment.appointmentServices.reduce((sum, svc) => sum + toNumber(svc.price), 0);
  }
  return 0;
};

const getPrimaryStaff = (appointment: AppointmentWithDetails) => {
  if (appointment.staffMembers?.length) {
    const sorted = [...appointment.staffMembers].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    return sorted[0]?.staff ?? appointment.assignedTo;
  }
  return appointment.assignedTo;
};

const getServiceNames = (appointment: AppointmentWithDetails): string => {
  if (appointment.appointmentServices?.length) {
    const names = appointment.appointmentServices.map((svc) => svc.name).filter(Boolean) as string[];
    if (names.length) {
      return names.join(', ');
    }
  }
  return appointment.service?.name ?? 'Услуга';
};

router.get(
  '/overview',
  wrapTenantRoute(async (req, res) => {
    const context = requireTenantContext(req, res);
    if (!context) {
      return;
    }

    const { tenantId, tenantClient } = context;
    const now = new Date();

    try {
      const tenantSettings = await tenantPrisma(tenantId).tenant.findUnique({
        where: { id: tenantId },
        select: { currency: true, timezone: true }
      });

      const timeZone = tenantSettings?.timezone ?? 'Europe/Warsaw';
      const { start: startToday, end: endToday } = getTenantDayRange(now, timeZone);
      const sevenDaysAgo = addDaysUtc(startToday, -7);
      const fourteenDaysAgo = addDaysUtc(startToday, -14);
      const thirtyDaysAgo = addDaysUtc(startToday, -30);
      const ninetyDaysAgo = addDaysUtc(startToday, -90);

      const appointmentsLast90Promise = tenantClient.appointment.findMany({
        where: {
          tenantId,
          startAt: { gte: ninetyDaysAgo }
        },
        include: {
          appointmentServices: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  category: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              price: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          staffMembers: {
            include: {
              staff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  color: true
                }
              }
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              color: true
            }
          }
        }
      }) as Promise<AppointmentWithDetails[]>;

      const upcomingAppointmentsPromise = tenantClient.appointment.findMany({
        where: {
          tenantId,
          startAt: { gte: now },
          status: { in: Array.from(ACTIVE_APPOINTMENT_STATUSES) as any[] }
        },
        take: 5,
        orderBy: [{ startAt: 'asc' }],
        include: {
          appointmentServices: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          service: {
            select: {
              id: true,
              name: true
            }
          },
          staffMembers: {
            include: {
              staff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  color: true
                }
              }
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              color: true
            }
          }
        }
      }) as Promise<AppointmentWithDetails[]>;

      const [
        appointmentsLast90,
        upcomingAppointmentsRaw,
        newClients7d,
        clientsWithBirthdays,
        staffMembers,
        notificationsToday
      ] = await Promise.all([
        appointmentsLast90Promise,
        upcomingAppointmentsPromise,
        tenantClient.client.count({
          where: {
            tenantId,
            createdAt: { gte: sevenDaysAgo }
          }
        }),
        tenantClient.client.findMany({
          where: {
            tenantId,
            birthday: { not: null }
          },
          select: {
            id: true,
            name: true,
            birthday: true
          }
        }),
        tenantClient.user.findMany({
          where: {
            tenantId,
            role: 'STAFF_MEMBER',
            status: 'ACTIVE'
          },
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }),
        tenantClient.notification.findMany({
          where: {
            tenantId,
            createdAt: { gte: startToday }
          },
          select: {
            id: true,
            title: true,
            status: true,
            type: true,
            createdAt: true
          },
          orderBy: [{ createdAt: 'desc' }]
        })
      ]);

      const appointmentsToday = appointmentsLast90.filter(
        (appointment) => appointment.startAt >= startToday && appointment.startAt <= endToday
      );

      const appointmentsLast7 = appointmentsLast90.filter(
        (appointment) => appointment.startAt >= sevenDaysAgo
      );

      const appointmentsPrev7 = appointmentsLast90.filter(
        (appointment) => appointment.startAt >= fourteenDaysAgo && appointment.startAt < sevenDaysAgo
      );

      const appointmentsLast30 = appointmentsLast90.filter(
        (appointment) => appointment.startAt >= thirtyDaysAgo
      );

      const revenueSum = (appointments: typeof appointmentsLast90) =>
        appointments.reduce((sum, appointment) => {
          if (!REVENUE_ELIGIBLE_STATUSES.has(appointment.status)) {
            return sum;
          }
          return sum + sumAppointmentPrice(appointment);
        }, 0);

      const revenueToday = revenueSum(appointmentsToday);
      const revenue7 = revenueSum(appointmentsLast7);
      const revenuePrev7 = revenueSum(appointmentsPrev7);
      const revenue30 = revenueSum(appointmentsLast30);

      const revenueChangePct =
        revenuePrev7 > 0 ? ((revenue7 - revenuePrev7) / revenuePrev7) * 100 : null;

      const cancellationsToday = appointmentsToday.filter((appointment) =>
        ['CANCELLED', 'NO_SHOW'].includes(appointment.status)
      ).length;

      const categoryTotals = appointmentsLast30.reduce<Record<
        string,
        { name: string; value: number }
      >>((acc, appointment) => {
        if (!REVENUE_ELIGIBLE_STATUSES.has(appointment.status)) {
          return acc;
        }

        const services = appointment.appointmentServices?.length
          ? appointment.appointmentServices
          : [];

        services.forEach((svc) => {
          const categoryName = svc.service?.category?.name ?? 'Другие услуги';
          const key = svc.service?.category?.id ?? categoryName;

          if (!acc[key]) {
            acc[key] = {
              name: categoryName,
              value: 0
            };
          }

          acc[key].value += toNumber(svc.price);
        });
        return acc;
      }, {});

      const financeCategories = Object.values(categoryTotals).map((entry) => ({
        name: entry.name,
        revenue: Number(entry.value.toFixed(2)),
        percentage: revenue30 > 0 ? Number(((entry.value / revenue30) * 100).toFixed(1)) : 0
      }));

      const completedAppointments30 = appointmentsLast30.filter((appointment) =>
        REVENUE_STATUSES.has(appointment.status)
      ).length;

      const averageCheck =
        completedAppointments30 > 0 ? revenue30 / completedAppointments30 : 0;

      const todaysBirthdays = clientsWithBirthdays
        .filter((client) => {
          if (!client.birthday) return false;
          const birthday = new Date(client.birthday);
          return (
            birthday.getUTCMonth() === now.getUTCMonth() &&
            birthday.getUTCDate() === now.getUTCDate()
          );
        })
        .map((client) => ({
          id: client.id,
          name: client.name
        }));

      const clientRevenueMap = appointmentsLast90.reduce<Record<string, { revenue: number; count: number }>>(
        (acc, appointment) => {
        if (!appointment.clientId || !REVENUE_ELIGIBLE_STATUSES.has(appointment.status)) {
          return acc;
        }

        const price = sumAppointmentPrice(appointment);
        if (!acc[appointment.clientId]) {
          acc[appointment.clientId] = { revenue: 0, count: 0 };
        }
          acc[appointment.clientId].revenue += price;
          acc[appointment.clientId].count += 1;
          return acc;
        },
        {}
      );

      const vipEntries = Object.entries(clientRevenueMap)
        .map(([clientId, stats]) => ({ clientId, ...stats }))
        .filter((entry) => entry.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const vipClientIds = vipEntries.map((entry) => entry.clientId);
      const vipClientsMap = vipClientIds.length
        ? await tenantClient.client.findMany({
            where: { id: { in: vipClientIds } },
            select: { id: true, name: true }
          }).then((records) => new Map(records.map((record) => [record.id, record.name])))
        : new Map<string, string>();

      const vipClients = vipEntries.map((entry) => ({
        id: entry.clientId,
        name: vipClientsMap.get(entry.clientId) ?? 'Клиент без имени',
        revenue: Number(entry.revenue.toFixed(2))
      }));

      const clientRetentionBase = Object.values(clientRevenueMap);
      const activeClients = clientRetentionBase.filter((entry) => entry.count > 0).length;
      const returningClients = clientRetentionBase.filter((entry) => entry.count >= 2).length;
      const retentionRate =
        activeClients > 0 ? Number(((returningClients / activeClients) * 100).toFixed(1)) : 0;

      const staffLookup = new Map(
        staffMembers.map((member) => [
          member.id,
          `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || 'Сотрудник'
        ])
      );

      const staffWorkMap = appointmentsToday.reduce<Record<
        string,
        { minutes: number; appointments: number }
      >>((acc, appointment) => {
        if (!REVENUE_ELIGIBLE_STATUSES.has(appointment.status)) {
          return acc;
        }

        const duration = minutesBetween(appointment.startAt, appointment.endAt);
        const members = appointment.staffMembers?.length ? appointment.staffMembers : [];
        members.forEach((member) => {
          const staffId = member.staffId;
          if (!staffId) return;
          if (!acc[staffId]) {
            acc[staffId] = { minutes: 0, appointments: 0 };
          }
          acc[staffId].minutes += duration;
          acc[staffId].appointments += 1;
        });
        return acc;
      }, {});

      const staffWorkload = Object.entries(staffWorkMap).map(([staffId, stats]) => ({
        staffId,
        name: staffLookup.get(staffId) ?? 'Сотрудник',
        utilization: Math.min(100, Number(((stats.minutes / 480) * 100).toFixed(1))),
        appointments: stats.appointments
      }));

      const staffRevenueMap = appointmentsLast30.reduce<Record<
        string,
        { revenue: number; clients: number }
      >>((acc, appointment) => {
        if (!REVENUE_ELIGIBLE_STATUSES.has(appointment.status)) {
          return acc;
        }

        const amount = sumAppointmentPrice(appointment);
        const members = appointment.staffMembers?.length ? appointment.staffMembers : [];
        members.forEach((member) => {
          const staffId = member.staffId;
          if (!staffId) return;
          if (!acc[staffId]) {
            acc[staffId] = { revenue: 0, clients: 0 };
          }

          acc[staffId].revenue += amount;
          acc[staffId].clients += 1;
        });
        return acc;
      }, {});

      const topPerformerEntry = Object.entries(staffRevenueMap)
        .map(([staffId, stats]) => ({
          staffId,
          name: staffLookup.get(staffId) ?? 'Сотрудник',
          revenue: stats.revenue,
          clients: stats.clients
        }))
        .sort((a, b) => b.revenue - a.revenue)[0];

      const notificationSummary = {
        totalSent: notificationsToday.length,
        failed: notificationsToday.filter((notification) => notification.status === 'FAILED')
          .length,
        latest: notificationsToday[0]
          ? {
              id: notificationsToday[0].id,
              title: notificationsToday[0].title,
              createdAt: notificationsToday[0].createdAt
            }
          : null
      };

      res.json({
        success: true,
        data: {
          generatedAt: now.toISOString(),
          kpis: {
            appointmentsToday: appointmentsToday.length,
            revenueToday: Number(revenueToday.toFixed(2)),
            cancellationsToday,
            newClients7d,
            revenueChangePct: revenueChangePct !== null ? Number(revenueChangePct.toFixed(1)) : null,
            currency: tenantSettings?.currency ?? 'PLN'
          },
          finance: {
            totalRevenue30d: Number(revenue30.toFixed(2)),
            averageCheck: Number(averageCheck.toFixed(2)),
            categories: financeCategories
          },
          appointments: {
            upcoming: upcomingAppointmentsRaw.map((appointment) => ({
              id: appointment.id,
              startTime: appointment.startAt,
              endTime: appointment.endAt,
              status: appointment.status,
              clientName: appointment.client?.name ?? appointment.client?.email ?? 'Клиент',
              serviceName: getServiceNames(appointment),
              staffName: (() => {
                const primaryStaff = getPrimaryStaff(appointment);
                if (!primaryStaff) return null;
                const fullName = `${primaryStaff.firstName ?? ''} ${primaryStaff.lastName ?? ''}`.trim();
                return fullName || 'Сотрудник';
              })()
            }))
          },
          clients: {
            birthdaysToday: todaysBirthdays,
            vipClients,
            retention30d: retentionRate
          },
          staff: {
            workload: staffWorkload,
            topPerformer: topPerformerEntry
              ? {
                  name: topPerformerEntry.name,
                  revenue: Number(topPerformerEntry.revenue.toFixed(2)),
                  clients: topPerformerEntry.clients
                }
              : null
          },
          notifications: notificationSummary,
          marketing: {
            lastCampaign: notificationSummary.latest
              ? {
                  title: notificationSummary.latest.title,
                  sentAt: notificationSummary.latest.createdAt
                }
              : null,
            // нет отдельного источника для планируемых кампаний — оставляем пустой массив
            upcomingCampaigns: []
          }
        }
      });
    } catch (error) {
      console.error('[CRM Dashboard] Failed to build overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to build dashboard overview'
      });
    }
  })
);

export default router;
