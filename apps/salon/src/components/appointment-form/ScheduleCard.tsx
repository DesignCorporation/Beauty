import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ScheduleCardProps {
  editable: boolean;
  startAt?: Date;
  endAt?: Date;
  durationMinutes?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  onDateChange?: (date: string) => void;
  onStartTimeChange?: (time: string) => void;
  formatFullDate?: (date: Date) => string;
  formatTimeValue?: (date: Date) => string;
}

export function ScheduleCard({
  editable,
  startAt,
  endAt,
  durationMinutes,
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  formatFullDate = (d) => d.toLocaleString()
}: ScheduleCardProps) {
  const { t } = useTranslation();

  const renderViewMode = () => {
    if (!startAt || !endAt) {
      return <p className="text-sm text-muted-foreground">{t('common.noData')}</p>;
    }

    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-start justify-between">
          <span className="text-muted-foreground">{t('appointmentForm.detailsPage.startTime')}</span>
          <span className="font-medium">{formatFullDate(startAt)}</span>
        </div>
        <div className="flex items-start justify-between">
          <span className="text-muted-foreground">{t('appointmentForm.detailsPage.endTime')}</span>
          <span className="font-medium">{formatFullDate(endAt)}</span>
        </div>
        {durationMinutes !== undefined && (
          <div className="flex items-start justify-between pt-2 border-t border-border/60">
            <span className="text-muted-foreground">{t('appointmentForm.detailsPage.duration')}</span>
            <span className="font-semibold">{durationMinutes} {t('appointmentForm.detailsPage.minutes')}</span>
          </div>
        )}
      </div>
    );
  };

  const renderEditMode = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-muted-foreground mb-2">
          {t('appointmentForm.date')} *
        </label>
        <input
          type="date"
          value={date || ''}
          onChange={(e) => onDateChange?.(e.target.value)}
          className="w-full border-0 border-b border-border/70 bg-transparent px-0 py-2 text-base focus-visible:outline-none focus-visible:ring-0 rounded-none"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            {t('appointmentForm.startTime')} *
          </label>
          <input
            type="time"
            value={startTime || ''}
            onChange={(e) => onStartTimeChange?.(e.target.value)}
            step="900"
            className="w-full border-0 border-b border-border/70 bg-transparent px-0 py-2 text-base focus-visible:outline-none focus-visible:ring-0 rounded-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            {t('appointmentForm.endTime')}
          </label>
          <input
            type="time"
            value={endTime || ''}
            disabled
            className="w-full border-0 border-b border-border/60 bg-transparent px-0 py-2 text-base text-muted-foreground cursor-not-allowed"
            title={t('appointmentForm.endTimeAutoCalculated')}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('appointmentForm.autoCalculated')}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="border-0 border-t border-border/70 bg-transparent shadow-none rounded-none">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Calendar className="w-5 h-5" />
          {t('appointmentForm.sections.schedule')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {editable ? renderEditMode() : renderViewMode()}
      </CardContent>
    </Card>
  );
}
