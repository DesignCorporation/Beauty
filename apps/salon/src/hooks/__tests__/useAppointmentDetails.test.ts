/**
 * Vitest tests для useAppointmentDetails хука
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { useAppointmentDetails } from '../useAppointmentDetails'
import * as ReactRouter from 'react-router-dom'

// Mock CRMApiService
vi.mock('../../services/crmApiNew', () => ({
  CRMApiService: {
    getAppointmentById: vi.fn(),
  },
}))

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = (await vi.importActual<typeof ReactRouter>('react-router-dom'))
  return {
    ...actual,
    useParams: vi.fn(),
  }
})

describe('useAppointmentDetails', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  const mockAppointmentData = {
    id: 'apt_123',
    appointmentNumber: '001.K7M9A3X2.11.11.2025',
    status: 'CONFIRMED',
    createdAt: new Date('2025-11-10T14:30:00').toISOString(),
    updatedAt: new Date('2025-11-11T08:00:00').toISOString(),
    startAt: new Date('2025-11-11T09:00:00').toISOString(),
    endAt: new Date('2025-11-11T09:45:00').toISOString(),
    client: {
      id: 'cli_456',
      firstName: 'Иван',
      lastName: 'Иванов',
      email: 'ivan@example.com',
      phone: '+7999123456',
      avatar: 'https://example.com/avatar.jpg',
      totalVisits: 5,
    },
    service: {
      id: 'srv_789',
      name: 'Укладка волос',
      price: 500,
      durationMinutes: 45,
      category: 'Парикмахерские услуги',
    },
    staff: {
      id: 'stf_321',
      firstName: 'Анна',
      lastName: 'Сергеевна',
      role: 'Парикмахер',
      avatar: 'https://example.com/staff-avatar.jpg',
      rating: 4.8,
    },
    totalPrice: 500,
    currency: 'EUR',
    payments: [
      {
        id: 'pay_001',
        status: 'PAID',
        amount: 500,
        method: 'CARD',
        paidAt: new Date('2025-11-11T09:00:00').toISOString(),
      },
    ],
    outstandingBalance: 0,
    salonName: 'Beauty Salon',
    roomNumber: '2',
  }

  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, {}, children)

  it('should return error when appointmentId is not provided', () => {
    vi.mocked(ReactRouter.useParams).mockReturnValue({})

    const { result } = renderHook(() => useAppointmentDetails(), { wrapper })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Appointment ID is required')
    expect(result.current.isLoading).toBe(false)
  })

  it('should load appointment details successfully', async () => {
    const { CRMApiService } = await import('../../services/crmApiNew')
    const mockGetAppointmentById = vi.fn().mockResolvedValue({ success: true, appointment: mockAppointmentData })
    vi.mocked(CRMApiService.getAppointmentById).mockImplementation(mockGetAppointmentById)

    vi.mocked(ReactRouter.useParams).mockReturnValue({ id: 'apt_123' })

    const { result } = renderHook(() => useAppointmentDetails(), { wrapper })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeDefined()
    expect(result.current.data?.appointmentNumber).toBe('001.K7M9A3X2.11.11.2025')
    expect(result.current.data?.client.firstName).toBe('Иван')
    expect(result.current.data?.totalPrice).toBe(500)
  })

  it('should respect enabled option', async () => {
    vi.mocked(ReactRouter.useParams).mockReturnValue({ id: 'apt_123' })

    const { result } = renderHook(() => useAppointmentDetails('apt_123', { enabled: false }), {
      wrapper,
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should use provided appointmentId over route param', async () => {
    const { CRMApiService } = await import('../../services/crmApiNew')
    const mockGetAppointmentById = vi.fn().mockResolvedValue({ success: true, appointment: mockAppointmentData })
    vi.mocked(CRMApiService.getAppointmentById).mockImplementation(mockGetAppointmentById)

    vi.mocked(ReactRouter.useParams).mockReturnValue({ id: 'route_id' })

    const { result } = renderHook(() => useAppointmentDetails('apt_123'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Should have called API with provided id, not route id
    expect(mockGetAppointmentById).toHaveBeenCalledWith('apt_123')
  })

  it('should normalize appointment data correctly', async () => {
    const { CRMApiService } = await import('../../services/crmApiNew')
    const mockGetAppointmentById = vi.fn().mockResolvedValue({ success: true, appointment: mockAppointmentData })
    vi.mocked(CRMApiService.getAppointmentById).mockImplementation(mockGetAppointmentById)

    vi.mocked(ReactRouter.useParams).mockReturnValue({ id: 'apt_123' })

    const { result } = renderHook(() => useAppointmentDetails(), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    const data = result.current.data!

    // Check date normalization
    expect(data.startAt).toBeInstanceOf(Date)
    expect(data.endAt).toBeInstanceOf(Date)
    expect(data.createdAt).toBeInstanceOf(Date)

    // Check duration calculation
    expect(data.durationMinutes).toBe(45)

    // Check services array
    expect(Array.isArray(data.services)).toBe(true)
    expect(data.services[0].name).toBe('Укладка волос')

    // Check payment transformation
    expect(Array.isArray(data.payments)).toBe(true)
    expect(data.payments[0].status).toBe('PAID')
  })

  it('should handle multiple services correctly', async () => {
    const { CRMApiService } = await import('../../services/crmApiNew')
    const dataWithMultipleServices = {
      ...mockAppointmentData,
      service: undefined, // Remove single service
      totalPrice: 700, // Update total price to match sum of services
      services: [
        {
          id: 'srv_1',
          name: 'Маникюр',
          price: 300,
          durationMinutes: 30,
        },
        {
          id: 'srv_2',
          name: 'Педикюр',
          price: 400,
          durationMinutes: 40,
        },
      ],
    }

    const mockGetAppointmentById = vi.fn().mockResolvedValue({ success: true, appointment: dataWithMultipleServices })
    vi.mocked(CRMApiService.getAppointmentById).mockImplementation(mockGetAppointmentById)

    vi.mocked(ReactRouter.useParams).mockReturnValue({ id: 'apt_123' })

    const { result } = renderHook(() => useAppointmentDetails(), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(result.current.data?.services).toHaveLength(2)
    expect(result.current.data?.totalPrice).toBe(700)
  })

  it('should handle API errors gracefully', async () => {
    const { CRMApiService } = await import('../../services/crmApiNew')
    const mockGetAppointmentById = vi.fn().mockRejectedValue(new Error('API Error'))
    vi.mocked(CRMApiService.getAppointmentById).mockImplementation(mockGetAppointmentById)

    vi.mocked(ReactRouter.useParams).mockReturnValue({ id: 'apt_123' })

    const { result } = renderHook(() => useAppointmentDetails(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
  })

  it('should load activity events separately', async () => {
    const { CRMApiService } = await import('../../services/crmApiNew')
    const mockGetAppointmentById = vi.fn().mockResolvedValue({ success: true, appointment: mockAppointmentData })
    vi.mocked(CRMApiService.getAppointmentById).mockImplementation(mockGetAppointmentById)

    vi.mocked(ReactRouter.useParams).mockReturnValue({ id: 'apt_123' })

    const { result } = renderHook(() => useAppointmentDetails(), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    // Activity events are loaded as empty array by default (TODO: API endpoint not ready)
    expect(result.current.data?.activityEvents).toEqual([])
  })

  it('should calculate outstanding balance correctly', async () => {
    const { CRMApiService } = await import('../../services/crmApiNew')
    const dataWithOutstandingBalance = {
      ...mockAppointmentData,
      totalPrice: 1000,
      payments: [
        {
          id: 'pay_001',
          status: 'PAID',
          amount: 600,
          method: 'CARD',
        },
      ],
      outstandingBalance: 400,
    }

    const mockGetAppointmentById = vi.fn().mockResolvedValue({ success: true, appointment: dataWithOutstandingBalance })
    vi.mocked(CRMApiService.getAppointmentById).mockImplementation(mockGetAppointmentById)

    vi.mocked(ReactRouter.useParams).mockReturnValue({ id: 'apt_123' })

    const { result } = renderHook(() => useAppointmentDetails(), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(result.current.data?.totalPrice).toBe(1000)
    expect(result.current.data?.outstandingBalance).toBe(400)
  })

  it('should handle cancelled appointments', async () => {
    const { CRMApiService } = await import('../../services/crmApiNew')
    const cancelledData = {
      ...mockAppointmentData,
      status: 'CANCELLED',
      cancelledAt: new Date('2025-11-11T08:00:00').toISOString(),
      cancelledReason: 'CLIENT_NO_SHOW',
    }

    const mockGetAppointmentById = vi.fn().mockResolvedValue({ success: true, appointment: cancelledData })
    vi.mocked(CRMApiService.getAppointmentById).mockImplementation(mockGetAppointmentById)

    vi.mocked(ReactRouter.useParams).mockReturnValue({ id: 'apt_123' })

    const { result } = renderHook(() => useAppointmentDetails(), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(result.current.data?.status).toBe('CANCELLED')
    expect(result.current.data?.cancelledReason).toBe('CLIENT_NO_SHOW')
    expect(result.current.data?.cancelledAt).toBeInstanceOf(Date)
  })
})
