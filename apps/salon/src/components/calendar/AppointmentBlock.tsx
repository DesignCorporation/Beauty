import React, { useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Clock, DollarSign } from 'lucide-react';
import type { CalendarAppointment } from '../../types/calendar';
import { debugLog } from '../../utils/debug';

interface AppointmentBlockProps {
  appointment: CalendarAppointment;
  masterColor?: string;
  style?: React.CSSProperties;
  onClick: () => void;
  onDrop: (appointmentId: string, newStartAt: string, newStaffId?: string) => void;
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-warning/10 border-warning/20 text-warning-foreground',
  CONFIRMED: 'bg-success/10 border-success/20 text-success',
  IN_PROGRESS: 'bg-info/10 border-info/20 text-info', // Добавлено для IN_PROGRESS
  COMPLETED: 'bg-primary/10 border-primary/20 text-primary',
  CANCELED: 'bg-error/10 border-error/20 text-error-foreground'
};

const statusLabels: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  IN_PROGRESS: 'W trakcie', // Добавлено для IN_PROGRESS
  COMPLETED: 'Zakończona',
  CANCELED: 'Anulowana'
};

const getInitials = (value?: string | null) => {
  if (!value) return '?';
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const [onlyPart] = parts;
    return onlyPart?.charAt(0).toUpperCase() ?? '?';
  }
  const firstPart = parts[0] ?? '';
  const lastPart = parts.length > 1 ? parts[parts.length - 1] ?? firstPart : firstPart;
  const initials = `${firstPart.charAt(0)}${lastPart.charAt(0)}`.toUpperCase();
  return initials || '?';
};

export const AppointmentBlock: React.FC<AppointmentBlockProps> = ({
  appointment,
  masterColor,
  style,
  onClick
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('appointmentId', appointment.id);
    e.dataTransfer.setData('sourceStartAt', appointment.startAt);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const formatTime = (datetime: string, timezone?: string) => {
    // Convert UTC time to local timezone for display
    try {
      const utcDate = new Date(datetime);
      const tz = timezone || 'Europe/Warsaw';
      const localDate = toZonedTime(utcDate, tz);
      return format(localDate, 'HH:mm');
    } catch (error) {
      return format(new Date(datetime), 'HH:mm');
    }
  };

  const formatPrice = (price: number | string, currency: string) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency
    }).format(numericPrice);
  };

  const staffLines =
    (appointment.staffLabel && appointment.staffLabel.length > 0)
      ? appointment.staffLabel
      : appointment.staffMembers && appointment.staffMembers.length > 0
        ? appointment.staffMembers.map(m => `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()).filter(Boolean)
        : appointment.staffName ? [appointment.staffName] : [];

  return (
    <div
      style={{
        ...style,
        borderLeftColor: masterColor || '#6B7280'
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        debugLog('[AppointmentBlock] Clicked appointment:', appointment.id);
        onClick();
      }}
      className={`
        rounded-lg border-l-4 p-2 cursor-pointer transition-all duration-200 shadow-sm
        ${statusStyles[appointment.status]}
        ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'}
      `}
    >
      {/* Time */}
      <div className="flex items-center text-xs font-medium mb-1">
        <Clock className="h-3 w-3 mr-1" />
        {formatTime(appointment.startAt, appointment.timezone)} - {formatTime(appointment.endAt, appointment.timezone)}
      </div>

      {/* Client */}
      <div className="flex items-center text-sm font-semibold mb-1">
        {appointment.clientAvatarUrl ? (
          <img
            src={appointment.clientAvatarUrl}
            alt={appointment.clientName}
            className="h-4 w-4 rounded-full object-cover mr-1.5"
          />
        ) : (
          <div className="h-4 w-4 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center text-[10px] font-semibold mr-1.5">
            {getInitials(appointment.clientName)}
          </div>
        )}
        {appointment.clientName}
      </div>

      {/* Staff */}
      {staffLines.length > 0 && (
        <div className="text-xs text-muted-foreground mb-1 space-y-0.5">
          {staffLines.map((line, idx) => (
            <div key={`${appointment.id}-staff-${idx}`} className="flex items-center">
              <div
                className="h-4 w-4 rounded-full flex items-center justify-center mr-1.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: appointment.staffColor || '#6B7280' }}
              >
                {getInitials(line)}
              </div>
              <span className="truncate">{line}</span>
            </div>
          ))}
        </div>
      )}

      {/* Service */}
      <div className="text-xs text-muted-foreground mb-1 line-clamp-1">
        {appointment.serviceNames.join(', ')}
      </div>

      {/* Price */}
      <div className="flex items-center text-xs font-medium">
        <DollarSign className="h-3 w-3 mr-1" />
        {formatPrice(appointment.price, appointment.currency)}
      </div>

      {/* Status badge */}
      <div className="mt-1">
        <span className="inline-block px-1.5 py-0.5 text-xs font-medium rounded">
          {statusLabels[appointment.status]}
        </span>
      </div>
    </div>
  );
};
