import type { Meta, StoryObj } from '@storybook/react'
import { ClientsWidget } from './ClientsWidget'
import type { DashboardClientsData } from '../../../hooks/useDashboardOverview'

const sampleClients: DashboardClientsData = {
  birthdaysToday: [
    { id: '1', name: 'Анна' },
    { id: '2', name: 'Marek' }
  ],
  vipClients: [
    { id: '3', name: 'Kasia Nowak', revenue: 5400 },
    { id: '4', name: 'Jan Kowalski', revenue: 4200 }
  ],
  retention30d: 72
}

const meta: Meta<typeof ClientsWidget> = {
  title: 'Dashboard/ClientsWidget',
  component: ClientsWidget,
  args: {
    data: sampleClients,
    loading: false
  }
}

export default meta
type Story = StoryObj<typeof ClientsWidget>

export const Default: Story = {}

export const Loading: Story = {
  args: {
    data: { ...sampleClients, birthdaysToday: [], vipClients: [] },
    loading: true
  }
}

export const EmptyState: Story = {
  args: {
    data: { ...sampleClients, birthdaysToday: [], vipClients: [], retention30d: 0 },
    loading: false
  }
}
