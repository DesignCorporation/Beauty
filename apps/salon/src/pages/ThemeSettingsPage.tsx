import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PageContainer,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Label,
  SidebarTrigger,
} from '@beauty-platform/ui'
import { useTheme, beautyThemes } from '@beauty-platform/ui'
import type { ThemeId, ThemeMode, ThemeConfig } from '@beauty-platform/ui'
import { Check, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '../contexts/AuthContext'
import { PageHeader } from '../components/layout/PageHeader'

export default function ThemeSettingsPage(): JSX.Element {
  const { t } = useTranslation()
  const { tenantId } = useTenant()
  const { themeId, setTheme, mode, setMode } = useTheme()
  const themeOptions = useMemo<ThemeConfig[]>(() => Object.values(beautyThemes), [])
  const modeOptions = useMemo(
    () => [
      { value: 'light' as ThemeMode, label: t('userSettings.modeLight', 'Светлая') },
      { value: 'dark' as ThemeMode, label: t('userSettings.modeDark', 'Тёмная') },
      { value: 'system' as ThemeMode, label: t('userSettings.modeSystem', 'Как в системе') },
    ],
    [t]
  )
  const themeStorageKey = tenantId ? `salon-theme-${tenantId}` : null

  useEffect(() => {
    if (!themeStorageKey) return
    try {
      const stored = localStorage.getItem(themeStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.themeId) {
          setTheme(parsed.themeId as ThemeId)
        }
        if (parsed?.mode) {
          setMode(parsed.mode as ThemeMode)
        }
      }
    } catch (e) {
      console.warn('Failed to restore salon theme', e)
    }
  }, [themeStorageKey, setTheme, setMode])

  const persistTheme = (nextTheme?: ThemeId, nextMode?: ThemeMode) => {
    if (!themeStorageKey) return
    try {
      const payload = {
        themeId: nextTheme ?? themeId,
        mode: nextMode ?? mode
      }
      localStorage.setItem(themeStorageKey, JSON.stringify(payload))
    } catch (e) {
      console.warn('Failed to persist salon theme', e)
    }
  }

  const handleThemeSelect = (id: ThemeId) => {
    if (themeId === id) return
    setTheme(id)
    persistTheme(id, mode)
    const selectedTheme = themeOptions.find((theme) => theme.id === id)
    toast.success(`${t('salonSettings.themeChanged', 'Тема обновлена')}: ${selectedTheme?.name ?? id}`)
  }

  const handleModeSelect = (nextMode: ThemeMode) => {
    setMode(nextMode)
    persistTheme(themeId, nextMode)
  }

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-8">
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-medium text-foreground">
                  {t('salonSettings.theme.title', 'Оформление салона')}
                </span>
              </div>
            </div>
          }
        />
        <p className="text-sm text-muted-foreground">
          {t('salonSettings.theme.subtitle', 'Выберите цветовую схему и режим для этого салона')}
        </p>

        <Card className="border-0 border-t border-border bg-card shadow-none rounded-none">
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Palette className="h-5 w-5 text-muted-foreground" />
              {t('salonSettings.theme.title', 'Оформление салона')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t('salonSettings.theme.subtitle', 'Выберите цветовую схему и режим для этого салона')}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {themeOptions.map((theme) => {
                const isActive = themeId === theme.id
                const light = theme.colors.light
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => void handleThemeSelect(theme.id as ThemeId)}
                    className={`group text-left w-full border-0 border-t border-border/60 bg-transparent px-0 py-4 transition ${
                      isActive ? 'text-primary bg-primary/5' : 'hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-base font-medium text-foreground">{theme.name}</p>
                        <p className="text-sm text-muted-foreground">{theme.description}</p>
                      </div>
                      {isActive && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-1">
                        <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: light.primary[500] }} />
                        <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: light.primary[300] }} />
                        <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: light.primary[700] }} />
                      </div>
                      <div className="flex gap-1">
                        <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: light.accent[500] }} />
                        <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: light.neutral[200] }} />
                        <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: light.neutral[700] }} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="space-y-2 border-0 border-t border-border/70 pt-4">
              <Label className="text-sm font-medium text-foreground">
                {t('userSettings.displayMode', 'Режим отображения')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {modeOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={mode === option.value ? 'default' : 'outline'}
                    onClick={() => void handleModeSelect(option.value)}
                    className={mode === option.value ? '' : 'bg-card shadow-none border-border hover:bg-muted'}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
