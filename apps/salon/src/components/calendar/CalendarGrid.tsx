import React, { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, differenceInMinutes, isSameMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { pl } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { AppointmentBlock } from './AppointmentBlock';
import { CurrentTimeLine } from './CurrentTimeLine';
import type { CalendarAppointment, CalendarView } from '../../types/calendar';
import { useWorkingHours, isWithinWorkingHoursSlot, getOverallWorkingHoursRange } from '../../hooks/useWorkingHours';
import { useStaffSchedules, isStaffAvailable } from '../../hooks/useStaffSchedules';
import { useCalendarAvailability, getSlotUnavailabilityColor, getSlotUnavailabilityIcon, getSlotUnavailabilityTranslationKey } from '../../hooks/useCalendarAvailability';
import { debugLog } from '../../utils/debug';

interface CalendarGridProps {
  view: CalendarView;
  currentDate: Date;
  appointments: CalendarAppointment[];
  onAppointmentClick: (appointmentId: string) => void;
  onSlotClick: (datetime: Date) => void;
  onAppointmentDrop: (appointmentId: string, newStartAt: string, newStaffId?: string) => void;
  onDateNavigation?: (date: Date) => void;
  loading: boolean;
  staffFilter?: string[]; // Optional staff filter for availability checking
  // Optional params for availability checking (Issue #77)
  serviceDurationMinutes?: number;
  selectedStaffId?: string;
  bufferMinutes?: number;
  enableAvailabilityChecking?: boolean; // Feature toggle for availability visualization
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  view,
  currentDate,
  appointments,
  onAppointmentClick,
  onSlotClick,
  onAppointmentDrop,
  onDateNavigation,
  loading,
  staffFilter = [],
  serviceDurationMinutes = 60,
  selectedStaffId,
  bufferMinutes = 15,
  enableAvailabilityChecking = true
}) => {
  const { t } = useTranslation();
  // Load working hours from API
  const { workingHours, loading: workingHoursLoading } = useWorkingHours();
  const { schedules: staffSchedules, exceptionsByStaff } = useStaffSchedules();

  // Load availability info for slot visualization (Issue #77)
  const availabilityParams = useMemo(() => ({
    date: format(currentDate, 'yyyy-MM-dd'),
    serviceDurationMinutes,
    staffId: selectedStaffId,
    bufferMinutes
  }), [currentDate, serviceDurationMinutes, selectedStaffId, bufferMinutes]);

  const { checkSlotAvailability } = useCalendarAvailability(
    enableAvailabilityChecking ? availabilityParams : undefined
  );
  
  // Calculate dynamic working hours range
  const workingHoursRange = useMemo(() => {
    if (workingHours.length === 0) {
      return { start: 7, end: 20, interval: 30 }; // Fallback to default
    }
    const { earliestHour, latestHour } = getOverallWorkingHoursRange(workingHours);
    return { start: earliestHour, end: latestHour, interval: 30 };
  }, [workingHours]);
  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else if (view === 'month') {
      // Month view - always show exactly 6 weeks (42 days) for consistent layout
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      // Start from Monday of the first week
      const start = startOfWeek(startOfMonth, { weekStartsOn: 1 });
      
      // Always show 6 weeks (42 days) for consistent calendar height
      const end = new Date(start);
      end.setDate(end.getDate() + 41); // 42 days total (0-41 = 42 days)
      
      return eachDayOfInterval({ start, end });
    }
    return [currentDate]; // day view
  }, [currentDate, view]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = workingHoursRange.start; hour < workingHoursRange.end; hour++) {
      for (let minute = 0; minute < 60; minute += workingHoursRange.interval) {
        slots.push({ hour, minute });
      }
    }
    return slots;
  }, [workingHoursRange]);

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => {
      // Convert UTC time to local timezone for filtering
      const utcDate = new Date(apt.startAt);
      const tz = apt.timezone || 'Europe/Warsaw';
      const localDate = toZonedTime(utcDate, tz);
      return isSameDay(localDate, day);
    });
  };

  const getAppointmentPosition = (appointment: CalendarAppointment) => {
    // Convert UTC time to local timezone for positioning
    const utcStart = new Date(appointment.startAt);
    const utcEnd = new Date(appointment.endAt);
    const tz = appointment.timezone || 'Europe/Warsaw';

    const start = toZonedTime(utcStart, tz);
    const end = toZonedTime(utcEnd, tz);

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const workingStartMinutes = workingHoursRange.start * 60;
    const topPosition = ((startMinutes - workingStartMinutes) / workingHoursRange.interval) * 3.5; // Increased from 2rem to 3.5rem for better visibility

    const duration = differenceInMinutes(end, start);
    const height = Math.max((duration / workingHoursRange.interval) * 3.5, 3.5); // Minimum height 3.5rem

    return { top: topPosition, height };
  };

  // Helper function to check if day is a non-working day
  const isNonWorkingDay = (day: Date): boolean => {
    const dayOfWeek = day.getDay();
    
    // Проверяем общие рабочие часы салона
    const dayWorkingHours = workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
    const salonIsWorking = dayWorkingHours ? dayWorkingHours.isWorkingDay : false;
    
    
    // Если салон не работает в этот день, проверяем есть ли мастера с персональными графиками
    if (!salonIsWorking && staffSchedules.length > 0) {
      // Проверяем есть ли хотя бы один мастер, который работает в этот день
      const hasWorkingStaff = staffSchedules.some(schedule => 
        schedule.dayOfWeek === dayOfWeek && schedule.isWorkingDay
      );
      
      return !hasWorkingStaff; // День некликабельный только если никто не работает
    }
    
    return !salonIsWorking;
  };

  const handleSlotClick = (day: Date, slot: { hour: number; minute: number }) => {
    const datetime = new Date(day);
    datetime.setHours(slot.hour, slot.minute, 0, 0);
    
    // Блокировка записи на прошедшее время
    const now = new Date();
    if (datetime < now) {
      return; // Не вызываем onSlotClick для прошедшего времени
    }
    
    // Блокировка записи в выходные дни
    if (isNonWorkingDay(day)) {
      return; // Не вызываем onSlotClick для выходных дней
    }
    
    // Блокировка записи вне рабочих часов
    if (!isWithinWorkingHoursSlot(workingHours, day, slot.hour, slot.minute)) {
      return; // Не вызываем onSlotClick для нерабочего времени
    }
    
    onSlotClick(datetime);
  };

  const formatTimeSlot = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  if (loading || workingHoursLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-info mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">
            {t('calendar.loading', 'Ładowanie kalendarza...')}
          </p>
        </div>
      </div>
    );
  }

  // Helper to check slot availability and get color/tooltip (Issue #77)
  const getSlotStatusForDisplay = (day: Date, hour: number, minute: number) => {
    if (!enableAvailabilityChecking) {
      return { isAvailable: true };
    }

    const dateStr = format(day, 'yyyy-MM-dd');
    const availability = checkSlotAvailability(dateStr, hour, minute);
    const fallbackKey = availability.unavailabilityReason
      ? getSlotUnavailabilityTranslationKey(availability.unavailabilityReason)
      : undefined;

    return {
      isAvailable: availability.isAvailable,
      reason: availability.unavailabilityReason,
      message: availability.message,
      messageKey: availability.messageKey ?? fallbackKey,
      color: getSlotUnavailabilityColor(availability.unavailabilityReason),
      icon: getSlotUnavailabilityIcon(availability.unavailabilityReason)
    };
  };

  // Month view requires different layout
  if (view === 'month') {
    return (
      <div className="h-full bg-background overflow-hidden">
        <div className="h-full overflow-auto">
          {/* MONTH VIEW LAYOUT */}
          <div className="calendar-month-container">
            {/* Week day headers - современный стиль */}
            <div className="grid grid-cols-7 border-b border-border/30 bg-muted/40">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((dayKey) => (
                <div key={dayKey} className="h-12 flex items-center justify-center bg-muted/40 border-r border-border/30 text-sm font-semibold text-foreground/70">
                  {t(`calendar.weekdays.short.${dayKey}`, dayKey.slice(0, 3))}
                </div>
              ))}
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-7">
              {days.map((day, dayIndex) => {
                const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));
                const isNonWorking = isNonWorkingDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDay = isToday(day);

                return (
                <div
                  key={dayIndex}
                  className={`min-h-[160px] border-r border-b border-border/20 p-3 relative transition-all duration-200 rounded-lg overflow-hidden ${
                    // Styling based on different states
                    !isCurrentMonth
                      ? 'bg-muted/20 text-muted-foreground/40 opacity-50'
                      : isPastDay
                      ? 'bg-muted/30 text-muted-foreground/60'
                      : isNonWorking
                      ? 'bg-muted/40 opacity-70'
                      : 'bg-card hover:shadow-sm hover:border-primary/20'
                  } ${
                    isTodayDay ? 'ring-2 ring-primary ring-opacity-40 bg-primary/5' : ''
                  } ${
                    !isPastDay && !isNonWorking && isCurrentMonth ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  style={
                    isPastDay
                      ? {
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 16px)',
                          backgroundBlendMode: 'multiply'
                        }
                      : isNonWorking
                      ? {
                          backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(239,68,68,0.08) 8px, rgba(239,68,68,0.08) 16px)',
                          backgroundBlendMode: 'multiply'
                        }
                      : undefined
                  }
                >
                  {/* Day number with working hours */}
                  <div className="flex items-baseline justify-between mb-2">
                    <div className={`text-lg font-semibold ${
                      isTodayDay ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    {/* Рабочие часы - очень компактно */}
                    {isCurrentMonth && (
                      <div className={`text-[10px] font-medium whitespace-nowrap ${
                        isNonWorking ? 'text-error/70' : 'text-muted-foreground/60'
                      }`}>
                        {isNonWorking ? (
                          <span>Выходной</span>
                        ) : (
                          (() => {
                            const dayOfWeek = day.getDay();
                            const dayWorkingHours = workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
                            if (dayWorkingHours && dayWorkingHours.isWorkingDay) {
                              return `${dayWorkingHours.startTime}-${dayWorkingHours.endTime}`;
                            }
                            return '';
                          })()
                        )}
                      </div>
                    )}
                  </div>

                  {/* Appointments for this day - компактнее и больше */}
                  <div className="space-y-1.5 relative flex-1 overflow-y-auto">
                    {getAppointmentsForDay(day).slice(0, 5).map((appointment) => {
                      // Convert UTC time to Polish timezone for display
                      const utcDate = new Date(appointment.startAt);
                      const polandOffset = 1 * 60; // UTC+1 in minutes
                      const localDate = new Date(utcDate.getTime() + (polandOffset * 60 * 1000));
                      const timeDisplay = format(localDate, 'HH:mm');

                      // Используем цвет мастера из профиля (приходит из API)
                      const masterColor = appointment.staffColor || '#6B7280';

                      return (
                        <div
                          key={appointment.id}
                          className={`text-[11px] py-1.5 px-2 rounded-md cursor-pointer transition-all duration-150 truncate relative z-1 hover:shadow-md hover:scale-[1.03] group text-white`}
                          style={{
                            backgroundColor: masterColor,
                            opacity: 0.85
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          debugLog('[CalendarGrid Month] Appointment clicked:', appointment.id);
                            onAppointmentClick(appointment.id);
                          }}
                        >
                          <div className="font-semibold truncate leading-tight">{timeDisplay}</div>
                          <div className="text-[10px] truncate leading-tight opacity-95">{appointment.clientName}</div>
                          <div className="text-[9px] truncate leading-tight opacity-85">{appointment.serviceNames[0]}</div>
                        </div>
                      );
                    })}

                    {/* Show more indicator */}
                    {getAppointmentsForDay(day).length > 5 && (
                      <div className="text-[10px] text-muted-foreground/70 text-center py-0.5 font-medium">
                        +{getAppointmentsForDay(day).length - 5}
                      </div>
                    )}
                  </div>

                  {/* Click area for new appointment - lower z-index to not interfere with appointment clicks */}
                  <div
                    className={`absolute inset-0 transition-all duration-200 z-0 ${
                      day < new Date(new Date().setHours(0, 0, 0, 0)) || isNonWorking
                        ? 'cursor-not-allowed'
                        : !isSameMonth(day, currentDate)
                        ? 'cursor-pointer hover:bg-muted/30'
                        : 'cursor-pointer hover:bg-primary/5'
                    }`}
                    onClick={(e) => {
                      // Only handle click if it's not on an appointment
                      if (e.target === e.currentTarget) {
                        // Block clicks on past days and non-working days
                        if (day < new Date(new Date().setHours(0, 0, 0, 0)) || isNonWorking) {
                          return;
                        }

                        // If clicking on a day from different month, navigate to that month
                        if (!isSameMonth(day, currentDate) && onDateNavigation) {
                          onDateNavigation(day);
                        } else {
                          // Находим подходящее время для записи
                          const dayOfWeek = day.getDay();
                          const dayWorkingHours = workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
                          const isToday = isSameDay(day, new Date());

                          let startHour = 9;
                          let startMinute = 0;

                          if (dayWorkingHours?.isWorkingDay && dayWorkingHours.startTime) {
                            const [hourPart, minutePart] = dayWorkingHours.startTime.split(':');
                            const parsedHour = Number.parseInt(hourPart ?? '', 10);
                            const parsedMinute = Number.parseInt(minutePart ?? '', 10);

                            if (!Number.isNaN(parsedHour)) {
                              startHour = parsedHour;
                            }
                            if (!Number.isNaN(parsedMinute)) {
                              startMinute = parsedMinute;
                            }
                          }

                          // Если это сегодня, используем текущее время + 30 минут (округленное вверх)
                          if (isToday) {
                            const now = new Date();
                            const nowHour = now.getHours();
                            const nowMinute = now.getMinutes();

                            // Округляем вверх до ближайших 30 минут и добавляем 30 минут буферного времени
                            let nearestSlotMinutes = nowMinute <= 0 ? 0 : nowMinute <= 30 ? 30 : 0;
                            let nearestSlotHour = nowMinute <= 30 ? nowHour : nowHour + 1;

                            // Добавляем 30 минут буфера
                            nearestSlotMinutes += 30;
                            if (nearestSlotMinutes >= 60) {
                              nearestSlotMinutes = 0;
                              nearestSlotHour += 1;
                            }

                            // Используем либо ближайший слот, либо начало рабочего дня (если ближайший слот раньше)
                            if (nearestSlotHour > startHour || (nearestSlotHour === startHour && nearestSlotMinutes > startMinute)) {
                              startHour = nearestSlotHour;
                              startMinute = nearestSlotMinutes;
                            }
                          }

                          handleSlotClick(day, { hour: startHour, minute: startMinute });
                        }
                      }
                    }}
                  />
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Week and Day view layout (existing)
  return (
    <div className="h-full bg-card overflow-hidden">
      <div className="h-full overflow-auto">
        {/* FRESHA-STYLE GRID */}
        <div className="calendar-grid-container">
          {/* Header Row */}
          <div className="sticky top-0 z-20 bg-card border-b border-border">
            <div className="grid" style={{ gridTemplateColumns: days.length === 1 ? '80px 1fr' : '80px repeat(7, 1fr)' }}>
              {/* Time column header */}
              <div className="h-16 border-r border-border bg-muted"></div>
              
              {/* Day headers */}
              {days.map((day, dayIndex) => {
                const isNonWorking = isNonWorkingDay(day);
                return (
                <div 
                  key={dayIndex} 
                  className={`h-16 p-3 text-center border-r border-border ${
                    isToday(day) ? 'bg-info/10' : isNonWorking ? 'non-working-day' : 'bg-muted'
                  }`}
                >
                  <div className="text-xs text-muted-foreground uppercase font-medium">
                    {format(day, 'EEE', { locale: pl })}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${
                    isToday(day) ? 'text-info' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Time Grid */}
          <div className="relative">
            <div className="grid" style={{ gridTemplateColumns: days.length === 1 ? '80px 1fr' : '80px repeat(7, 1fr)' }}>
              {/* Time slots column */}
              <div className="border-r border-border bg-muted">
                {timeSlots.map((slot, index) => (
                  <div 
                    key={index}
                    className="h-14 border-b border-border flex items-start justify-end pr-3 pt-1"
                  >
                    {slot.minute === 0 && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {formatTimeSlot(slot.hour, slot.minute)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((day, dayIndex) => {
                const isDayNonWorking = isNonWorkingDay(day);
                return (
                <div 
                  key={dayIndex} 
                  className={`border-r border-border relative ${isDayNonWorking ? 'non-working-day' : ''}`}
                >
                  {timeSlots.map((slot, slotIndex) => {
                    // Проверяем является ли слот прошедшим
                    const slotDateTime = new Date(day);
                    slotDateTime.setHours(slot.hour, slot.minute, 0, 0);
                    const isPast = slotDateTime < new Date();

                    // Проверяем является ли слот в рабочих часах салона
                    const isWorkingTime = isWithinWorkingHoursSlot(workingHours, day, slot.hour, slot.minute);

                    // Проверяем доступность персонала (если есть фильтр по персоналу)
                    let isStaffWorkingTime = true;
                    if (staffFilter.length > 0 && Object.keys(staffSchedules).length > 0) {
                      // Если есть фильтр по персоналу, проверяем что хотя бы один из выбранных мастеров работает
                      isStaffWorkingTime = staffFilter.some(staffId =>
                        isStaffAvailable(staffId, day, staffSchedules, exceptionsByStaff)
                      );
                    }

                    // Проверяем доступность через API (Issue #77)
                    const slotStatus = getSlotStatusForDisplay(day, slot.hour, slot.minute);

                    // Общая доступность слота = салон работает И есть доступный мастер (если выбран фильтр) И API подтверждает
                    const isSlotAvailable = isWorkingTime && isStaffWorkingTime && slotStatus.isAvailable;

                    // Определяем класс для цвета недоступности
                    const unavailabilityClass = !isSlotAvailable && !isPast && slotStatus.reason ? slotStatus.color : '';
                    const tooltipText = !isSlotAvailable
                      ? slotStatus.messageKey
                        ? t(slotStatus.messageKey)
                        : slotStatus.message
                      : undefined;

                    const slotLabel = isSlotAvailable
                      ? t('schedule.availability.slotAvailable', 'Это время доступно')
                      : tooltipText || t('schedule.availability.slotUnavailableHint')
                    const reasonElementId =
                      !isSlotAvailable && tooltipText
                        ? `slot-reason-${dayIndex}-${slotIndex}`
                        : undefined

                    return (
                    <div
                      key={slotIndex}
                      role={isPast ? undefined : 'button'}
                      tabIndex={isPast || !isSlotAvailable ? -1 : 0}
                      aria-disabled={isPast || !isSlotAvailable}
                      aria-label={slotLabel}
                      aria-describedby={reasonElementId}
                      onKeyDown={event => {
                        if ((event.key === 'Enter' || event.key === ' ') && !isPast && isSlotAvailable) {
                          event.preventDefault()
                          handleSlotClick(day, slot)
                        }
                      }}
                      className={`h-14 border-b border-border transition-colors relative group ${
                        isPast
                          ? 'past-slot cursor-not-allowed'
                          : !isSlotAvailable
                          ? `non-working-hours cursor-not-allowed ${unavailabilityClass || 'bg-muted'}`
                          : 'hover:bg-info/10 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info'
                      }`}
                      onClick={() => {
                        if (!isPast && isSlotAvailable) {
                          handleSlotClick(day, slot)
                        }
                      }}
                      title={tooltipText}
                    >
                      {/* Unavailability icon and tooltip for Issue #77 */}
                      {!isSlotAvailable && slotStatus.reason && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="text-xl" title={tooltipText}>
                            {slotStatus.icon}
                          </div>
                        </div>
                      )}
                      {!isSlotAvailable && tooltipText && (
                        <>
                          <span id={reasonElementId} className="sr-only">
                            {tooltipText}
                          </span>
                          <div className="absolute inset-x-1 bottom-1 text-[10px] font-medium text-foreground/80 sm:hidden">
                            {tooltipText}
                          </div>
                        </>
                      )}

                      {/* Hover indicator */}
                      {!isPast && isSlotAvailable && (
                        <div className="absolute inset-0 bg-info/10 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none" />
                      )}

                      {/* Time indicator on hover */}
                      {slot.minute === 0 && (
                        <div className="absolute top-1 left-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatTimeSlot(slot.hour, slot.minute)}
                        </div>
                      )}
                    </div>
                    );
                  })}

                  {/* Current time line */}
                  {isToday(day) && <CurrentTimeLine />}

                  {/* Appointments */}
                  {getAppointmentsForDay(day).map((appointment) => {
                    const position = getAppointmentPosition(appointment);
                    return (
                      <AppointmentBlock
                        key={appointment.id}
                        appointment={appointment}
                        masterColor={appointment.staffColor || '#6B7280'}
                        style={{
                          position: 'absolute',
                          top: `${position.top}rem`,
                          height: `${position.height}rem`,
                          left: '6px',
                          right: '6px',
                          zIndex: 1
                        }}
                        onClick={() => onAppointmentClick(appointment.id)}
                        onDrop={onAppointmentDrop}
                      />
                    );
                  })}
                </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
