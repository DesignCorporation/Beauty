import { Card, CardContent, CardHeader, CardTitle, cn } from '@beauty-platform/ui';
import { Briefcase, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Service {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  durationMinutes?: number;
  price: number;
  currency?: string;
  category?: string;
  image?: string;
}

interface ServicesCardProps {
  editable: boolean;
  services: Service[];
  allServices?: Service[];
  selectedServiceIds?: string[];
  totalPrice?: number;
  currency?: string;
  onChange?: (serviceId: string) => void;
  formatCurrencyValue?: (price: number, currency: string) => string;
}

export function ServicesCard({
  editable,
  services,
  allServices = [],
  selectedServiceIds = [],
  totalPrice,
  currency = 'PLN',
  onChange,
  formatCurrencyValue = (price, curr) => `${price.toFixed(2)} ${curr}`
}: ServicesCardProps) {
  const { t } = useTranslation();

  const renderDurationLabel = (service: Service): string => {
    const duration = service.durationMinutes ?? service.duration ?? 0;
    return t('appointmentForm.durationShort', { duration });
  };

  const renderViewMode = () => (
    <div className="space-y-3">
      {services.length > 0 ? (
        <>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between border-0 border-b border-border/60 px-0 py-3"
              >
                <p className="font-medium truncate">{service.name}</p>
                <div className="ml-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="whitespace-nowrap">{renderDurationLabel(service)}</span>
                  <span className="whitespace-nowrap font-semibold text-foreground">
                    {formatCurrencyValue(service.price, service.currency || currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {totalPrice !== undefined && (
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="font-semibold">{t('appointmentForm.total')}</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrencyValue(totalPrice, currency)}
              </span>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t('common.noResults')}</p>
      )}
    </div>
  );

  const renderEditMode = () => (
    <div className="space-y-3">
      {allServices.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('appointmentForm.noServicesAvailable')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-0 max-h-96 overflow-y-auto">
          {allServices.map((service) => {
            const isSelected = selectedServiceIds.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onChange?.(service.id)}
                className={cn(
                  'text-left px-0 py-3 border-0 border-b border-border/60 transition-colors',
                  isSelected ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium truncate">{service.name}</p>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="whitespace-nowrap">{renderDurationLabel(service)}</span>
                    <span className="whitespace-nowrap font-semibold text-foreground">
                      {formatCurrencyValue(service.price, service.currency || currency)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedServiceIds.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <span className="text-sm text-muted-foreground">
            {t('appointmentForm.selectedCount', { count: selectedServiceIds.length })}
          </span>
          {totalPrice !== undefined && (
            <span className="text-lg font-bold text-primary">
              {formatCurrencyValue(totalPrice, currency)}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card className="border-0 border-t border-border/70 bg-transparent shadow-none rounded-none">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Briefcase className="w-5 h-5" />
          {t('appointmentForm.sections.services')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {editable ? renderEditMode() : renderViewMode()}
      </CardContent>
    </Card>
  );
}
