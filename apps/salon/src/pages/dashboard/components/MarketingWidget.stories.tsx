import type { Meta, StoryObj } from '@storybook/react'
import { MarketingWidget } from './MarketingWidget'
import type { DashboardMarketingData } from '../../../hooks/useDashboardOverview'

const sampleMarketing: DashboardMarketingData = {
  lastCampaign: {
    title: 'Black Friday рассылка',
    sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  upcomingCampaigns: [{ id: 1 }, { id: 2 }]
}

const meta: Meta<typeof MarketingWidget> = {
  title: 'Dashboard/MarketingWidget',
  component: MarketingWidget,
  args: {
    data: sampleMarketing,
    loading: false
  }
}

export default meta
type Story = StoryObj<typeof MarketingWidget>

export const Default: Story = {}

export const Loading: Story = {
  args: {
    data: { ...sampleMarketing, lastCampaign: null, upcomingCampaigns: [] },
    loading: true
  }
}

export const EmptyState: Story = {
  args: {
    data: { lastCampaign: null, upcomingCampaigns: [] },
    loading: false
  }
}
