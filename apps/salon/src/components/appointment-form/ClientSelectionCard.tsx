import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface ClientSelectionCardProps {
  clients: Client[];
  selectedClientId: string;
  onChange: (clientId: string) => void;
  error?: string;
}

export function ClientSelectionCard({
  clients,
  selectedClientId,
  onChange,
  error
}: ClientSelectionCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <User className="w-6 h-6 mr-3" />
          {t('appointmentForm.sections.client')} *
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <select
          value={selectedClientId}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
          required
        >
          <option value="">{t('appointmentForm.placeholders.selectClient')}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} {client.phone && `(${client.phone})`}
            </option>
          ))}
        </select>
        {error && <div className="text-error text-sm mt-2">{error}</div>}
      </CardContent>
    </Card>
  );
}
