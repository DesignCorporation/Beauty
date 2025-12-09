import type { Meta, StoryObj } from '@storybook/react'
import { TechStatusWidget } from './TechStatusWidget'

const meta: Meta<typeof TechStatusWidget> = {
  title: 'Dashboard/TechStatusWidget',
  component: TechStatusWidget
}

export default meta
type Story = StoryObj<typeof TechStatusWidget>

export const Default: Story = {}
