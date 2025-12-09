import { useState, useEffect, useRef, useCallback } from 'react';
import type { CalendarAppointment, CalendarView, AppointmentFilters, AppointmentStatus } from '../types/calendar';

const getDateRangeForView = (referenceDate: Date, view: CalendarView = 'month') => {
  const date = new Date(referenceDate);

  const startOfDay = (target: Date) => {
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const endOfDay = (target: Date) => {
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  switch (view) {
    case 'day': {
      return {
        startDate: startOfDay(date),
        endDate: endOfDay(date)
      };
    }
    case 'week':
    case 'staff': {
      const dayOfWeek = date.getDay();
      const startOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as first day
      const start = new Date(date);
      start.setDate(date.getDate() + startOffset);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      return {
        startDate: startOfDay(start),
        endDate: endOfDay(end)
      };
    }
    case 'month':
    default: {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      return {
        startDate: startOfDay(start),
        endDate: endOfDay(end)
      };
    }
  }
};

interface UseAppointmentsParams {
  date?: Date;
  view?: CalendarView;
  filters?: AppointmentFilters;
  salonId?: string;
}

export const useAppointments = (params: UseAppointmentsParams = {}): {
  appointments: CalendarAppointment[];
  loading: boolean;
  error: string | null;
  fetchAppointments: (signal?: AbortSignal) => Promise<void>;
  rescheduleAppointment: (appointmentId: string, newStartAt: string, newStaffId?: string) => Promise<void>;
  updateStatus: (appointmentId: string, status: AppointmentStatus) => Promise<void>;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
} => {
  const { date, view, filters, salonId } = params;
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAppointments = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (!salonId) return;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (date) {
        const { startDate, endDate } = getDateRangeForView(date, view);
        params.set('startDate', startDate.toISOString());
        params.set('endDate', endDate.toISOString());
      }

      if (view) params.set('view', view);

      if (filters?.staffIds && filters.staffIds.length === 1 && filters.staffIds[0]) {
        params.set('staffId', filters.staffIds[0] as string);
      }

      if (filters?.statuses && filters.statuses.length === 1 && filters.statuses[0]) {
        params.set('status', filters.statuses[0] as string);
      }

      // Use relative URL to avoid CORS issues and let nginx proxy handle it
      const response = await fetch(`/api/crm/appointments?${params}`, {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies (JWT token передается автоматически)
        headers: {
          'Content-Type': 'application/json',
        },
        signal: signal || controller.signal
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Session expired - redirect to login
          window.location.href = '/login';
          return;
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Don't update if request was aborted
      if (!controller.signal.aborted) {
        const appointments = (data.appointments || data).map((appointment: CalendarAppointment & { staffMembers?: Array<{ id?: string; firstName?: string; lastName?: string; role?: string; color?: string }> }) => {
          const members = appointment.staffMembers;
          const staffLabel = members && members.length > 0
            ? members.map((m) => `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()).filter(Boolean)
            : [appointment.staffName];

          return {
            ...appointment,
            staffColor: appointment.staffColor ?? appointment.staffName,
            staffMembers: members,
            staffLabel,
          };
        });
        setAppointments(appointments);
      }
    } catch (err) {
      if ((err instanceof Error && err.name === 'AbortError') || controller.signal.aborted) {
        // Request was cancelled, ignore error
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Не удалось загрузить записи';
      setError(errorMessage);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId, date, view]); // filters intentionally omitted to avoid infinite loops

  const rescheduleAppointment = async (appointmentId: string, newStartAt: string, newStaffId?: string) => {
    try {
      const response = await fetch(`/api/crm/appointments/${appointmentId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startAt: newStartAt,
          staffId: newStaffId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Refresh appointments
      await fetchAppointments();
    } catch (err) {
      console.error('Failed to reschedule appointment:', err);
      setError('Не удалось перенести запись');
    }
  };

  const updateStatus = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      const response = await fetch(`/api/crm/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status } : apt
        )
      );
    } catch (err) {
      console.error('Failed to update appointment status:', err);
      setError('Не удалось обновить статус записи');
    }
  };

  // Начальная загрузка данных когда есть salonId
  useEffect(() => {
    if (salonId) {
      void fetchAppointments();
    }
  }, [salonId, fetchAppointments]);

  // Обновление при изменении фильтров (стабилизированные зависимости)
  // Используем join(',') чтобы React корректно сравнивал массивы
  useEffect(() => {
    if (salonId && filters) {
      void fetchAppointments();
    }
  }, [filters, salonId, fetchAppointments]);

  // Обновление при изменении даты или вида календаря
  useEffect(() => {
    if (salonId) {
      void fetchAppointments();
    }
  }, [date, view, salonId, fetchAppointments]);

  // Функция для принудительного обновления (вызывается кнопкой или после создания записи)
  const refreshAppointments = useCallback(async () => {
    await fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    fetchAppointments,
    rescheduleAppointment,
    updateStatus,
    refetch: fetchAppointments,
    refresh: refreshAppointments // Добавляем refresh функцию для ручного обновления
  };
};
