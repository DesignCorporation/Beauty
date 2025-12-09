// Theme Selector Component - для выбора тем салонами
// Компонент для админской панели и настроек салонов

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from './ui/card';
import { Badge } from './ui/badge';
import { useTheme } from '../themes/theme-provider';
import { beautyThemes, ThemeId } from '../themes';
import { Palette, Sun, Moon, Monitor, Eye, Settings } from 'lucide-react';

interface ThemeSelectorProps {
  showPreview?: boolean;
  showModeSelector?: boolean;
  showCustomization?: boolean;
  compact?: boolean;
  className?: string;
}

function ThemeSelector({
  showPreview = true,
  showModeSelector = true,
  showCustomization = false,
  compact = false,
  className = ''
}: ThemeSelectorProps) {
  const { theme, themeId, mode, setTheme, setMode, effectiveMode } = useTheme();
  const [_previewTheme, setPreviewTheme] = useState<ThemeId | null>(null);

  // Получаем все доступные темы
  const availableThemes = Object.entries(beautyThemes).map(([themeKey, config]) => ({
    ...config,
    id: themeKey as ThemeId
  }));

  // Категории тем
  const themeCategories = {
    preset: availableThemes.filter(t => t.category === 'preset'),
    custom: availableThemes.filter(t => t.category === 'custom'),
    salon: availableThemes.filter(t => t.category === 'salon')
  };

  // Превью темы
  const handleThemePreview = (themeIdToPreview: ThemeId) => {
    if (!showPreview) return;
    setPreviewTheme(themeIdToPreview);
    
    // Через секунду убираем превью
    setTimeout(() => {
      setPreviewTheme(null);
    }, 1000);
  };

  // Применение темы
  const handleThemeSelect = (newThemeId: ThemeId) => {
    setTheme(newThemeId);
    setPreviewTheme(null);
  };

  // Иконки для режимов
  const modeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor
  };

  // Компактный режим
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Select value={themeId} onValueChange={handleThemeSelect}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Выберите тему" />
          </SelectTrigger>
          <SelectContent>
            {availableThemes.map(theme => (
              <SelectItem key={theme.id} value={theme.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: theme.colors.light.primary[500] }}
                  />
                  {theme.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showModeSelector && (
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Светлая
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Темная
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Авто
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }

  // Полный режим
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Настройки темы
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Выбор темы по категориям */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Предустановленные темы</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {themeCategories.preset.map(themeConfig => (
              <div
                key={themeConfig.id}
                className={`
                  relative p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${themeId === themeConfig.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
                onClick={() => handleThemeSelect(themeConfig.id)}
                onMouseEnter={() => handleThemePreview(themeConfig.id)}
              >
                {/* Цветовая палитра */}
                <div className="flex gap-1 mb-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: themeConfig.colors.light.primary[500] }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: themeConfig.colors.light.accent[500] }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: themeConfig.colors.light.semantic.success }}
                  />
                </div>

                {/* Название и описание */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{themeConfig.name}</h4>
                    {themeId === themeConfig.id && (
                      <Badge variant="default" className="text-xs">Активная</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {themeConfig.description}
                  </p>
                </div>

                {/* Кнопка превью */}
                {showPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThemePreview(themeConfig.id);
                    }}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Режим темы */}
        {showModeSelector && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Режим темы</h3>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map(modeOption => {
                const Icon = modeIcons[modeOption];
                return (
                  <Button
                    key={modeOption}
                    variant={mode === modeOption ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode(modeOption)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {modeOption === 'light' && 'Светлая'}
                    {modeOption === 'dark' && 'Темная'}
                    {modeOption === 'system' && 'Авто'}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Текущий режим: {effectiveMode === 'light' ? 'Светлый' : 'Темный'}
            </p>
          </div>
        )}

        {/* Кастомизация (для будущих версий) */}
        {showCustomization && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Персонализация</h3>
            <Button variant="outline" size="sm" disabled className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              Создать собственную тему
              <Badge variant="secondary" className="ml-2">Скоро</Badge>
            </Button>
          </div>
        )}

        {/* Информация о текущей теме */}
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Текущая тема: <span className="font-medium">{theme.name}</span></div>
            <div>Режим: <span className="font-medium">{effectiveMode}</span></div>
            <div>Семейство шрифтов: <span className="font-medium">{theme.typography.fontFamily.sans[0]}</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { ThemeSelector };
export default ThemeSelector;