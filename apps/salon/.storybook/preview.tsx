import type { Preview } from '@storybook/react'
import { ThemeProvider } from '@beauty-platform/ui'
import '@beauty-platform/ui/styles/globals.css'
import '@beauty-platform/ui/styles/theme-styles.css'
import '../src/styles/accessibility.css'
import '../src/i18n'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen'
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    )
  ]
}

export default preview
