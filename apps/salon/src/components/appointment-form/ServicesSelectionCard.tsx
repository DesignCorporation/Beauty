import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Service {
  id: string;
  name?: string;
  duration?: number;
  price?: number;
}

interface ServicesSelectionCardProps {
  services: Service[];
  selectedServiceIds: string[];
  onChange: (serviceId: string) => void;
}

export function ServicesSelectionCard({
  services,
  selectedServiceIds,
  onChange
}: ServicesSelectionCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <Briefcase className="w-6 h-6 mr-3" />
          {t('appointmentForm.sections.services')} *
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {services.map((service) => (
            <label
              key={service.id}
              className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selectedServiceIds.includes(service.id)}
                onChange={() => onChange(service.id)}
                className="rounded border-border text-info focus:ring-info"
              />
              <div className="flex-1">
                <div className="font-medium">
                  {service.name || t('appointmentForm.fallbacks.serviceName', 'Service name')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {service.duration || 0} {t('appointments.minutesShort')} • {service.price || 0} PLN
                </div>
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-error">
                    DEBUG: name={service.name}, duration={service.duration}, price={service.price}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
