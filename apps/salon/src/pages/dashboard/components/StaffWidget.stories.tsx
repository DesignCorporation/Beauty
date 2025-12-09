import type { Meta, StoryObj } from '@storybook/react'
import { StaffWidget } from './StaffWidget'
import type { DashboardStaffData } from '../../../hooks/useDashboardOverview'

const sampleStaff: DashboardStaffData = {
  workload: [
    { staffId: '1', name: 'Ольга', utilization: 86, appointments: 7 },
    { staffId: '2', name: 'Pavel', utilization: 65, appointments: 5 },
    { staffId: '3', name: 'Anna', utilization: 42, appointments: 3 }
  ],
  topPerformer: {
    name: 'Ольга',
    revenue: 12400,
    clients: 38
  }
}

const meta: Meta<typeof StaffWidget> = {
  title: 'Dashboard/StaffWidget',
  component: StaffWidget,
  args: {
    data: sampleStaff,
    loading: false
  }
}

export default meta
type Story = StoryObj<typeof StaffWidget>

export const Default: Story = {}

export const Loading: Story = {
  args: {
    data: { ...sampleStaff, workload: [], topPerformer: null },
    loading: true
  }
}

export const EmptyState: Story = {
  args: {
    data: { ...sampleStaff, workload: [], topPerformer: null },
    loading: false
  }
}
