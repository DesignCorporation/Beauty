import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { Calendar, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ScheduleViewCardProps {
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  status: string;
  statusColor?: string;
  formatFullDate: (date: Date) => string;
  formatTimeValue: (date: Date) => string;
}

export function ScheduleViewCard({
  startAt,
  endAt,
  durationMinutes,
  status,
  statusColor,
  formatFullDate,
  formatTimeValue
}: ScheduleViewCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5" />
          {t('appointmentForm.detailsPage.scheduleCard')}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('appointmentForm.detailsPage.statusLabel')}:</span>
          {statusColor ? (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColor}`}>
              {status}
            </span>
          ) : (
            <span className="border border-border text-foreground px-2 py-0.5 text-xs font-medium rounded-full">
              {status}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t('appointmentForm.labels.date')}</p>
            <p className="font-medium">{formatFullDate(startAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('appointmentForm.detailsPage.durationLabel')}</p>
            <p className="font-medium">
              {durationMinutes} {t('appointments.minutesShort')}
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t('appointmentForm.labels.start')}</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <p className="font-medium">{formatTimeValue(startAt)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('appointmentForm.labels.end')}</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <p className="font-medium">{formatTimeValue(endAt)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
