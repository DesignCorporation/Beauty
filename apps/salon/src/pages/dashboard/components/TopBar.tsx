import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

export function TopBar(): JSX.Element {
  const { t } = useTranslation()
  const today = new Date()
  const formatter = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-muted ring-1 ring-border" />
        <div>
          <h1 className="text-3xl font-medium text-foreground">
            {t('dashboard.topBar.salonName', 'Название салона')}
          </h1>
          <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            <span>{formatter.format(today)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <LanguageSwitcher variant="compact" />
      </div>
    </div>
  )
}
