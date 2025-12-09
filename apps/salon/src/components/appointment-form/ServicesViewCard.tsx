import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  currency?: string;
}

interface ServicesViewCardProps {
  services: Service[];
  totalPrice: number;
  currency: string;
  formatCurrencyValue: (price: number, currency: string) => string;
}

export function ServicesViewCard({
  services,
  totalPrice,
  currency,
  formatCurrencyValue
}: ServicesViewCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="w-5 h-5" />
          {t('appointmentForm.detailsPage.servicesCard')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.length ? (
          <>
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {service.durationMinutes} {t('appointments.minutesShort')}
                  </p>
                </div>
                <div className="text-right font-semibold">
                  {formatCurrencyValue(service.price, service.currency || currency)}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3 font-semibold">
              <span>{t('appointmentForm.detailsPage.totalLabel')}</span>
              <span>{formatCurrencyValue(totalPrice, currency)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('common.noResults')}</p>
        )}
      </CardContent>
    </Card>
  );
}
