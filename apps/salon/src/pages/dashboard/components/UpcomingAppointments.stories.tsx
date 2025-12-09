import type { Meta, StoryObj } from '@storybook/react'
import { UpcomingAppointments } from './UpcomingAppointments'
import type { DashboardAppointment } from '../../../hooks/useDashboardOverview'

const sampleAppointments: DashboardAppointment[] = [
  {
    id: '1',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'CONFIRMED',
    clientName: 'Анна Иванова',
    serviceName: 'Маникюр классический',
    staffName: 'Ольга'
  },
  {
    id: '2',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'IN_PROGRESS',
    clientName: 'Марек Ковальски',
    serviceName: 'Стрижка мужская',
    staffName: 'Павел'
  },
  {
    id: '3',
    startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    status: 'PENDING',
    clientName: 'Kasia Nowak',
    serviceName: 'Окрашивание',
    staffName: 'Ewa'
  }
]

const meta: Meta<typeof UpcomingAppointments> = {
  title: 'Dashboard/UpcomingAppointments',
  component: UpcomingAppointments,
  args: {
    appointments: sampleAppointments,
    loading: false
  }
}

export default meta
type Story = StoryObj<typeof UpcomingAppointments>

export const Default: Story = {}

export const Loading: Story = {
  args: {
    appointments: [],
    loading: true
  }
}

export const EmptyState: Story = {
  args: {
    appointments: [],
    loading: false
  }
}
