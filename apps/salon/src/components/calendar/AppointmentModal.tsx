import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Clock, User, Calendar, DollarSign, Search, Briefcase, Users, CreditCard, TrendingUp, TrendingDown, Maximize2, Minimize2, Phone, Mail, Edit3, Trash2, Plus, Minus, AlertTriangle, CheckCircle, Flag, Timer, CheckCircle2, XCircle, Loader2, Info } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import api from '../../utils/api-client';
import { useTenant } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { CalendarAppointment, AppointmentStatus } from '../../types/calendar';
import type { Client } from '../../hooks/useClients';
import type { Service } from '../../hooks/useServices';
import type { StaffMember } from '../../hooks/useStaff';
import { StaffCard } from './StaffCard';
import { debugLog } from '../../utils/debug';
import { useWorkingHours, isWithinWorkingHours } from '../../hooks/useWorkingHours';
import { useStaffSchedules, isStaffAvailable } from '../../hooks/useStaffSchedules';
import { useCalendarAvailability, getSlotUnavailabilityColor, getSlotUnavailabilityIcon, getSlotUnavailabilityTranslationKey } from '../../hooks/useCalendarAvailability';

export type AppointmentModalMode = 'CREATE' | 'EDIT' | 'VIEW';
export type ModalSize = 'normal' | 'fullscreen' | 'minimized';

// API Response interfaces from Codex
interface AppointmentClient {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  profileFirstName?: string | null;
  profileLastName?: string | null;
}

interface AppointmentServiceSummary {
  id: string;
  name: string;
  duration: number;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  category?: { id: string; name: string } | null;
  subcategory?: { id: string; name: string } | null;
}

interface AppointmentStaffSummary {
  id: string;
  firstName: string;
  lastName: string;
  color?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface AppointmentDetails {
  id: string;
  appointmentNumber?: string | null;
  tenantId: string;
  clientId: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAvatarUrl?: string | null;
  client?: AppointmentClient | null;
  serviceId: string | null;
  service?: AppointmentServiceSummary | null;
  assignedTo?: AppointmentStaffSummary | null;
  staffId: string | null;
  staffName?: string | null;
  serviceIds?: string[];
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  price?: number | string | null;
  currency?: string | null;
  notes?: string | null;
}

interface AppointmentDetailsResponse {
  success: boolean;
  data: AppointmentDetails;
}

interface AppointmentModalProps {
  appointmentId: string | null;
  initialDate?: Date | null;
  mode?: AppointmentModalMode;
  onClose: () => void;
  onUpdate: (appointmentId: string, status: AppointmentStatus, isFullUpdate?: boolean) => void;
}

// Client interface imported from useClients hook
interface DeleteResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

interface AvailabilityResponse {
  available: boolean;
  conflicts?: Array<{
    staffName: string;
    time: string;
  }>;
}

// Service interface imported from useServices hook
// Local interface removed to avoid conflict

// Extended interfaces for additional functionality
interface ExtendedStaff extends StaffMember {
  availableServices?: string[];
  active?: boolean;
  name?: string;
  spokenLocales?: string[];
  avatarUrl?: string | null;
}

// Extended CalendarAppointment with client contact info
interface ExtendedCalendarAppointment extends CalendarAppointment {
  client?: AppointmentClient | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAvatarUrl?: string | null;
}

// Duplicate interface removed - using ExtendedStaff from above

interface NewAppointmentData {
  clientId: string;
  serviceIds: string[];
  staffIds: string[]; // Support multiple staff members
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
}

const statusOptions = [
  { 
    value: 'PENDING' as AppointmentStatus, 
    label: 'Oczekująca', 
    shortLabel: 'Oczek.', 
    icon: Timer 
  },
  { 
    value: 'CONFIRMED' as AppointmentStatus, 
    label: 'Potwierdzona', 
    shortLabel: 'Potw.', 
    icon: CheckCircle2 
  },
  { 
    value: 'COMPLETED' as AppointmentStatus, 
    label: 'Zakończona', 
    shortLabel: 'Zak.', 
    icon: CheckCircle 
  },
  { 
    value: 'CANCELED' as AppointmentStatus, 
    label: 'Anulowana', 
    shortLabel: 'Anul.', 
    icon: XCircle 
  }
];

const statusButtonStyles: Record<AppointmentStatus, { selected: string; unselected: string }> = {
  PENDING: {
    selected: 'bg-warning text-warning-foreground border border-warning/30',
    unselected: 'bg-muted text-muted-foreground border border-transparent hover:bg-warning/10 hover:border-warning/30 hover:text-warning-foreground'
  },
  CONFIRMED: {
    selected: 'bg-info text-info-foreground border border-info/30',
    unselected: 'bg-muted text-muted-foreground border border-transparent hover:bg-info/10 hover:border-info/30 hover:text-info-foreground'
  },
  IN_PROGRESS: {
    selected: 'bg-primary text-primary-foreground border border-primary/30',
    unselected: 'bg-muted text-muted-foreground border border-transparent hover:bg-primary/10 hover:border-primary/30 hover:text-primary'
  },
  COMPLETED: {
    selected: 'bg-success text-success-foreground border border-success/30',
    unselected: 'bg-muted text-muted-foreground border border-transparent hover:bg-success/10 hover:border-success/30 hover:text-success'
  },
  CANCELED: {
    selected: 'bg-error text-error-foreground border border-error/30',
    unselected: 'bg-muted text-muted-foreground border border-transparent hover:bg-error/10 hover:border-error/30 hover:text-error-foreground'
  }
};

const getInitials = (value?: string | null) => {
  if (!value) return '?';
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const [singlePart] = parts;
    return singlePart?.charAt(0).toUpperCase() ?? '?';
  }
  const firstPart = parts[0] ?? '';
  const lastPart = parts.length > 1 ? parts[parts.length - 1] ?? firstPart : firstPart;
  const initials = `${firstPart.charAt(0)}${lastPart.charAt(0)}`.toUpperCase();
  return initials || '?';
};

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  appointmentId,
  initialDate,
  mode,
  onClose,
  onUpdate
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [appointment, setAppointment] = useState<ExtendedCalendarAppointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data for new appointments
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<ExtendedStaff[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // New appointment form state
  const [formData, setFormData] = useState<NewAppointmentData>({
    clientId: '',
    serviceIds: [],
    staffIds: [],
    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    startTime: initialDate ? format(initialDate, 'HH:mm') : '09:00',
    endTime: initialDate ? format(addMinutes(initialDate, 60), 'HH:mm') : '10:00',
    status: 'CONFIRMED',
    notes: ''
  });
  
  // Appointment number for display
  const [appointmentNumber, setAppointmentNumber] = useState<string>('');
  
  // REMOVED: generatingNumberRef (no longer needed)
  
  // Modal size management - open fullscreen by default
  const [modalSize, setModalSize] = useState<ModalSize>('fullscreen');
  
  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedClientLanguage, setSelectedClientLanguage] = useState<string>('pl');
  const [showAllServices, setShowAllServices] = useState(false);
  
  // Filtered data based on selections
  const [availableStaff, setAvailableStaff] = useState<ExtendedStaff[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  
  const { token, role } = useTenant();
  const { showToast } = useToast();
  
  // Удобные функции для уведомлений
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
  const { workingHours } = useWorkingHours();
  const { schedules: staffSchedules, exceptionsByStaff: staffScheduleExceptions } = useStaffSchedules();
  const isNewAppointment = !appointmentId;
  
  debugLog('[AppointmentModal] Component mounted with props:', {
    appointmentId,
    mode,
    initialDate: initialDate?.toISOString(),
    token: !!token
  });
  
  // Determine modal mode
  const modalMode = mode || (isNewAppointment ? 'CREATE' : 'VIEW');
  const isReadOnly = modalMode === 'VIEW';
  const isEditing = modalMode === 'EDIT';
  const isCreating = modalMode === 'CREATE';

  useEffect(() => {
    if (appointmentId && token) {
      void fetchAppointment();
      if (isEditing) {
        fetchFormData(); // Load form data for editing
      }
    } else if (isCreating && token) {
      void fetchFormData();
    }
  }, [appointmentId, token, modalMode]);

  // Load appointment data into form when switching to edit mode
  useEffect(() => {
    if (appointment && isEditing) {
      const tz = appointment.timezone || 'Europe/Warsaw';
      const startZoned = toZonedTime(new Date(appointment.startAt), tz);
      const endZoned = toZonedTime(new Date(appointment.endAt), tz);

      setFormData({
        clientId: appointment.clientId,
        serviceIds: appointment.serviceIds,
        staffIds: [appointment.staffId], // Convert single staff to array
        date: format(startZoned, 'yyyy-MM-dd'),
        startTime: format(startZoned, 'HH:mm'),
        endTime: format(endZoned, 'HH:mm'),
        status: appointment.status,
        notes: appointment.notes || ''
      });
    }
  }, [appointment, isEditing]);

  useEffect(() => {
    // Auto-calculate end time based on selected services
    if (formData.serviceIds.length > 0) {
      const totalDuration = formData.serviceIds.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return total + (service?.duration || 0);
      }, 0);
      
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = addMinutes(startDateTime, totalDuration);
      
      setFormData(prev => ({
        ...prev,
        endTime: format(endDateTime, 'HH:mm')
      }));
    }
  }, [formData.serviceIds, formData.startTime, formData.date, services]);

  // Dynamic filtering: Services -> Staff
  useEffect(() => {
    if (formData.serviceIds.length > 0) {
      // Filter staff who can perform ALL selected services
      const compatibleStaff = staff.filter(member => {
        // Check if staff can perform all selected services
        const canPerformServices = formData.serviceIds.every(serviceId => {
          return member.availableServices?.includes(serviceId) ?? false;
        });
        
        // Check language compatibility if client language is selected
        const languageCompatible = !selectedClientLanguage || 
          (member.spokenLocales?.includes(selectedClientLanguage) ?? true);
        
        return canPerformServices && languageCompatible && member.active;
      });
      setAvailableStaff(compatibleStaff);
      
      // Clear staff selection if any selected staff can't perform selected services
      const validStaffIds = formData.staffIds.filter(staffId => 
        compatibleStaff.find(s => s.id === staffId)
      );
      if (validStaffIds.length !== formData.staffIds.length) {
        setFormData(prev => ({ ...prev, staffIds: validStaffIds }));
      }
    } else {
      // Show all active staff with language filter and at least one service
      const filteredStaff = staff.filter(member => {
        const languageCompatible = !selectedClientLanguage || 
          (member.spokenLocales?.includes(selectedClientLanguage) ?? true);
        const hasServices = member.availableServices && member.availableServices.length > 0;
        return languageCompatible && member.active && hasServices;
      });
      setAvailableStaff(filteredStaff);
    }
  }, [formData.serviceIds, staff, services, selectedClientLanguage]);

  // Загружаем расписания для выбранных мастеров
  useEffect(() => {
    if (formData.staffIds.length > 0) {
      formData.staffIds.forEach(staffId => {
        const staffSchedule = staffSchedules.find(s => s.staffId === staffId);
        if (!staffSchedule) {
          debugLog('Schedule for staff:', staffId, 'not loaded');
          // TODO: Implement fetchSchedule when API is ready
        }
      });
    }
  }, [formData.staffIds, staffSchedules]);

  // Dynamic filtering: Staff -> Services
  useEffect(() => {
    if (formData.staffIds.length > 0) {
      // Get all services that ANY of the selected staff can perform
      const compatibleServices = services.filter(service => 
        formData.staffIds.some(staffId => {
          const selectedStaff = staff.find(s => s.id === staffId);
          return selectedStaff?.availableServices?.includes(service.id) || !selectedStaff?.availableServices;
        })
      );
      setAvailableServices(compatibleServices);
      
      // Remove any selected services that NONE of the staff can perform
      const validServiceIds = formData.serviceIds.filter(serviceId => 
        formData.staffIds.some(staffId => {
          const selectedStaff = staff.find(s => s.id === staffId);
          return selectedStaff?.availableServices?.includes(serviceId) || !selectedStaff?.availableServices;
        })
      );
      if (validServiceIds.length !== formData.serviceIds.length) {
        setFormData(prev => ({ ...prev, serviceIds: validServiceIds }));
      }
    } else {
      setAvailableServices(services);
    }
  }, [formData.staffIds, staff, services]);

  const fetchAppointment = async () => {
    if (!appointmentId || !token) {
      debugLog('[AppointmentModal] fetchAppointment skipped:', { appointmentId, token });
      return;
    }

    debugLog('[AppointmentModal] Starting fetchAppointment for:', appointmentId);
    setLoading(true);
    setError(null);

    try {
      const { data: appointmentData } = await api.get<AppointmentDetailsResponse>(`/crm/appointments/${appointmentId}`);
      debugLog('[AppointmentModal] Appointment loaded successfully:', appointmentData);

      const clientFromResponse = appointmentData.client ?? null;
      const clientAvatarUrl = appointmentData.clientAvatarUrl ?? clientFromResponse?.avatarUrl ?? null;
      const derivedClientName = clientFromResponse?.name ?? appointmentData.clientName ?? 'Brak klienta';
      const serviceIds = appointmentData.serviceIds ?? (appointmentData.serviceId ? [appointmentData.serviceId] : []);
      const clientEmail = clientFromResponse?.email ?? appointmentData.clientEmail ?? null;
      const clientPhone = clientFromResponse?.phone ?? appointmentData.clientPhone ?? null;

      // Create normalized appointment from API response
      const normalizedAppointment: ExtendedCalendarAppointment = {
        id: appointmentData.id,
        appointmentNumber: appointmentData.appointmentNumber || '',
        clientId: appointmentData.clientId || '',
        clientName: derivedClientName,
        clientAvatarUrl: clientAvatarUrl,
        serviceIds: serviceIds,
        serviceNames: appointmentData.service ? [appointmentData.service.name] : [],
        staffId: appointmentData.staffId || '',
        staffName: appointmentData.assignedTo ? `${appointmentData.assignedTo.firstName} ${appointmentData.assignedTo.lastName}` : (appointmentData.staffName || ''),
        startAt: appointmentData.startAt,
        endAt: appointmentData.endAt,
        status: appointmentData.status,
        price: (appointmentData.price ?? 0) as string | number,
        currency: appointmentData.currency || 'EUR',
        notes: appointmentData.notes || '',
        // Extended fields
        client: clientFromResponse,
        clientEmail,
        clientPhone
      };

      setAppointment(normalizedAppointment);

      // Set appointment number from API response
      if (appointmentData.appointmentNumber) {
        setAppointmentNumber(appointmentData.appointmentNumber);
      }

      // Ensure client and service selection is reflected for edit mode
      if (appointmentData.clientId) {
        setFormData(prev => ({
          ...prev,
          clientId: appointmentData.clientId || '',
          serviceIds: serviceIds
        }));
      }
    } catch (err) {
      console.error('[AppointmentModal] Failed to fetch appointment:', err);
      setError('Nie udało się załadować danych wizyty');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    if (!token) return;

    setLoadingData(true);
    try {
      const [clientsRes, servicesRes, staffRes] = await Promise.all([
        api.get<Client[]>('/crm/clients'),
        api.get<Service[]>('/crm/services'),
        fetch('/api/crm/staff', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }).then(res => res.json()).then(data => data.data || [])
      ]);

      setClients(clientsRes);
      setServices(servicesRes);
      
      // Transform staff data from API format and filter active
      const staffData = (staffRes || []).map((s: StaffMember & { availableServices?: string[] }): ExtendedStaff => ({
        ...s, // Preserve all original StaffMember fields
        avatarUrl: s.avatarUrl ?? null,
        name: `${s.firstName} ${s.lastName}`.trim(),
        active: s.status === 'ACTIVE',
        availableServices: s.availableServices ?? []
      })).filter((s: ExtendedStaff) => s.status === 'ACTIVE');
      
      setStaff(staffData);
    } catch (err) {
      console.error('Failed to fetch form data:', err);
      setError('Nie udało się załadować danych formularza');
      showError('Nie udało się załadować danych formularza');
    } finally {
      setLoadingData(false);
    }
  };

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (!appointment || !token) return;

    setSaving(true);
    try {
      await api.put(`/crm/appointments/${appointment.id}/status`, {
        status: newStatus
      });

      setAppointment({ ...appointment, status: newStatus });
      onUpdate(appointment.id, newStatus);
      success('Status wizyty został zaktualizowany');
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Nie udało się zaktualizować statusu');
      showError('Nie udało się zaktualizować statusu');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!token || !validateForm()) return;

    // Проверка доступности мастера
    const isAvailable = await checkStaffAvailability();
    if (!isAvailable) return;

    setSaving(true);
    setError(null);

    try {
      // Convert to UTC - JavaScript Date.toISOString() handles timezone conversion automatically
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      const appointmentData = {
        clientId: formData.clientId,
        serviceIds: formData.serviceIds,
        staffId: formData.staffIds[0] || '', // For now, use first selected staff (API supports single staff)
        startAt: startDateTime.toISOString(),  // Already in UTC
        endAt: endDateTime.toISOString(),      // Already in UTC
        status: formData.status,
        notes: formData.notes || undefined
      };

      await api.post('/crm/appointments', appointmentData);
      
      success('Wizyta została pomyślnie utworzona');
      onUpdate('new', 'CONFIRMED');
      onClose();
    } catch (err) {
      console.error('Failed to create appointment:', err);
      setError('Nie udało się utworzyć wizyty');
      showError('Nie udało się utworzyć wizyty');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAppointment = async () => {
    if (!token || !appointmentId || !validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      // Convert to UTC - JavaScript Date.toISOString() handles timezone conversion automatically
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      const appointmentData = {
        clientId: formData.clientId,
        serviceIds: formData.serviceIds,
        staffId: formData.staffIds[0] || '', // For now, use first selected staff (API supports single staff)
        startAt: startDateTime.toISOString(),  // Already in UTC
        endAt: endDateTime.toISOString(),      // Already in UTC
        status: formData.status,
        notes: formData.notes || undefined
      };

      const response = await api.put<CalendarAppointment>(`/crm/appointments/${appointmentId}`, appointmentData);
      
      // Update appointment number if returned from API
      if (response.id) {
        setAppointmentNumber(response.id.replace('appt_', ''));
      }
      
      success('Wizyta została zaktualizowana');
      onUpdate(appointmentId, formData.status, true); // Pass actual status and isFullUpdate flag
      onClose();
    } catch (err) {
      console.error('Failed to update appointment:', err);
      setError('Nie udało się zaktualizować wizyty');
      showError('Nie udało się zaktualizować wizyty');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!token || !appointmentId || !appointment) return;
    
    // Double confirmation for admin delete action
    const confirmMessage = `Czy na pewno chcesz usunąć wizytę?\n\nKlient: ${appointment.clientName}\nData: ${format(new Date(appointment.startAt), 'dd.MM.yyyy HH:mm')}\n\nTa akcja zostanie zapisana w logach.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      debugLog(`[ADMIN ACTION] Deleting appointment ${appointmentId} by ${role} user`);
      
      const response = await api.delete<DeleteResponse>(`/crm/appointments/${appointmentId}`);
      
      // Log successful deletion
      debugLog(`[ADMIN ACTION] Successfully deleted appointment:`, response);
      
      success('Wizyta została usunięta przez administratora');
      onUpdate(appointmentId, 'CANCELED');
      onClose();
    } catch (err: any) {
      console.error('[ADMIN ACTION] Failed to delete appointment:', err);
      
      if (err.response?.status === 403) {
        setError('Brak uprawnień do usuwania wizyt');
        showError('Brak uprawnień do usuwania wizyt');
      } else {
        setError('Nie udało się usunąć wizyty');
        showError('Nie udało się usunąć wizyty');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = () => {
    if (!appointment) return;
    
    // Calculate total price from selected services
    const totalPrice = appointment.serviceNames?.length > 0 
      ? appointment.price || 0 
      : 0;
    
    // Create a payment for this appointment
    const paymentData = {
      appointmentId: appointment.id,
      clientId: appointment.clientId,
      amount: totalPrice,
      currency: 'PLN',
      paymentMethod: 'cash',
      status: 'completed'
    };
    
    // Navigate to payments page with pre-filled data
    // We'll store this in sessionStorage so the payments page can pick it up
    sessionStorage.setItem('pendingPayment', JSON.stringify(paymentData));
    
    // Close modal and navigate to payments
    onClose();
    window.location.href = '/payments';
  };

  // Проверка доступности мастера  
  const checkStaffAvailability = async (): Promise<boolean> => {
    try {
      if (formData.staffIds.length === 0) return true; // Будет проверено в основной валидации
      
      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
      
      const queryParams = new URLSearchParams({
        staffIds: formData.staffIds.join(','),
        date: formData.date,
        startTime: formData.startTime,
        duration: totalDuration.toString()
      });
      const response = await api.get<{ data: AvailabilityResponse }>(`/crm/appointments/check-availability?${queryParams}`);
      const availability = response.data;
      
      if (availability?.available === false) {
        const conflicts = availability.conflicts ?? [];
        const [firstConflict] = conflicts;
        const conflictInfo = firstConflict
          ? `Konflikt z ${firstConflict.staffName} o ${firstConflict.time}`
          : 'Masz już wizytę w tym czasie';
        
        setError(`Wybrany termin nie jest dostępny. ${conflictInfo}`);
        showError(`Wybrany termin nie jest dostępny. ${conflictInfo}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking staff availability:', error);
      // Nie blokujemy w przypadku błędu API - pozwalamy kontynuować
      return true;
    }
  };

  const validateForm = (): boolean => {
    if (!formData.clientId) {
      setError('Wybierz klienta');
      showError('Wybierz klienta');
      return false;
    }
    if (formData.serviceIds.length === 0) {
      setError('Wybierz przynajmniej jedną usługę');
      showError('Wybierz przynajmniej jedną usługę');
      return false;
    }
    if (formData.staffIds.length === 0) {
      setError('Wybierz przynajmniej jednego pracownika');
      showError('Wybierz przynajmniej jednego pracownika');
      return false;
    }
    if (!formData.date || !formData.startTime) {
      setError('Wybierz datę i czas');
      showError('Wybierz datę i czas');
      return false;
    }
    
    // Проверка что дата и время не в прошлом
    const appointmentDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
    const now = new Date();
    if (appointmentDateTime < now) {
      setError('Nie można umówić wizyty w przeszłości');
      showError('Nie można umówić wizyty w przeszłości');
      return false;
    }
    
    // Проверка рабочих часов салона
    const appointmentDate = new Date(formData.date);
    const timeParts = formData.startTime.split(':');
    const hours = parseInt(timeParts[0] || '0', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);
    appointmentDate.setHours(hours, minutes);
    
    // Check salon working hours
    if (!isWithinWorkingHours(appointmentDate, workingHours)) {
      setError('Wybrana godzina jest poza godzinami pracy salonu');
      showError('Wybrana godzina jest poza godzinami pracy salonu');
      return false;
    }

    // Check staff personal schedules if staff is selected
    if (formData.staffIds.length > 0) {
      for (const staffId of formData.staffIds) {
        const staffSchedule = staffSchedules.filter(s => s.staffId === staffId);
        if (!isStaffAvailable(staffId, appointmentDate, staffSchedule, staffScheduleExceptions)) {
          const staff = availableStaff.find(s => s.id === staffId);
          const staffName = staff?.name || 'Wybrany pracownik';
          setError(`${staffName} nie jest dostępny w wybranym czasie`);
          showError(`${staffName} nie jest dostępny w wybranym czasie`);
          return false;
        }
      }
    }

    if (canUseAvailabilityData && formData.date && formData.startTime) {
      const [hourStr, minuteStr] = formData.startTime.split(':');
      const apiAvailability = checkSlotAvailability(
        formData.date,
        Number.parseInt(hourStr || '0', 10),
        Number.parseInt(minuteStr || '0', 10)
      );
      if (!apiAvailability.isAvailable) {
        const reasonLabel = apiAvailability.unavailabilityReason
          ? t(getSlotUnavailabilityTranslationKey(apiAvailability.unavailabilityReason))
          : apiAvailability.messageKey
          ? t(apiAvailability.messageKey)
          : apiAvailability.message || t('schedule.unavailable.default', 'Wybrany termin nie jest dostępny');
        const availabilityErrorMessage = `${reasonLabel}. ${t(
          'schedule.availability.slotUnavailableHint',
          'Wybierz inny termin lub pracownika.'
        )}`;
        setError(availabilityErrorMessage);
        showError(availabilityErrorMessage);
        return false;
      }
    }
    
    return true;
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client.phone && client.phone.includes(clientSearch))
  );

  const filteredServices = availableServices.filter(service =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    false // category field not available in imported Service
  );

  const selectedServices = services.filter(s => formData.serviceIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const primaryStaffId = formData.staffIds.length === 1 ? formData.staffIds[0] : undefined;
  const availabilityParams = useMemo(() => {
    if (!formData.date || totalDuration <= 0) {
      return undefined;
    }
    return {
      date: formData.date,
      serviceDurationMinutes: totalDuration,
      staffId: primaryStaffId,
      bufferMinutes: 15
    };
  }, [formData.date, totalDuration, primaryStaffId]);
  const {
    timezone: availabilityTimezone,
    loading: availabilityLoading,
    error: availabilityError,
    checkSlotAvailability,
    getUnavailabilityReasons: availabilityReasons
  } = useCalendarAvailability(availabilityParams);
  const availabilityReasonList = availabilityReasons ?? [];
  const availabilityEnabled = Boolean(availabilityParams?.date && availabilityParams?.serviceDurationMinutes);
  const canUseAvailabilityData = availabilityEnabled && !availabilityLoading && !availabilityError;
  const selectedSlotAvailability = useMemo(() => {
    if (!canUseAvailabilityData || !formData.date || !formData.startTime) {
      return null;
    }
    const [hourStr, minuteStr] = formData.startTime.split(':');
    if (!hourStr || !minuteStr) {
      return null;
    }
    return checkSlotAvailability(
      formData.date,
      Number.parseInt(hourStr, 10),
      Number.parseInt(minuteStr, 10)
    );
  }, [canUseAvailabilityData, formData.date, formData.startTime, checkSlotAvailability]);
  
  // Check if user can select date/time
  const canSelectDateTime = formData.staffIds.length > 0 && formData.serviceIds.length > 0;

  const formatDateTime = (datetime: string, timezone?: string) => {
    const tz = timezone || 'Europe/Warsaw';
    try {
      const utcDate = new Date(datetime);
      const zonedDate = toZonedTime(utcDate, tz);
      return format(zonedDate, 'EEEE, d MMMM yyyy · HH:mm');
    } catch (error) {
      // Fallback если timezone некорректен
      return format(new Date(datetime), 'EEEE, d MMMM yyyy · HH:mm');
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const formatDateTimeDisplay = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date}T${time}`);
      return format(dateTime, 'EEEE, d MMMM yyyy · HH:mm');
    } catch {
      return `${date} ${time}`;
    }
  };

  // COMPLETELY DISABLED - this function was causing system crashes
  // const generateAppointmentNumber = useCallback(async (date: Date): Promise<string> => { ... }

  // REMOVED: Problematic useEffect that was causing infinite API calls
  
  // Generate appointment number when date changes or for new appointments
  useEffect(() => {
    if (isNewAppointment && formData.date && token) {
      const generateNumber = async () => {
        try {
          const response = await fetch(`/api/crm/appointments/generate-number?date=${formData.date}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setAppointmentNumber(data.appointmentNumber);
          } else {
            // Fallback to simple format
            const dateObj = new Date(formData.date);
            const displayDate = dateObj.toLocaleDateString('pl-PL');
            setAppointmentNumber(`001.02.${displayDate}`);
          }
        } catch (error) {
          console.error('Failed to generate appointment number:', error);
          // Fallback to simple format
          const dateObj = new Date(formData.date);
          const displayDate = dateObj.toLocaleDateString('pl-PL');
          setAppointmentNumber(`001.02.${displayDate}`);
        }
      };
      
      generateNumber();
    }
  }, [isNewAppointment, formData.date, token]);

  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${
      modalSize === 'minimized' 
        ? 'pointer-events-none' 
        : 'bg-black bg-opacity-50 flex items-center justify-center'
    }`}>
      <div className={`bg-card shadow-xl transition-all duration-300 ${
        modalSize === 'fullscreen' 
          ? 'w-screen h-screen rounded-none' 
          : modalSize === 'normal'
          ? 'max-w-4xl w-full mx-4 max-h-[90vh] rounded-lg'
          : 'w-80 h-20 fixed bottom-4 right-4 rounded-lg pointer-events-auto shadow-2xl'
      } overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-border ${
          modalSize === 'minimized' ? 'p-3' : 'p-6'
        }`}>
          <div className={modalSize === 'minimized' ? 'truncate' : ''}>
            <h2 className={`font-semibold text-foreground ${
              modalSize === 'minimized' ? 'text-sm' : 'text-xl'
            }`}>
              {modalMode === 'CREATE' && 'Nowa wizyta'}
              {modalMode === 'EDIT' && 'Edytuj wizytę'}
              {modalMode === 'VIEW' && 'Szczegóły wizyty'}
            </h2>
            {modalSize !== 'minimized' && (
              <>
                {modalMode === 'CREATE' && appointmentNumber && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Numer: <span className="font-mono font-medium text-info">#{appointmentNumber}</span>
                  </p>
                )}
                {appointment && modalMode !== 'CREATE' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Numer: <span className="font-mono font-medium text-info">#{appointment.id.replace('appt_', '')}</span>
                  </p>
                )}
              </>
            )}
          </div>
          
          {/* Modal Size Controls */}
          <div className="flex items-center space-x-2">
            {modalSize === 'minimized' ? (
              <button
                onClick={() => setModalSize('normal')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Rozszerz"
              >
                <TrendingUp className="h-5 w-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setModalSize('minimized')}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Zminimalizuj"
                >
                  <TrendingDown className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setModalSize(modalSize === 'fullscreen' ? 'normal' : 'fullscreen')}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title={modalSize === 'fullscreen' ? 'Normalizuj' : 'Pełny ekran'}
                >
                  {modalSize === 'fullscreen' ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Zamknij"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {modalSize === 'minimized' ? (
          // Minimized content - just show basic info
          <div className="px-3 py-1 text-xs text-muted-foreground truncate">
            {modalMode === 'CREATE' && 'Tworzenie nowej wizyty...'}
            {modalMode === 'EDIT' && 'Edycja wizyty...'}
            {modalMode === 'VIEW' && appointment && `${appointment.clientName} - ${format(new Date(appointment.startAt), 'HH:mm')}`}
          </div>
        ) : (
          <div className={`overflow-y-auto ${
            modalSize === 'fullscreen' ? 'h-[calc(100vh-200px)] p-8' : 'max-h-[calc(90vh-200px)] p-6'
          }`}>
            {loading || loadingData ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Ładowanie...</span>
              </div>
            ) : error ? (
            <div className="text-center py-8">
              <div className="text-error mb-4 p-4 bg-error/10 rounded-lg">{error}</div>
              <button
                onClick={() => {
                  setError(null);
                  if (isNewAppointment) {
                    void fetchFormData();
                  } else {
                    void fetchAppointment();
                  }
                }}
                className="btn-secondary"
              >
                Spróbuj ponownie
              </button>
            </div>
          ) : (modalMode === 'CREATE' || (modalMode === 'EDIT' && appointment)) ? (
            /* NEW APPOINTMENT FORM */
            <div className="space-y-6">
              {/* Staff Selection - Horizontal under "Nowa wizyta" */}
              <div>
                
                {/* Horizontal Staff Cards - NO BACKGROUND */}
                <div className="relative">
                  {availableStaff.length > 0 ? (
                    <div className="flex space-x-4 overflow-x-auto py-2">
                      {availableStaff.map((member) => (
                        <StaffCard
                          key={member.id}
                          staff={member}
                          selected={formData.staffIds.includes(member.id)}
                          onClick={() => {
                            const isSelected = formData.staffIds.includes(member.id);
                            if (isEditing) {
                              // In edit mode, allow only one staff member (database limitation)
                              setFormData(prev => ({ 
                                ...prev, 
                                staffIds: isSelected ? [] : [member.id]
                              }));
                            } else {
                              // In create mode, support multiple staff selection
                              if (isSelected) {
                                // Remove from selection
                                const newStaffIds = formData.staffIds.filter(id => id !== member.id);
                                setFormData(prev => ({ ...prev, staffIds: newStaffIds }));
                              } else {
                                // Add to selection
                                setFormData(prev => ({ ...prev, staffIds: [...prev.staffIds, member.id] }));
                              }
                            }
                          }}
                          disabled={isReadOnly}
                          className="flex-shrink-0"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                      <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Brak dostępnych pracowników</p>
                    </div>
                  )}
                </div>
                
                {/* Status Messages */}
                {formData.serviceIds.length > 0 && availableStaff.length === 0 && (
                  <div className="mt-3 text-sm text-warning-foreground bg-warning/10 p-3 rounded-lg border border-warning/20">
                    <AlertTriangle className="h-4 w-4 text-warning inline mr-1" /> Brak dostępnych pracowników dla wybranych usług
                  </div>
                )}
              </div>

              {/* Status Selection + Language Selection - Horizontal row */}
              <div className="flex items-start justify-between space-x-6">
                {/* Status Selection - Left side */}
                <div className="flex-1">
                  <div className="flex space-x-2 overflow-x-auto">
                    {statusOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = formData.status === option.value;
                      const style = statusButtonStyles[option.value];
                      return (
                        <button
                          key={option.value}
                          onClick={() => setFormData(prev => ({ ...prev, status: option.value }))}
                          disabled={saving}
                          title={option.label}
                          className={`
                            flex items-center justify-center px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                            ${isSelected ? style.selected : style.unselected}
                            ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            group
                          `}
                        >
                          <Icon className="h-4 w-4 mr-2 md:mr-1" />
                          <span className="hidden md:inline">{option.shortLabel}</span>
                          <span className="md:hidden sr-only">{option.label}</span>
                          
                          {/* Tooltip for mobile */}
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 md:hidden">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language Selection - Right side */}
                <div className="flex-shrink-0">
                  <div className="flex space-x-2">
                    {[
                      { code: 'pl', label: 'Polski', name: 'PL', flag: <Flag className="h-3 w-3 text-error" /> },
                      { code: 'ru', label: 'Русский', name: 'RU', flag: <Flag className="h-3 w-3 text-info" /> },
                      { code: 'uk', label: 'Українська', name: 'UA', flag: <Flag className="h-3 w-3 text-warning" /> },
                      { code: 'en', label: 'English', name: 'EN', flag: <Flag className="h-3 w-3 text-info" /> }
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => !isReadOnly && setSelectedClientLanguage(lang.code)}
                        disabled={isReadOnly}
                        title={lang.label}
                        className={`
                          flex items-center justify-center px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                          ${selectedClientLanguage === lang.code
                            ? 'bg-info text-info-foreground border border-info/30'
                            : 'bg-muted text-muted-foreground border border-border hover:bg-info/10 hover:text-info-foreground'
                          }
                          ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          group
                        `}
                      >
                        <span className="hidden md:inline">{lang.name}</span>
                        <span className="md:hidden sr-only">{lang.label}</span>
                        
                        {/* Tooltip for mobile */}
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 md:hidden">
                          {lang.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>


              {/* 3 COLUMN LAYOUT for main content */}
              <div className={`${
                modalSize === 'fullscreen' 
                  ? 'grid grid-cols-3 gap-8 h-full' 
                  : 'grid grid-cols-1 lg:grid-cols-3 gap-6'
              }`}>
              {/* Column 1 - Clients */}
              <div className={`${
                modalSize === 'fullscreen' ? 'space-y-6 overflow-y-auto' : 'space-y-4'
              }`}>
                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Klient *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Szukaj klienta..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      disabled={isReadOnly}
                      className={`w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                        isReadOnly ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                  <div className="mt-2 max-h-80 overflow-y-auto border border-border rounded-lg">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => setFormData(prev => ({ ...prev, clientId: client.id }))}
                        className={`w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-b-0 ${
                          formData.clientId === client.id ? 'bg-info/10 text-info-foreground' : ''
                        }`}
                      >
                        <div className="font-medium">{client.name}</div>
                        {client.phone && <div className="text-sm text-muted-foreground">{client.phone}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 2 - Time + Services */}
              <div className={`${
                modalSize === 'fullscreen' ? 'space-y-6 overflow-y-auto' : 'space-y-4'
              }`}>
                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Usługi * {isEditing && (
                      <span className="text-xs text-warning-foreground font-normal">
                        (w trybie edycji można wybrać tylko jedną usługę)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Szukaj usługi..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      disabled={isReadOnly}
                      className={`w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                        isReadOnly ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                  <div className="mt-2 max-h-64 overflow-y-auto border border-border rounded-lg">
                    {filteredServices.map((service) => {
                      const isSelected = formData.serviceIds.includes(service.id);
                      const isCompatibleWithStaff = formData.staffIds.length === 0 || 
                        availableServices.includes(service);
                      
                      return (
                        <button
                          key={service.id}
                          onClick={() => {
                            if (isEditing) {
                              // In edit mode, allow only one service (database limitation)
                              setFormData(prev => ({
                                ...prev,
                                serviceIds: isSelected ? [] : [service.id]
                              }));
                            } else {
                              // In create mode, allow multiple services (though only first will be saved)
                              setFormData(prev => ({
                                ...prev,
                                serviceIds: isSelected
                                  ? prev.serviceIds.filter(id => id !== service.id)
                                  : [...prev.serviceIds, service.id]
                              }));
                            }
                          }}
                          disabled={!isCompatibleWithStaff}
                          className={`w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-b-0 transition-colors ${
                            isSelected ? 'bg-success/10 text-success border-success/30' : ''
                          } ${
                            !isCompatibleWithStaff ? 'opacity-50 cursor-not-allowed bg-muted' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-medium flex items-center">
                                {service.name}
                                {!isCompatibleWithStaff && (
                                  <span className="ml-2 text-xs text-error flex items-center"><AlertTriangle className="h-3 w-3 mr-1" /> Niedostępne dla wybranego pracownika</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {service.duration} min • {formatPrice(service.price, 'PLN')}
                                {/* Category not available in Service interface */}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="text-success font-medium ml-2"><CheckCircle className="h-4 w-4" /></div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Add More Services Button */}
                  {formData.serviceIds.length > 0 && !showAllServices && (
                    <div className="mt-3">
                      <button 
                        type="button"
                        onClick={() => setShowAllServices(true)}
                        className="text-info hover:text-info-foreground text-sm font-medium flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Dodaj więcej usług
                      </button>
                    </div>
                  )}
                  
                  {/* Extended Services List */}
                  {showAllServices && (
                    <div className="mt-4 p-4 bg-info/10 rounded-lg border border-info/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-info-foreground">Wszystkie dostępne usługi</h4>
                        <button 
                          type="button"
                          onClick={() => setShowAllServices(false)}
                          className="text-info hover:text-info-foreground text-xs"
                        >
                          <Minus className="h-4 w-4 mr-1" /> Zwiń
                        </button>
                      </div>
                      <div className="max-h-32 overflow-y-auto border border-info/30 rounded bg-card">
                        {services.filter(service => !formData.serviceIds.includes(service.id)).map((service) => {
                          const isCompatible = formData.staffIds.length === 0 || availableServices.includes(service);
                          return (
                            <button
                              key={service.id}
                              onClick={() => {
                                if (isCompatible) {
                                  setFormData(prev => ({
                                    ...prev,
                                    serviceIds: [...prev.serviceIds, service.id]
                                  }));
                                }
                              }}
                              disabled={!isCompatible}
                              className={`w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-b-0 transition-colors ${
                                !isCompatible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-sm">{service.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {service.duration} min • {formatPrice(service.price, 'PLN')}
                                  </div>
                                </div>
                                {!isCompatible && (
                                  <span className="text-xs text-error flex items-center"><AlertTriangle className="h-3 w-3 mr-1" /> Niedostępne</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                </div>



              </div>

              {/* Column 3 - Summary */}
              <div className={`${
                modalSize === 'fullscreen' ? 'space-y-8 overflow-y-auto' : 'space-y-6'
              }`}>
                {/* Date and Time - moved to column 3 */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-3">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data i godzina * {canSelectDateTime && (
                      <span className="ml-2 text-success text-xs flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Gotowe do wyboru</span>
                    )}
                  </label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        disabled={isReadOnly}
                        className={`w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                          isReadOnly ? 'bg-muted cursor-not-allowed' : ''
                        }`}
                      />
                      <label className="block text-xs text-muted-foreground mt-1">Data</label>
                    </div>
                    <div>
                      <select
                        value={formData.startTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                        disabled={isReadOnly}
                        className={`w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                          isReadOnly ? 'bg-muted cursor-not-allowed' : ''
                        }`}
                      >
                        {Array.from({ length: 24 }, (_, hour) => 
                          ['00', '15', '30', '45'].map(minute => {
                            const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
                            const appointmentDate = formData.date ? new Date(formData.date) : new Date();
                            
                            let isAvailable = false;
                            
                            if (formData.staffIds.length > 0) {
                              // Если выбран конкретный мастер, проверяем его персональный график
                              isAvailable = formData.staffIds.some(staffId => {
                                const timeSlot = new Date(appointmentDate);
                                timeSlot.setHours(hour, parseInt(minute));
                                const staffSchedule = staffSchedules.filter(s => s.staffId === staffId);
                                return isStaffAvailable(staffId, timeSlot, staffSchedule, staffScheduleExceptions);
                              });
                            } else {
                              // Если мастер не выбран, проверяем общие часы салона
                              const timeSlot = new Date(appointmentDate);
                              timeSlot.setHours(hour, parseInt(minute));
                              isAvailable = isWithinWorkingHours(timeSlot, workingHours);
                            }
                            
                            // Показываем только доступные временные слоты
                            if (!isAvailable) return null;
                            
                            let disabledByAvailability = false;
                            let availabilityDescription = '';
                            if (canUseAvailabilityData && formData.date) {
                              const apiSlotAvailability = checkSlotAvailability(
                                formData.date,
                                hour,
                                Number.parseInt(minute, 10)
                              );
                              if (!apiSlotAvailability.isAvailable) {
                                disabledByAvailability = true;
                                const label = apiSlotAvailability.unavailabilityReason
                                  ? t(getSlotUnavailabilityTranslationKey(apiSlotAvailability.unavailabilityReason))
                                  : apiSlotAvailability.messageKey
                                  ? t(apiSlotAvailability.messageKey)
                                  : apiSlotAvailability.message || t('schedule.unavailable.default');
                                availabilityDescription = ` — ${label}`;
                              }
                            }
                            
                            return (
                              <option 
                                key={timeStr} 
                                value={timeStr}
                                disabled={disabledByAvailability}
                              >
                                {timeStr}{availabilityDescription}
                              </option>
                            );
                          })
                        ).flat().filter(Boolean)}
                      </select>
                      <label className="block text-xs text-muted-foreground mt-1">Godzina rozpoczęcia</label>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {availabilityEnabled ? (
                      <>
                        {availabilityLoading && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {t('schedule.availability.checking', 'Sprawdzanie dostępności slotów...')}
                          </div>
                        )}
                        {!availabilityLoading && availabilityError && (
                          <div className="flex items-center gap-2 text-xs text-error">
                            <AlertTriangle className="h-3 w-3" />
                            {t('schedule.availability.loadFailed', {
                              error: availabilityError
                            })}
                          </div>
                        )}
                        {!availabilityLoading && !availabilityError && selectedSlotAvailability && (
                          selectedSlotAvailability.isAvailable ? (
                            <div className="flex items-center gap-2 text-sm text-success">
                              <CheckCircle className="h-4 w-4" />
                              {t('schedule.availability.slotAvailable', 'Ten termin jest dostępny')}
                            </div>
                          ) : (
                            <div className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${getSlotUnavailabilityColor(selectedSlotAvailability.unavailabilityReason)}`}>
                              <span className="text-base">
                                {getSlotUnavailabilityIcon(selectedSlotAvailability.unavailabilityReason)}
                              </span>
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {selectedSlotAvailability.unavailabilityReason
                                    ? t(getSlotUnavailabilityTranslationKey(selectedSlotAvailability.unavailabilityReason))
                                    : selectedSlotAvailability.messageKey
                                    ? t(selectedSlotAvailability.messageKey)
                                    : selectedSlotAvailability.message || t('schedule.unavailable.default')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t('schedule.availability.slotUnavailableHint', 'Wybierz inny termin lub pracownika.')}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                        {!availabilityLoading && !availabilityError && availabilityReasonList.length > 0 && (
                          <div className="pt-2 border-t border-dashed border-border">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              {t('schedule.availability.legendTitle', 'Legenda dostępności')}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {availabilityReasonList.map(reason => (
                                <span
                                  key={reason}
                                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${getSlotUnavailabilityColor(reason)}`}
                                >
                                  <span>{getSlotUnavailabilityIcon(reason)}</span>
                                  {t(getSlotUnavailabilityTranslationKey(reason))}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {!availabilityLoading && !availabilityError && availabilityTimezone && (
                          <p className="text-[11px] text-muted-foreground">
                            {t('schedule.availability.timezoneLabel', { timezone: availabilityTimezone })}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Info className="h-3 w-3" />
                        {t(
                          'schedule.availability.selectPrompt',
                          'Wybierz usługi i pracownika, aby sprawdzić dostępność slotów.'
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Podsumowanie wizyty</h3>
                  
                  {/* Selected Client */}
                  {formData.clientId && (
                    <div className="mb-4">
                      <div className="text-sm text-muted-foreground">Klient</div>
                      <div className="font-medium">
                        {clients.find(c => c.id === formData.clientId)?.name}
                      </div>
                    </div>
                  )}

                  {/* Selected Services */}
                  {selectedServices.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm text-muted-foreground mb-2">Usługi</div>
                      <div className="space-y-1">
                        {selectedServices.map((service) => (
                          <div key={service.id} className="flex justify-between text-sm">
                            <span>{service.name}</span>
                            <span>{formatPrice(service.price, 'PLN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Staff */}
                  {formData.staffIds.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm text-muted-foreground">
                        {formData.staffIds.length === 1 ? 'Pracownik' : 'Pracownicy'}
                      </div>
                      <div className="font-medium">
                        {formData.staffIds.length === 1 
                          ? staff.find(s => s.id === formData.staffIds[0])?.name
                          : formData.staffIds.map(staffId => 
                              staff.find(s => s.id === staffId)?.name
                            ).filter(Boolean).join(', ')
                        }
                      </div>
                    </div>
                  )}

                  {/* Date & Time */}
                  {formData.date && formData.startTime && (
                    <div className="mb-4">
                      <div className="text-sm text-muted-foreground">Data i czas</div>
                      <div className="font-medium">
                        {formatDateTimeDisplay(formData.date, formData.startTime)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Zakończenie: {formData.endTime}
                      </div>
                    </div>
                  )}

                  {/* Duration & Price */}
                  {selectedServices.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Czas trwania</span>
                        <span className="font-medium">{totalDuration} min</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Łączna cena</span>
                        <span className="text-lg font-bold">
                          {formatPrice(totalPrice, 'PLN')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes - moved below summary */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Notatki
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Dodatkowe informacje..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
                  />
                </div>
              </div>
              </div>
            </div>
          ) : modalMode === 'VIEW' ? (
            appointment ? (
            /* EXISTING APPOINTMENT VIEW - 2 COLUMN LAYOUT */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN - CLIENT INFORMATION */}
              <div className="space-y-6">
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Informacje o kliencie</h3>
                  
                  {/* Client Avatar */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden bg-muted">
                      {appointment.clientAvatarUrl ? (
                        <img
                          src={appointment.clientAvatarUrl}
                          alt={appointment.clientName || 'Client'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-muted-foreground font-bold text-xl">
                          {getInitials(appointment.clientName)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-foreground">{appointment.clientName || 'Brak klienta'}</h3>
                      <p className="text-sm text-muted-foreground">Klient</p>
                    </div>
                  </div>

                  {/* Client Contact Information */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center text-success">
                        <Phone className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Telefon</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.clientPhone || 'Brak numeru telefonu'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-info/10 rounded-full flex items-center justify-center text-info">
                        <Mail className="h-4 w-4 text-info" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Email</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.clientEmail || 'Brak adresu email'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN - APPOINTMENT DETAILS */}
              <div className="space-y-6">
                {/* Date & Time */}
                <div className="bg-muted rounded-lg p-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-1">Data i czas</h4>
                      <p className="text-sm font-medium text-foreground">
                        {formatDateTime(appointment.startAt, appointment.timezone)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Czas trwania: {Math.round((new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / (1000 * 60))} min
                      </p>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="bg-muted rounded-lg p-6">
                  <h4 className="text-sm font-medium text-foreground mb-3">Usługi</h4>
                  <div className="space-y-2">
                    {appointment.serviceNames.map((service, index) => (
                      <div key={index} className="text-sm text-muted-foreground bg-card px-3 py-2 rounded border">
                        {service}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Staff */}
                <div className="bg-muted rounded-lg p-6">
                  <h4 className="text-sm font-medium text-foreground mb-2">Pracownik</h4>
                  <div className="text-sm text-muted-foreground">{appointment.staffName}</div>
                </div>

                {/* Price */}
                <div className="bg-muted rounded-lg p-6">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {formatPrice(typeof appointment.price === 'string' ? parseFloat(appointment.price) : appointment.price, appointment.currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">Cena</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {appointment.notes && (
                  <div className="bg-muted rounded-lg p-6">
                    <h4 className="text-sm font-medium text-foreground mb-2">Notatki</h4>
                    <p className="text-sm text-muted-foreground bg-card p-3 rounded border">
                      {appointment.notes}
                    </p>
                  </div>
                )}

                {/* Status - No title, same as CREATE/EDIT mode */}
                <div className="bg-muted rounded-lg p-6">
                  <div className="flex space-x-2 overflow-x-auto">
                    {statusOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = appointment.status === option.value;
                      const isDisabled = saving;
                      const style = statusButtonStyles[option.value];
                      return (
                        <button
                          key={option.value}
                          onClick={() => !isDisabled && handleStatusChange(option.value)}
                          disabled={isDisabled}
                          title={option.label}
                          className={`
                            flex items-center justify-center px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                            ${isSelected ? style.selected : style.unselected}
                            ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            group
                          `}
                        >
                          <Icon className="h-4 w-4 mr-2 md:mr-1" />
                          <span className="hidden md:inline">{option.shortLabel}</span>
                          <span className="md:hidden sr-only">{option.label}</span>
                          
                          {/* Tooltip for mobile */}
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 md:hidden">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            ) : (
            /* Loading state for VIEW mode */
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground text-sm">Ładowanie szczegółów wizyty...</p>
            </div>
            )
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nieznany tryb</p>  
            </div>
          )}
          </div>
        )}

        {/* Footer - Hidden when minimized */}
        {modalSize !== 'minimized' && (
        <div className={`flex justify-between border-t border-border ${
          modalSize === 'fullscreen' ? 'p-8' : 'p-6'
        }`}>
          <div className="flex space-x-3">
            {modalMode === 'VIEW' && appointment && (
              <>
                <button
                  onClick={() => {
                    navigate(`/appointments/${appointmentId}?mode=edit`);
                    onClose?.();
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Edit3 className="h-4 w-4 mr-1" /> Edytuj
                </button>
                <button
                  onClick={() => handleAddPayment()}
                  className="px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors flex items-center"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Płatność
                </button>
                {/* Admin-only delete button */}
                {modalMode === 'VIEW' && appointment && (role === 'OWNER' || role === 'MANAGER') && (
                  <button
                    onClick={handleDeleteAppointment}
                    disabled={saving}
                    className="px-4 py-2 bg-error text-error-foreground rounded-lg hover:bg-error/90 disabled:opacity-50 transition-colors"
                    title="Tylko dla administratorów - akcja zostanie zapisana w logach"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> {saving ? 'Usuwanie...' : 'Usuń (Admin)'}
                  </button>
                )}
              </>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              {modalMode === 'VIEW' ? 'Zamknij' : 'Anuluj'}
            </button>
            
            {modalMode === 'CREATE' && (
              <button
                onClick={handleCreateAppointment}
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Zapisywanie...' : 'Utwórz wizytę'}
              </button>
            )}
            
            {modalMode === 'EDIT' && (
              <button
                onClick={handleUpdateAppointment}
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Zapisywanie...' : 'Zaktualizuj wizytę'}
              </button>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
