import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { Calendar, Clock, User, Briefcase, DollarSign, CheckCircle, Timer, CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { type Service } from '../hooks/useServices';
import type { AppointmentStatus } from '../types/calendar';

interface StatusOption {
  value: AppointmentStatus;
  label: string;
  shortLabel: string;
  colorLight: string;
  icon: LucideIcon;
}

// Цветная система статусов как в старом проекте
const statusOptions: StatusOption[] = [
  { 
    value: 'PENDING', 
    label: 'Oczekująca', 
    shortLabel: 'Oczek.', 
    colorLight: 'bg-warning/10 border-warning/20 text-warning-foreground',
    icon: Timer 
  },
  { 
    value: 'CONFIRMED', 
    label: 'Potwierdzona', 
    shortLabel: 'Potw.', 
    colorLight: 'bg-info/10 border-info/20 text-info-foreground',
    icon: CheckCircle2 
  },
  { 
    value: 'COMPLETED', 
    label: 'Zakończona', 
    shortLabel: 'Zak.', 
    colorLight: 'bg-success/10 border-success/20 text-success',
    icon: CheckCircle 
  },
  { 
    value: 'CANCELED', 
    label: 'Anulowana', 
    shortLabel: 'Anul.', 
    colorLight: 'bg-error/10 border-error/20 text-error-foreground',
    icon: XCircle 
  }
];

const DEFAULT_STATUS: StatusOption = (statusOptions[1] ?? statusOptions[0]) as StatusOption;

const getStatusStyles = (status?: string): StatusOption => {
  const statusOption = statusOptions.find(opt => opt.value === status);
  return statusOption ?? DEFAULT_STATUS; // fallback на CONFIRMED
};

interface Client {
  id: string;
  name: string;
  phone?: string;
}


interface Staff {
  id: string;
  name: string;
  role: string;
}

interface AppointmentSummaryProps {
  selectedClient?: Client;
  selectedServices: Service[];
  selectedStaff?: Staff;
  staffMembers?: Staff[];
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  totalDuration: number;
  status?: string;
}

export const AppointmentSummary: React.FC<AppointmentSummaryProps> = ({
  selectedClient,
  selectedServices,
  selectedStaff,
  staffMembers = [],
  date,
  startTime,
  endTime,
  totalPrice,
  totalDuration,
  status
}) => {
  const { t } = useTranslation();

  const formatDateTimeDisplay = (date: string, time: string) => {
    if (!date || !time) return '';
    
    try {
      const dateObj = new Date(`${date}T${time}`);
      return format(dateObj, 'EEEE, d MMMM yyyy • HH:mm');
    } catch {
      return `${date} • ${time}`;
    }
  };

  const formatPrice = (price: number, currency: string = 'PLN') => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const statusLabel = status ? t(`appointments.statuses.${status}`, status) : '';

  const roleLabel = (role?: string) => {
    if (!role) return '';
    const map: Record<string, string> = {
      SALON_OWNER: t('roles.salonOwner', 'Владелец'),
      MANAGER: t('roles.manager', 'Менеджер'),
      STAFF_MEMBER: t('roles.staff', 'Мастер'),
      RECEPTIONIST: t('roles.receptionist', 'Администратор')
    };
    return map[role] ?? role;
  };

  const staffList = staffMembers.length
    ? staffMembers
    : selectedStaff
      ? [selectedStaff]
      : [];

  return (
    <Card className="border-0 border-t border-border/70 bg-transparent shadow-none rounded-none">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="flex items-center text-foreground text-base font-medium">
          <CheckCircle className="w-5 h-5 mr-2 text-success" />
          {t('appointmentSummary.title', 'Подытог записи')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4 space-y-6">
        {/* Selected Client */}
        {selectedClient && (
          <div>
            <div className="text-sm text-muted-foreground mb-1 flex items-center">
              <User className="w-4 h-4 mr-1" />
              {t('appointmentForm.sections.client')}
            </div>
            <div className="font-medium text-foreground">
              {selectedClient.name}
            </div>
            {selectedClient.phone && (
              <div className="text-sm text-muted-foreground">
                {selectedClient.phone}
              </div>
            )}
          </div>
        )}

        {/* Selected Services */}
        {selectedServices.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2 flex items-center">
              <Briefcase className="w-4 h-4 mr-1" />
              {t('appointmentForm.sections.services')} ({selectedServices.length})
            </div>
            <div className="space-y-2">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex justify-between items-start text-sm border-0 border-b border-border/60 px-0 py-3">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {service.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {service.duration} min
                    </div>
                  </div>
                  <div className="font-semibold text-foreground">
                    {formatPrice(service.price || 0, 'PLN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Staff */}
        {staffList.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-1 flex items-center">
              <User className="w-4 h-4 mr-1" />
              {t('appointmentForm.sections.staff')}
            </div>
            <div className="space-y-1">
              {staffList.map(member => (
                <div key={member.id} className="text-sm">
                  <div className="font-medium text-foreground">{member.name}</div>
                  {member.role ? (
                    <div className="text-xs text-muted-foreground">
                      {roleLabel(member.role)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date & Time */}
        {date && startTime && (
          <div>
            <div className="text-sm text-muted-foreground mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {t('appointmentForm.sections.dateTime')}
            </div>
            <div className="font-medium text-foreground">
              {formatDateTimeDisplay(date, startTime)}
            </div>
            {endTime !== startTime && (
              <div className="text-sm text-muted-foreground flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1" />
                {startTime} - {endTime} ({totalDuration} min)
              </div>
            )}
          </div>
        )}

        {/* Status - ЦВЕТНОЙ СТАТУС КАК В СТАРОМ ПРОЕКТЕ */}
        {status && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">{t('appointmentForm.sections.status')}</div>
            <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-none border text-sm font-medium ${getStatusStyles(status).colorLight}`}>
              {React.createElement(getStatusStyles(status).icon, { className: 'w-4 h-4' })}
              <span>{statusLabel}</span>
            </div>
          </div>
        )}

        {/* Total Summary */}
        {(totalPrice > 0 || totalDuration > 0) && (
          <div className="border-t border-border pt-4">
            <div className="space-y-2">
              {totalDuration > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('appointmentSummary.totalDuration', 'Суммарное время')}:</span>
                  <span className="font-medium text-foreground">{totalDuration} min</span>
                </div>
              )}
              {totalPrice > 0 && (
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-foreground flex items-center">
                    <DollarSign className="w-5 h-5 mr-1" />
                    {t('appointmentForm.total')}:
                  </span>
                  <span className="text-success">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedClient && selectedServices.length === 0 && !selectedStaff && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('appointmentSummary.emptyLine1', 'Выберите клиента, услуги и мастеров')}</p>
            <p className="text-xs">{t('appointmentSummary.emptyLine2', 'чтобы увидеть подытог')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
