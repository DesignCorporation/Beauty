import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Label, Switch } from '@beauty-platform/ui'
import type { WorkingHours } from '../../hooks/useWorkingHours'

const WEEK_DAYS = [
  { value: 1, short: 'Пн', translationKey: 'common.weekdays.monday' },
  { value: 2, short: 'Вт', translationKey: 'common.weekdays.tuesday' },
  { value: 3, short: 'Ср', translationKey: 'common.weekdays.wednesday' },
  { value: 4, short: 'Чт', translationKey: 'common.weekdays.thursday' },
  { value: 5, short: 'Пт', translationKey: 'common.weekdays.friday' },
  { value: 6, short: 'Сб', translationKey: 'common.weekdays.saturday' },
  { value: 0, short: 'Вс', translationKey: 'common.weekdays.sunday' }
]

interface WorkingHoursEditorProps {
  value: WorkingHours[]
  onChange: (next: WorkingHours[]) => void
  disabled?: boolean
  timezone?: string | null
  idPrefix?: string
}

const ensureRecord = (hours: WorkingHours[], day: number): WorkingHours => {
  return hours.find(item => item.dayOfWeek === day) ?? {
    id: `day-${day}`,
    dayOfWeek: day,
    startTime: '09:00',
    endTime: '18:00',
    isWorkingDay: day >= 1 && day <= 5
  }
}

export const WorkingHoursEditor: React.FC<WorkingHoursEditorProps> = ({
  value,
  onChange,
  disabled,
  timezone,
  idPrefix = 'working-hours'
}) => {
  const { t } = useTranslation()

  const orderedHours = useMemo(() => {
    return WEEK_DAYS.map(day => ensureRecord(value, day.value))
  }, [value])

  const updateDay = (dayOfWeek: number, patch: Partial<WorkingHours>) => {
    onChange(
      orderedHours.map(record => {
        if (record.dayOfWeek !== dayOfWeek) return record
        return {
          ...record,
          ...patch
        }
      })
    )
  }

  const legendId = `${idPrefix}-legend`
  const formatHintId = `${idPrefix}-time-hint`

  const inputBaseClasses =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-muted/60 disabled:text-muted-foreground'

  return (
    <fieldset className="space-y-4" aria-labelledby={legendId}>
      <legend id={legendId} className="sr-only">
        {t('schedule.working_hours_legend', 'Рабочие часы на неделю')}
      </legend>
      {timezone && (
        <p className="text-sm font-medium text-foreground" id={`${idPrefix}-timezone`}>
          {t('schedule.common.timezoneLabel', { timezone })}
        </p>
      )}
      <p id={formatHintId} className="text-sm text-foreground">
        {t('schedule.time_format_hint', 'Формат: ЧЧ:мм (24-часовой формат)')}
      </p>
      <div className="space-y-3 rounded-xl border border-border bg-card">
        {WEEK_DAYS.map(day => {
          const record =
            orderedHours.find(item => item.dayOfWeek === day.value) ?? ensureRecord(value, day.value)
          const isDayDisabled = disabled || !record.isWorkingDay
          const dayLabel = day.short || t(day.translationKey)
          const startInputId = `${idPrefix}-start-${day.value}`
          const endInputId = `${idPrefix}-end-${day.value}`
          const offToggleId = `${idPrefix}-off-${day.value}`
          return (
            <div
              key={day.value}
              className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex items-center justify-between gap-3 sm:w-52 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{dayLabel}</p>
                  {!record.isWorkingDay && (
                    <p className="text-xs text-foreground">
                      {t('schedule.common.offDay', 'Выходной')}
                    </p>
                  )}
                </div>
                <Switch
                  id={offToggleId}
                  aria-label={t('schedule.is_working_day_aria', {
                    day: dayLabel,
                    defaultValue: `${dayLabel} — рабочий день?`
                  })}
                  checked={record.isWorkingDay}
                  disabled={disabled}
                  onCheckedChange={checked => updateDay(day.value, { isWorkingDay: checked })}
                />
              </div>

              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={startInputId} className="text-xs font-semibold text-foreground">
                    {t('schedule.common.start')}
                  </Label>
                  <Input
                    id={startInputId}
                    type="time"
                    aria-label={t('schedule.start_time_aria', {
                      day: dayLabel,
                      defaultValue: `Время начала для ${dayLabel}`
                    })}
                    aria-describedby={formatHintId}
                    aria-required="true"
                    required
                    value={record.startTime}
                    className={inputBaseClasses}
                    disabled={isDayDisabled}
                    min="00:00"
                    max="23:45"
                    step={15 * 60}
                    onChange={event =>
                      updateDay(day.value, {
                        startTime: event.target.value || '00:00',
                        isWorkingDay: true
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor={endInputId} className="text-xs font-semibold text-foreground">
                    {t('schedule.common.end')}
                  </Label>
                  <Input
                    id={endInputId}
                    type="time"
                    aria-label={t('schedule.end_time_aria', {
                      day: dayLabel,
                      defaultValue: `Время окончания для ${dayLabel}`
                    })}
                    aria-describedby={formatHintId}
                    aria-required="true"
                    required
                    value={record.endTime}
                    className={inputBaseClasses}
                    disabled={isDayDisabled}
                    min="00:15"
                    max="23:59"
                    step={15 * 60}
                    onChange={event =>
                      updateDay(day.value, {
                        endTime: event.target.value || '00:00',
                        isWorkingDay: true
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

export default WorkingHoursEditor
