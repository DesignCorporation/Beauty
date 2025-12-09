import { useQuery } from '@tanstack/react-query'
import { clientApi } from '../services'
import type { Booking } from '../services'

interface ClientBookingsApiResponse {
  appointments?: Booking[]
  totals?: {
    total: number
    upcoming: number
    past: number
  }
}

export const useClientBookings = () => {
  const query = useQuery({
    queryKey: ['client', 'bookings'],
    queryFn: async () => {
      try {
        const response = await clientApi.getClientBookings()
        if (!response.success) {
          throw new Error(response.error || 'Failed to load bookings')
        }

        const raw = response.data
        let appointments: Booking[] = []
        let totals: ClientBookingsApiResponse['totals'] | undefined

        if (Array.isArray(raw)) {
          appointments = raw as Booking[]
        } else {
          const payload = (raw || {}) as ClientBookingsApiResponse
          appointments = payload.appointments ?? []
          totals = payload.totals
        }

        const computedTotals = (() => {
          if (totals) {
            return totals
          }

          const now = Date.now()
          const activeStatuses = new Set<Booking['status']>(['PENDING', 'CONFIRMED', 'IN_PROGRESS'])
          const upcoming = appointments.filter(booking => {
            if (!booking.startTime) return false
            const startMs = new Date(booking.startTime).getTime()
            return startMs >= now && activeStatuses.has(booking.status)
          }).length

          return {
            total: appointments.length,
            upcoming,
            past: appointments.length - upcoming,
          }
        })()

        return {
          appointments,
          totals: computedTotals,
        }
      } catch (error: any) {
        if (error instanceof Error && /endpoint not found/i.test(error.message)) {
          // Backend ещё не обновлён – показываем корректное пустое состояние
          return {
            appointments: [],
            totals: {
              total: 0,
              upcoming: 0,
              past: 0,
            },
          }
        }
        throw error
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })

  return {
    appointments: query.data?.appointments ?? [],
    totals: query.data?.totals,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch: query.refetch,
  }
}
