import type { Meta, StoryObj } from '@storybook/react'
import { NotificationsWidget } from './NotificationsWidget'
import type { DashboardNotificationsData } from '../../../hooks/useDashboardOverview'

const sampleNotifications: DashboardNotificationsData = {
  totalSent: 128,
  failed: 3,
  latest: {
    id: 'n1',
    title: 'Акция: Скидка 20% на стрижки',
    createdAt: new Date().toISOString()
  }
}

const meta: Meta<typeof NotificationsWidget> = {
  title: 'Dashboard/NotificationsWidget',
  component: NotificationsWidget,
  args: {
    data: sampleNotifications,
    loading: false
  }
}

export default meta
type Story = StoryObj<typeof NotificationsWidget>

export const Default: Story = {}

export const Loading: Story = {
  args: {
    data: { ...sampleNotifications, latest: null },
    loading: true
  }
}

export const EmptyState: Story = {
  args: {
    data: { totalSent: 0, failed: 0, latest: null },
    loading: false
  }
}
