import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import { z } from 'zod';
import axios from 'axios';
import crypto from 'crypto';
import { PaymentMethod, PaymentStatus, ClientNotificationType, NotificationPriority, Prisma } from '@prisma/client';
import { tenantPrisma, prisma } from '@beauty-platform/database';
import { assertAuth } from '@beauty/shared';
import type { TenantRequest } from '../middleware/tenant';
import {
  sendBookingConfirmationEmail,
  sendAppointmentInvitationEmail
} from '../utils/emailSender';
import { createClientPortalNotification } from '../utils/clientNotifications';
import { buildOptional } from '../utils/normalize';
import {
  calculateEndAt,
  calculateTotalPrice,
  calculateTotalDuration,
  getCurrency,
  toNumber
} from '../utils/appointmentCalculations';
import {
  emitAppointmentCreated,
  emitAppointmentReminder,
  emitAppointmentCancelled
} from '../utils/emitters';
import type {
  AppointmentWithServices,
  AppointmentServiceSnapshot,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  ServiceDurationAndPrice
} from '../types/appointment';

const router: Router = express.Router();
const wrapTenantRoute =
  (
    handler: (req: TenantRequest, res: Response) => Promise<void | Response> | void | Response
  ) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req as TenantRequest, res);
    } catch (error) {
      next(error);
    }
  };

const WORKING_DAY_START_HOUR = 8;
const WORKING_DAY_END_HOUR = 20;
const SLOT_INTERVAL_MINUTES = 30;

const toMillis = (minutes: number) => minutes * 60 * 1000;

const buildDailySlots = () => {
  const slots: string[] = [];
  for (let hour = WORKING_DAY_START_HOUR; hour <= WORKING_DAY_END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
      if (hour === WORKING_DAY_END_HOUR && minute > 0) break;
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return slots;
};

// Normalize base URL once; API endpoints always live under /api
const RAW_PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL;
const PAYMENT_SERVICE_BASE_URL = (RAW_PAYMENT_SERVICE_URL || '').replace(/\/+$/, '');
const PAYMENT_SERVICE_API_PREFIX = '/api';

const buildPaymentPath = (path: string) =>
  `${PAYMENT_SERVICE_API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
const PAYMENT_SERVICE_TIMEOUT_MS = Number(process.env.PAYMENT_SERVICE_TIMEOUT_MS || 5000);

type PaymentServiceRecord = {
  id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  customerId?: string | null;
  appointmentId?: string | null;
  metadata?: Record<string, unknown> | null;
};

const paymentClient = axios.create({
  baseURL: PAYMENT_SERVICE_BASE_URL,
  timeout: PAYMENT_SERVICE_TIMEOUT_MS
});

type TenantClient = ReturnType<typeof tenantPrisma>;

const AUTH_REQUIRED_ERROR = 'Authentication required';

function requireTenantContext(req: TenantRequest, res: Response): {
  auth: ReturnType<typeof assertAuth>;
  tenantId: string;
  tenantClient: TenantClient;
} | null {
  try {
    const auth = assertAuth(req);
    const rawTenantId = req.tenantId ?? auth.tenantId;

    if (!rawTenantId) {
      res.status(403).json({
        success: false,
        error: 'Tenant context is required'
      });
      return null;
    }

    const tenantId = rawTenantId as string;
    const tenantClient = tenantPrisma(tenantId);
    return { auth, tenantId, tenantClient };
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
}

type ClientProfileInfo = {
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
};

async function fetchPaymentRecord(tenantId: string, paymentId: string): Promise<PaymentServiceRecord> {
  try {
    const response = await paymentClient.get(buildPaymentPath(`/payments/${paymentId}`), {
      headers: {
        'x-tenant-id': tenantId
      }
    });
    return response.data?.data as PaymentServiceRecord;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;
      throw new Error(`Failed to fetch payment ${paymentId}: ${message} (${status ?? 'no status'})`);
    }
    throw error;
  }
}

async function createCashPaymentRecord(params: {
  tenantId: string;
  amount: number;
  currency: string;
  description?: string;
  customerId?: string;
}): Promise<PaymentServiceRecord> {
  const idempotencyKey = crypto.randomUUID();
  try {
    const response = await paymentClient.post(
      buildPaymentPath('/payments/manual'),
      {
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        customerId: params.customerId,
        method: 'CASH'
      },
      {
        headers: {
          'x-tenant-id': params.tenantId,
          'idempotency-key': idempotencyKey
        }
      }
    );
    return response.data?.data as PaymentServiceRecord;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;
      throw new Error(`Failed to create manual payment: ${message} (${status ?? 'no status'})`);
    }
    throw error;
  }
}

async function linkPaymentToAppointment(params: {
  tenantId: string;
  paymentId: string;
  appointmentId: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
}) {
  try {
    await paymentClient.patch(
      buildPaymentPath(`/payments/${params.paymentId}`),
      {
        appointmentId: params.appointmentId,
        status: params.status,
        paymentMethod: params.paymentMethod
      },
      {
        headers: {
          'x-tenant-id': params.tenantId
        }
      }
    );
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;
      throw new Error(`Failed to link payment ${params.paymentId} to appointment ${params.appointmentId}: ${message} (${status ?? 'no status'})`);
    }
    throw error;
  }
}

async function sendInvoiceEmail(options: {
  tenantId: string;
  paymentId: string;
  recipientEmail: string;
  locale?: 'ru' | 'en';
}) {
  const idempotencyKey = crypto.randomUUID();
  try {
    await paymentClient.post(
      buildPaymentPath(`/invoices/${options.paymentId}/email`),
      {
        to: options.recipientEmail,
        locale: options.locale ?? 'ru'
      },
      {
        headers: {
          'x-tenant-id': options.tenantId,
          'idempotency-key': idempotencyKey
        }
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;
      throw new Error(`Failed to send invoice email: ${message} (${status ?? 'no status'})`);
    }
    throw error;
  }
}

// Validation schemas
const BaseAppointmentSchema = z.object({
  // Old flow: existing CRM client by ID
  clientId: z.string().optional(),

  // New walk-in flow: client by email
  clientEmail: z.string().email('Invalid email format').optional(),
  clientData: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().optional(),
    birthdate: z.string().optional()
  }).optional(),

  // Issue #79: Multiple services support
  serviceIds: z.array(z.string().min(1)).min(1, 'At least one service is required').optional(),

  // LEGACY: Single service (for backward compatibility during migration)
  serviceId: z.string().min(1).optional(),

  // Issue #80: Multiple staff support
  staffIds: z.array(z.string().min(1)).min(1, 'At least one staff member is required').optional(),

  // LEGACY: Single staff (for backward compatibility during migration)
  staffId: z.string().min(1, 'Staff member is required').optional(),
  startAt: z.string().min(1, 'Start time is required'),
  endAt: z.string().min(1, 'End time is required').optional(), // Optional: backend will calculate if not provided
  notes: z.string().optional()
});

const PaymentDetailsSchema = z.object({
  method: z.enum(['CARD', 'CASH']).default('CASH'),
  paymentId: z.string().optional(),
  amount: z.number().int().positive('Payment amount must be positive'),
  currency: z.string().min(1, 'Currency is required')
});

const CreateAppointmentSchema = BaseAppointmentSchema.extend({
  payment: PaymentDetailsSchema.optional()
}).refine(
  (data) => data.clientId || data.clientEmail,
  {
    message: 'Either clientId or clientEmail must be provided'
  }
).refine(
  (data) => data.serviceIds?.length || data.serviceId,
  {
    message: 'Either serviceIds array or serviceId must be provided'
  }
).refine(
  (data) => data.staffIds?.length || data.staffId,
  {
    message: 'Either staffIds array or staffId must be provided (Issue #80)'
  }
);

const UpdateAppointmentSchema = BaseAppointmentSchema.partial().extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional()
});

const UpdateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
});

// ========================================
// Helper functions for Issue #79
// ========================================

/**
 * Issue #80: Check appointment time conflicts for multiple staff members
 * Returns map of { staffId: hasConflict } for detailed error response
 */
async function checkMultiStaffConflicts(
  staffIds: string[],
  startAt: Date,
  endAt: Date,
  tenantId: string,
  tenantClient: TenantClient,
  excludeAppointmentId?: string
): Promise<{ conflictMap: Record<string, boolean>; conflictingStaffIds: string[] }> {
  const conflictMap: Record<string, boolean> = {};
  const conflictingStaffIds: string[] = [];

  for (const staffId of staffIds) {
    const conflictingAppointment = await tenantClient.appointment.findFirst({
      where: {
        staffMembers: {
          some: { staffId }
        },
        startAt: { lte: endAt },
        endAt: { gte: startAt },
        status: { not: 'CANCELLED' },
        tenantId,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined
      },
      select: { id: true, appointmentNumber: true, startAt: true }
    });

    conflictMap[staffId] = !!conflictingAppointment;
    if (conflictingAppointment) {
      conflictingStaffIds.push(staffId);
    }
  }

  return { conflictMap, conflictingStaffIds };
}

/**
 * Issue #80: Normalize staffMembers from AppointmentStaff junction records
 */
async function normalizeAppointmentWithStaffMembers(
  appointment: any
): Promise<any> {
  // Fetch appointment staff with user details
  const appointmentStaff = await prisma.appointmentStaff.findMany({
    where: { appointmentId: appointment.id },
    include: { staff: true },
    orderBy: { sequenceOrder: 'asc' }
  });

  // Transform to response format
  const staffMembers = appointmentStaff.map((as) => ({
    id: as.staffId,
    firstName: as.staff.firstName,
    lastName: as.staff.lastName,
    role: as.role,
    sequenceOrder: as.sequenceOrder,
    confirmedAt: as.confirmedAt
  }));

  return {
    ...appointment,
    staffMembers // Add staffMembers array
  };
}

/**
 * Normalize appointment with services from Prisma query result
 * Transforms raw Prisma data into AppointmentWithServices response format
 */
async function normalizeAppointmentWithServices(
  appointment: any,
  tenantClient: TenantClient
): Promise<AppointmentWithServices> {
  // Fetch appointment services with related service details
  const appointmentServices = await prisma.appointmentService.findMany({
    where: { appointmentId: appointment.id },
    include: { service: true }
  });

  // Transform to response format
  const services: AppointmentServiceSnapshot[] = appointmentServices.map((as) => ({
    id: as.id,
    appointmentId: as.appointmentId,
    serviceId: as.serviceId,
    name: as.name,
    price: toNumber(as.price),
    duration: as.duration,
    currency: as.currency,
    createdAt: as.createdAt,
    updatedAt: as.updatedAt
  }));

  return {
    id: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    tenantId: appointment.tenantId,
    date: appointment.date,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    clientId: appointment.clientId,
    clientName: appointment.client?.name,
    assignedToId: appointment.assignedToId,
    staffName: appointment.assignedTo?.firstName + ' ' + appointment.assignedTo?.lastName,
    services,
    totalDuration: appointment.totalDuration,
    totalPrice: toNumber(appointment.totalPrice),
    currency: appointment.currency,
    status: appointment.status,
    notes: appointment.notes,
    paymentMethod: appointment.paymentMethod,
    paymentStatus: appointment.paymentStatus,
    paymentId: appointment.paymentId,
    createdById: appointment.createdById,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt
  };
}

// GET /api/appointments - Получить все записи салона
router.get('/', wrapTenantRoute(async (req, res): Promise<void> => {
  try {
    const context = requireTenantContext(req, res);
    if (!context) {
      return;
    }

    const { tenantId, tenantClient } = context;
    const { 
      page = 1, 
      limit = 50, 
      date,
      staffId,
      clientId,
      status = 'all',
      startDate,
      endDate
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: Record<string, unknown> = {
      tenantId
    };
    
    // Фильтр по дате (используем date поле)
    if (date && typeof date === 'string') {
      const dateStart = new Date(date + 'T00:00:00.000Z');
      const dateEnd = new Date(date + 'T23:59:59.999Z');
      where.date = {
        gte: dateStart,
        lte: dateEnd
      };
    }
    
    // Фильтр по диапазону дат
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    // Фильтр по сотруднику
    if (staffId && typeof staffId === 'string') {
      where.assignedToId = staffId;
    }
    
    // Фильтр по клиенту
    if (clientId && typeof clientId === 'string') {
      where.clientId = clientId;
    }
    
    // Фильтр по статусу
    if (status !== 'all') {
      where.status = status;
    }
    
    const [appointments, totalCount] = await Promise.all([
      tenantClient.appointment.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
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
              },
              subcategory: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              color: true,
              avatar: true
            }
          }
        },
        orderBy: [
          { date: 'asc' },
          { startAt: 'asc' }
        ],
        take: Number(limit),
        skip: offset
      }),
      tenantClient.appointment.count({ where })
    ]);
    
    const clientEmails = appointments
      .map((apt: any) => apt.client?.email)
      .filter((email: string | null | undefined): email is string => Boolean(email));

    let clientProfileMap = new Map<string, ClientProfileInfo>();
    if (clientEmails.length > 0) {
      const profiles = await tenantPrisma(null).clientProfile.findMany({
        where: { email: { in: clientEmails } },
        select: { email: true, firstName: true, lastName: true, avatar: true }
      });
      clientProfileMap = new Map(profiles.map(profile => [profile.email, profile]));
    }

    // Issue #79: Fetch all AppointmentService records for this list
    const appointmentIds = appointments.map(a => a.id);
    const appointmentServicesMap = new Map<string, any[]>();

    if (appointmentIds.length > 0) {
      const allServices = await prisma.appointmentService.findMany({
        where: { appointmentId: { in: appointmentIds } },
        orderBy: { createdAt: 'asc' }
      });

      for (const service of allServices) {
        if (!appointmentServicesMap.has(service.appointmentId)) {
          appointmentServicesMap.set(service.appointmentId, []);
        }
        appointmentServicesMap.get(service.appointmentId)!.push(service);
      }
    }

    // Issue #80: Fetch all AppointmentStaff records for this list (batch optimization)
    const appointmentStaffMap = new Map<string, any[]>();

    if (appointmentIds.length > 0) {
      const allStaff = await prisma.appointmentStaff.findMany({
        where: { appointmentId: { in: appointmentIds } },
        include: { staff: true },
        orderBy: { sequenceOrder: 'asc' }
      });

      for (const staffRecord of allStaff) {
        if (!appointmentStaffMap.has(staffRecord.appointmentId)) {
          appointmentStaffMap.set(staffRecord.appointmentId, []);
        }
        appointmentStaffMap.get(staffRecord.appointmentId)!.push(staffRecord);
      }
    }

    // Transform appointments to list format (Issue #79: with services array)
    const calendarAppointments = appointments.map((apt: any) => {
      const profile = apt.client?.email ? clientProfileMap.get(apt.client.email) : undefined;
      const fallbackName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();

      // Issue #79: Get services from AppointmentService records
      const appointmentServiceRecords = appointmentServicesMap.get(apt.id) || [];
      const servicesList = appointmentServiceRecords.map((as) => ({
        id: as.id,
        name: as.name,
        price: toNumber(as.price),
        duration: as.duration,
        currency: as.currency
      }));

      // Issue #80: Get staff members from AppointmentStaff records
      const appointmentStaffRecords = appointmentStaffMap.get(apt.id) || [];
      const staffMembersList = appointmentStaffRecords.map((as) => ({
        id: as.staffId,
        firstName: as.staff.firstName,
        lastName: as.staff.lastName,
        role: as.role,
        sequenceOrder: as.sequenceOrder
      }));

      return {
        id: apt.id,
        appointmentNumber: apt.appointmentNumber,
        clientId: apt.clientId,
        clientName: apt.client?.name || fallbackName || 'Unknown Client',
        clientAvatarUrl: profile?.avatar ?? null,
        // Issue #79: Multiple services support
        services: servicesList,
        // Issue #80: Multiple staff support
        staffMembers: staffMembersList,
        totalPrice: toNumber(apt.totalPrice),
        totalDuration: apt.totalDuration,
        currency: apt.currency || 'PLN',
        // Legacy single service for backward compatibility
        serviceIds: appointmentServiceRecords.map(s => s.id),
        serviceNames: appointmentServiceRecords.map(s => s.name),
        serviceCategoryId: apt.service?.category?.id ?? null,
        serviceCategoryName: apt.service?.category?.name ?? null,
        serviceSubcategoryId: apt.service?.subcategory?.id ?? null,
        serviceSubcategoryName: apt.service?.subcategory?.name ?? null,
        staffId: apt.assignedToId,
        staffName: apt.assignedTo ? `${apt.assignedTo.firstName} ${apt.assignedTo.lastName}`.trim() : 'Unassigned',
        startAt: apt.startAt.toISOString(),
        endAt: apt.endAt.toISOString(),
        status: apt.status,
        price: toNumber(apt.totalPrice),
        notes: apt.notes || '',
        staffColor: apt.assignedTo?.color || '#6366f1',
        timezone: 'Europe/Warsaw'
      };
    });

    res.json({
      success: true,
      appointments: calendarAppointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
    return;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments'
    });
    return;
  }
}));

// GET /api/appointments/check-availability - Проверить свободные слоты мастера
router.get('/check-availability', wrapTenantRoute(async (req, res) => {
  try {
    const { staffId, date, duration } = req.query;

    if (!staffId || typeof staffId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'staffId query parameter is required'
      });
    }

    if (!date || typeof date !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'date query parameter is required (YYYY-MM-DD)'
      });
    }

    const slotDuration = Math.max(
      SLOT_INTERVAL_MINUTES,
      Number.parseInt((duration as string) || `${SLOT_INTERVAL_MINUTES}`, 10) || SLOT_INTERVAL_MINUTES
    );

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const appointments = await tenantPrisma(req.tenantId as any).appointment.findMany({
      where: {
        tenantId: req.tenantId,
        assignedToId: staffId,
        startAt: {
          gte: dayStart,
          lte: dayEnd
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      },
      select: {
        startAt: true,
        endAt: true
      },
      orderBy: {
        startAt: 'asc'
      }
    });

    const busyWindows = appointments.map(appointment => ({
      start: appointment.startAt.getTime(),
      end: appointment.endAt.getTime()
    }));

    const slots = buildDailySlots().map(time => {
      const slotStart = new Date(`${date}T${time}:00Z`).getTime();
      const slotEnd = slotStart + toMillis(slotDuration);
      const overlaps = busyWindows.some(window => slotStart < window.end && slotEnd > window.start);

      return {
        time,
        available: !overlaps
      };
    });

    return res.json({
      success: true,
      slots,
      metadata: {
        staffId,
        date,
        slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
        assumedDurationMinutes: slotDuration
      }
    });
  } catch (error) {
    console.error('Error checking staff availability:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    });
  }
}));

// GET /api/appointments/calendar - Получить записи для календаря
router.get('/calendar', wrapTenantRoute(async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const appointments = await tenantPrisma(req.tenantId as any).appointment.findMany({
      where: {
        tenantId: req.tenantId,
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true, email: true }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            category: {
              select: {
                id: true,
                name: true
              }
            },
            subcategory: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, color: true, avatar: true }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startAt: 'asc' }
      ]
    });
    
    const clientEmails = appointments
      .map((appointment: any) => appointment.client?.email)
      .filter((email: string | null | undefined): email is string => Boolean(email));

    let clientProfileMap = new Map<string, ClientProfileInfo>();
    if (clientEmails.length > 0) {
      const profiles = await tenantPrisma(null).clientProfile.findMany({
        where: { email: { in: clientEmails } },
        select: { email: true, firstName: true, lastName: true, avatar: true }
      });
      clientProfileMap = new Map(profiles.map(profile => [profile.email, profile]));
    }
    
    // Issue #79: Fetch all AppointmentService records for calendar display
    const appointmentIds = appointments.map(a => a.id);
    const appointmentServicesMap = new Map<string, any[]>();

    if (appointmentIds.length > 0) {
      const allServices = await prisma.appointmentService.findMany({
        where: { appointmentId: { in: appointmentIds } },
        orderBy: { createdAt: 'asc' }
      });

      for (const service of allServices) {
        if (!appointmentServicesMap.has(service.appointmentId)) {
          appointmentServicesMap.set(service.appointmentId, []);
        }
        appointmentServicesMap.get(service.appointmentId)!.push(service);
      }
    }

    // Issue #80: Fetch all AppointmentStaff records for calendar display (batch optimization)
    const appointmentStaffMap = new Map<string, any[]>();

    if (appointmentIds.length > 0) {
      const allStaff = await prisma.appointmentStaff.findMany({
        where: { appointmentId: { in: appointmentIds } },
        include: { staff: true },
        orderBy: { sequenceOrder: 'asc' }
      });

      for (const staffRecord of allStaff) {
        if (!appointmentStaffMap.has(staffRecord.appointmentId)) {
          appointmentStaffMap.set(staffRecord.appointmentId, []);
        }
        appointmentStaffMap.get(staffRecord.appointmentId)!.push(staffRecord);
      }
    }

    // Форматируем для календаря
    const calendarEvents = appointments.map((appointment: any) => {
      const profile = appointment.client?.email ? clientProfileMap.get(appointment.client.email) : undefined;
      const clientName = appointment.client?.name || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || 'Unknown Client';

      // Issue #79: Get services from AppointmentService records
      const appointmentServiceRecords = appointmentServicesMap.get(appointment.id) || [];
      const servicesList = appointmentServiceRecords.map((as) => ({
        id: as.id,
        name: as.name,
        price: toNumber(as.price),
        duration: as.duration,
        currency: as.currency
      }));

      // Issue #80: Get staff members from AppointmentStaff records
      const appointmentStaffRecords = appointmentStaffMap.get(appointment.id) || [];
      const staffMembersList = appointmentStaffRecords.map((as) => ({
        id: as.staffId,
        firstName: as.staff.firstName,
        lastName: as.staff.lastName,
        role: as.role,
        sequenceOrder: as.sequenceOrder
      }));

      return {
        id: appointment.id,
        title: `${appointment.appointmentNumber} - ${clientName} - ${appointment.service?.name || 'Unknown Service'}`,
        start: appointment.startAt.toISOString(),
        end: appointment.endAt.toISOString(),
        backgroundColor: appointment.assignedTo?.color || '#6366f1',
        borderColor: appointment.assignedTo?.color || '#6366f1',
        extendedProps: {
          appointmentNumber: appointment.appointmentNumber,
          client: {
            ...appointment.client,
            name: clientName,
            avatarUrl: profile?.avatar ?? null
          },
          clientAvatarUrl: profile?.avatar ?? null,
          // Legacy single service for backward compatibility
          service: appointment.service,
          serviceCategoryId: appointment.service?.category?.id ?? null,
          serviceCategoryName: appointment.service?.category?.name ?? null,
          serviceSubcategoryId: appointment.service?.subcategory?.id ?? null,
          serviceSubcategoryName: appointment.service?.subcategory?.name ?? null,
          // Issue #79: Multiple services in extendedProps
          services: servicesList,
          // Issue #80: Multiple staff members in extendedProps
          staffMembers: staffMembersList,
          totalPrice: appointment.totalPrice,
          totalDuration: appointment.totalDuration,
          currency: appointment.currency,
          staff: appointment.assignedTo,
          status: appointment.status,
          notes: appointment.notes
        }
      };
    });
    
    res.json({
      success: true,
      data: calendarEvents
    });
    
  } catch (error) {
    console.error('Error fetching calendar appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar appointments'
    });
  }
  return undefined;
}));

// GET /api/appointments/:id - Получить запись по ID (Issue #79: с массивом услуг)
router.get('/:id', wrapTenantRoute(async (req, res) => {
  try {
    const context = requireTenantContext(req, res);
    if (!context) {
      return;
    }
    const { tenantId, tenantClient } = context;

    // Fetch appointment with basic relations
    const appointment = await tenantClient.appointment.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            isDefault: true,
            isActive: true,
            category: {
              select: {
                id: true,
                name: true
              }
            },
            subcategory: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            color: true,
            avatar: true,
            email: true,
            phone: true
          }
        }
      }
    }) as any;

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Issue #79: Fetch AppointmentService records for this appointment
    const appointmentServices = await prisma.appointmentService.findMany({
      where: { appointmentId: appointment.id },
      orderBy: { createdAt: 'asc' }
    });

    // Issue #80: Fetch AppointmentStaff records (multiple staff support)
    const appointmentStaff = await prisma.appointmentStaff.findMany({
      where: { appointmentId: appointment.id },
      include: { staff: true },
      orderBy: { sequenceOrder: 'asc' }
    });

    const clientProfile = appointment.client?.email
      ? await tenantPrisma(null).clientProfile.findUnique({
          where: { email: appointment.client.email },
          select: { email: true, firstName: true, lastName: true, avatar: true }
        })
      : null;

    const clientName =
      appointment.client?.name ||
      [clientProfile?.firstName, clientProfile?.lastName].filter(Boolean).join(' ').trim() ||
      'Unknown Client';

    // Issue #79: Transform to AppointmentWithServices format
    const appointmentResponse = {
      ...appointment,
      // Services array (from AppointmentService snapshots)
      services: appointmentServices.map((as) => ({
        id: as.id,
        serviceId: as.serviceId,
        name: as.name,
        price: toNumber(as.price),
        duration: as.duration,
        currency: as.currency,
        createdAt: as.createdAt,
        updatedAt: as.updatedAt
      })),
      // Legacy single service for backward compatibility
      service: appointment.service,
      // Issue #80: Staff members array (from AppointmentStaff records)
      staffMembers: appointmentStaff.map((as) => ({
        id: as.staffId,
        firstName: as.staff.firstName,
        lastName: as.staff.lastName,
        role: as.role,
        sequenceOrder: as.sequenceOrder,
        confirmedAt: as.confirmedAt,
        email: as.staff.email,
        phone: as.staff.phone,
        avatar: as.staff.avatar,
        color: as.staff.color
      })),
      clientName,
      clientAvatarUrl: clientProfile?.avatar ?? null,
      // Переименовываем assignedTo в staff для фронта
      staff: appointment.assignedTo ? {
        id: appointment.assignedTo.id,
        firstName: appointment.assignedTo.firstName,
        lastName: appointment.assignedTo.lastName,
        color: appointment.assignedTo.color,
        email: appointment.assignedTo.email,
        phone: appointment.assignedTo.phone,
        avatar: appointment.assignedTo.avatar ?? null,
        avatarUrl: appointment.assignedTo.avatar ?? null
      } : null,
      client: appointment.client
        ? {
            ...appointment.client,
            name: clientName,
            avatar: clientProfile?.avatar ?? null,
            avatarUrl: clientProfile?.avatar ?? null,
            firstName: clientProfile?.firstName ?? appointment.client.name?.split(' ')?.[0] ?? null,
            lastName: clientProfile?.lastName ?? appointment.client.name?.split(' ')?.slice(1).join(' ') ?? null
          }
        : null
    };

    res.json({
      success: true,
      data: appointmentResponse
    });

  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointment'
    });
  }
  return undefined;
}));

// POST /api/appointments - Создать новую запись
router.post('/', wrapTenantRoute(async (req, res) => {
  try {
    const context = requireTenantContext(req, res);
    if (!context) {
      return;
    }
    const { auth, tenantId, tenantClient } = context;
    const validatedData = CreateAppointmentSchema.parse(req.body);

    // Определяем клиента: либо по clientId (старый flow), либо по clientEmail (walk-in flow)
    let client: any;
    let clientProfile: any = null; // ClientProfile для создания ClientSalonRelation
    let isNewClient = false; // Флаг для отправки invitation email

    if (validatedData.clientId) {
      // OLD FLOW: Existing client by ID
      client = await tenantClient.client.findFirst({
        where: { id: validatedData.clientId, tenantId }
      });

      if (!client) {
        return res.status(400).json({
          success: false,
          error: 'Client not found'
        });
      }
    } else if (validatedData.clientEmail) {
      // NEW WALK-IN FLOW: Check ClientProfile by email
      const normalizedEmail = validatedData.clientEmail.toLowerCase().trim();
      clientProfile = await tenantPrisma(null).clientProfile.findUnique({
        where: { email: normalizedEmail },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          phoneVerified: true,
          birthdate: true,
          avatar: true
        }
      });

      if (clientProfile) {
        // ClientProfile EXISTS: Sync to Client table (read-only from ClientProfile)

        // IMPORTANT: Search by EMAIL ONLY (email is primary key in ClientProfile)
        // Phone can be shared between different clients (family members, etc.)
        client = await tenantClient.client.findFirst({
          where: {
            tenantId,
            email: clientProfile.email
          }
        });

        if (client) {
          // Client exists - update with latest ClientProfile data
          client = await tenantClient.client.update({
            where: { id: client.id },
            data: {
              // Always sync name from ClientProfile (single source of truth)
              name: `${clientProfile.firstName} ${clientProfile.lastName}`,
              // Always sync phone from ClientProfile
              phone: clientProfile.phone || undefined,
              // Always sync birthday from ClientProfile
              birthday: clientProfile.birthdate || undefined
            }
          });
          console.log(`[WALK-IN] ✅ Client synced from ClientProfile: ${clientProfile.email} (ID: ${client.id})`);
        } else {
          // Client doesn't exist in this salon - create new
          // Check if phone is already used by another client in this salon
          const existingClientWithPhone = clientProfile.phone
            ? await tenantClient.client.findFirst({
                where: {
                  tenantId,
                  phone: clientProfile.phone,
                  email: { not: clientProfile.email } // Different email
                }
              })
            : null;

          if (existingClientWithPhone) {
            // Phone conflict: return error
            return res.status(409).json({
              success: false,
              error: `Phone number ${clientProfile.phone} is already registered for another client (${existingClientWithPhone.email}). Please contact salon administrator.`,
              code: 'PHONE_CONFLICT'
            });
          }

          // No conflicts - create new client
          client = await tenantClient.client.create({
            data: {
              tenantId,
              name: `${clientProfile.firstName} ${clientProfile.lastName}`,
              email: clientProfile.email,
              ...buildOptional('phone', clientProfile.phone),
              ...buildOptional('birthday', clientProfile.birthdate ?? undefined),
              notes: validatedData.notes || 'Синхронизировано из ClientProfile',
              status: 'ACTIVE'
            }
          });
          console.log(`[WALK-IN] ✅ New client created from ClientProfile: ${clientProfile.email}`);
        }
      } else {
        // ClientProfile NOT EXISTS: Create new client from clientData
        if (!validatedData.clientData) {
          return res.status(400).json({
            success: false,
            error: 'clientData is required when creating a new client without ClientProfile'
          });
        }

        client = await tenantClient.client.create({
          data: {
            tenantId,
            name: `${validatedData.clientData.firstName} ${validatedData.clientData.lastName}`,
            email: validatedData.clientEmail.toLowerCase().trim(),
            ...buildOptional('phone', validatedData.clientData.phone),
            ...buildOptional(
              'birthday',
              validatedData.clientData.birthdate ? new Date(validatedData.clientData.birthdate) : undefined
            ),
            notes: validatedData.notes,
            status: 'ACTIVE'
          }
        });

        isNewClient = true; // Flag to send invitation email
        console.log(`[WALK-IN] ✅ New client created: ${client.email}`);
      }
    }

    // === CRITICAL: Create ClientSalonRelation for Client Portal ===
    // Ensure ClientSalonRelation exists so salon appears in My Salons
    if (clientProfile && client) {
      const existingRelation = await prisma.clientSalonRelation.findFirst({
        where: {
          clientEmail: clientProfile.email,
          tenantId
        }
      });

      if (!existingRelation) {
        await prisma.clientSalonRelation.create({
          data: {
            clientEmail: clientProfile.email,
            tenantId,
            loyaltyTier: 'BRONZE',
            loyaltyPoints: 0,
            totalSpent: 0,
            visitCount: 0,
            joinedSalonAt: new Date()
          }
        });
        console.log(`[WALK-IN] ✅ ClientSalonRelation created: ${clientProfile.email} → Salon ${tenantId}`);
      } else {
        console.log(`[WALK-IN] ℹ️ ClientSalonRelation already exists: ${clientProfile.email} → Salon ${tenantId}`);
      }
    }

    // Issue #79: Determine service IDs (either serviceIds array or single serviceId)
    const serviceIds = validatedData.serviceIds?.length
      ? validatedData.serviceIds
      : validatedData.serviceId
      ? [validatedData.serviceId]
      : [];

    if (serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one service is required'
      });
    }

    // Issue #80: Determine staff IDs (either staffIds array or single staffId)
    const staffIds = validatedData.staffIds?.length
      ? validatedData.staffIds
      : validatedData.staffId
      ? [validatedData.staffId]
      : [];

    if (staffIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one staff member is required'
      });
    }

    // Fetch all staff members (Issue #80: validation for multiple staff)
    const staffMembers = await tenantClient.user.findMany({
      where: {
        id: { in: staffIds },
        tenantId,
        isBookable: true
      },
      select: { id: true, firstName: true, lastName: true, isBookable: true }
    });

    if (staffMembers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No staff members found'
      });
    }

    if (staffMembers.length !== staffIds.length) {
      const foundIds = staffMembers.map(s => s.id);
      const missingIds = staffIds.filter(id => !foundIds.includes(id));
      return res.status(400).json({
        success: false,
        error: `Staff members not found: ${missingIds.join(', ')}`
      });
    }

    // Backward compatibility: Use first staff member for assignedToId
    const primaryStaffId = staffIds[0];

    // Fetch all services (Issue #79: multiple services support)
    const services = await tenantClient.service.findMany({
      where: {
        id: { in: serviceIds },
        tenantId
      }
    });

    if (services.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No services found'
      });
    }

    if (services.length !== serviceIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more services not found or not available in this salon'
      });
    }

    // Convert ISO strings to Date objects
    const startAt = new Date(validatedData.startAt);

    // Issue #79: Calculate endAt based on total service duration
    const totalDurationMinutes = calculateTotalDuration(
      services.map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration,
        price: Number(s.price),
        currency: 'PLN'
      }))
    );

    const endAt = calculateEndAt(validatedData.startAt, totalDurationMinutes);

    // Issue #79: Calculate total price
    const totalPrice = calculateTotalPrice(
      services.map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration,
        price: Number(s.price),
        currency: 'PLN'
      }))
    );

    const currency = getCurrency(
      services.map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration,
        price: Number(s.price),
        currency: 'PLN'
      })),
      'PLN'
    );

    // Рассчитываем стоимость в минорных единицах для платежей
    const amountMinorUnits = Math.round(totalPrice * 100);
    const paymentRequest = validatedData.payment ?? {
      method: 'CASH',
      amount: amountMinorUnits,
      currency
    };
    const paymentCurrency = (paymentRequest.currency || currency).toUpperCase();

    if (paymentRequest.amount && paymentRequest.amount !== amountMinorUnits) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount does not match service price'
      });
    }

    // Issue #80: Check conflicts for ALL staff members independently
    const { conflictMap, conflictingStaffIds } = await checkMultiStaffConflicts(
      staffIds,
      startAt,
      endAt,
      tenantId,
      tenantClient
    );

    if (conflictingStaffIds.length > 0) {
      // Return detailed conflict information for each staff member
      const conflictDetails = conflictingStaffIds.map(staffId => {
        const staff = staffMembers.find(s => s.id === staffId);
        return {
          staffId,
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown',
          hasConflict: true
        };
      });

      return res.status(409).json({
        success: false,
        error: 'Some staff members are already booked at this time',
        code: 'STAFF_CONFLICT',
        conflictingStaff: conflictDetails,
        conflictMap // Include full map for detailed frontend handling
      });
    }

    // Подготавливаем платеж
    let paymentMethod: PaymentMethod = paymentRequest.method === 'CARD' ? PaymentMethod.CARD : PaymentMethod.CASH;
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let paymentRecordId: string | undefined;

    if (paymentMethod === PaymentMethod.CARD) {
      if (!paymentRequest.paymentId) {
        return res.status(400).json({
          success: false,
          error: 'paymentId is required for card payments'
        });
      }

      const paymentRecord = await fetchPaymentRecord(tenantId, paymentRequest.paymentId);

      if (!paymentRecord) {
        return res.status(404).json({
          success: false,
          error: 'Payment record not found'
        });
      }

      if (paymentRecord.status.toUpperCase() !== 'SUCCEEDED') {
        return res.status(400).json({
          success: false,
          error: 'Card payment is not completed'
        });
      }

      if (paymentRecord.amount !== amountMinorUnits) {
        return res.status(400).json({
          success: false,
          error: 'Payment amount mismatch'
        });
      }

      if (paymentRecord.currency.toUpperCase() !== paymentCurrency) {
        return res.status(400).json({
          success: false,
          error: 'Payment currency mismatch'
        });
      }

      paymentRecordId = paymentRecord.id;
      paymentStatus = PaymentStatus.SUCCEEDED;
    } else {
      const manualPayment = await createCashPaymentRecord({
        tenantId,
        amount: amountMinorUnits,
        currency: paymentCurrency,
        description: `Appointment for services: ${services.map(s => s.name).join(', ')}`,
        customerId: client?.id || validatedData.clientEmail || undefined
      });

      paymentRecordId = manualPayment.id;
      paymentStatus = PaymentStatus.PENDING;
    }

    // Генерируем номер записи
    const appointmentDateKey = startAt.toISOString().slice(0, 10);
    const appointmentNumber = await generateAppointmentNumber(
      tenantId,
      appointmentDateKey
    );

    const resolvedClientId = validatedData.clientId || client?.id || null;
    const appointmentData: Prisma.AppointmentUncheckedCreateInput = {
      tenantId,
      appointmentNumber,
      clientId: resolvedClientId,
      serviceId: validatedData.serviceId || serviceIds[0], // Keep single serviceId for backward compatibility
      assignedToId: primaryStaffId, // Issue #80: Use first staff as primary for backward compatibility
      date: startAt,
      startAt,      // Issue #79: New field
      endAt,         // Issue #79: New field
      status: 'PENDING',
      notes: validatedData.notes ?? null,
      createdById: auth.userId ?? null,
      paymentId: paymentRecordId ?? null,
      paymentMethod,
      paymentStatus,
      // Issue #79: Multiple services support
      totalDuration: totalDurationMinutes,
      totalPrice: new Prisma.Decimal(totalPrice),
      currency
    };

    const appointment = await prisma.appointment.create({
      data: appointmentData,
      include: {
        client: true,
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            isDefault: true,
            isActive: true,
            category: {
              select: {
                id: true,
                name: true
              }
            },
            subcategory: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            color: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Issue #79: Create AppointmentService records for each service
    try {
      const appointmentServiceRecords = services.map((service) => ({
        id: crypto.randomUUID(),
        appointmentId: appointment.id,
        serviceId: service.id,
        name: service.name,
        price: new Prisma.Decimal(Number(service.price)),
        duration: service.duration,
        currency: 'PLN',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await prisma.appointmentService.createMany({
        data: appointmentServiceRecords,
        skipDuplicates: true
      });

      console.log(`[APPOINTMENTS] ✅ Created ${appointmentServiceRecords.length} AppointmentService records for appointment ${appointment.id}`);
    } catch (error) {
      console.warn(`[APPOINTMENTS] ⚠️ Failed to create AppointmentService records:`, error);
      // Don't block appointment creation if service records fail
    }

    // Issue #80: Create AppointmentStaff records for each staff member
    try {
      const appointmentStaffRecords = staffIds.map((staffId, index) => ({
        id: crypto.randomUUID(),
        appointmentId: appointment.id,
        staffId,
        role: index === 0 ? 'primary' : undefined, // Mark first staff as primary
        sequenceOrder: index,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await prisma.appointmentStaff.createMany({
        data: appointmentStaffRecords,
        skipDuplicates: true
      });

      console.log(`[APPOINTMENTS] ✅ Created ${appointmentStaffRecords.length} AppointmentStaff records for appointment ${appointment.id}`);
    } catch (error) {
      console.warn(`[APPOINTMENTS] ⚠️ Failed to create AppointmentStaff records:`, error);
      // Don't block appointment creation if staff records fail
    }

    if (paymentRecordId) {
      try {
        await linkPaymentToAppointment({
          tenantId,
          paymentId: paymentRecordId,
          appointmentId: appointment.id,
          status: paymentStatus,
          paymentMethod
        });
      } catch (error) {
        console.error('[APPOINTMENTS] Failed to link payment to appointment:', error);
      }
    }

    // 📧 Используем any для обхода TypeScript ошибок с includes
    const appointmentWithIncludes = appointment as any;

    // 🔔 Отправляем WebSocket событие создания записи (асинхронно)
    // Это позволит real-time обновлять интерфейсы салона и клиента
    try {
      const serviceName = appointmentWithIncludes.service?.name || 'Услуга';
      const staffName = appointmentWithIncludes.assignedTo
        ? `${appointmentWithIncludes.assignedTo.firstName} ${appointmentWithIncludes.assignedTo.lastName}`
        : 'Мастер';

      await emitAppointmentCreated({
        appointmentId: appointment.id,
        clientId: appointmentWithIncludes.client?.id || 'unknown',
        clientName: appointmentWithIncludes.client?.name || 'Гость',
        staffId: appointmentWithIncludes.assignedToId || 'unknown',
        staffName,
        tenantId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        service: serviceName
      });
    } catch (error) {
      console.error('[APPOINTMENTS] Failed to emit appointmentCreated event:', error);
      // Не блокируем response если эмиссия не сработает
    }

    // 📧 Отправляем email клиенту (асинхронно, не блокируем response)

    // Форматируем основные данные для уведомлений и email шаблонов
    const appointmentDate = startAt.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const appointmentTime = startAt.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });

    let tenantName: string | null = null;

    if (appointmentWithIncludes.client?.email) {
      const duration = Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60)); // minutes

      // Получаем название салона из tenant
      const tenant = await tenantClient.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true }
      });
      tenantName = tenant?.name ?? null;

      // Общие данные для обоих типов email
      const emailData = {
        clientName: appointmentWithIncludes.client.name,
        appointmentNumber: appointmentWithIncludes.appointmentNumber,
        serviceName: appointmentWithIncludes.service.name,
        staffName: `${appointmentWithIncludes.assignedTo.firstName} ${appointmentWithIncludes.assignedTo.lastName}`,
        appointmentDate,
        appointmentTime,
        duration,
        price: Number(appointmentWithIncludes.service.price),
        currency: 'PLN',
        salonName: tenantName || 'Beauty Salon',
        notes: appointmentWithIncludes.notes || undefined
      };

      if (paymentRecordId) {
        sendInvoiceEmail({
          tenantId,
          paymentId: paymentRecordId,
          recipientEmail: appointmentWithIncludes.client.email,
          locale: 'ru'
        }).catch(err => {
          console.error('[APPOINTMENTS] Ошибка отправки PDF инвойса:', err);
        });
      }

      if (isNewClient) {
        // НОВЫЙ КЛИЕНТ БЕЗ ClientProfile: Отправляем invitation email с CTA регистрации
        const clientPortalUrl = process.env.CLIENT_PORTAL_URL || 'https://client.beauty.designcorp.eu';
        const registrationLink = `${clientPortalUrl}/register?email=${encodeURIComponent(appointmentWithIncludes.client.email as any)}&tenantId=${encodeURIComponent(tenantId)}&locale=ru`;

        sendAppointmentInvitationEmail(appointmentWithIncludes.client.email, {
          ...emailData,
          registrationLink
        }).catch(err => {
          console.error('[APPOINTMENTS] Ошибка отправки email приглашения:', err);
        });

        console.log(`[APPOINTMENTS] ✅ Запись создана, email приглашения отправлен на ${appointmentWithIncludes.client.email}`);
      } else {
        // СУЩЕСТВУЮЩИЙ КЛИЕНТ: Отправляем confirmation email
        sendBookingConfirmationEmail(appointmentWithIncludes.client.email, emailData).catch(err => {
          console.error('[APPOINTMENTS] Ошибка отправки email подтверждения:', err);
        });

        console.log(`[APPOINTMENTS] ✅ Запись создана, email подтверждения отправлен на ${appointmentWithIncludes.client.email}`);
      }
    }

    // In-app notifications (best effort)
    try {
      const clientEmail = (validatedData.clientEmail || appointmentWithIncludes.client?.email || '').toLowerCase();

      const notificationTasks: Array<Promise<unknown>> = [];

      if (clientEmail) {
        notificationTasks.push(
          createClientPortalNotification({
            clientEmail,
            type: ClientNotificationType.APPOINTMENT_CONFIRMED,
            title: 'Запись подтверждена',
            message: `Ваша запись №${appointmentWithIncludes.appointmentNumber} на услугу "${appointmentWithIncludes.service.name}" подтверждена на ${appointmentDate} в ${appointmentTime}.`,
            priority: NotificationPriority.MEDIUM,
            metadata: {
              appointmentId: appointment.id,
              tenantId,
              serviceId: appointmentWithIncludes.serviceId,
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
              salonName: tenantName,
              staffId: appointmentWithIncludes.assignedTo?.id ?? null
            }
          })
        );
      }

      // ✅ Попытка создать notification для клиента
      if (clientEmail) {
        const clientUser = await prisma.user.findFirst({
          where: { email: clientEmail }
        });

        if (clientUser) {
          console.log(`[APPOINTMENTS] Found client user ${clientUser.id} for email ${clientEmail}`);
          notificationTasks.push(
            tenantClient.notification.create({
              data: {
                tenantId,
                userId: clientUser.id,
                type: 'IN_APP',
                title: 'Новая запись подтверждена',
                message: `Ваша запись №${appointmentWithIncludes.appointmentNumber} на услугу "${appointmentWithIncludes.service.name}" успешно создана на ${appointmentDate} в ${appointmentTime}.`,
                priority: 'MEDIUM',
                metadata: {
                  appointmentId: appointment.id,
                  startAt: startAt.toISOString(),
                  paymentMethod,
                  paymentStatus
                }
              }
            }).catch(err => {
              console.error(`[APPOINTMENTS] Failed to create notification for client ${clientUser.id}:`, err);
              throw err;
            })
          );
        } else {
          console.warn(`[APPOINTMENTS] No User found for client email ${clientEmail}`);
        }
      }

      if (appointmentWithIncludes.assignedTo?.id) {
        notificationTasks.push(
          tenantClient.notification.create({
            data: {
              tenantId,
              userId: appointmentWithIncludes.assignedTo.id,
              type: 'IN_APP',
              title: 'Новая запись',
              message: `Новая запись №${appointmentWithIncludes.appointmentNumber} с клиентом ${appointmentWithIncludes.client?.name || ''}.`,
              metadata: {
                appointmentId: appointment.id,
                startAt: startAt.toISOString(),
                paymentMethod,
                paymentStatus
              }
            }
          })
        );
      }

      if (notificationTasks.length) {
        await Promise.allSettled(notificationTasks);
      }
    } catch (notificationError) {
      console.error('[APPOINTMENTS] Ошибка создания in-app уведомлений:', notificationError);
    }

    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment created successfully'
    });
    
  } catch (error) {
    console.error('Error creating appointment:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment'
    });
  }
  return undefined;
}));

// PUT /api/appointments/:id - Обновить запись (Issue #79: поддержка serviceIds[])
router.put('/:id', wrapTenantRoute(async (req, res) => {
  try {
    const context = requireTenantContext(req, res);
    if (!context) {
      return;
    }
    const { tenantId, tenantClient } = context;
    const validatedData = UpdateAppointmentSchema.parse(req.body);

    const existingAppointment = await tenantClient.appointment.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Issue #79: Determine service IDs (either serviceIds array or single serviceId)
    const newServiceIds = validatedData.serviceIds?.length
      ? validatedData.serviceIds
      : validatedData.serviceId
      ? [validatedData.serviceId]
      : null;

    // Валидируем существование новых serviceId/serviceIds если они указаны
    if (newServiceIds && newServiceIds.length > 0) {
      const services = await tenantClient.service.findMany({
        where: {
          id: { in: newServiceIds },
          tenantId: req.tenantId
        }
      });

      if (services.length !== newServiceIds.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more services not found or not available in this salon'
        });
      }
    }

    if (validatedData.staffId) {
      const staffExists = await tenantClient.user.findFirst({
        where: { id: validatedData.staffId, tenantId: req.tenantId, isBookable: true }
      });
      if (!staffExists) {
        return res.status(400).json({
          success: false,
          error: 'Staff member not found or not available in this salon'
        });
      }
    }

    // Issue #80: Determine staff IDs (either staffIds array or single staffId)
    const newStaffIds = validatedData.staffIds?.length
      ? validatedData.staffIds
      : validatedData.staffId
      ? [validatedData.staffId]
      : null;

    // Валидируем существование новых staffId/staffIds если они указаны
    if (newStaffIds && newStaffIds.length > 0) {
      const staffMembers = await tenantClient.user.findMany({
        where: {
          id: { in: newStaffIds },
          tenantId: req.tenantId,
          isBookable: true
        }
      });

      if (staffMembers.length !== newStaffIds.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more staff members not found or not available in this salon'
        });
      }
    }

    // Если меняется время/дата/сотрудник, проверяем конфликты
    if (validatedData.staffId || validatedData.staffIds || validatedData.startAt) {
      // Use new staff IDs if provided, otherwise keep existing
      const staffsToCheck = newStaffIds ||
        (existingAppointment.assignedToId ? [existingAppointment.assignedToId] : []);

      const startAt = validatedData.startAt ? new Date(validatedData.startAt) : existingAppointment.startAt;

      // Issue #79: Calculate endAt based on new serviceIds or existing totalDuration
      let endAt: Date;
      if (newServiceIds && newServiceIds.length > 0) {
        // Fetch new services to calculate duration
        const newServices = await tenantClient.service.findMany({
          where: { id: { in: newServiceIds }, tenantId: req.tenantId }
        });
        const newTotalDuration = calculateTotalDuration(
          newServices.map((s) => ({
            id: s.id,
            name: s.name,
            duration: s.duration,
            price: Number(s.price),
            currency: 'PLN'
          }))
        );
        endAt = calculateEndAt(startAt.toISOString(), newTotalDuration);
      } else {
        endAt = validatedData.startAt
          ? calculateEndAt(validatedData.startAt, existingAppointment.totalDuration || 0)
          : existingAppointment.endAt;
      }

      // Issue #80: Multi-staff conflict detection (check each staff member independently)
      if (staffsToCheck.length > 0) {
        const { conflictingStaffIds, conflictMap } = await checkMultiStaffConflicts(
          staffsToCheck,
          startAt,
          endAt,
          req.tenantId,
          tenantClient,
          req.params.id // Exclude current appointment from conflict check
        );

        if (conflictingStaffIds.length > 0) {
          // Get staff names for conflict response
          const conflictingStaff = await tenantClient.user.findMany({
            where: { id: { in: conflictingStaffIds } },
            select: { id: true, firstName: true, lastName: true }
          });

          return res.status(409).json({
            success: false,
            code: 'STAFF_CONFLICT',
            error: `One or more staff members are already booked at this time`,
            conflictingStaff: conflictingStaff.map(s => ({
              id: s.id,
              name: `${s.firstName} ${s.lastName}`
            })),
            conflictMap
          });
        }
      }
    }

    // Issue #79: Payment recalculation if serviceIds change
    let newTotalPrice = toNumber(existingAppointment.totalPrice);
    let newTotalDuration = existingAppointment.totalDuration;

    if (newServiceIds && newServiceIds.length > 0) {
      const newServices = await tenantClient.service.findMany({
        where: { id: { in: newServiceIds }, tenantId: req.tenantId }
      });

      newTotalDuration = calculateTotalDuration(
        newServices.map((s) => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          price: Number(s.price),
          currency: 'PLN'
        }))
      );

      newTotalPrice = calculateTotalPrice(
        newServices.map((s) => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          price: Number(s.price),
          currency: 'PLN'
        }))
      );

      // Обновляем платеж, если цена изменилась и есть связанный платеж
      if (newTotalPrice !== toNumber(existingAppointment.totalPrice) && existingAppointment.paymentId) {
        try {
          const newAmountMinorUnits = Math.round(newTotalPrice * 100);

          await paymentClient.patch(
            buildPaymentPath(`/payments/${existingAppointment.paymentId}`),
            {
              amount: newAmountMinorUnits,
              currency: 'PLN'
            },
            {
              headers: {
                'x-tenant-id': req.tenantId
              }
            }
          );
          console.log(`[APPOINTMENTS] ✅ Payment ${existingAppointment.paymentId} updated: ${newAmountMinorUnits / 100} PLN`);
        } catch (paymentError) {
          console.warn(`[APPOINTMENTS] ⚠️ Failed to update payment ${existingAppointment.paymentId}:`, paymentError);
        }
      }

      // Update AppointmentService records
      try {
        // Delete old records
        await prisma.appointmentService.deleteMany({
          where: { appointmentId: existingAppointment.id }
        });

        // Create new records
        const appointmentServiceRecords = newServices.map((service) => ({
          id: crypto.randomUUID(),
          appointmentId: existingAppointment.id,
          serviceId: service.id,
          name: service.name,
          price: new Prisma.Decimal(Number(service.price)),
          duration: service.duration,
          currency: 'PLN',
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await prisma.appointmentService.createMany({
          data: appointmentServiceRecords,
          skipDuplicates: true
        });

        console.log(`[APPOINTMENTS] ✅ Updated ${appointmentServiceRecords.length} AppointmentService records`);
      } catch (error) {
        console.warn('[APPOINTMENTS] ⚠️ Failed to update AppointmentService records:', error);
      }
    }

    // Маппим входные поля
    const startAt = validatedData.startAt ? new Date(validatedData.startAt) : existingAppointment.startAt;
    const endAt = validatedData.startAt
      ? calculateEndAt(validatedData.startAt, newTotalDuration || existingAppointment.totalDuration || 0)
      : existingAppointment.endAt;

    const updateData: Record<string, unknown> = {
      // прямые поля
      clientId: validatedData.clientId ?? existingAppointment.clientId,
      serviceId: newServiceIds ? newServiceIds[0] : (validatedData.serviceId ?? existingAppointment.serviceId),
      notes: validatedData.notes ?? existingAppointment.notes,
      status: validatedData.status ?? existingAppointment.status,
      // Issue #79: Update totals
      totalDuration: newTotalDuration ?? existingAppointment.totalDuration,
      totalPrice: new Prisma.Decimal(newTotalPrice.toString()),
      // Time fields
      date: startAt,
      startAt,
      endAt
    };

    // Issue #80: Set assignedToId to first staff member (primary)
    if (newStaffIds && newStaffIds.length > 0) {
      updateData.assignedToId = newStaffIds[0];
    } else if (validatedData.staffId) {
      updateData.assignedToId = validatedData.staffId;
    }

    const appointment = await tenantPrisma(req.tenantId as any).appointment.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            isDefault: true,
            isActive: true,
            category: {
              select: {
                id: true,
                name: true
              }
            },
            subcategory: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            color: true,
            email: true,
            phone: true
          }
        }
      }
    }) as any;

    // Issue #80: Update AppointmentStaff records if staffIds changed
    if (newStaffIds && newStaffIds.length > 0) {
      try {
        // Delete old records
        await prisma.appointmentStaff.deleteMany({
          where: { appointmentId: existingAppointment.id }
        });

        // Create new records
        const appointmentStaffRecords = newStaffIds.map((staffId, index) => ({
          id: crypto.randomUUID(),
          appointmentId: existingAppointment.id,
          staffId,
          role: index === 0 ? 'primary' : undefined,
          sequenceOrder: index,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await prisma.appointmentStaff.createMany({
          data: appointmentStaffRecords,
          skipDuplicates: true
        });

        console.log(`[APPOINTMENTS] ✅ Updated ${appointmentStaffRecords.length} AppointmentStaff records for appointment ${existingAppointment.id}`);
      } catch (error) {
        console.warn('[APPOINTMENTS] ⚠️ Failed to update AppointmentStaff records:', error);
        // Don't block appointment update if staff records fail
      }
    }

    const clientProfile = appointment.client?.email
      ? await tenantPrisma(null).clientProfile.findUnique({
          where: { email: appointment.client.email },
          select: { email: true, firstName: true, lastName: true, avatar: true }
        })
      : null;

    const clientName =
      appointment.client?.name ||
      [clientProfile?.firstName, clientProfile?.lastName].filter(Boolean).join(' ').trim() ||
      'Unknown Client';

    // Issue #80: Load staffMembers for response
    const appointmentStaffRecords = await prisma.appointmentStaff.findMany({
      where: { appointmentId: existingAppointment.id },
      include: { staff: true },
      orderBy: { sequenceOrder: 'asc' }
    });

    const staffMembers = appointmentStaffRecords.map((as) => ({
      id: as.staffId,
      firstName: as.staff.firstName,
      lastName: as.staff.lastName,
      email: as.staff.email,
      phone: as.staff.phone,
      avatar: as.staff.avatar,
      color: as.staff.color,
      role: as.role,
      sequenceOrder: as.sequenceOrder,
      confirmedAt: as.confirmedAt
    }));

    const appointmentResponse = {
      ...appointment,
      clientName,
      clientAvatarUrl: clientProfile?.avatar ?? null,
      staffMembers,
      client: appointment.client
        ? {
            ...appointment.client,
            name: clientName,
            avatar: clientProfile?.avatar ?? null,
            avatarUrl: clientProfile?.avatar ?? null,
            firstName: clientProfile?.firstName ?? appointment.client.name?.split(' ')?.[0] ?? null,
            lastName: clientProfile?.lastName ?? appointment.client.name?.split(' ')?.slice(1).join(' ') ?? null
          }
        : null
    };

    res.json({
      success: true,
      data: appointmentResponse,
      message: 'Appointment updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating appointment:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment'
    });
  }
  return undefined;
}));

// PATCH /api/appointments/:id/status - Изменить статус записи
router.patch('/:id/status', wrapTenantRoute(async (req, res) => {
  try {
    const { status } = UpdateStatusSchema.parse(req.body);
    
    const existingAppointment = await tenantPrisma(req.tenantId as any).appointment.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    const appointment = await tenantPrisma(req.tenantId as any).appointment.update({
      where: { id: req.params.id },
      data: {
        status,
        // updatedById field doesn't exist in schema
        // updatedAt will be automatically set by Prisma
      }
    });
    
    res.json({
      success: true,
      data: appointment,
      message: 'Appointment status updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating appointment status:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment status'
    });
  }
  return undefined;
}));

// GET /api/v1/crm/appointments/generate-number - Генерировать номер записи
router.get('/generate-number', wrapTenantRoute(async (req, res) => {
  try {
    const context = requireTenantContext(req, res);
    if (!context) {
      return;
    }
    const { tenantId } = context;

    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }
    
    const appointmentNumber = await generateAppointmentNumber(tenantId, date as string);
    
    res.json({
      success: true,
      appointmentNumber,
      date
    });
    
  } catch (error) {
    console.error('Error generating appointment number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate appointment number'
    });
  }
  return undefined;
}));

// DELETE /api/appointments/:id - Отменить запись
router.delete('/:id', wrapTenantRoute(async (req, res) => {
  try {
    const existingAppointment = await tenantPrisma(req.tenantId as any).appointment.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    // Soft delete - меняем статус на CANCELLED
    await tenantPrisma(req.tenantId as any).appointment.update({
      where: { id: req.params.id },
      data: { 
        status: 'CANCELLED',
        // updatedById field doesn't exist in schema
        // updatedAt will be automatically set by Prisma
      }
    });
    
    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
    
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel appointment'
    });
  }
  return undefined;
}));

// Функция генерации номера записи (унифицированный подход с постоянным salon_number)
// Формат: 001.00000001.DD.MM.YYYY (номер записи + постоянный номер салона + дата)
async function generateAppointmentNumber(tenantId: string, _appointmentDate: string): Promise<string> {
  try {
    // Используем СЕГОДНЯШНЮЮ дату для номерации (как в старом проекте)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Считаем записи СОЗДАННЫЕ СЕГОДНЯ (не дату записи)
    const dailyCreationCount = await tenantPrisma(tenantId).appointment.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(todayStr + 'T00:00:00.000Z'),
          lte: new Date(todayStr + 'T23:59:59.999Z')
        }
      }
    });

    const nextAppointmentNumber = (dailyCreationCount + 1).toString().padStart(3, '0');

    // НОВОЕ: Используем постоянный salon_number из таблицы tenants
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { salonNumber: true }
    });

    if (!tenant || !tenant.salonNumber) {
      console.error(`[APPOINTMENT NUMBER] Tenant ${tenantId} does not have a salon_number!`);
      // Fallback для старых салонов без номера
      return `${nextAppointmentNumber}.00000000.${todayStr}`;
    }

    const salonNumber = tenant.salonNumber; // 8-значный постоянный номер

    // Форматируем СЕГОДНЯШНЮЮ дату (дату создания) в формате DD.MM.YYYY
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear().toString();
    const creationDate = `${day}.${month}.${year}`;

    const appointmentNumber = `${nextAppointmentNumber}.${salonNumber}.${creationDate}`;

    console.log(`Generated appointment number: ${appointmentNumber} for tenant ${tenantId} (salon ${salonNumber})`);

    return appointmentNumber;
    
  } catch (error) {
    console.error('Error generating appointment number:', error);
    // Fallback к timestamp при ошибке
    const timestamp = Date.now().toString();
    return `ERR.${timestamp.slice(-8)}`;
  }
}

export default router;
