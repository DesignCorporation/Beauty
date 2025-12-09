import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Theme Selector Component - для выбора тем салонами
// Компонент для админской панели и настроек салонов
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useTheme } from '../themes/theme-provider';
import { beautyThemes } from '../themes';
import { Palette, Sun, Moon, Monitor, Eye, Settings } from 'lucide-react';
function ThemeSelector({ showPreview = true, showModeSelector = true, showCustomization = false, compact = false, className = '' }) {
    const { theme, themeId, mode, setTheme, setMode, effectiveMode } = useTheme();
    const [_previewTheme, setPreviewTheme] = useState(null);
    // Получаем все доступные темы
    const availableThemes = Object.entries(beautyThemes).map(([themeKey, config]) => ({
        ...config,
        id: themeKey
    }));
    // Категории тем
    const themeCategories = {
        preset: availableThemes.filter(t => t.category === 'preset'),
        custom: availableThemes.filter(t => t.category === 'custom'),
        salon: availableThemes.filter(t => t.category === 'salon')
    };
    // Превью темы
    const handleThemePreview = (themeIdToPreview) => {
        if (!showPreview)
            return;
        setPreviewTheme(themeIdToPreview);
        // Через секунду убираем превью
        setTimeout(() => {
            setPreviewTheme(null);
        }, 1000);
    };
    // Применение темы
    const handleThemeSelect = (newThemeId) => {
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
        return (_jsxs("div", { className: `flex items-center gap-2 ${className}`, children: [_jsxs(Select, { value: themeId, onValueChange: handleThemeSelect, children: [_jsx(SelectTrigger, { className: "w-40", children: _jsx(SelectValue, { placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0435\u043C\u0443" }) }), _jsx(SelectContent, { children: availableThemes.map(theme => (_jsx(SelectItem, { value: theme.id, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full", style: { backgroundColor: theme.colors.light.primary[500] } }), theme.name] }) }, theme.id))) })] }), showModeSelector && (_jsxs(Select, { value: mode, onValueChange: setMode, children: [_jsx(SelectTrigger, { className: "w-32", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "light", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sun, { className: "w-4 h-4" }), "\u0421\u0432\u0435\u0442\u043B\u0430\u044F"] }) }), _jsx(SelectItem, { value: "dark", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Moon, { className: "w-4 h-4" }), "\u0422\u0435\u043C\u043D\u0430\u044F"] }) }), _jsx(SelectItem, { value: "system", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Monitor, { className: "w-4 h-4" }), "\u0410\u0432\u0442\u043E"] }) })] })] }))] }));
    }
    // Полный режим
    return (_jsxs(Card, { className: className, children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Palette, { className: "w-5 h-5" }), "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0442\u0435\u043C\u044B"] }) }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-medium", children: "\u041F\u0440\u0435\u0434\u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0442\u0435\u043C\u044B" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: themeCategories.preset.map(themeConfig => (_jsxs("div", { className: `
                  relative p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${themeId === themeConfig.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'}
                `, onClick: () => handleThemeSelect(themeConfig.id), onMouseEnter: () => handleThemePreview(themeConfig.id), children: [_jsxs("div", { className: "flex gap-1 mb-3", children: [_jsx("div", { className: "w-4 h-4 rounded-full", style: { backgroundColor: themeConfig.colors.light.primary[500] } }), _jsx("div", { className: "w-4 h-4 rounded-full", style: { backgroundColor: themeConfig.colors.light.accent[500] } }), _jsx("div", { className: "w-4 h-4 rounded-full", style: { backgroundColor: themeConfig.colors.light.semantic.success } })] }), _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h4", { className: "font-medium text-sm", children: themeConfig.name }), themeId === themeConfig.id && (_jsx(Badge, { variant: "default", className: "text-xs", children: "\u0410\u043A\u0442\u0438\u0432\u043D\u0430\u044F" }))] }), _jsx("p", { className: "text-xs text-muted-foreground", children: themeConfig.description })] }), showPreview && (_jsx(Button, { variant: "ghost", size: "sm", className: "absolute top-2 right-2 opacity-0 group-hover:opacity-100", onClick: (e) => {
                                                e.stopPropagation();
                                                handleThemePreview(themeConfig.id);
                                            }, children: _jsx(Eye, { className: "w-3 h-3" }) }))] }, themeConfig.id))) })] }), showModeSelector && (_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-medium", children: "\u0420\u0435\u0436\u0438\u043C \u0442\u0435\u043C\u044B" }), _jsx("div", { className: "flex gap-2", children: ['light', 'dark', 'system'].map(modeOption => {
                                    const Icon = modeIcons[modeOption];
                                    return (_jsxs(Button, { variant: mode === modeOption ? "default" : "outline", size: "sm", onClick: () => setMode(modeOption), className: "flex items-center gap-2", children: [_jsx(Icon, { className: "w-4 h-4" }), modeOption === 'light' && 'Светлая', modeOption === 'dark' && 'Темная', modeOption === 'system' && 'Авто'] }, modeOption));
                                }) }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0440\u0435\u0436\u0438\u043C: ", effectiveMode === 'light' ? 'Светлый' : 'Темный'] })] })), showCustomization && (_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-medium", children: "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F" }), _jsxs(Button, { variant: "outline", size: "sm", disabled: true, className: "w-full", children: [_jsx(Settings, { className: "w-4 h-4 mr-2" }), "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u0443\u044E \u0442\u0435\u043C\u0443", _jsx(Badge, { variant: "secondary", className: "ml-2", children: "\u0421\u043A\u043E\u0440\u043E" })] })] })), _jsx("div", { className: "pt-3 border-t", children: _jsxs("div", { className: "text-xs text-muted-foreground space-y-1", children: [_jsxs("div", { children: ["\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u0442\u0435\u043C\u0430: ", _jsx("span", { className: "font-medium", children: theme.name })] }), _jsxs("div", { children: ["\u0420\u0435\u0436\u0438\u043C: ", _jsx("span", { className: "font-medium", children: effectiveMode })] }), _jsxs("div", { children: ["\u0421\u0435\u043C\u0435\u0439\u0441\u0442\u0432\u043E \u0448\u0440\u0438\u0444\u0442\u043E\u0432: ", _jsx("span", { className: "font-medium", children: theme.typography.fontFamily.sans[0] })] })] }) })] })] }));
}
export { ThemeSelector };
export default ThemeSelector;
