import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DateTimeCardProps {
  date: string;
  startTime: string;
  endTime: string;
  onDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  autoRoundedHint?: string;
  autoCalculatedHint?: string;
}

export function DateTimeCard({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  autoRoundedHint,
  autoCalculatedHint
}: DateTimeCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <Calendar className="w-6 h-6 mr-3" />
          {t('appointmentForm.sections.dateTime')} *
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t('appointmentForm.labels.date')}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t('appointmentForm.labels.start')}
            </label>
            <input
              type="time"
              step="900"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
              required
              placeholder="HH:MM"
              pattern="[0-9]{2}:[0-9]{2}"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {autoRoundedHint || t('appointmentForm.messages.autoRoundedHint')}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t('appointmentForm.labels.end')}
            </label>
            <input
              type="time"
              step="900"
              value={endTime}
              readOnly
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
              required
            />
            <div className="text-xs text-muted-foreground mt-1">
              {autoCalculatedHint || t('appointmentForm.messages.autoCalculatedHint')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
