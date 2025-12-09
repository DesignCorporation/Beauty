import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button, PageContainer, SidebarTrigger } from '@beauty-platform/ui';
import { Plus, Search, Phone, Mail, Loader2, AlertCircle, Copy, Check, Users, Download, UploadCloud, UserCircle } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { CRMApiService } from '../services/crmApiNew';
import { useAuthContext } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ClientsImportDialog } from '../components/clients/ClientImportDialog';
import { PageHeader } from '../components/layout/PageHeader';

export default function ClientsPage(): JSX.Element {
  const navigate = useNavigate();
  useAuthContext(); // Auth context used for session validation
  const { clients, loading, error, searchClients, refetch: fetchClients } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(clients);
  const { t } = useTranslation();

  // Постоянный код приглашения салона
  const [salonNumber, setSalonNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleExport = useCallback((format: 'csv' | 'xlsx') => {
    setExportingFormat(format);

    void (async () => {
      try {
        const result = await CRMApiService.exportClients(format);
        if (!result.success || !result.blob) {
          throw new Error('EXPORT_FAILED');
        }

        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename ?? `clients-export.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        toast.success(t('clients.exportSuccess'));
      } catch (err) {
        console.error('Failed to export clients:', err);
        toast.error(t('clients.exportError'));
      } finally {
        setExportingFormat(null);
      }
    })();
  }, [t]);

  // Загружаем salon settings для получения постоянного кода
  useEffect(() => {
    const fetchSalonSettings = async () => {
      try {
        const response = await fetch('/api/crm/settings', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const message = data?.error || `HTTP ${response.status}`;
          throw new Error(message);
        }

        if (data?.success && data.settings?.salonNumber) {
          setSalonNumber(data.settings.salonNumber);
        } else {
          setSalonNumber(null);
          console.warn('[ClientsPage] Salon settings response missing salonNumber field');
        }
      } catch (err) {
        console.error('Failed to load salon settings:', err);
        setSalonNumber(null);
      }
    };

    void fetchSalonSettings();
  }, []);

  // Обновляем результаты поиска при изменении клиентов
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults(clients);
    }
  }, [clients, searchQuery]);

  // Обработка поиска
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await searchClients(query);
      setSearchResults(results);
    } else {
      setSearchResults(clients);
    }
  };

  // Date formatting handled by backend response, formatDate utility not needed for current UI

  // Копирование кода приглашения
  const handleCopyInviteCode = async () => {
    if (!salonNumber) return;

    try {
      await navigator.clipboard.writeText(salonNumber);
      setCopied(true);
      toast.success(t('clients.inviteCodeCopied', 'Код приглашения скопирован'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t('clients.copyFailed', 'Не удалось скопировать код'));
    }
  };

  const displayClients = (searchQuery ? searchResults : clients).filter(
    c => !c.name.includes('Тестовый клиент')
  );
  const getInitials = (name: string) => {
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

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-10">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <UserCircle className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('navigation.clients', 'Клиенты')}</span>
              </div>
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setImportDialogOpen(true)} className="bg-card text-foreground hover:bg-muted border border-border">
                <UploadCloud className="w-4 h-4 mr-2" />
                {t('clients.importButton', 'Импорт')}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('csv')}
                disabled={Boolean(exportingFormat)}
                className="bg-card shadow-none border-border text-foreground hover:bg-muted"
              >
                {exportingFormat === 'csv' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('clients.exporting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('clients.exportCsv')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('xlsx')}
                disabled={Boolean(exportingFormat)}
                className="bg-card shadow-none border-border text-foreground hover:bg-muted"
              >
                {exportingFormat === 'xlsx' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('clients.exporting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('clients.exportXlsx')}
                  </>
                )}
              </Button>
              <Button onClick={() => void navigate('/clients/create')} className="bg-success text-success-foreground hover:bg-success/90">
                <Plus className="w-4 h-4 mr-2" />
                {t('clients.addClient')}
              </Button>
            </div>
          }
        />

        {/* Постоянный код приглашения салона */}
        {salonNumber && (
          <Card className="rounded-none border-0 border-t border-info/40 bg-info/5 shadow-none">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-info" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('clients.permanentInviteCode', 'Постоянный код приглашения клиентов')}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-mono font-medium text-info tracking-wider">
                        {salonNumber}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleCopyInviteCode()}
                        className="h-8 px-3"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground text-left lg:text-right max-w-xl">
                  <p className="mb-1">
                    {t('clients.inviteCodeDescription', 'Этот код используется для приглашения новых клиентов. Код постоянный и не меняется.')}
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    {t('clients.inviteCodeUsage', 'Используйте код в рекламе и для рассылок')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Поиск и фильтры */}
        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-lg">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('clients.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => void handleSearch(e.target.value)}
                  className="w-full border-0 border-b border-border/60 bg-transparent pl-10 pr-4 py-2 text-sm focus:border-primary/40 focus:outline-none focus:ring-0"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="bg-card shadow-none border-border text-foreground hover:bg-muted">
                  {t('clients.filters')}
                </Button>
                <Button variant="ghost" className="text-sm text-primary hover:bg-transparent hover:underline" onClick={() => void handleSearch('')}>
                  {t('clients.resetFilters', t('servicesPage.resetFilters'))}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Состояния загрузки и ошибки */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{t('clients.loading')}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12 text-center">
            <div>
              <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('clients.errorLoading')}</h3>
              <p className="text-error mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                {t('clients.retry')}
              </Button>
            </div>
          </div>
        )}

        {/* Пустое состояние */}
        {!loading && !error && displayClients.length === 0 && (
          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardContent className="text-center space-y-4 p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">
                {searchQuery ? t('clients.noClientsFound') : t('clients.noClients')}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? t('clients.noResults', { query: searchQuery }) 
                  : t('clients.emptyStateMessage')
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => void navigate('/clients/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('clients.addClient')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Список клиентов */}
        {!loading && !error && displayClients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayClients.map((client) => {
              // Извлекаем имя и фамилию
              const firstName = client.profileFirstName || client.name.split(' ')[0] || '';
              const lastName = client.profileLastName || client.name.split(' ').slice(1).join(' ') || '';

              return (
                <Card
                  key={client.id}
                  className="cursor-pointer border-0 border-t border-border bg-transparent shadow-none transition hover:bg-muted/40 rounded-none"
                  onClick={() => void navigate(`/clients/${client.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Аватар */}
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-medium uppercase text-muted-foreground">
                        {client.avatarUrl ? (
                          <img
                            src={client.avatarUrl}
                            alt={client.name}
                            className="h-16 w-16 object-cover object-center rounded-full"
                          />
                        ) : (
                          getInitials(client.name)
                        )}
                      </div>

                      {/* Информация */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="text-base font-medium text-foreground truncate">
                          {firstName}
                        </div>
                        {lastName && (
                          <div className="text-base font-medium text-foreground truncate">
                            {lastName}
                          </div>
                        )}

                        {client.email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}

                        {client.phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        <ClientsImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImportComplete={() => void fetchClients()}
        />
      </div>
    </PageContainer>
  );
}
