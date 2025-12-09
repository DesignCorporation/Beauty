import { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, AlertTriangle, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { Button, PageContainer, SidebarTrigger } from '@beauty-platform/ui';
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { StaffCalendarGrid } from '../components/calendar/StaffCalendarGrid';
import { FiltersModal } from '../components/calendar/FiltersModal';
import { useAppointments } from '../hooks/useAppointments';
import { useStaff } from '../hooks/useStaff';
import { useTenant } from '../contexts/AuthContext';
import type { CalendarView, AppointmentFilters } from '../types/calendar';
import { debugLog } from '../utils/debug';
import { PageHeader } from '../components/layout/PageHeader';

const SELECTED_STAFF_STORAGE_KEY = 'calendar-selected-staff';

// Note: Removed demo appointments - now using only real data from API

export default function CalendarPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(() => {
    // Start with current date instead of hardcoded demo date
    return new Date(); // Current date - FIXED: was hardcoded to 2025-08-25
  });
  const [filters, setFilters] = useState<AppointmentFilters>({
    staffIds: [],
    statuses: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] // Обновлено под реальные статусы API
  });
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const { salonId, token } = useTenant();
  const appointmentsParams = useMemo(() => ({
    date: currentDate,
    view,
    filters,
    ...(salonId ? { salonId } : {})
  }), [currentDate, view, filters, salonId]);

  const { appointments, loading, error, rescheduleAppointment, refetch } = useAppointments(appointmentsParams);
  const { staff, loading: _staffLoading, error: _staffError } = useStaff();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // FIXED: Use only real appointments from API for ALL calendar views
  const allAppointments = appointments || [];
  
  // Debug log to track data sync issues
  debugLog(`[CalendarPage] Loading appointments for ${view} view:`, {
    appointmentsCount: allAppointments.length,
    currentDate: currentDate.toISOString(),
    salonId,
    filters,
    loading,
    error,
    appointments: allAppointments.slice(0, 3) // Show first 3 appointments for debugging
  });

  // Keep calendar on current month - no auto-switching to demo data
  // Users can manually navigate to months with demo data if needed

  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      switch (view) {
        case 'day':
          return direction === 'next' ? addDays(prevDate, 1) : subDays(prevDate, 1);
        case 'week':
          return direction === 'next' ? addWeeks(prevDate, 1) : subWeeks(prevDate, 1);
        case 'month':
          return direction === 'next' ? addMonths(prevDate, 1) : subMonths(prevDate, 1);
        default:
          return prevDate;
      }
    });
  }, [view]);

  const getDateTitle = useCallback(() => {
    switch (view) {
      case 'day':
        return format(currentDate, 'EEEE, d MMMM yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        return format(weekStart, 'MMMM yyyy');
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  }, [view, currentDate]);

  const roundTimeToQuarterHour = (value: Date) => {
    const rounded = new Date(value);
    const minutes = rounded.getMinutes();
    const remainder = minutes % 15;

    if (remainder !== 0) {
      const increment = 15 - remainder;
      rounded.setMinutes(minutes + increment, 0, 0);
    } else {
      rounded.setSeconds(0, 0);
    }

    return rounded;
  };

  const handleSlotClick = useCallback((datetime: Date) => {
    // Navigate to new appointment form with pre-filled date/time
    const roundedDate = roundTimeToQuarterHour(datetime);
    const dateStr = roundedDate.toISOString().split('T')[0];
    const timeStr = roundedDate.toTimeString().slice(0, 5);
    navigate(`/appointments/new?date=${dateStr}&time=${timeStr}`);
  }, [navigate]);

  const handleAppointmentClick = useCallback((appointmentId: string, mode: string = 'VIEW') => {
    debugLog('[CalendarPage] Appointment clicked:', { appointmentId, mode });
    if (mode === 'EDIT') {
      navigate(`/appointments/${appointmentId}?mode=edit`);
    } else {
      navigate(`/appointments/${appointmentId}`);
    }
  }, [navigate]);

  const openNewAppointment = useCallback(() => {
    navigate('/appointments/new');
  }, [navigate]);

  const handleViewChange = useCallback((newView: CalendarView) => {
    setView(newView);
  }, []);

  const handleStaffFilterChange = useCallback((staffId: string | null) => {
    setSelectedStaffId(staffId);
    setFilters(prev => ({
      ...prev,
      staffIds: staffId ? [staffId] : []
    }));
    if (typeof window !== 'undefined') {
      if (staffId) {
        window.localStorage.setItem(SELECTED_STAFF_STORAGE_KEY, staffId);
      } else {
        window.localStorage.removeItem(SELECTED_STAFF_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || staff.length === 0) return;
    const saved = window.localStorage.getItem(SELECTED_STAFF_STORAGE_KEY);
    if (saved && staff.some(member => member.id === saved)) {
      setSelectedStaffId(saved);
      setFilters(prev => ({ ...prev, staffIds: [saved] }));
    }
  }, [staff]);

  const activeFiltersCount = filters.staffIds.length + (filters.statuses.length < 4 ? 1 : 0);

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="w-full px-6 py-8 space-y-6">
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-medium text-foreground">{t('calendar.title', 'Календарь')}</span>
              </div>
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')} className="bg-card shadow-none border-border hover:bg-muted">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[200px] text-center text-base font-medium text-foreground">
                {getDateTitle()}
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')} className="bg-card shadow-none border-border hover:bg-muted">
                <ChevronRight className="h-4 w-4" />
              </Button>

              <div className="h-6 w-px bg-border" />

              <div className="flex items-center gap-1">
                <Button
                  variant={view === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => void handleViewChange('day')}
                  className={view === 'day' ? '' : 'bg-card shadow-none border-border hover:bg-muted'}
                >
                  {t('calendar.views.day')}
                </Button>
                <Button
                  variant={view === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => void handleViewChange('week')}
                  className={view === 'week' ? '' : 'bg-card shadow-none border-border hover:bg-muted'}
                >
                  {t('calendar.views.week')}
                </Button>
                <Button
                  variant={view === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => void handleViewChange('month')}
                  className={view === 'month' ? '' : 'bg-card shadow-none border-border hover:bg-muted'}
                >
                  {t('calendar.views.month')}
                </Button>
                <Button
                  variant={view === 'staff' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => void handleViewChange('staff')}
                  className={view === 'staff' ? '' : 'bg-card shadow-none border-border hover:bg-muted'}
                >
                  {t('calendar.views.staff')}
                </Button>
              </div>

              <Button
                variant={activeFiltersCount > 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => void setShowFiltersModal(true)}
                className={activeFiltersCount > 0 ? '' : 'bg-card shadow-none border-border hover:bg-muted'}
              >
                <Filter className="h-4 w-4 mr-2" />
                {t('calendar.filters')}
                {activeFiltersCount > 0 && (
                  <span className="ml-2 bg-card text-primary text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              <Button variant="default" size="sm" onClick={() => void openNewAppointment()}>
                <Plus className="h-4 w-4 mr-2" />
                {t('calendar.newAppointment')}
              </Button>
            </div>
          }
        />

        {error && (
          <div className="border border-error/30 bg-error/10 px-4 py-3 flex items-start gap-3 rounded-none">
            <AlertTriangle className="h-5 w-5 text-error mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-error">
                {t('calendar.errorLoading')}
              </h3>
              <p className="text-sm text-error mt-1">
                {error}. {t('calendar.offlineMode')}.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 bg-card shadow-none border-error/40 text-error hover:bg-error/10"
                onClick={() => void refetch()}
              >
                {t('calendar.retry')}
              </Button>
            </div>
          </div>
        )}

        {(view === 'week' || view === 'day') && staff.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedStaffId === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStaffFilterChange(null)}
              className={selectedStaffId === null ? '' : 'bg-card shadow-none border-border hover:bg-muted'}
            >
              {t('calendar.allStaff', 'Все мастера')}
            </Button>
            {staff.map((member) => {
              const memberName = [member.firstName, member.lastName].filter(Boolean).join(' ') || t('calendar.staff');
              return (
              <Button
                key={member.id}
                variant={selectedStaffId === member.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStaffFilterChange(member.id)}
                className={selectedStaffId === member.id ? '' : 'bg-card shadow-none border-border hover:bg-muted'}
              >
                <span className="flex items-center gap-2">
                  {member.color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color }} />}
                  {memberName}
                </span>
              </Button>
            )})}
          </div>
        )}

        <div className="w-full">
          <div className="calendar-grid h-full w-full">
            {view === 'staff' ? (
              <StaffCalendarGrid
                appointments={allAppointments}
                staff={staff}
                selectedDate={currentDate}
                view="week"
                onAppointmentClick={(appointment) => handleAppointmentClick(appointment.id, 'VIEW')}
                onTimeSlotClick={(staffId, datetime) => {
                  navigate('/appointments/new', {
                    state: {
                      staffId,
                      startTime: datetime.toISOString()
                    }
                  });
                }}
              />
            ) : (
              <CalendarGrid
                view={view}
                currentDate={currentDate}
                appointments={allAppointments}
                onAppointmentClick={(id) => handleAppointmentClick(id, 'VIEW')}
                onSlotClick={(date) => void handleSlotClick(date)}
                onAppointmentDrop={rescheduleAppointment}
                onDateNavigation={setCurrentDate}
                loading={loading}
                staffFilter={filters.staffIds}
              />
            )}
          </div>
        </div>

        <FiltersModal
          isOpen={showFiltersModal}
          onClose={() => void setShowFiltersModal(false)}
          filters={filters}
          onFiltersChange={setFilters}
          salonId={salonId ?? ''}
          token={token ?? ''}
        />
      </div>
    </PageContainer>
  );
}
