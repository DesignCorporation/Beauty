import { useState, useEffect, useCallback } from 'react'
import { CRMApiService } from '../services/crmApiNew'
import type { SalonWorkingHour, WorkingHourInput } from '../types/schedule'
import { debugLog, debugWarn } from '../utils/debug'

export interface WorkingHours extends WorkingHourInput {
  id?: string
}

const buildFallbackHours = (): WorkingHours[] => ([
  { id: 'mon', dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
  { id: 'tue', dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
  { id: 'wed', dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
  { id: 'thu', dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
  { id: 'fri', dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
  { id: 'sat', dayOfWeek: 6, startTime: '10:00', endTime: '16:00', isWorkingDay: true },
  { id: 'sun', dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isWorkingDay: false }
])

const normalizeHours = (records: SalonWorkingHour[] | undefined): WorkingHours[] => {
  if (!records?.length) {
    return buildFallbackHours()
  }

  return records.map(record => ({
    id: record.id,
    dayOfWeek: record.dayOfWeek,
    startTime: record.startTime,
    endTime: record.endTime,
    isWorkingDay: record.isWorkingDay
  }))
}

export const useWorkingHours = (): {
  workingHours: WorkingHours[];
  loading: boolean;
  error: string | null;
  fetchWorkingHours: () => Promise<void>;
  updateWorkingHours: (updates: WorkingHourInput[]) => Promise<void>;
  refetch: () => Promise<void>;
} => {
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>(buildFallbackHours())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkingHours = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const response = await CRMApiService.getSalonWorkingHours()
      debugLog('[useWorkingHours] Received working hours', response.hours?.length ?? 0)

      setWorkingHours(normalizeHours(response.hours))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load working hours'
      debugWarn('[useWorkingHours] Failed to load working hours', err)
      setError(message)
      setWorkingHours(buildFallbackHours())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchWorkingHours()
  }, [fetchWorkingHours])

  const updateWorkingHours = useCallback(async (updates: WorkingHourInput[]): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const response = await CRMApiService.updateSalonWorkingHours(updates)
      debugLog('[useWorkingHours] Updated working hours', response.hours?.length ?? 0)

      setWorkingHours(normalizeHours(response.hours))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update working hours'
      debugWarn('[useWorkingHours] Failed to update working hours', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    workingHours,
    loading,
    error,
    fetchWorkingHours,
    updateWorkingHours,
    refetch: fetchWorkingHours
  }
}

// Утилитарные функции
export const isWithinWorkingHours = (date: Date, workingHours: WorkingHours[]): boolean => {
  const dayOfWeek = date.getDay()
  const timeString = date.toTimeString().substring(0, 5) // "HH:mm"

  const dayHours = workingHours.find(wh => wh.dayOfWeek === dayOfWeek)
  if (!dayHours || !dayHours.isWorkingDay) {
    return false
  }

  return timeString >= dayHours.startTime && timeString <= dayHours.endTime
}

// Перегруженная версия для удобства использования в календаре
export const isWithinWorkingHoursSlot = (workingHours: WorkingHours[], day: Date, hour: number, minute: number): boolean => {
  const date = new Date(day)
  date.setHours(hour, minute, 0, 0)
  return isWithinWorkingHours(date, workingHours)
}

// Получение общего диапазона рабочих часов (для календарной сетки)
export const getOverallWorkingHoursRange = (workingHours: WorkingHours[]): { earliestHour: number; latestHour: number } => {
  if (!workingHours || workingHours.length === 0) {
    return { earliestHour: 9, latestHour: 18 }
  }

  const workingDays = workingHours.filter(wh => wh.isWorkingDay)
  if (workingDays.length === 0) {
    return { earliestHour: 9, latestHour: 18 }
  }

  let earliestHour = 24
  let latestHour = 0

  workingDays.forEach(day => {
    if (day.startTime && day.endTime) {
      const [startHourPart] = day.startTime.split(':')
      const [endHourPart] = day.endTime.split(':')
      const startHour = Number.parseInt(startHourPart ?? '0', 10)
      let endHour = Number.parseInt(endHourPart ?? '0', 10)
      if (endHour === 0) endHour = 24 // Handle midnight

      earliestHour = Math.min(earliestHour, startHour)
      latestHour = Math.max(latestHour, endHour)
    }
  })

  return {
    earliestHour: Math.max(0, earliestHour),
    latestHour: Math.min(24, latestHour)
  }
}

export const getWorkingHoursRange = (date: Date, workingHours: WorkingHours[]): { start: string; end: string } | null => {
  if (!date || Number.isNaN(date.getTime())) {
    debugWarn('Invalid date passed to getWorkingHoursRange:', date)
    return null
  }

  const dayOfWeek = date.getDay()
  const dayHours = workingHours.find(wh => wh.dayOfWeek === dayOfWeek)

  if (!dayHours || !dayHours.isWorkingDay) {
    return null
  }

  return {
    start: dayHours.startTime,
    end: dayHours.endTime
  }
}
