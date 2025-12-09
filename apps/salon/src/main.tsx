import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from '@beauty-platform/ui'
import '@beauty-platform/ui/styles/globals.css'
import '@beauty-platform/ui/styles/theme-styles.css'
import './i18n' // Подключаем i18n конфигурацию
import './styles/accessibility.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Временно отключаем StrictMode для отладки перезагрузок
  // <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  // </React.StrictMode>,
)
