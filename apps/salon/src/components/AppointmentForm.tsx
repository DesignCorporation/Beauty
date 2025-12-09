import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@beauty-platform/ui';
import { X, Clock, User, Briefcase, Calendar, AlertCircle, Mail, Loader2, Phone, CalendarDays } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useServices } from '../hooks/useServices';
import { useStaff } from '../hooks/useStaff';
import { useAppointments } from '../hooks/useAppointments';
import { useTenant } from '../contexts/AuthContext';
import { CRMApiService, ClientProfileInfo } from '../services/crmApiNew';
import { sdkClient } from '../services/sdkClient';
import { debugLog } from '../utils/debug';
import type { AppointmentFilters } from '../types/calendar';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_CHECK_DEBOUNCE_MS = 500;

// Issue #82: Specialization labels
const specializationLabels: Record<string, string> = {
  BARBER: 'Барбер',
  STYLIST: 'Стилист',
  NAIL_MASTER: 'Мастер маникюра',
  COLORIST: 'Колорист',
  GROOMER: 'Груммер',
  MAKEUP_ARTIST: 'Визажист',
  MASSAGE_THERAPIST: 'Массажист',
  AESTHETIC_SPECIALIST: 'Эстетолог',
  PIERCER: 'Пирсер',
  TATTOO_ARTIST: 'Татуировщик',
};

// Issue #82: Language flags
const languageFlags: Record<string, string> = {
  pl: '🇵🇱',
  en: '🇬🇧',
  ru: '🇷🇺',
  ua: '🇺🇦',
};

type AppointmentScheduleFormData = {
  date: string;
  startTime: string;
  endTime: string;
  serviceId: string;
  assignedToId: string;
  notes: string;
};

type ClientProfileSummary = ClientProfileInfo;

interface ClientDataPayload {
  firstName: string;
  lastName: string;
  phone?: string;
  birthdate?: string;
}

interface CreateAppointmentPayload {
  clientEmail: string;
  clientData?: ClientDataPayload;
  serviceId: string;
  staffId: string;
  startAt: string;
  endAt: string;
  notes?: string;
}

interface CreateAppointmentResponse {
  success?: boolean;
  [key: string]: unknown;
}

interface StaffAppointmentSummary {
  startTime: string;
  endTime: string;
  status: string;
}

const formatBirthdate = (value?: string | null) => {
  if (!value) return '';
  const date = parseISO(value);
  return isValid(date) ? format(date, 'dd.MM.yyyy') : value;
};

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  onSuccess?: () => void;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  isOpen,
  onClose,
  initialDate = new Date(),
  onSuccess
}) => {
  const { t } = useTranslation();
  const { services, loading: servicesLoading } = useServices();
  // Issue #82: Load ALL staff (not just bookable ones) for appointment scheduling
  const { staff, loading: staffLoading } = useStaff({ bookableOnly: false });
  const { tenantId } = useTenant();
  const defaultFilters: AppointmentFilters = { staffIds: [], statuses: [] };
  useAppointments({
    date: new Date(),
    view: 'day',
    filters: defaultFilters,
    ...(tenantId ? { salonId: tenantId } : {})
  });

  const emailCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmailCheckRef = useRef<{ email: string; exists: boolean } | null>(null);

  const clearEmailCheckTimer = useCallback(() => {
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
      emailCheckTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearEmailCheckTimer();
    };
  }, [clearEmailCheckTimer]);

  // Проверка доступности временного слота для мастера
  const checkStaffAvailability = async (staffId: string, date: string, startTime: string, endTime: string): Promise<boolean> => {
    if (!staffId || !date || !startTime || !endTime) return true;
    
    try {
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;
      
      const result = await sdkClient.request<{
        data?: StaffAppointmentSummary[];
        appointments?: StaffAppointmentSummary[];
      }>(`/crm/appointments?staffId=${staffId}&startDate=${date}&endDate=${date}`, {
        method: 'GET'
      });
      const appointments: StaffAppointmentSummary[] = result.appointments ?? result.data ?? [];
      
      // Проверяем пересечения времени
      const hasConflict = appointments.some((apt) => {
        if (apt.status === 'CANCELLED') return false;
        
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        const newStart = new Date(startDateTime);
        const newEnd = new Date(endDateTime);
        
        // Проверка пересечения: новое время начинается до окончания существующей записи
        // и заканчивается после начала существующей записи
        return (newStart < aptEnd && newEnd > aptStart);
      });
      
      return !hasConflict;
    } catch (error) {
      console.error('Error checking staff availability:', error);
      return true; // В случае ошибки не блокируем
    }
  };

  const sanitizeOptional = (value: string) => (value && value.trim() ? value.trim() : undefined);

  const createAppointment = async (payload: CreateAppointmentPayload): Promise<CreateAppointmentResponse> => {
    try {
      const result = await sdkClient.post<CreateAppointmentResponse>('/crm/appointments', payload);
      debugLog('✅ Appointment created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to create appointment:', error);
      throw error;
    }
  };

  const [formData, setFormData] = useState<AppointmentScheduleFormData>({
    date: format(initialDate, 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    serviceId: '',
    assignedToId: '',
    notes: ''
  });

  const [clientEmail, setClientEmail] = useState('');
  const [clientForm, setClientForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    birthdate: ''
  });
  const [clientProfile, setClientProfile] = useState<ClientProfileSummary | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState('');

  // Issue #82: Filtered staff based on selected service
  const [filteredStaff, setFilteredStaff] = useState(staff);

  const getClientName = useCallback((profile?: ClientProfileSummary | null) => {
    if (!profile) return '';
    const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    return fullName || profile.email;
  }, []);

  const clientDisplayName = useMemo(() => getClientName(clientProfile), [clientProfile, getClientName]);

  const clientInitials = useMemo(() => {
    if (clientDisplayName) {
      const parts = clientDisplayName.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        const [firstPart, secondPart] = parts;
        const firstInitial = firstPart?.charAt(0).toUpperCase() ?? '';
        const secondInitial = secondPart?.charAt(0).toUpperCase() ?? '';
        const combined = `${firstInitial}${secondInitial}`;
        return combined || '—';
      }
      return clientDisplayName.charAt(0).toUpperCase();
    }

    if (clientProfile?.email) {
      return clientProfile.email.charAt(0).toUpperCase();
    }

    return '—';
  }, [clientDisplayName, clientProfile?.email]);

  const performEmailCheck = useCallback(
    async (email: string, options: { silent?: boolean } = {}) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        return;
      }

      setIsCheckingEmail(true);
      setEmailError(null);

      try {
        const response = await CRMApiService.checkClientEmail(normalizedEmail);

        if (!response.success) {
          throw new Error('CHECK_FAILED');
        }

        setEmailChecked(true);

        const previous = lastEmailCheckRef.current;
        const hasChanged =
          !previous ||
          previous.email !== normalizedEmail ||
          previous.exists !== response.exists;

        lastEmailCheckRef.current = { email: normalizedEmail, exists: response.exists };

        if (response.exists && response.clientProfile) {
          setClientProfile(response.clientProfile);
          setClientForm({
            firstName: '',
            lastName: '',
            phone: '',
            birthdate: ''
          });

          if (!options.silent && hasChanged) {
            toast.success(
              t('appointmentForm.clientSection.toast.found', {
                name: getClientName(response.clientProfile)
              })
            );
          }
        } else {
          setClientProfile(null);
          if (!options.silent && hasChanged) {
            toast.info(t('appointmentForm.clientSection.toast.new'));
          }
        }
      } catch (error) {
        console.error('[AppointmentForm] Email check failed:', error);
        setEmailChecked(false);
        setClientProfile(null);
        setEmailError(t('appointmentForm.clientSection.errors.checkFailed'));
        lastEmailCheckRef.current = null;
        if (!options.silent) {
          toast.error(t('appointmentForm.clientSection.toast.error'));
        }
      } finally {
        setIsCheckingEmail(false);
      }
    },
    [getClientName, t]
  );

  const scheduleEmailCheck = useCallback(
    (value: string) => {
      clearEmailCheckTimer();
      const normalized = value.trim().toLowerCase();
      if (!normalized || !EMAIL_REGEX.test(normalized)) {
        return;
      }

      emailCheckTimeoutRef.current = setTimeout(() => {
        void performEmailCheck(normalized, { silent: true });
      }, EMAIL_CHECK_DEBOUNCE_MS);
    },
    [clearEmailCheckTimer, performEmailCheck]
  );
  const clearError = (field: string) => {
    if (!errors[field]) return;
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Сброс формы при открытии
  useEffect(() => {
    if (isOpen) {
      clearEmailCheckTimer();
      setFormData({
        date: format(initialDate, 'yyyy-MM-dd'),
        startTime: '10:00',
        endTime: '11:00',
        serviceId: '',
        assignedToId: '',
        notes: ''
      });
      setClientEmail('');
      setClientForm({
        firstName: '',
        lastName: '',
        phone: '',
        birthdate: ''
      });
      setClientProfile(null);
      setEmailChecked(false);
      setEmailError(null);
      setIsCheckingEmail(false);
      setErrors({});
      setConflictWarning('');
      lastEmailCheckRef.current = null;
    }
  }, [clearEmailCheckTimer, initialDate, isOpen]);

  // Issue #82: Update filteredStaff when staff changes
  useEffect(() => {
    setFilteredStaff(staff);

    // If currently selected staff is no longer available, clear selection
    if (formData.assignedToId && !staff.some(s => s.id === formData.assignedToId)) {
      setFormData(prev => ({ ...prev, assignedToId: '' }));
    }
  }, [staff, formData.assignedToId]);

  // Автоматический расчет времени окончания при выборе услуги или изменении времени начала
  useEffect(() => {
    if (formData.serviceId && formData.startTime) {
      const selectedService = services.find(s => s.id === formData.serviceId);
      if (selectedService && selectedService.duration) {
        const [hoursRaw, minutesRaw] = formData.startTime.split(':');
        const hours = Number.parseInt(hoursRaw ?? '0', 10);
        const minutes = Number.parseInt(minutesRaw ?? '0', 10);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + selectedService.duration;
        // Обработка перехода через полночь
        const endHours = Math.floor(endMinutes / 60) % 24;
        const endMins = endMinutes % 60;
        
        const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        
        // Обновляем только если время изменилось, чтобы избежать лишних ре-рендеров
        if (formData.endTime !== newEndTime) {
          setFormData(prev => ({
            ...prev,
            endTime: newEndTime
          }));
        }
      }
    }
  }, [formData.serviceId, formData.startTime, services, formData.endTime]);

  // Real-time проверка конфликтов мастера
  useEffect(() => {
    const checkAvailability = async () => {
      if (formData.assignedToId && formData.date && formData.startTime && formData.endTime) {
        const isAvailable = await checkStaffAvailability(
          formData.assignedToId, 
          formData.date, 
          formData.startTime, 
          formData.endTime
        );
        
        if (!isAvailable) {
          setConflictWarning(`⚠️ Мастер уже занят в это время. Выберите другое время или мастера.`);
        } else {
          setConflictWarning('');
        }
      } else {
        setConflictWarning('');
      }
    };
    
    // Debounce: проверяем через 500ms после последнего изменения
    const timeoutId = setTimeout(checkAvailability, 500);
    
    return () => clearTimeout(timeoutId);
  }, [formData.assignedToId, formData.date, formData.startTime, formData.endTime]);

  // Обработка изменения полей
  const handleInputChange = (field: keyof AppointmentScheduleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const handleClientFormChange = (field: keyof typeof clientForm, value: string) => {
    setClientForm(prev => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const handleEmailChange = (value: string) => {
    setClientEmail(value);
    setClientProfile(null);
    setEmailChecked(false);
    setEmailError(null);
    setClientForm({
      firstName: '',
      lastName: '',
      phone: '',
      birthdate: ''
    });
    clearError('clientEmail');
    lastEmailCheckRef.current = null;
    scheduleEmailCheck(value);
  };

  const handleCheckEmail = async () => {
    const normalizedEmail = clientEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailError(t('appointmentForm.clientSection.errors.empty'));
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailError(t('appointmentForm.clientSection.errors.invalid'));
      return;
    }

    clearEmailCheckTimer();
    await performEmailCheck(normalizedEmail, { silent: false });
  };

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const normalizedEmail = clientEmail.trim();
    if (!normalizedEmail) {
      newErrors.clientEmail = t('appointmentForm.clientSection.errors.empty');
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      newErrors.clientEmail = t('appointmentForm.clientSection.errors.invalid');
    } else if (!emailChecked) {
      newErrors.clientEmail = t('appointmentForm.clientSection.errors.notChecked');
    }

    if (!clientProfile) {
      if (!clientForm.firstName.trim()) newErrors.firstName = 'Укажите имя';
      if (!clientForm.lastName.trim()) newErrors.lastName = 'Укажите фамилию';
    }

    if (!formData.serviceId) newErrors.serviceId = 'Выберите услугу';
    if (!formData.assignedToId) newErrors.assignedToId = 'Выберите мастера';
    if (!formData.date) newErrors.date = 'Выберите дату';
    if (!formData.startTime) newErrors.startTime = 'Укажите время начала';
    if (!formData.endTime) newErrors.endTime = 'Укажите время окончания';

    // Проверка логики времени
    if (formData.startTime && formData.endTime) {
      const startMinutes = timeToMinutes(formData.startTime);
      const endMinutes = timeToMinutes(formData.endTime);
      
      if (endMinutes <= startMinutes) {
        newErrors.endTime = 'Время окончания должно быть позже времени начала';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Конвертация времени в минуты
  const timeToMinutes = (time: string): number => {
    const [hoursRaw, minutesRaw] = time.split(':');
    const hours = Number.parseInt(hoursRaw ?? '0', 10);
    const minutes = Number.parseInt(minutesRaw ?? '0', 10);
    return hours * 60 + minutes;
  };

  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    const normalizedEmail = clientEmail.trim().toLowerCase();

    setIsSubmitting(true);
    
    try {
      const payload: CreateAppointmentPayload = {
        clientEmail: normalizedEmail,
        serviceId: formData.serviceId,
        staffId: formData.assignedToId,
        startAt: `${formData.date}T${formData.startTime}:00`,
        endAt: `${formData.date}T${formData.endTime}:00`
      };

      const sanitizedNotes = sanitizeOptional(formData.notes);
      if (sanitizedNotes !== undefined) {
        payload.notes = sanitizedNotes;
      }

      if (!clientProfile) {
        const clientData: ClientDataPayload = {
          firstName: clientForm.firstName.trim(),
          lastName: clientForm.lastName.trim()
        };

        const sanitizedPhone = sanitizeOptional(clientForm.phone);
        if (sanitizedPhone !== undefined) {
          clientData.phone = sanitizedPhone;
        }

        const sanitizedBirthdate = sanitizeOptional(clientForm.birthdate);
        if (sanitizedBirthdate !== undefined) {
          clientData.birthdate = sanitizedBirthdate;
        }

        payload.clientData = clientData;
      }

      const newAppointment = await createAppointment(payload);
      
      if (newAppointment) {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      setErrors({ general: t('appointmentForm.messages.createFailed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Генерация временных слотов
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">
            {t('appointmentForm.createTitle')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            {/* Ошибка общая */}
            {errors.general && (
              <div className="bg-error/10 border border-error/30 rounded-md p-4 flex items-center">
                <AlertCircle className="h-5 w-5 text-error mr-3" />
                <span className="text-error">{errors.general}</span>
              </div>
            )}

            {/* Предупреждение о конфликте */}
            {conflictWarning && (
              <div className="bg-warning/10 border border-warning/30 rounded-md p-4 flex items-center text-warning">
                <AlertCircle className="h-5 w-5 mr-3" />
                <span className="text-warning-foreground">{conflictWarning}</span>
              </div>
            )}

            {/* Email клиента */}
            <div>
              <Label className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                <Mail className="h-4 w-4 mr-2" />
                {t('appointmentForm.clientSection.emailLabel')}
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="client@example.com"
                  className={errors.clientEmail ? 'border-error focus-visible:ring-error' : ''}
                  disabled={isSubmitting || isCheckingEmail}
                  required
                />
                <Button
                  type="button"
                  onClick={handleCheckEmail}
                  disabled={isCheckingEmail || isSubmitting || !clientEmail.trim()}
                  variant="secondary"
                >
                  {isCheckingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('appointmentForm.clientSection.checking')}
                    </>
                  ) : (
                    t('appointmentForm.clientSection.check')
                  )}
                </Button>
              </div>
              {emailError && (
                <p className="mt-2 text-sm text-error">{emailError}</p>
              )}
              {!emailError && emailChecked && clientProfile && (
                <p className="mt-2 text-sm text-green-600">
                  {t('appointmentForm.clientSection.found')}
                </p>
              )}
              {!emailError && emailChecked && !clientProfile && (
                <p className="mt-2 text-sm text-warning">
                  {t('appointmentForm.clientSection.new')}
                </p>
              )}
            </div>

            {clientProfile && emailChecked && (
              <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm font-medium text-green-700">
                    <User className="mr-2 h-4 w-4" />
                    {t('appointmentForm.clientSection.registered')}
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-green-200 bg-white">
                    {clientProfile.avatar ? (
                      <img
                        src={clientProfile.avatar}
                        alt={t('appointmentForm.clientSection.avatarAlt', { name: clientDisplayName })}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-green-700">
                        {clientInitials}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs font-medium uppercase text-muted-foreground">Имя</Label>
                    <p className="mt-1 text-sm text-foreground">
                      {`${clientProfile.firstName || ''} ${clientProfile.lastName || ''}`.trim() || '—'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium uppercase text-muted-foreground">Email</Label>
                    <p className="mt-1 text-sm text-foreground">
                      {clientProfile.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium uppercase text-muted-foreground">
                      {t('appointmentForm.clientSection.phone')}
                    </Label>
                    <p className="mt-1 text-sm text-foreground flex items-center gap-2">
                      {clientProfile.phone || '—'}
                      {clientProfile.phoneVerified && (
                        <span className="text-green-600 text-xs">✓</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium uppercase text-muted-foreground">
                      {t('appointmentForm.clientSection.birthdate')}
                    </Label>
                    <p className="mt-1 text-sm text-foreground">
                      {formatBirthdate(clientProfile.birthdate) || '—'}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t('appointmentForm.clientSection.notesLabel')}
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder={t('appointmentForm.clientSection.notesPlaceholder')}
                    rows={3}
                    className="mt-2"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            {!clientProfile && emailChecked && (
              <div className="space-y-4 rounded-lg border border-warning/40 bg-warning/10 p-4">
                <div className="flex items-center text-sm font-medium text-warning">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {t('appointmentForm.clientSection.new')}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Имя *</Label>
                    <Input
                      value={clientForm.firstName}
                      onChange={(e) => handleClientFormChange('firstName', e.target.value)}
                      placeholder="Иван"
                      disabled={isSubmitting}
                      className={errors.firstName ? 'border-error focus-visible:ring-error' : ''}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-error">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Фамилия *</Label>
                    <Input
                      value={clientForm.lastName}
                      onChange={(e) => handleClientFormChange('lastName', e.target.value)}
                      placeholder="Петров"
                      disabled={isSubmitting}
                      className={errors.lastName ? 'border-error focus-visible:ring-error' : ''}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-error">{errors.lastName}</p>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center text-sm font-medium text-muted-foreground">
                      <Phone className="mr-2 h-4 w-4" />
                      {t('appointmentForm.clientSection.phone')}
                    </Label>
                    <Input
                      type="tel"
                      value={clientForm.phone}
                      onChange={(e) => handleClientFormChange('phone', e.target.value)}
                      placeholder="+48..."
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center text-sm font-medium text-muted-foreground">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {t('appointmentForm.clientSection.birthdate')}
                    </Label>
                    <Input
                      type="date"
                      value={clientForm.birthdate}
                      onChange={(e) => handleClientFormChange('birthdate', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t('appointmentForm.clientSection.notesLabel')}
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder={t('appointmentForm.clientSection.newNotesPlaceholder')}
                    rows={3}
                    className="mt-2"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            {/* Услуга */}
            <div>
              <Label className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                <Briefcase className="h-4 w-4 mr-2" />
                Услуга *
              </Label>
              <select
                value={formData.serviceId}
                onChange={(e) => handleInputChange('serviceId', e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                  errors.serviceId ? 'border-error' : 'border-border'
                }`}
                disabled={servicesLoading || isSubmitting}
              >
                <option value="">Выберите услугу</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.duration}мин, {service.price}₴)
                  </option>
                ))}
              </select>
              {errors.serviceId && (
                <span className="text-error text-sm mt-1">{errors.serviceId}</span>
              )}
            </div>

            {/* Мастер */}
            <div>
              <Label className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                <User className="h-4 w-4 mr-2" />
                Мастер *
              </Label>
              <select
                value={formData.assignedToId}
                onChange={(e) => handleInputChange('assignedToId', e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                  errors.assignedToId ? 'border-error' : 'border-border'
                }`}
                disabled={staffLoading || isSubmitting}
              >
                <option value="">Выберите мастера</option>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staffMember) => {
                    // Issue #82: Build option text with specialization and languages
                    const specialization = (staffMember as any).specialization
                      ? specializationLabels[(staffMember as any).specialization] || (staffMember as any).specialization
                      : null;
                    const languages = ((staffMember as any).languages || []) as string[];
                    const languageEmojis = languages.slice(0, 2).map(lang => languageFlags[lang.toLowerCase()] || '').join('');

                    let optionText = `${staffMember.firstName} ${staffMember.lastName}`;
                    if (specialization) optionText += ` (${specialization})`;
                    if (languageEmojis) optionText += ` ${languageEmojis}`;

                    return (
                      <option key={staffMember.id} value={staffMember.id}>
                        {optionText}
                      </option>
                    );
                  })
                ) : (
                  <option disabled>{t('appointmentForm.noStaffAvailable')}</option>
                )}
              </select>
              {errors.assignedToId && (
                <span className="text-error text-sm mt-1">{errors.assignedToId}</span>
              )}
              {/* Issue #82: Show selected staff info */}
              {formData.assignedToId && filteredStaff.length > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  {(() => {
                    const selected = filteredStaff.find(s => s.id === formData.assignedToId);
                    if (!selected) return null;

                    const spec = (selected as any).specialization;
                    const langs = ((selected as any).languages || []) as string[];

                    return (
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {selected.firstName} {selected.lastName}
                        </span>
                        <div className="flex gap-2 items-center">
                          {spec && (
                            <span className="text-xs bg-info/20 text-info px-2 py-1 rounded">
                              {specializationLabels[spec] || spec}
                            </span>
                          )}
                          {langs.length > 0 && (
                            <span className="text-xs">
                              {langs.slice(0, 3).map(lang => languageFlags[lang.toLowerCase()] || '').join(' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Дата и время */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Дата */}
              <div>
                <Label className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4 mr-2" />
                  Дата *
                </Label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                    errors.date ? 'border-error' : 'border-border'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.date && (
                  <span className="text-error text-sm mt-1">{errors.date}</span>
                )}
              </div>

              {/* Время начала */}
              <div>
                <Label className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                  <Clock className="h-4 w-4 mr-2" />
                  Начало *
                </Label>
                <select
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                    errors.startTime ? 'border-error' : 'border-border'
                  }`}
                  disabled={isSubmitting}
                >
                  {generateTimeSlots().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                {errors.startTime && (
                  <span className="text-error text-sm mt-1">{errors.startTime}</span>
                )}
              </div>

              {/* Время окончания */}
              <div>
                <Label className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                  <Clock className="h-4 w-4 mr-2" />
                  Окончание *
                </Label>
                <select
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                    errors.endTime ? 'border-error' : 'border-border'
                  }`}
                  disabled={isSubmitting}
                >
                  {generateTimeSlots().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                {errors.endTime && (
                  <span className="text-error text-sm mt-1">{errors.endTime}</span>
                )}
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  servicesLoading ||
                  staffLoading ||
                  !emailChecked ||
                  isCheckingEmail
                }
              >
                {isSubmitting
                  ? t('appointmentForm.buttons.creating')
                  : t('appointments.createAppointment')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
