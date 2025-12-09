import { useState, useEffect, FormEvent, useMemo, useCallback, type ComponentProps } from 'react';
import { Button, PageContainer, SidebarTrigger } from '@beauty-platform/ui';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ru, pl, enUS } from 'date-fns/locale';
import {
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Edit,
  Loader2,
  PlayCircle,
  RefreshCw,
  Save,
  Timer,
  XCircle,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { CRMApiService } from '../services/crmApiNew';
import { useToast } from '../contexts/ToastContext';
import { useStaff } from '../hooks/useStaff';
import { type Service } from '../hooks/useServices';
import { AppointmentSummary } from '../components/AppointmentSummary';
import { useTranslation } from 'react-i18next';
import { useAppointmentDetails } from '../hooks/useAppointmentDetails';
import type { AppointmentFormData as AppointmentPayload, AppointmentStatus } from '../types/appointment';
import {
  ClientCard,
  ServicesCard,
  StaffCard,
  ScheduleCard,
  StatusCard,
  NotesCard,
  PaymentsViewCard
} from '../components/appointment-form';
import { PageHeader } from '../components/layout/PageHeader';

interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

type AppointmentFormState = AppointmentPayload & {
  status: AppointmentStatus;
  staffIds: string[];
  staffId?: string;
  date: string;
  endTime: string;
  startTime: string;
};

const normalizeStatus = (status?: string): AppointmentStatus => {
  if (!status) {
    return 'CONFIRMED';
  }
  return status as AppointmentStatus;
};

export default function AppointmentFormPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { showToast } = useToast();
  
  // Удобные функции для уведомлений
  const { t, i18n } = useTranslation();

  const success = (title: string, description?: string) =>
    showToast({
      title,
      ...(description !== undefined ? { description } : {}),
      variant: 'success'
    });
  const showError = (title: string, description?: string) =>
    showToast({
      title,
      ...(description !== undefined ? { description } : {}),
      variant: 'destructive'
    });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const isEdit = !!id;
  const explicitEditRoute = location.pathname.endsWith('/edit');
  const modeQuery = searchParams.get('mode');
  const [mode, setMode] = useState<'view' | 'edit'>(() => {
    if (!isEdit) return 'edit';
    if (explicitEditRoute || modeQuery === 'edit') {
      return 'edit';
    }
    return 'view';
  });
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const {
    data: appointmentDetails,
    isFetching: detailsFetching,
    refetch: refetchAppointmentDetails
  } = useAppointmentDetails(id, { enabled: isEdit });
  const pageTitle = isEdit ? t('appointmentForm.editTitle') : t('appointmentForm.createTitle');

const statusOptions = useMemo(() => [
  {
    value: 'PENDING',
      label: t('appointments.statuses.PENDING'),
      shortLabel: t('appointments.statusShort.PENDING'),
      colorLight: 'bg-warning/10 border-warning/30 text-warning',
      icon: Timer
    },
    {
      value: 'CONFIRMED',
      label: t('appointments.statuses.CONFIRMED'),
      shortLabel: t('appointments.statusShort.CONFIRMED'),
      colorLight: 'bg-info/10 border-info/30 text-info',
      icon: CheckCircle2
    },
    {
      value: 'IN_PROGRESS',
      label: t('appointments.statuses.IN_PROGRESS'),
      shortLabel: t('appointments.statusShort.IN_PROGRESS'),
      colorLight: 'bg-primary/10 border-primary/30 text-primary',
      icon: PlayCircle
    },
    {
      value: 'COMPLETED',
      label: t('appointments.statuses.COMPLETED'),
      shortLabel: t('appointments.statusShort.COMPLETED'),
      colorLight: 'bg-success/10 border-success/30 text-success',
      icon: CheckCircle
    },
  {
    value: 'CANCELLED',
    label: t('appointments.statuses.CANCELED'),
    shortLabel: t('appointments.statusShort.CANCELED'),
    colorLight: 'bg-error/10 border-error/30 text-error',
    icon: XCircle
  }
  ], [t]);

  const getStatusOption = useCallback((status: string) => {
    return statusOptions.find(opt => opt.value === status) ?? statusOptions[0];
  }, [statusOptions]);

  // Pre-fill form with URL parameters
  const initialDateParam = searchParams.get('date');
  const initialDate = initialDateParam && initialDateParam.length > 0
    ? initialDateParam
    : new Date().toISOString().split('T')[0];
  const rawInitialTime = searchParams.get('time') || '09:00';
  
  // Функция для округления времени до 15-минутных интервалов (должна быть определена до useState)
  const roundTimeToQuarterHour = (timeString: string): string => {
    const [hoursPart, minutesPart] = timeString.split(':');
    const hoursValue = Number.parseInt(hoursPart ?? '0', 10);
    const minutesValue = Number.parseInt(minutesPart ?? '0', 10);
    const hours = Number.isFinite(hoursValue) ? hoursValue : 0;
    const minutes = Number.isFinite(minutesValue) ? minutesValue : 0;
    const roundedMinutes = Math.round(minutes / 15) * 15;
    
    if (roundedMinutes === 60) {
      return `${String(hours + 1).padStart(2, '0')}:00`;
    }
    
    return `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
  };
  
  const initialTime: string = roundTimeToQuarterHour(rawInitialTime);

  const [formData, setFormData] = useState<AppointmentFormState>({
    clientId: '',
    serviceIds: [],
    staffIds: [],
    staffId: '',
    date: initialDate as string,
    startAt: `${initialDate}T${initialTime}:00`,
    startTime: initialTime,
    endTime: initialTime, // Will be recalculated by services selection
    status: 'CONFIRMED',
    notes: ''
  });

  // Используем hook мастеров без фильтрации по услугам (Issue #82)
  // Note: serviceId filter removed because staff_service_map is not populated yet
  // Issue #82: Load ALL staff (not just bookable ones) for appointment scheduling
  const { staff: staffData, loading: staffLoading } = useStaff({
    bookableOnly: false
  });

  // Преобразуем данные мастеров под формат формы и добавляем услуги/специализации
  type StaffCardData = ComponentProps<typeof StaffCard>['staff'];
  type NormalizedStaff = NonNullable<StaffCardData>;

  const staff = useMemo<NormalizedStaff[]>(() => {
    return staffData.map(member => {
      const staffMember: NormalizedStaff = {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        role: member.role,
        active: member.status === 'ACTIVE',
        status: member.status
      };

      if (member.color) {
        staffMember.color = member.color;
      }
      if (member.avatarUrl) {
        staffMember.avatarUrl = member.avatarUrl;
      }

      const specialization = member.specialization ?? member.specializations?.[0] ?? null;
      staffMember.specialization = specialization;
      staffMember.languages = member.languages ?? [];

      const serviceIds = Array.isArray(member.serviceIds) ? member.serviceIds : [];
      staffMember.serviceIds = serviceIds;
      staffMember.servicesAvailable = member.servicesAvailable;

      return staffMember;
    });
  }, [staffData]);

  const serviceNameById = useMemo(() => {
    const map = new Map<string, string>();
    services.forEach(service => {
      map.set(service.id, service.name);
    });
    return map;
  }, [services]);

  const staffServiceMap = useMemo(() => {
    const map = new Map<string, string[]>();
    staff.forEach(member => {
      map.set(member.id, member.serviceIds ?? []);
    });
    return map;
  }, [staff]);

  const serviceToStaffMap = useMemo(() => {
    const map = new Map<string, string[]>();
    staff.forEach(member => {
      (member.serviceIds ?? []).forEach(serviceId => {
        if (!map.has(serviceId)) {
          map.set(serviceId, []);
        }
        map.get(serviceId)!.push(member.id);
      });
    });
    return map;
  }, [staff]);

  const compatibleStaffIds = useMemo(() => {
    if (formData.serviceIds.length === 0) {
      return staff.map(member => member.id);
    }

    const union = new Set<string>();
    formData.serviceIds.forEach(serviceId => {
      const staffForService = serviceToStaffMap.get(serviceId) ?? [];
      staffForService.forEach(id => union.add(id));
    });
    return Array.from(union).sort();
  }, [formData.serviceIds, serviceToStaffMap, staff]);

  const staffWithCompatibility = useMemo(() => {
    return staff.map(member => {
      const serviceIds = member.serviceIds ?? [];
      const matchingServiceIds = formData.serviceIds.filter(serviceId => serviceIds.includes(serviceId));
      const matchingServiceNames = matchingServiceIds
        .map(serviceId => serviceNameById.get(serviceId) || '')
        .filter((name): name is string => Boolean(name));
      const isCompatible = formData.serviceIds.length === 0 ? true : matchingServiceIds.length > 0;

      return {
        ...member,
        isCompatible,
        matchingServiceNames
      };
    });
  }, [staff, formData.serviceIds, serviceNameById]);

  const servicesWithoutAnyStaff = useMemo(() => {
    return formData.serviceIds.filter(serviceId => (serviceToStaffMap.get(serviceId)?.length ?? 0) === 0);
  }, [formData.serviceIds, serviceToStaffMap]);

  const uncoveredServices = useMemo(() => {
    return formData.serviceIds.filter(serviceId => {
      if (formData.staffIds.length === 0) {
        return true;
      }
      return !formData.staffIds.some(staffId => (staffServiceMap.get(staffId) ?? []).includes(serviceId));
    });
  }, [formData.serviceIds, formData.staffIds, staffServiceMap]);

  useEffect(() => {
    void loadFormData();
  }, [id]);

  useEffect(() => {
    setFormData(prev => {
      if (prev.serviceIds.length === 0) {
        return prev;
      }

      const allowed = new Set(compatibleStaffIds);
      const nextStaffIds = prev.staffIds.filter(id => allowed.has(id));
      if (nextStaffIds.length === prev.staffIds.length) {
        return prev;
      }

      return {
        ...prev,
        staffIds: nextStaffIds,
        staffId: nextStaffIds[0] || ''
      };
    });
  }, [compatibleStaffIds]);

  useEffect(() => {
    if (!isEdit) return;
    if (explicitEditRoute || modeQuery === 'edit') {
      setMode('edit');
    } else {
      setMode('view');
    }
  }, [explicitEditRoute, isEdit, modeQuery]);

  useEffect(() => {
    setIsFormInitialized(false);
  }, [id]);

  useEffect(() => {
    if (!isEdit || !appointmentDetails || isFormInitialized) {
      return;
    }

    // Helper функции для безопасного преобразования дат (может быть Date или string)
    const getDateString = (dateValue?: Date | string): string => {
      if (!dateValue) return '';
      try {
        const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
        if (!(date instanceof Date) || isNaN(date.getTime())) return '';
        return date.toISOString().slice(0, 10);
      } catch {
        return '';
      }
    };

    const getTimeString = (dateValue?: Date | string): string => {
      if (!dateValue) return '';
      try {
        const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
        if (!(date instanceof Date) || isNaN(date.getTime())) return '';
        return date.toISOString().slice(11, 16);
      } catch {
        return '';
      }
    };

    // Вычисляем длительность в минутах
    const calculateDuration = (): number => {
      if (!appointmentDetails.startAt || !appointmentDetails.endAt) return 0;
      try {
        const startDate = new Date(appointmentDetails.startAt);
        const endDate = new Date(appointmentDetails.endAt);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
        return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
      } catch {
        return 0;
      }
    };

    const calculatedDuration = calculateDuration();

    const staffMembers = (appointmentDetails.staffMembers || []).map(member => member.id).filter(Boolean);

    setFormData(prev => ({
      ...prev,
      clientId: appointmentDetails.client?.id ?? prev.clientId,
      serviceIds: appointmentDetails.services?.map(service => service.id) ?? prev.serviceIds,
      staffIds: staffMembers.length ? staffMembers : (appointmentDetails.staff?.id ? [appointmentDetails.staff.id] : prev.staffIds),
      staffId: staffMembers[0] || appointmentDetails.staff?.id || prev.staffId,
      date: getDateString(appointmentDetails.startAt) || prev.date,
      startTime: getTimeString(appointmentDetails.startAt) || prev.startTime,
      endTime: getTimeString(appointmentDetails.endAt) || prev.endTime,
      startAt: appointmentDetails.startAt ? new Date(appointmentDetails.startAt).toISOString() : prev.startAt,
      status: normalizeStatus(appointmentDetails.status),
      notes: prev.notes || appointmentDetails.notes?.[0]?.content || ''
    }));

    // Сохраняем длительность для использования в ScheduleCard
    setDurationMinutes(calculatedDuration);
    setIsFormInitialized(true);
  }, [appointmentDetails, isEdit, isFormInitialized]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      // Загружаем только клиентов и услуги, мастера берем из useStaff hook
      const [clientsRes, servicesRes] = await Promise.all([
        CRMApiService.getClients(),
        CRMApiService.getServices()
      ]);

      if (clientsRes.success) setClients(clientsRes.clients);
      if (servicesRes.success) setServices(servicesRes.services);
      
    } catch (err) {
      console.error('Failed to load form data:', err);
      showError(t('appointmentForm.messages.formLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const formatFullDate = useCallback(
    (value?: Date | string) => {
      if (!value) return '—';
      const date = typeof value === 'string' ? new Date(value) : value;
       if (isNaN(date.getTime())) return '—';
      const tz = appointmentDetails?.timezone || 'Europe/Warsaw';
      const zonedDate = toZonedTime(date, tz);
      const locale = i18n.language === 'pl' ? pl : i18n.language === 'en' ? enUS : ru;
      return format(zonedDate, "d MMMM yyyy · HH:mm", { locale });
    },
    [i18n.language, appointmentDetails?.timezone]
  );

  const formatTimeValue = useCallback(
    (value?: Date | string) => {
      if (!value) return '—';
      const date = typeof value === 'string' ? new Date(value) : value;
       if (isNaN(date.getTime())) return '—';
      const tz = appointmentDetails?.timezone || 'Europe/Warsaw';
      const zonedDate = toZonedTime(date, tz);
      return format(zonedDate, 'HH:mm');
    },
    [i18n.language, appointmentDetails?.timezone]
  );

  const formatCurrencyValue = useCallback(
    (amount?: number, currency?: string) => {
      try {
        return new Intl.NumberFormat(i18n.language || 'en-US', {
          style: 'currency',
          currency: currency || 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(amount ?? 0);
      } catch {
        return `${amount ?? 0} ${currency || 'EUR'}`;
      }
    },
    [i18n.language]
  );

  // Обработчик изменения времени с автоматическим округлением
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const roundedTime = roundTimeToQuarterHour(value);
    setFormData(prev => {
      const next = { ...prev, [field]: roundedTime };
      const isoDate = next.date || initialDate;
      const startTimeValue = field === 'startTime' ? roundedTime : next.startTime;
      next.startAt = `${isoDate}T${startTimeValue}:00`;
      return next;
    });
    
    // Если изменили startTime, пересчитываем endTime
    if (field === 'startTime' && formData.serviceIds.length > 0) {
      const totalDuration = formData.serviceIds.reduce((total, id) => {
        const service = services.find(s => s.id === id);
        return total + (service?.duration || 0);
      }, 0);
      
      const startDateTime = new Date(`${formData.date}T${roundedTime}:00`);
      startDateTime.setMinutes(startDateTime.getMinutes() + totalDuration);
      
      setFormData(prev => ({
        ...prev,
        startTime: roundedTime,
        endTime: startDateTime.toTimeString().slice(0, 5)
      }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    try {
      const primaryServiceId = formData.serviceIds[0];
      const primaryStaffId = formData.staffIds[0];
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);

      if (!primaryServiceId || !primaryStaffId) {
        showError(t('appointmentForm.messages.saveFailed'));
        setSaving(false);
        return;
      }

      const appointmentUpdateData: AppointmentPayload = {
        clientId: formData.clientId,
        serviceIds: formData.serviceIds,
        staffIds: formData.staffIds,
        staffId: primaryStaffId,
        startAt: startDateTime.toISOString(),
        status: formData.status,
        notes: formData.notes || undefined
      };

      if (isEdit && id) {
        const result = await CRMApiService.updateAppointment(id, appointmentUpdateData);

        if (result.success && result.appointment) {
          success(t('appointmentForm.toast.updateSuccess'));
          await refetchAppointmentDetails();
          setMode('view');
        } else {
          showError(t('appointmentForm.messages.saveFailed'));
        }
      } else {
        // Create new appointment
        const result = await CRMApiService.createAppointment(appointmentUpdateData);

        if (result.success && result.appointment) {
          const appointmentNumber = result.appointment.appointmentNumber;
          success(t('appointmentForm.toast.createSuccess', { number: appointmentNumber }));
          navigate('/appointments');
        } else {
          showError(t('appointmentForm.messages.createFailed'));
        }
      }
    } catch (err) {
      console.error('Failed to save appointment:', err);
      showError(t('appointmentForm.messages.saveFailed'));
    } finally {
      setSaving(false);
    }
  };


  const validateForm = (): boolean => {
    if (!formData.clientId) {
      showError(t('appointmentForm.validation.selectClient'));
      return false;
    }
    if (formData.serviceIds.length === 0) {
      showError(t('appointmentForm.validation.selectService'));
      return false;
    }
    if (formData.staffIds.length === 0) {
      showError(t('appointmentForm.validation.selectStaff'));
      return false;
    }
    if (!formData.date || !formData.startTime) {
      showError(t('appointmentForm.validation.selectDateTime'));
      return false;
    }

    const missingStaffServices = formData.serviceIds.filter(serviceId =>
      !formData.staffIds.some(staffId => (staffServiceMap.get(staffId) ?? []).includes(serviceId))
    );

    if (missingStaffServices.length > 0) {
      const names = missingStaffServices.map(serviceId => serviceNameById.get(serviceId) || t('appointmentForm.staff.unknownService')).join(', ');
      showError(t('appointmentForm.validation.serviceNeedsStaff', { services: names }));
      return false;
    }

    return true;
  };

  const handleServiceChange = (serviceId?: string) => {
    if (!serviceId) return
    const isSelected = formData.serviceIds.includes(serviceId);
    const newServiceIds = isSelected
      ? formData.serviceIds.filter(id => id !== serviceId)
      : [...formData.serviceIds, serviceId];
    
    setFormData(prev => ({ ...prev, serviceIds: newServiceIds }));
    
    // Auto-calculate end time
    if (newServiceIds.length > 0) {
      const totalDuration = newServiceIds.reduce((total, id) => {
        const service = services.find(s => s.id === id);
        return total + (service?.duration || 0);
      }, 0);
      
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      startDateTime.setMinutes(startDateTime.getMinutes() + totalDuration);
      
      // Округляем endTime до 15 минут
      const endTime = startDateTime.toTimeString().slice(0, 5);
      const roundedEndTime = roundTimeToQuarterHour(endTime);
      
      setFormData(prev => ({
        ...prev,
        endTime: roundedEndTime,
        startAt: `${prev.date}T${prev.startTime}:00`
      }));
    }
  };

  const selectedServices = services.filter(s => formData.serviceIds.includes(s.id));
  const selectedClient = clients.find(c => c.id === formData.clientId) || null;
  const selectedStaff = staff.find(s => s?.id === formData.staffIds[0]) || null;
  const selectedStaffMembers = staff.filter(s => formData.staffIds.includes(s?.id || '')).map(s => ({
    id: s?.id || '',
    name: s?.name || '',
    role: s?.role || ''
  }));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const currentStatusStyles = getStatusOption(formData.status);

  const appointmentSummaryProps: ComponentProps<typeof AppointmentSummary> = {
    selectedServices,
    date: formData.date,
    startTime: formData.startTime,
    endTime: formData.endTime,
    totalPrice,
    totalDuration,
    status: formData.status
  };

  if (selectedClient) {
    appointmentSummaryProps.selectedClient = selectedClient;
  }

  if (selectedStaff) {
    appointmentSummaryProps.selectedStaff = {
      id: selectedStaff.id,
      name: selectedStaff.name || '',
      role: selectedStaff.role || ''
    };
  }
  if (selectedStaffMembers.length > 0) {
    appointmentSummaryProps.staffMembers = selectedStaffMembers;
  }

  // Loading state
  if (loading || staffLoading || (isEdit && (!appointmentDetails || !isFormInitialized))) {
    return (
      <PageContainer variant="full-width" className="bg-background min-h-screen">
        <div className="mx-auto max-w-[1200px] px-8 py-16 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>{t('appointmentForm.messages.loading')}</span>
        </div>
      </PageContainer>
    );
  }

  // Editable flag for inline editing
  const editable = mode === 'edit';

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-8">
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <div>
                <h1 className="text-2xl font-medium text-foreground">{pageTitle}</h1>
              </div>
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => void navigate('/appointments')} className="h-9 px-3">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
              {isEdit && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => void refetchAppointmentDetails()}
                    className="h-9 px-3 bg-card shadow-none border-border hover:bg-muted"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${detailsFetching ? 'animate-spin' : ''}`} />
                    {t('appointmentForm.detailsPage.refreshAction')}
                  </Button>
                  <Button
                    variant={editable ? 'ghost' : 'default'}
                    onClick={() => void setMode(editable ? 'view' : 'edit')}
                    className="h-9 px-3"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {editable ? t('appointmentForm.detailsPage.viewTitle') : t('appointmentForm.detailsPage.editAction')}
                  </Button>
                </>
              )}
            </div>
          }
        />

        <form onSubmit={(e) => void handleSubmit(e)} className="w-full space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full">
            {/* Left Column */}
            <div className="xl:col-span-4 space-y-6">
              <ClientCard
                editable={editable}
                client={isEdit ? (appointmentDetails?.client as any) || null : selectedClient}
                clients={clients}
                selectedClientId={formData.clientId}
                onChange={(clientId) => setFormData(prev => ({ ...prev, clientId }))}
              />
            </div>

            {/* Middle Column */}
            <div className="xl:col-span-4 space-y-6">
              <ServicesCard
                editable={editable}
                services={isEdit ? (appointmentDetails?.services as any) || [] : selectedServices}
                allServices={services as any}
                selectedServiceIds={formData.serviceIds}
                totalPrice={totalPrice}
                currency={appointmentDetails?.currency || 'PLN'}
                onChange={(serviceId) => void handleServiceChange(serviceId)}
                formatCurrencyValue={formatCurrencyValue}
              />

              <StaffCard
                editable={editable}
                staff={isEdit ? (appointmentDetails?.staff as any) || null : selectedStaff}
                staffMembers={isEdit ? (appointmentDetails?.staffMembers as any) || [] : undefined}
                allStaff={staffWithCompatibility}
                selectedStaffIds={formData.staffIds}
                onChange={(staffId) => {
                  if (!staffId) return;
                  setFormData(prev => {
                    const exists = prev.staffIds.includes(staffId);
                    const nextIds = exists ? prev.staffIds.filter(id => id !== staffId) : [...prev.staffIds, staffId];
                    return { ...prev, staffIds: nextIds, staffId: nextIds[0] || '' };
                  });
                }}
              />

              {editable && servicesWithoutAnyStaff.length > 0 && (
                <div className="border border-destructive/30 bg-destructive/5 text-sm text-destructive-foreground px-4 py-3 rounded-none">
                  {t('appointmentForm.staff.noTeamForServices', {
                    services: servicesWithoutAnyStaff
                      .map((serviceId) => serviceNameById.get(serviceId) || serviceId)
                      .join(', ')
                  })}
                </div>
              )}

              {editable && servicesWithoutAnyStaff.length === 0 && uncoveredServices.length > 0 && (
                <div className="border border-warning/30 bg-warning/5 text-sm text-warning-foreground px-4 py-3 rounded-none">
                  {t('appointmentForm.staff.assignStaffHint', {
                    services: uncoveredServices
                      .map((serviceId) => serviceNameById.get(serviceId) || serviceId)
                      .join(', ')
                  })}
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="xl:col-span-4 space-y-6">
              <ScheduleCard
                editable={editable}
                startAt={appointmentDetails?.startAt}
                endAt={appointmentDetails?.endAt}
                durationMinutes={isEdit ? durationMinutes : undefined}
                date={formData.date}
                startTime={formData.startTime}
                endTime={formData.endTime}
                onDateChange={(date) => setFormData(prev => ({ ...prev, date, startAt: `${date}T${prev.startTime}:00` }))}
                onStartTimeChange={(startTime) => handleTimeChange('startTime', startTime)}
                formatFullDate={formatFullDate}
                formatTimeValue={formatTimeValue}
              />

              {isEdit && !editable && (
                <PaymentsViewCard
                  payments={appointmentDetails?.payments || []}
                  outstandingBalance={appointmentDetails?.outstandingBalance || 0}
                  currency={appointmentDetails?.currency || 'EUR'}
                  formatCurrencyValue={formatCurrencyValue}
                  formatFullDate={formatFullDate}
                />
              )}

              {editable && (
                <>
                  <StatusCard
                    selectedStatus={formData.status}
                    statusOptions={statusOptions}
                    onStatusChange={(status) => setFormData(prev => ({ ...prev, status: status as AppointmentStatus }))}
                    statusInfo={currentStatusStyles}
                  />
                  <AppointmentSummary {...appointmentSummaryProps} />
                </>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <NotesCard
            notes={formData.notes || ''}
            onNotesChange={(notes) => setFormData(prev => ({ ...prev, notes }))}
          />

          {/* Action buttons */}
          {editable && (
            <div className="flex justify-end gap-3 border-0 border-t border-border/70 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => (isEdit ? setMode('view') : navigate('/appointments'))}
                className="h-9 px-4 bg-card shadow-none border-border hover:bg-muted"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-9 px-4"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isEdit ? t('appointmentForm.buttons.saveChanges') : t('appointmentForm.buttons.create')}
              </Button>
            </div>
          )}
        </form>
      </div>
    </PageContainer>
  );
}
