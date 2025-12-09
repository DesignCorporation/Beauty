import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  Button,
  Badge,
  PageContainer,
  SidebarTrigger,
} from '@beauty-platform/ui';
import { ArrowLeft, Edit, Calendar, Mail, Phone, Loader2, AlertCircle, MessageSquare, User } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useTranslation } from 'react-i18next';
import type { CalendarAppointment, AppointmentStatus } from '../types/calendar';
import { PageHeader } from '../components/layout/PageHeader';

export default function ClientDetailsPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { clients, loading: clientsLoading } = useClients();
  const { t, i18n } = useTranslation();

  // State for appointments
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  const client = clients.find((c) => c.id === id);
  const clientAvatarUrl = client?.avatarUrl ?? null;
  const clientDisplayName = client
    ? [client.profileFirstName, client.profileLastName].filter(Boolean).join(' ') || client.name
    : '';

  const getInitials = (name: string): string => {
    if (!name) return '—';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const [firstPart, ...restParts] = parts;
    if (!firstPart) return '—';
    if (parts.length === 1) {
      return firstPart.slice(0, 2).toUpperCase();
    }
    const lastPart = restParts.length > 0 ? restParts[restParts.length - 1] : firstPart;
    const initials = `${firstPart.charAt(0)}${lastPart?.charAt(0) ?? ''}`.toUpperCase();
    return initials || '—';
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return t('clients.notRecorded');
    const localeMap: Record<string, string> = {
      ru: 'ru-RU',
      en: 'en-US',
      pl: 'pl-PL',
      ua: 'uk-UA',
    };
    const locale = localeMap[i18n.language] || localeMap.en;
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Helper functions for appointments
  const formatDateTime = (datetime: string): string => {
    const localeMap: Record<string, string> = {
      ru: 'ru-RU',
      en: 'en-US',
      pl: 'pl-PL',
      ua: 'uk-UA',
    };
    const locale = localeMap[i18n.language] || 'en-US';
    return new Date(datetime).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: AppointmentStatus): string => {
    const statusKey = `appointments.statuses.${status}`;
    return t(statusKey);
  };

  // Fetch client appointments
  const fetchClientAppointments = async () => {
    if (!id) return;

    setAppointmentsLoading(true);
    setAppointmentsError(null);

    try {
      const response = await fetch(`/api/crm/appointments?clientId=${id}&limit=100`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const appointmentsList = data.appointments || [];

      // Sort by date (newest first)
      const sorted = appointmentsList.sort((a: CalendarAppointment, b: CalendarAppointment) =>
        new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
      );

      setAppointments(sorted);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Не удалось загрузить записи клиента';
      console.error('Failed to fetch client appointments:', err);
      setAppointmentsError(errorMessage);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // Load appointments when client is loaded
  useEffect(() => {
    if (client?.id) {
      void fetchClientAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  if (clientsLoading) {
    return (
      <PageContainer variant="full-width" className="bg-background min-h-screen">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">{t('clients.loading')}</span>
        </div>
      </PageContainer>
    );
  }

  if (!client) {
    return (
      <PageContainer variant="full-width" className="bg-background min-h-screen">
        <div className="flex items-center justify-center py-12 text-center">
          <div>
            <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('clients.clientNotFound')}
            </h3>
            <p className="text-muted-foreground mb-4">{t('clients.clientNotFoundMessage')}</p>
            <Button onClick={() => void navigate('/clients')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('clients.backToClients')}
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-8">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('navigation.clients', 'Клиенты')}</span>
              </div>
            </div>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="bg-card shadow-none border-border hover:bg-muted" onClick={() => void navigate('/clients')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('clients.backToClients')}
              </Button>
              <Button variant="outline" className="bg-card shadow-none border-border hover:bg-muted" onClick={() => void navigate(`/clients/${client.id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                {t('clients.edit')}
              </Button>
              <Button onClick={() => void navigate('/appointments/new')} className="bg-success text-success-foreground hover:bg-success/90">
                <Calendar className="w-4 h-4 mr-2" />
                {t('clients.bookAppointment')}
              </Button>
            </div>
          }
        />

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden bg-muted text-3xl font-medium uppercase text-muted-foreground rounded-full">
                {clientAvatarUrl ? (
                  <img
                    src={clientAvatarUrl}
                    alt={clientDisplayName || client.name}
                    className="h-28 w-28 object-cover object-center rounded-full"
                  />
                ) : (
                  getInitials(clientDisplayName || client.name)
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-medium text-foreground">
                    {clientDisplayName || client.name}
                  </h1>
                  <Badge
                    variant={client.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className={client.status === 'ACTIVE' ? 'bg-success/10 text-success' : ''}
                  >
                    {client.status === 'ACTIVE'
                      ? t('clients.statusActive')
                      : t('clients.statusInactive')}
                  </Badge>
                  {client.isPortalClient && (
                    <Badge variant="outline">{t('clients.portalClient')}</Badge>
                  )}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calendar className="w-4 h-4" />
                  {t('clients.statistics')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="space-y-1">
                    <p className="text-2xl font-medium text-foreground">{client.appointmentsCount ?? 0}</p>
                    <p className="text-sm text-muted-foreground">{t('clients.visits')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-medium text-foreground">{formatDate(client.createdAt)}</p>
                    <p className="text-sm text-muted-foreground">{t('clients.registrationDate')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-medium text-foreground">
                      {client.status === 'ACTIVE' ? '✓' : '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('clients.status')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {client.notes && (
              <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
                <CardContent className="p-5 space-y-2">
                  <p className="text-sm font-medium text-foreground">{t('clients.notes')}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
                <Calendar className="w-4 h-4" />
                {t('clients.appointmentHistoryTitle')}
              </div>
              {appointmentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : appointmentsError ? (
                <div className="text-center py-8 text-error">{appointmentsError}</div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3" />
                  <p>{t('clients.noAppointments')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {appointments.map((appointment) => {
                    const duration = Math.round(
                      (new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / (1000 * 60)
                    );

                    return (
                      <div key={appointment.id} className="relative flex flex-col gap-2 border-t border-border bg-transparent p-3">
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="text-foreground font-medium whitespace-nowrap">
                            {formatDateTime(appointment.startAt)}
                          </span>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {duration} {t('appointments.minutesShort')}
                          </span>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {appointment.staffName}
                          </span>
                          <span className="font-medium text-foreground whitespace-nowrap ml-auto">
                            {new Intl.NumberFormat('pl-PL', {
                              style: 'currency',
                              currency: appointment.currency || 'PLN'
                            }).format(Number(appointment.price) || 0)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {appointment.serviceNames.map((service, idx) => (
                            <span key={idx} className="px-2 py-0.5 border border-border">
                              {service}
                            </span>
                          ))}
                          {appointment.notes && (
                            <span title={appointment.notes} className="shrink-0">
                              <MessageSquare className="w-4 h-4 text-muted-foreground cursor-help" />
                            </span>
                          )}
                          <span className="ml-auto px-2 py-1 text-xs font-medium border border-border">
                            {getStatusLabel(appointment.status)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
