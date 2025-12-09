import { useQuery } from '@tanstack/react-query'
import { clientApi } from '../services'

export interface DashboardStats {
  totalSalons: number
  totalLoyaltyPoints: number
  totalVisits: number
  totalSpent: number
  upcomingAppointments: number
  salons: Array<{
    id: string
    name: string
    loyaltyTier: string
    loyaltyPoints: number
    isPrimary: boolean
  }>
}

export const useDashboardStats = () => {
  const query = useQuery({
    queryKey: ['client', 'dashboard'],
    queryFn: async () => {
      const response = await clientApi.getDashboardStats()
      if (!response.success) {
        throw new Error(response.error || 'Failed to load dashboard stats')
      }
      return response.data as DashboardStats
    },
    retry: 1,
    refetchOnWindowFocus: false
  })

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch: query.refetch
  }
}
