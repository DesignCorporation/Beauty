import { useState, useMemo, useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Card, CardContent, Button, PageContainer, Badge, SidebarTrigger } from '@beauty-platform/ui';
import { Plus, Calendar, Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppointments } from '../hooks/useAppointments';
import { useTenant } from '../contexts/AuthContext';
import type { AppointmentStatus } from '../types/calendar';
import { PageHeader } from '../components/layout/PageHeader';

export default function AppointmentsPage(): JSX.Element {
  const { t } = useTranslation();
  const { salonId } = useTenant();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Стабилизируем массив статусов через useMemo
  // Это предотвращает бесконечные циклы useEffect в useAppointments
  const filterStatuses = useMemo<AppointmentStatus[]>(() => {
    return statusFilter === 'all'
      ? ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']
      : [statusFilter];
  }, [statusFilter]);
  
  // Стабилизируем объект фильтров через useMemo
  // Без этого React будет считать объект новым при каждом рендере
  const appointmentFilters = useMemo(() => ({
    staffIds: [] as string[],
    statuses: filterStatuses
  }), [filterStatuses]);

  // Стабилизируем дату через useMemo
  // Убираем фильтр по дате по умолчанию - показываем все записи
  const appointmentDate = useMemo(() => 
    dateFilter ? new Date(dateFilter) : undefined,
    [dateFilter]
  );
  const statusOptions: Array<AppointmentStatus | 'all'> = ['all', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'];

  const appointmentsParams = useMemo(() => ({
    view: 'month' as const,
    filters: appointmentFilters,
    ...(appointmentDate ? { date: appointmentDate } : {}),
    ...(salonId ? { salonId } : {})
  }), [appointmentDate, appointmentFilters, salonId]);

  const { appointments, loading, error, refresh } = useAppointments(appointmentsParams);

  const handleStatusChange = (status: AppointmentStatus | 'all') => {
    setStatusFilter(status);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredAppointments = useMemo(() => {
    return appointments?.filter(appointment => {
      const staffSearchSource = (appointment.staffLabel && appointment.staffLabel.length > 0)
        ? appointment.staffLabel.join(' ')
        : appointment.staffName || '';

      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      const matchesDate = !dateFilter || appointment.startAt.startsWith(dateFilter);
      const matchesSearch = !searchQuery ||
        appointment.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.serviceNames.some(service => service.toLowerCase().includes(searchQuery.toLowerCase())) ||
        staffSearchSource.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch && matchesStatus && matchesDate;
    }) || [];
  }, [appointments, searchQuery, statusFilter, dateFilter]);

  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }, [filteredAppointments]);

  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusAccentClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-warning';
      case 'CONFIRMED':
        return 'bg-info';
      case 'IN_PROGRESS':
        return 'bg-primary';
      case 'COMPLETED':
        return 'bg-success';
      case 'CANCELED':
        return 'bg-error';
      default:
        return 'bg-muted';
    }
  };


  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return t('appointments.statuses.PENDING');
      case 'CONFIRMED':
        return t('appointments.statuses.CONFIRMED');
      case 'IN_PROGRESS':
        return t('appointments.statuses.IN_PROGRESS');
      case 'COMPLETED':
        return t('appointments.statuses.COMPLETED');
      case 'CANCELED':
        return t('appointments.statuses.CANCELED');
      default:
        return status;
    }
  };

  const handleViewAppointment = (appointmentId: string): void => {
    void navigate(`/appointments/${appointmentId}`);
  };

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, appointmentId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleViewAppointment(appointmentId);
    }
  };

  const openNewAppointment = useCallback((): void => {
    void navigate('/appointments/new');
  }, [navigate]);

  const groupedAppointments = useMemo(() => {
    const groups = new Map<
      string,
      {
        date: string;
        label: string;
        appointments: typeof sortedAppointments;
      }
    >();

    sortedAppointments.forEach(appointment => {
      const date = new Date(appointment.startAt);
      const key = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      const existing = groups.get(key);
      if (existing) {
        existing.appointments.push(appointment);
      } else {
        groups.set(key, {
          date: key,
          label,
          appointments: [appointment],
        });
      }
    });

    return Array.from(groups.values());
  }, [sortedAppointments]);

  const handleQuickDate = (preset: 'today' | 'tomorrow' | 'clear') => {
    if (preset === 'clear') {
      setDateFilter('');
      return;
    }
    const target = new Date();
    if (preset === 'tomorrow') {
      target.setDate(target.getDate() + 1);
    }
    setDateFilter(target.toISOString().split('T')[0]);
  };

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-10">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('navigation.appointments', 'Записи')}</span>
              </div>
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => void refresh()}
                variant="outline"
                disabled={loading}
                className="bg-card shadow-none border-border text-foreground hover:bg-muted"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {t('appointments.refresh')}
              </Button>
              <Button onClick={openNewAppointment} className="bg-success hover:bg-success/90 text-success-foreground">
                <Plus className="w-4 h-4 mr-2" />
                {t('appointments.newAppointment')}
              </Button>
            </div>
          }
        />

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 self-start">
            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardContent className="space-y-6 p-5">
                <div className="space-y-2">
                  <p className="text-base font-medium text-foreground">{t('appointments.filterTitle', 'Фильтр записей')}</p>
                  <p className="text-sm text-muted-foreground">{t('appointments.subtitle')}</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <input
                    type="text"
                    placeholder={t('appointments.searchPlaceholder')}
                    value={searchQuery}
                    onChange={event => handleSearch(event.target.value)}
                    className="w-full border-0 border-b border-border/60 bg-transparent py-2 pl-10 pr-4 text-sm focus:border-primary/40 focus:outline-none focus:ring-0"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {t('appointments.dateFilter')}
                    </p>
                    {dateFilter && (
                      <button
                        type="button"
                      onClick={() => void setDateFilter('')}
                      className="text-xs text-primary hover:underline"
                    >
                      {t('appointments.datePresets.any')}
                    </button>
                  )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant={dateFilter === new Date().toISOString().split('T')[0] ? 'default' : 'outline'}
                      className="rounded-none text-sm"
                      onClick={() => void handleQuickDate('today')}
                    >
                      {t('appointments.datePresets.today')}
                    </Button>
                    <Button
                      size="sm"
                      variant={dateFilter && dateFilter === new Date(Date.now() + 86400000).toISOString().split('T')[0] ? 'default' : 'outline'}
                      className="rounded-none text-sm"
                      onClick={() => void handleQuickDate('tomorrow')}
                    >
                      {t('appointments.datePresets.tomorrow')}
                    </Button>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={event => setDateFilter(event.target.value)}
                      className="w-full rounded-none border-0 border-b border-border/60 bg-transparent px-3 py-2 text-sm focus:border-primary/40 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t('appointments.allStatuses')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map(status => (
                      <Button
                        key={status}
                        size="sm"
                        variant={statusFilter === status ? 'default' : 'outline'}
                        onClick={() => void handleStatusChange(status)}
                        className="justify-start text-sm rounded-none"
                      >
                        {status === 'all' ? t('appointments.allStatuses') : getStatusLabel(status)}
                      </Button>
                    ))}
                  </div>
              </div>
            </CardContent>
            </Card>
          </aside>

          <div className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t('appointments.loading')}</span>
            </div>
          )}

          {error && (
            <Card className="border-error/40 bg-error/5">
              <CardContent className="flex flex-col items-center space-y-3 p-6 text-center">
                <AlertCircle className="h-10 w-10 text-error" />
                <div>
                  <p className="text-lg font-semibold text-foreground">{t('appointments.errorLoading')}</p>
                  <p className="text-sm text-error">{error}</p>
                </div>
                <Button onClick={() => void refresh()} variant="outline">
                  {t('appointments.retry')}
                </Button>
              </CardContent>
            </Card>
          )}

          {!loading && !error && groupedAppointments.length === 0 && (
            <Card className="border-border/70 bg-card/60 text-center">
              <CardContent className="space-y-4 p-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {searchQuery ? t('appointments.noAppointmentsFound') : t('appointments.noAppointments')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? t('appointments.noResults', { query: searchQuery }) : t('appointments.emptyStateMessage')}
                </p>
                {!searchQuery && (
                  <Button onClick={openNewAppointment} className="bg-success text-success-foreground hover:bg-success/90">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('appointments.createAppointment')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {!loading &&
            !error &&
            groupedAppointments.length > 0 &&
            groupedAppointments.map(group => (
              <section key={group.date} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-base font-medium capitalize text-foreground">{group.label}</p>
                  <Badge variant="outline" className="rounded-full border border-border/60 px-4 py-1 text-xs">
                    {group.appointments.length} {t('appointments.items')}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {group.appointments.map(appointment => {
                    const durationMinutes = Math.round(
                      (new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / (1000 * 60)
                    );
                    const staffItems =
                      Array.isArray(appointment.staffMembers) && appointment.staffMembers.length > 0
                        ? appointment.staffMembers
                            .map((m) => ({
                              name: `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || appointment.staffName,
                              color: m.color ?? appointment.staffColor
                            }))
                            .filter((m) => m.name)
                        : [{
                            name: appointment.staffName,
                            color: appointment.staffColor
                          }];

                    return (
                      <Card
                        key={appointment.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => void handleViewAppointment(appointment.id)}
                        onKeyDown={event => handleCardKeyDown(event, appointment.id)}
                        className="cursor-pointer border-0 border-t border-border bg-transparent shadow-none transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                        aria-label={`${appointment.clientName} · ${formatDateTime(appointment.startAt)}`}
                      >
                        <div className="flex items-stretch">
                          <CardContent className="flex-1 p-4">
                            <div className="flex flex-col gap-3">
                              <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-[150px_1.1fr_1.1fr_1.4fr_80px_100px]">
                                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-full ${getStatusAccentClass(appointment.status)}`} aria-hidden="true" />
                                  <span>{formatTime(appointment.startAt)} – {formatTime(appointment.endAt)}</span>
                                </div>
                                <div className="text-foreground text-sm">{appointment.clientName}</div>
                                <div className="text-foreground text-sm">
                                  {staffItems.map((item, idx) => (
                                    <div key={`${appointment.id}-staff-${idx}`} className="flex items-center gap-2">
                                      <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: item.color || '#0ea5e9' }}
                                        aria-hidden="true"
                                      />
                                      <span>{item.name}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="space-y-1 text-foreground text-sm">
                                  {appointment.serviceNames.map((service, index) => (
                                    <p key={index} className="leading-snug">
                                      {service}
                                    </p>
                                  ))}
                                </div>
                                <div className="font-medium text-foreground text-sm">
                                  {durationMinutes} {t('appointments.minutesShort')}
                                </div>
                                <div className="text-right text-base font-semibold text-foreground">
                                  {new Intl.NumberFormat('pl-PL', {
                                    style: 'currency',
                                    currency: appointment.currency || 'PLN',
                                  }).format(Number(appointment.price) || 0)}
                                </div>
                              </div>
                              {appointment.notes && (
                                <p className="rounded-none border-t border-border bg-muted/40 p-3 text-sm text-muted-foreground">{appointment.notes}</p>
                              )}
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      </div>
      </div>
    </PageContainer>
  );
}
