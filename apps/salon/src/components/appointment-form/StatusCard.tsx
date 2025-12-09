import { Card, CardContent, CardHeader, CardTitle, cn } from '@beauty-platform/ui';
import { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface StatusOption {
  value: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  colorLight: string;
}

interface StatusCardProps {
  selectedStatus: string;
  statusOptions: StatusOption[];
  onStatusChange: (status: string) => void;
  statusInfo?: StatusOption;
}

export function StatusCard({
  selectedStatus,
  statusOptions,
  onStatusChange,
  statusInfo
}: StatusCardProps) {
  const { t } = useTranslation();

  const StatusIcon = statusInfo?.icon || statusOptions[0]?.icon;

  return (
    <Card className="border-0 border-t border-border/70 bg-transparent shadow-none rounded-none">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="text-base font-medium">{t('appointmentForm.sections.status')}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4">
        <div className="grid grid-cols-2 gap-0">
          {statusOptions.map((statusOption) => {
            const Icon = statusOption.icon;
            const isSelected = selectedStatus === statusOption.value;

            return (
              <button
                key={statusOption.value}
                type="button"
                onClick={() => onStatusChange(statusOption.value)}
                className={cn(
                  'relative w-full text-left px-0 py-3 border-0 border-b border-border/60 text-sm transition-colors',
                  isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="w-4 h-4" />
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:block">{statusOption.label}</span>
                    <span className="block sm:hidden">{statusOption.shortLabel}</span>
                  </div>
                </div>
                {isSelected && <div className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-current" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground border-t border-border/60 pt-3">
          <StatusIcon className="w-4 h-4" />
          <span>{t('appointmentForm.statusSelected', { status: statusInfo?.label ?? '' })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
