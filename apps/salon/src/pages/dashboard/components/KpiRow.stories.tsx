import type { Meta, StoryObj } from '@storybook/react'
import { KpiRow } from './KpiRow'
import type { DashboardKpiData } from '../../../hooks/useDashboardOverview'

const sampleKpis: DashboardKpiData = {
  appointmentsToday: 12,
  revenueToday: 18450,
  cancellationsToday: 1,
  newClients7d: 7,
  revenueChangePct: 8.5,
  currency: 'EUR'
}

const meta: Meta<typeof KpiRow> = {
  title: 'Dashboard/KpiRow',
  component: KpiRow,
  args: {
    data: sampleKpis,
    loading: false
  }
}

export default meta
type Story = StoryObj<typeof KpiRow>

export const Default: Story = {}

export const Loading: Story = {
  args: {
    data: null,
    loading: true
  }
}

export const EmptyData: Story = {
  args: {
    data: {
      ...sampleKpis,
      appointmentsToday: 0,
      revenueToday: 0,
      revenueChangePct: null,
      newClients7d: 0
    }
  }
}
