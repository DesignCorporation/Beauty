import type { Meta, StoryObj } from '@storybook/react'
import { FinanceWidget } from './FinanceWidget'
import type { DashboardFinanceData } from '../../../hooks/useDashboardOverview'

const sampleFinance: DashboardFinanceData = {
  totalRevenue30d: 48200,
  averageCheck: 185,
  categories: [
    { name: 'Стрижки', revenue: 18000, percentage: 60 },
    { name: 'Маникюр', revenue: 9000, percentage: 30 },
    { name: 'Косметология', revenue: 2400, percentage: 8 },
    { name: 'Прочее', revenue: 800, percentage: 2 }
  ]
}

const meta: Meta<typeof FinanceWidget> = {
  title: 'Dashboard/FinanceWidget',
  component: FinanceWidget,
  args: {
    data: sampleFinance,
    currency: 'EUR',
    loading: false
  }
}

export default meta
type Story = StoryObj<typeof FinanceWidget>

export const Default: Story = {}

export const Loading: Story = {
  args: {
    data: { ...sampleFinance, categories: [] },
    loading: true
  }
}

export const EmptyState: Story = {
  args: {
    data: { ...sampleFinance, categories: [], totalRevenue30d: 0, averageCheck: 0 },
    loading: false
  }
}
