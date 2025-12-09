import { useQuery } from '@tanstack/react-query'
import { clientApi } from '../services'

export interface SalonRelation {
  id: string
  salonId: string
  salonName: string
  salonAddress?: string
  salonPhone?: string
  salonEmail?: string
  loyaltyTier: string
  loyaltyPoints: number
  totalSpent: number
  visitCount: number
  lastVisitAt?: string
  joinedSalonAt: string
  salonNotes?: string
  isPrimary: boolean
  isActive: boolean
}

export const useMySalons = () => {
  const query = useQuery({
    queryKey: ['client', 'salons'],
    queryFn: async () => {
      const response = await clientApi.getMySalons()
      if (!response.success) {
        throw new Error(response.error || 'Failed to load salons')
      }
      return response.data as SalonRelation[]
    },
    retry: 1,
    refetchOnWindowFocus: false
  })

  return {
    salons: query.data,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch: query.refetch
  }
}
