import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { User, Search, Phone, Mail, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';

interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  loyaltyTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  totalVisits?: number;
  lastVisitAt?: Date;
}

interface ClientCardProps {
  editable: boolean;
  client: Client | null;
  clients?: Client[];
  selectedClientId?: string;
  onChange?: (clientId: string) => void;
}

export function ClientCard({
  editable,
  client,
  clients = [],
  selectedClientId,
  onChange
}: ClientCardProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  const clientName = client
    ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.name
    : t('appointmentForm.sections.client');

  const renderViewMode = () => (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0">
        {client?.avatar ? (
          <img
            src={client.avatar}
            alt={clientName}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-base">{clientName}</p>
        {client?.phone && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{client.phone}</span>
          </p>
        )}
        {client?.email && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{client.email}</span>
          </p>
        )}
        {client?.loyaltyTier && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            <Award className="h-3 w-3 text-muted-foreground" />
            <span>
              {client.loyaltyTier} • {client.totalVisits || 0} {t('appointmentForm.detailsPage.visits')}
            </span>
          </p>
        )}
      </div>
    </div>
  );

  const renderEditMode = () => (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          placeholder={t('appointmentForm.searchClient')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border-0 border-b border-border/70 bg-transparent text-sm focus-visible:outline-none focus-visible:ring-0 rounded-none"
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {filteredClients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('appointmentForm.noClientsFound')}
          </p>
        ) : (
          filteredClients.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange?.(c.id)}
              className={`w-full text-left px-0 py-3 border-0 border-b border-border/60 transition-colors ${
                selectedClientId === c.id
                  ? 'text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                {c.avatar ? (
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{c.name}</p>
                  {c.phone && (
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Card className="border-0 border-t border-border/70 bg-transparent shadow-none rounded-none">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <User className="w-5 h-5" />
          {t('appointmentForm.sections.client')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {editable ? renderEditMode() : renderViewMode()}
      </CardContent>
    </Card>
  );
}
