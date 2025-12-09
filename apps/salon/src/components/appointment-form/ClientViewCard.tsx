import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { User, Phone, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ClientInfo {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  birthDate?: Date;
  loyaltyTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  totalVisits?: number;
  lastVisitAt?: Date;
  notes?: string;
}

interface ClientViewCardProps {
  client: ClientInfo;
  clientName: string;
}

export function ClientViewCard({ client, clientName }: ClientViewCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5" />
          {t('appointmentForm.detailsPage.clientCard')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {client.avatar ? (
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
            {client.loyaltyTier && (
              <p className="text-xs text-muted-foreground">
                {client.loyaltyTier} {client.totalVisits && `• ${client.totalVisits} visits`}
              </p>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 mt-2">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{client.email}</span>
              </div>
            )}
            {client.notes && (
              <p className="text-xs text-muted-foreground mt-2">{client.notes}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
