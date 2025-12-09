import React, { useMemo } from 'react';
import { format, isSameDay, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
// import { AppointmentModal } from './AppointmentModal'; // Заменено на отдельные страницы
import { useNavigate } from 'react-router-dom';
import { AppointmentBlock } from './AppointmentBlock';
import { CurrentTimeLine } from './CurrentTimeLine';
import type { CalendarAppointment } from '../../types/calendar';
import type { StaffMember } from '../../hooks/useStaff';
import { debugLog } from '../../utils/debug';

interface StaffCalendarGridProps {
  appointments: CalendarAppointment[];
  staff: StaffMember[];
  selectedDate: Date;
  view?: 'day' | 'week';
  onAppointmentClick?: (appointment: CalendarAppointment) => void;
  onTimeSlotClick?: (staffId: string, datetime: Date) => void;
}

export const StaffCalendarGrid: React.FC<StaffCalendarGridProps> = ({
  appointments,
  staff,
  selectedDate,
  view = 'week',
  onAppointmentClick,
  onTimeSlotClick
}) => {
  const navigate = useNavigate();
  
  // Рабочие часы: с 8:00 до 20:00 с интервалом 30 минут
  const workingHoursRange = { start: 8, end: 20, interval: 30 };
  
  // Определяем дни для отображения (день или неделя)
  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Понедельник
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    return [selectedDate]; // день
  }, [selectedDate, view]);
  
  // Генерируем временные слоты
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = workingHoursRange.start; hour < workingHoursRange.end; hour++) {
      for (let minute = 0; minute < 60; minute += workingHoursRange.interval) {
        slots.push({ hour, minute });
      }
    }
    return slots;
  }, [workingHoursRange]);

  // Фильтруем записи только мастеров (STAFF_MEMBER)
  const staffMembers = staff.filter(member => member.role === 'STAFF_MEMBER');
  
  // Функция для получения записей для конкретного дня
  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => {
      const utcDate = new Date(apt.startAt);
      const polandOffset = 1 * 60; // UTC+1 в минутах
      const localDate = new Date(utcDate.getTime() + (polandOffset * 60 * 1000));
      return isSameDay(localDate, day);
    });
  };
  
  // Функция для получения записей всех дней (неиспользуемая, удаляем)
  // const allDaysAppointments = useMemo(() => {
  //   return days.flatMap(day => getAppointmentsForDay(day));
  // }, [days, appointments]);

  // Функция для получения записи для конкретного мастера и времени (неиспользуемая, удаляем)
  // const getAppointmentAtTime = (staffId: string, day: Date, slot: { hour: number; minute: number }) => {
  //   const dayAppointments = getAppointmentsForDay(day);
  //   const slotTime = new Date(day);
  //   slotTime.setHours(slot.hour, slot.minute, 0, 0);
  //   
  //   return dayAppointments.find(apt => {
  //     const aptStart = new Date(apt.startAt);
  //     const aptEnd = new Date(apt.endAt);
  //     return apt.staffId === staffId && 
  //              aptStart <= slotTime && 
  //              aptEnd > slotTime;
  //   });
  // };

  // Функция для расчета позиции записи
  const getAppointmentPosition = (appointment: CalendarAppointment) => {
    const utcStart = new Date(appointment.startAt);
    const utcEnd = new Date(appointment.endAt);
    const polandOffset = 1 * 60; // UTC+1 в минутах
    
    const start = new Date(utcStart.getTime() + (polandOffset * 60 * 1000));
    const end = new Date(utcEnd.getTime() + (polandOffset * 60 * 1000));
    
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const workingStartMinutes = workingHoursRange.start * 60;
    const topPosition = ((startMinutes - workingStartMinutes) / workingHoursRange.interval) * 3.5;
    
    const duration = differenceInMinutes(end, start);
    const height = Math.max((duration / workingHoursRange.interval) * 3.5, 3.5);
    
    return { top: topPosition, height };
  };
  
  // Функция для получения цвета мастера
  const getMasterColor = (staffName: string) => {
    const colorMap: { [key: string]: string } = {
      'Anna Kowalska': '#8B5CF6',
      'Maria Nowak': '#6366F1',
      'Petra Wiśniewska': '#10B981',
      'Olga Lewandowska': '#F59E0B',
      'CRM Owner': '#6B7280'
    };
    return colorMap[staffName] || '#9CA3AF';
  };

  // Обработка клика по записи - навигация на отдельную страницу
  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    debugLog('[StaffCalendarGrid] Appointment clicked:', appointment.id);
    navigate(`/appointments/${appointment.id}`);
    onAppointmentClick?.(appointment);
  };

  // Обработка клика по пустому слоту
  const handleTimeSlotClick = (staffId: string, day: Date, slot: { hour: number; minute: number }) => {
    const datetime = new Date(day);
    datetime.setHours(slot.hour, slot.minute, 0, 0);
    
    // Блокировка записи на прошедшее время
    const now = new Date();
    if (datetime < now) {
      return;
    }
    
    onTimeSlotClick?.(staffId, datetime);
  };
  
  // Функция для форматирования времени
  const formatTimeSlot = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full bg-card overflow-hidden">
      <div className="h-full overflow-auto">
        {/* ЗАГОЛОВОК С ДАТОЙ */}
        <div className="sticky top-0 z-30 bg-card border-b border-border p-4">
          <h3 className="text-lg font-semibold text-foreground">
            {(() => {
              if (view === 'week') {
                const weekStart = days[0] ?? selectedDate;
                const weekEnd = days[6] ?? days[days.length - 1] ?? selectedDate;
                return `Календарь мастеров: ${format(weekStart, 'dd.MM')} - ${format(weekEnd, 'dd.MM.yyyy')}`;
              }
              return `Календарь мастеров на ${format(selectedDate, 'dd.MM.yyyy')}`;
            })()}
          </h3>
          <p className="text-sm text-muted-foreground">
            {staffMembers.length} мастеров в команде
          </p>
        </div>

        {/* НЕДЕЛЬНАЯ КАЛЕНДАРНАЯ СЕТКА */}
        <div className="calendar-grid-container">
          {/* Заголовки дней и мастеров */}
          <div className="sticky top-[88px] z-20 bg-card border-b border-border">
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${staffMembers.length}, 1fr)` }}>
              {/* Колонка времени */}
              <div className="h-16 border-r border-border bg-muted"></div>
              
              {/* Заголовки мастеров */}
              {staffMembers.map((staff) => (
                <div 
                  key={staff.id}
                  className="h-16 p-3 text-center border-r border-border bg-muted"
                >
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: staff.color || '#6366f1' }}
                    />
                    <span className="font-medium text-foreground text-sm truncate">
                      {staff.firstName} {staff.lastName.charAt(0)}.
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {staff.role === 'STAFF_MEMBER' ? 'Мастер' : staff.role}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ДНИ НЕДЕЛИ (если недельный вид) */}
          {view === 'week' && (
            <div className="sticky top-[152px] z-10 bg-card border-b border-border">
              <div className="grid" style={{ gridTemplateColumns: `80px repeat(${staffMembers.length}, 1fr)` }}>
                {/* Пустая ячейка времени */}
                <div className="h-12 border-r border-border bg-muted"></div>
                
                {/* Дни для каждого мастера */}
                {staffMembers.map(() => (
                  <div className="border-r border-border bg-muted">
                    <div className="grid grid-cols-7 h-12">
                      {days.map((day, dayIndex) => (
                        <div 
                          key={dayIndex}
                          className={`text-center py-1 text-xs ${
                            isToday(day) ? 'bg-info/10 text-info-foreground font-medium' : 'text-muted-foreground'
                          }`}
                        >
                          <div className="text-xs">{format(day, 'EEE', { locale: pl })}</div>
                          <div className={`text-sm font-medium ${isToday(day) ? 'text-info' : ''}`}>
                            {format(day, 'd')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Временная сетка */}
          <div className="relative">
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${staffMembers.length}, 1fr)` }}>
              {/* Колонка времени */}
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

              {/* Колонки мастеров */}
              {staffMembers.map((staff) => (
                <div 
                  key={staff.id}
                  className="border-r border-border relative"
                >
                  {/* Сетка дней (если недельный вид) */}
                  {view === 'week' && (
                    <div className="absolute inset-0">
                      <div className="grid grid-cols-7 h-full">
                        {days.map((day, dayIndex) => (
                          <div key={dayIndex} className="border-r border-border relative">
                            {/* Временные слоты для каждого дня */}
                            {timeSlots.map((slot, slotIndex) => {
                              const slotDateTime = new Date(day);
                              slotDateTime.setHours(slot.hour, slot.minute, 0, 0);
                              const isPast = slotDateTime < new Date();
                              
                              return (
                                <div
                                  key={slotIndex}
                                  className={`h-14 border-b border-border transition-colors relative group ${
                                    isPast ? 'past-slot cursor-not-allowed' : 'hover:bg-info/10 cursor-pointer'
                                  }`}
                                  onClick={() => handleTimeSlotClick(staff.id, day, slot)}
                                >
                                  {!isPast && (
                                    <div className="absolute inset-0 bg-info/10 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none" />
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Индикатор текущего времени */}
                            {isToday(day) && <CurrentTimeLine />}
                            
                            {/* Записи для этого дня и мастера */}
                            {getAppointmentsForDay(day)
                              .filter(apt => apt.staffId === staff.id)
                              .map((appointment) => {
                                const position = getAppointmentPosition(appointment);
                                const masterColor = getMasterColor(appointment.staffName || '');
                                return (
                                  <AppointmentBlock
                                    key={appointment.id}
                                    appointment={appointment}
                                    masterColor={masterColor}
                                    style={{
                                      position: 'absolute',
                                      top: `${position.top}rem`,
                                      height: `${position.height}rem`,
                                      left: '3px',
                                      right: '3px',
                                      zIndex: 1
                                    }}
                                    onClick={() => handleAppointmentClick(appointment)}
                                    onDrop={() => {}} // Empty function to satisfy interface
                                  />
                                );
                              })
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Дневной вид */}
                  {view === 'day' && (
                    <>
                      {timeSlots.map((slot, slotIndex) => {
                        const slotDateTime = new Date(selectedDate);
                        slotDateTime.setHours(slot.hour, slot.minute, 0, 0);
                        const isPast = slotDateTime < new Date();
                        
                        return (
                          <div
                            key={slotIndex}
                            className={`h-14 border-b border-border transition-colors relative group ${
                              isPast ? 'past-slot cursor-not-allowed' : 'hover:bg-info/10 cursor-pointer'
                            }`}
                            onClick={() => handleTimeSlotClick(staff.id, selectedDate, slot)}
                          >
                            {!isPast && (
                              <div className="absolute inset-0 bg-info/10 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none" />
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Индикатор текущего времени */}
                      {isToday(selectedDate) && <CurrentTimeLine />}
                      
                      {/* Записи для выбранного дня и мастера */}
                      {getAppointmentsForDay(selectedDate)
                        .filter(apt => apt.staffId === staff.id)
                        .map((appointment) => {
                          const position = getAppointmentPosition(appointment);
                          const masterColor = getMasterColor(appointment.staffName || '');
                          return (
                            <AppointmentBlock
                              key={appointment.id}
                              appointment={appointment}
                              masterColor={masterColor}
                              style={{
                                position: 'absolute',
                                top: `${position.top}rem`,
                                height: `${position.height}rem`,
                                left: '6px',
                                right: '6px',
                                zIndex: 1
                              }}
                              onClick={() => handleAppointmentClick(appointment)}
                              onDrop={() => {}} // Empty function to satisfy interface
                            />
                          );
                        })
                      }
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно заменено на навигацию к отдельным страницам */}
    </div>
  );
};
