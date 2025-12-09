import { useCallback, useEffect, useMemo, useState } from 'react'
import { startOfDay, endOfDay } from 'date-fns'
import { CRMApiService } from '../services/crmApiNew'
import { useStaff } from './useStaff'
import type { StaffScheduleException } from '../types/schedule'
import { debugLog, debugWarn } from '../utils/debug'

export interface StaffSchedule {
  id: string
  staffId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isWorkingDay: boolean
}

type ExceptionsMap = Record<string, StaffScheduleException[]>

const normalizeWorkingHours = (staffId: string, records: { id: string; dayOfWeek: number; startTime: string; endTime: string; isWorkingDay: boolean }[]): StaffSchedule[] =>
  records.map(record => ({
    id: record.id,
    staffId,
    dayOfWeek: record.dayOfWeek,
    startTime: record.startTime,
    endTime: record.endTime,
    isWorkingDay: record.isWorkingDay
  }))

const isDateWithinRange = (target: Date, start: string, end: string): boolean => {
  const targetTime = target.getTime()
  const startTime = startOfDay(new Date(start)).getTime()
  const endTime = endOfDay(new Date(end)).getTime()
  return targetTime >= startTime && targetTime <= endTime
}

const getCustomHoursForDate = (exceptions: StaffScheduleException[], date: Date) => {
  return exceptions.find(exception =>
    exception.type === 'CUSTOM_HOURS' &&
    isDateWithinRange(date, exception.startDate, exception.endDate)
  )
}

const hasBlockingException = (exceptions: StaffScheduleException[], date: Date) => {
  return exceptions.some(exception =>
    (exception.type === 'DAY_OFF' || exception.type === 'SICK_LEAVE' || exception.isWorkingDay === false) &&
    isDateWithinRange(date, exception.startDate, exception.endDate)
  )
}

export const useStaffSchedules = (): {
  schedules: StaffSchedule[];
  exceptionsByStaff: ExceptionsMap;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} => {
  const { staff } = useStaff()
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [exceptionsByStaff, setExceptionsByStaff] = useState<ExceptionsMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSchedules = useCallback(async (): Promise<void> => {
    if (!staff.length) {
      setSchedules([])
      setExceptionsByStaff({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await Promise.allSettled(
        staff.map(async member => {
          if (!member.id) {
            return null
          }

          const data = await CRMApiService.getStaffSchedule(member.id)
          debugLog('[useStaffSchedules] Loaded schedule for staff', member.id, data.workingHours.length, 'entries')

          return {
            staffId: member.id,
            workingHours: data.workingHours,
            exceptions: data.exceptions
          }
        })
      )

      const normalizedSchedules: StaffSchedule[] = []
      const exceptionMap: ExceptionsMap = {}

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          const workingHours = normalizeWorkingHours(result.value.staffId, result.value.workingHours)
          normalizedSchedules.push(...workingHours)
          exceptionMap[result.value.staffId] = result.value.exceptions ?? []
        } else if (result.status === 'rejected') {
          debugWarn('[useStaffSchedules] Failed to load staff schedule', result.reason)
        }
      })

      setSchedules(normalizedSchedules)
      setExceptionsByStaff(exceptionMap)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load staff schedules'
      debugWarn('[useStaffSchedules] Failed to load schedules', err)
      setError(message)
      setSchedules([])
      setExceptionsByStaff({})
    } finally {
      setLoading(false)
    }
  }, [staff])

  useEffect(() => {
    void fetchSchedules()
  }, [fetchSchedules])

  const exceptions = useMemo(() => exceptionsByStaff, [exceptionsByStaff])

  return {
    schedules,
    exceptionsByStaff: exceptions,
    loading,
    error,
    refetch: fetchSchedules
  }
}

// Утилитарная функция для проверки доступности мастера
export const isStaffAvailable = (
  staffId: string,
  date: Date,
  schedules: StaffSchedule[],
  exceptionsByStaff?: ExceptionsMap
): boolean => {
  if (!staffId) return false

  const staffExceptions = exceptionsByStaff?.[staffId] ?? []
  if (hasBlockingException(staffExceptions, date)) {
    return false
  }

  const customHours = getCustomHoursForDate(staffExceptions, date)

  const dayOfWeek = date.getDay()
  const timeString = date.toTimeString().substring(0, 5)

  if (customHours && customHours.customStartTime && customHours.customEndTime) {
    return timeString >= customHours.customStartTime && timeString <= customHours.customEndTime
  }

  const staffSchedule = schedules.find(schedule =>
    schedule.staffId === staffId && schedule.dayOfWeek === dayOfWeek
  )

  if (!staffSchedule || !staffSchedule.isWorkingDay) {
    return false
  }

  return timeString >= staffSchedule.startTime && timeString <= staffSchedule.endTime
}
