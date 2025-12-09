import { useCallback, useEffect, useState } from 'react'
import { CRMApiService } from '../services/crmApiNew'
import type { AvailableTimeSlot, GetAvailableSlotsRequest } from '../types/schedule'
import { debugLog, debugWarn } from '../utils/debug'

export interface UseAvailableSlotsParams extends GetAvailableSlotsRequest {}

export const useAvailableSlots = (params?: Partial<UseAvailableSlotsParams>): {
  slots: AvailableTimeSlot[];
  timezone: string;
  date: string | null;
  loading: boolean;
  error: string | null;
  hasRequiredParams: boolean;
  refetch: () => Promise<void>;
} => {
  const [slots, setSlots] = useState<AvailableTimeSlot[]>([])
  const [timezone, setTimezone] = useState<string>('Europe/Warsaw')
  const [date, setDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasRequiredParams = Boolean(params?.date && params?.serviceDurationMinutes)

  const fetchSlots = useCallback(async (): Promise<void> => {
    if (!params || !hasRequiredParams) {
      setSlots([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await CRMApiService.getAvailableSlots({
        date: params.date!,
        serviceDurationMinutes: params.serviceDurationMinutes!,
        staffId: params.staffId,
        bufferMinutes: params.bufferMinutes
      })

      setSlots(response.slots ?? [])
      setTimezone(response.timezone)
      setDate(response.date)
      debugLog('[useAvailableSlots] Loaded slots', response.slots?.length ?? 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load available slots'
      debugWarn('[useAvailableSlots] Failed to load available slots', err)
      setError(message)
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [params, hasRequiredParams])

  useEffect(() => {
    if (hasRequiredParams) {
      void fetchSlots()
    }
  }, [fetchSlots, hasRequiredParams])

  return {
    slots,
    timezone,
    date,
    loading,
    error,
    hasRequiredParams,
    refetch: fetchSlots
  }
}
