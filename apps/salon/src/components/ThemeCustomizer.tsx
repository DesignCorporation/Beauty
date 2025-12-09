import { useState, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@beauty-platform/ui'
import { useTheme } from '@beauty-platform/ui'
import { Download, Upload, RotateCcw, Palette, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ColorPickerInputProps {
  label: string
  color: string
  onChange: (color: string) => void
  description?: string
}

function ColorPickerInput({ label, color, onChange, description }: ColorPickerInputProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">{label}</label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 rounded-lg border-2 border-border transition-all hover:scale-105"
          style={{ backgroundColor: color }}
          aria-label={t('themeCustomizer.pickColor', { label })}
        />
      </div>

      {isOpen && (
        <div className="relative">
          <div className="absolute right-0 z-50 p-4 bg-background border rounded-lg shadow-lg">
            <HexColorPicker color={color} onChange={onChange} />
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="px-2 py-1 text-sm border rounded"
                placeholder="#000000"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                {t('themeCustomizer.done')}
              </Button>
            </div>
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}

export function ThemeCustomizer() {
  const { t } = useTranslation()
  const { customTheme, setCustomTheme, theme, effectiveMode, isCustomTheme } = useTheme()

  // Получаем текущие семантические цвета (либо из custom темы, либо из базовой)
  const currentColors = customTheme?.colors?.[effectiveMode]?.semantic
    || theme.colors[effectiveMode].semantic

  const [localColors, setLocalColors] = useState({
    success: currentColors.success,
    warning: currentColors.warning,
    error: currentColors.error,
    info: currentColors.info,
  })

  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [savedColors, setSavedColors] = useState(localColors)

  // 🎨 Live Preview: применяем изменения сразу при изменении цветов
  useEffect(() => {
    if (!isPreviewMode) return

    const baseColors = customTheme?.colors ?? theme.colors
    const updatedColors = {
      light: {
        ...baseColors.light,
        semantic: effectiveMode === 'light' ? localColors : baseColors.light.semantic
      },
      dark: {
        ...baseColors.dark,
        semantic: effectiveMode === 'dark' ? localColors : baseColors.dark.semantic
      }
    }

    setCustomTheme({
      ...customTheme,
      colors: updatedColors
    })
  }, [localColors, isPreviewMode, effectiveMode])

  // Включить preview режим
  const handleEnablePreview = () => {
    setSavedColors(localColors)
    setIsPreviewMode(true)
  }

  // Отменить preview и вернуться к сохраненным цветам
  const handleCancelPreview = () => {
    setLocalColors(savedColors)
    setIsPreviewMode(false)

    // Восстанавливаем предыдущую тему
    const baseColors = customTheme?.colors ?? theme.colors
    const restoredColors = {
      light: {
        ...baseColors.light,
        semantic: effectiveMode === 'light' ? savedColors : baseColors.light.semantic
      },
      dark: {
        ...baseColors.dark,
        semantic: effectiveMode === 'dark' ? savedColors : baseColors.dark.semantic
      }
    }

    setCustomTheme({
      ...customTheme,
      colors: restoredColors
    })
  }

  // Применить изменения
  const handleApply = () => {
    setIsPreviewMode(false)
    setSavedColors(localColors)
    const baseColors = customTheme?.colors ?? theme.colors

    const updatedColors = {
      light: {
        ...baseColors.light,
        semantic: effectiveMode === 'light' ? localColors : baseColors.light.semantic
      },
      dark: {
        ...baseColors.dark,
        semantic: effectiveMode === 'dark' ? localColors : baseColors.dark.semantic
      }
    }

    setCustomTheme({
      ...customTheme,
      colors: updatedColors
    })
  }

  // Сбросить к дефолту
  const handleReset = () => {
    setCustomTheme(undefined)
    setLocalColors({
      success: theme.colors[effectiveMode].semantic.success,
      warning: theme.colors[effectiveMode].semantic.warning,
      error: theme.colors[effectiveMode].semantic.error,
      info: theme.colors[effectiveMode].semantic.info,
    })
  }

  // Экспорт темы в JSON
  const handleExport = () => {
    if (!customTheme) return

    const themeData = JSON.stringify(customTheme, null, 2)
    const blob = new Blob([themeData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `custom-theme-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Импорт темы из JSON
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const imported = JSON.parse(text)
        setCustomTheme(imported)

        // Обновляем локальное состояние
        if (imported.colors?.[effectiveMode]?.semantic) {
          setLocalColors(imported.colors[effectiveMode].semantic)
        }
      } catch (error) {
        console.error('Failed to import theme:', error)
        alert(t('themeCustomizer.importError'))
      }
    }
    input.click()
  }

  const previewItems = [
    { key: 'success', color: localColors.success },
    { key: 'warning', color: localColors.warning },
    { key: 'error', color: localColors.error },
    { key: 'info', color: localColors.info },
  ] as const

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              {t('themeCustomizer.title')}
            </CardTitle>
            <CardDescription>{t('themeCustomizer.description')}</CardDescription>
          </div>
          <div className="flex gap-2">
            {isPreviewMode && (
              <div className="px-2 py-1 text-xs rounded-full bg-warning/10 text-warning flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {t('themeCustomizer.previewActive', 'Режим предпросмотра')}
              </div>
            )}
            {isCustomTheme && (
              <div className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                {t('themeCustomizer.customActive')}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Color Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorPickerInput
            label={t('themeCustomizer.successColor')}
            description={t('themeCustomizer.successDesc')}
            color={localColors.success}
            onChange={(color) => setLocalColors({ ...localColors, success: color })}
          />

          <ColorPickerInput
            label={t('themeCustomizer.warningColor')}
            description={t('themeCustomizer.warningDesc')}
            color={localColors.warning}
            onChange={(color) => setLocalColors({ ...localColors, warning: color })}
          />

          <ColorPickerInput
            label={t('themeCustomizer.errorColor')}
            description={t('themeCustomizer.errorDesc')}
            color={localColors.error}
            onChange={(color) => setLocalColors({ ...localColors, error: color })}
          />

          <ColorPickerInput
            label={t('themeCustomizer.infoColor')}
            description={t('themeCustomizer.infoDesc')}
            color={localColors.info}
            onChange={(color) => setLocalColors({ ...localColors, info: color })}
          />
        </div>

        {/* Preview Section */}
        <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
          <div className="text-sm font-medium">{t('themeCustomizer.preview')}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {previewItems.map((item) => (
              <div key={item.key} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-lg shadow-sm" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground">
                  {t(`themeCustomizer.previewLabels.${item.key}`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {!isPreviewMode ? (
            <>
              <Button
                onClick={handleEnablePreview}
                variant="outline"
                className="flex-1 min-w-[120px]"
              >
                <Eye className="w-4 h-4 mr-2" />
                {t('themeCustomizer.enablePreview', 'Режим предпросмотра')}
              </Button>

              <Button
                onClick={handleApply}
                className="flex-1 min-w-[120px]"
              >
                {t('themeCustomizer.apply')}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleApply}
                className="flex-1 min-w-[120px]"
              >
                {t('themeCustomizer.apply')}
              </Button>

              <Button
                onClick={handleCancelPreview}
                variant="outline"
                className="flex-1 min-w-[120px]"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                {t('themeCustomizer.cancelPreview', 'Отменить просмотр')}
              </Button>
            </>
          )}

          <Button
            onClick={handleReset}
            variant="outline"
            disabled={!isCustomTheme}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('themeCustomizer.reset')}
          </Button>

          <Button
            onClick={handleExport}
            variant="outline"
            disabled={!isCustomTheme}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('themeCustomizer.export')}
          </Button>

          <Button
            onClick={handleImport}
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('themeCustomizer.import')}
          </Button>
        </div>

        {/* Info Note */}
        <div className="p-3 text-sm bg-info/10 text-info rounded-lg border border-info/20">
          {t('themeCustomizer.note')}
        </div>
      </CardContent>
    </Card>
  )
}
