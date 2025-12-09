import { jsx as _jsx } from "react/jsx-runtime";
// Enterprise Theme Provider для Beauty Platform
// React Context и хуки для управления темами
import { createContext, useContext, useEffect, useState } from 'react';
import { getTheme } from './index';
const hexToHsl = (hex) => {
    let cleanHex = hex.replace('#', '').trim();
    if (cleanHex.length === 3) {
        cleanHex = cleanHex
            .split('')
            .map((char) => char + char)
            .join('');
    }
    const bigint = parseInt(cleanHex, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
};
const formatHsl = (hex) => {
    const { h, s, l } = hexToHsl(hex);
    return `${h} ${s}% ${l}%`;
};
const hexToRgb = (hex) => {
    let cleanHex = hex.replace('#', '').trim();
    if (cleanHex.length === 3) {
        cleanHex = cleanHex
            .split('')
            .map((char) => char + char)
            .join('');
    }
    const bigint = parseInt(cleanHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r} ${g} ${b}`;
};
const getContrastingForeground = (hex) => {
    const { l } = hexToHsl(hex);
    return l > 60 ? '222 47% 11%' : '0 0% 100%';
};
const ThemeContext = createContext(undefined);
// Ключи для localStorage
const THEME_STORAGE_KEY = 'beauty-platform-theme';
const MODE_STORAGE_KEY = 'beauty-platform-theme-mode';
const CUSTOM_THEME_STORAGE_KEY = 'beauty-platform-custom-theme';
// Определение system theme
const getSystemTheme = () => {
    if (typeof window === 'undefined')
        return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
export function ThemeProvider({ children, defaultThemeId = 'elegant', defaultMode = 'system' }) {
    // Состояние темы
    const [themeId, setThemeIdState] = useState(defaultThemeId);
    const [mode, setModeState] = useState(defaultMode);
    const [customTheme, setCustomThemeState] = useState();
    const [systemMode, setSystemMode] = useState('light');
    // Загрузка из localStorage при инициализации
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        // Загружаем сохраненную тему
        const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedThemeId && getTheme(savedThemeId)) {
            setThemeIdState(savedThemeId);
        }
        // Загружаем сохраненный режим
        const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
            setModeState(savedMode);
        }
        // Загружаем кастомную тему
        const savedCustomTheme = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
        if (savedCustomTheme) {
            try {
                const parsed = JSON.parse(savedCustomTheme);
                setCustomThemeState(parsed);
            }
            catch (error) {
                console.warn('Failed to parse custom theme from localStorage:', error);
            }
        }
        // Устанавливаем начальный system mode
        setSystemMode(getSystemTheme());
    }, []);
    // Слушаем изменения system theme
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            setSystemMode(e.matches ? 'dark' : 'light');
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);
    // Вычисляем эффективный режим
    const effectiveMode = mode === 'system' ? systemMode : mode;
    // Получаем текущую тему
    const baseTheme = getTheme(themeId);
    const theme = customTheme ? { ...baseTheme, ...customTheme } : baseTheme;
    // Функция смены темы
    const setTheme = (newThemeId) => {
        setThemeIdState(newThemeId);
        localStorage.setItem(THEME_STORAGE_KEY, newThemeId);
        // Генерируем событие для других компонентов
        window.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { themeId: newThemeId, theme: getTheme(newThemeId) }
        }));
    };
    // Функция смены режима
    const setMode = (newMode) => {
        setModeState(newMode);
        localStorage.setItem(MODE_STORAGE_KEY, newMode);
        // Генерируем событие
        window.dispatchEvent(new CustomEvent('theme-mode-changed', {
            detail: { mode: newMode }
        }));
    };
    // Функция установки кастомной темы
    const setCustomTheme = (newCustomTheme) => {
        setCustomThemeState(newCustomTheme);
        if (newCustomTheme) {
            localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(newCustomTheme));
        }
        else {
            localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY);
        }
        // Генерируем событие
        window.dispatchEvent(new CustomEvent('custom-theme-changed', {
            detail: { customTheme: newCustomTheme }
        }));
    };
    // Сброс к дефолтной теме
    const resetToDefault = () => {
        setTheme('elegant');
        setMode('system');
        setCustomTheme(undefined);
    };
    // Применяем CSS переменные к document
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const root = document.documentElement;
        const colors = theme.colors[effectiveMode];
        // Основные цвета (RGB компоненты для Tailwind)
        root.style.setProperty('--primary-50', hexToRgb(colors.primary[50]));
        root.style.setProperty('--primary-100', hexToRgb(colors.primary[100]));
        root.style.setProperty('--primary-200', hexToRgb(colors.primary[200]));
        root.style.setProperty('--primary-300', hexToRgb(colors.primary[300]));
        root.style.setProperty('--primary-400', hexToRgb(colors.primary[400]));
        root.style.setProperty('--primary-500', hexToRgb(colors.primary[500]));
        root.style.setProperty('--primary-600', hexToRgb(colors.primary[600]));
        root.style.setProperty('--primary-700', hexToRgb(colors.primary[700]));
        root.style.setProperty('--primary-800', hexToRgb(colors.primary[800]));
        root.style.setProperty('--primary-900', hexToRgb(colors.primary[900]));
        root.style.setProperty('--primary-950', hexToRgb(colors.primary[950]));
        // Акцентные цвета
        root.style.setProperty('--accent-50', colors.accent[50]);
        root.style.setProperty('--accent-100', colors.accent[100]);
        root.style.setProperty('--accent-500', colors.accent[500]);
        root.style.setProperty('--accent-600', colors.accent[600]);
        root.style.setProperty('--accent-700', colors.accent[700]);
        // Нейтральные цвета
        root.style.setProperty('--neutral-50', colors.neutral[50]);
        root.style.setProperty('--neutral-100', colors.neutral[100]);
        root.style.setProperty('--neutral-200', colors.neutral[200]);
        root.style.setProperty('--neutral-300', colors.neutral[300]);
        root.style.setProperty('--neutral-400', colors.neutral[400]);
        root.style.setProperty('--neutral-500', colors.neutral[500]);
        root.style.setProperty('--neutral-600', colors.neutral[600]);
        root.style.setProperty('--neutral-700', colors.neutral[700]);
        root.style.setProperty('--neutral-800', colors.neutral[800]);
        root.style.setProperty('--neutral-900', colors.neutral[900]);
        root.style.setProperty('--neutral-950', colors.neutral[950]);
        // Семантические цвета
        root.style.setProperty('--success', formatHsl(colors.semantic.success));
        root.style.setProperty('--warning', formatHsl(colors.semantic.warning));
        root.style.setProperty('--error', formatHsl(colors.semantic.error));
        root.style.setProperty('--info', formatHsl(colors.semantic.info));
        root.style.setProperty('--success-foreground', getContrastingForeground(colors.semantic.success));
        root.style.setProperty('--warning-foreground', getContrastingForeground(colors.semantic.warning));
        root.style.setProperty('--info-foreground', getContrastingForeground(colors.semantic.info));
        root.style.setProperty('--destructive', formatHsl(colors.semantic.error));
        root.style.setProperty('--destructive-foreground', getContrastingForeground(colors.semantic.error));
        // Базовые поверхности
        root.style.setProperty('--background', formatHsl(colors.neutral[50]));
        root.style.setProperty('--foreground', formatHsl(colors.neutral[900]));
        root.style.setProperty('--card', formatHsl(colors.neutral[50]));
        root.style.setProperty('--card-foreground', formatHsl(colors.neutral[900]));
        root.style.setProperty('--popover', formatHsl(colors.neutral[50]));
        root.style.setProperty('--popover-foreground', formatHsl(colors.neutral[900]));
        root.style.setProperty('--secondary', formatHsl(colors.neutral[100]));
        root.style.setProperty('--secondary-foreground', formatHsl(colors.neutral[800]));
        root.style.setProperty('--muted', formatHsl(colors.neutral[100]));
        root.style.setProperty('--muted-foreground', formatHsl(colors.neutral[600]));
        const accentBase = colors.accent[100] ?? colors.accent[50];
        root.style.setProperty('--accent', formatHsl(accentBase));
        root.style.setProperty('--accent-foreground', getContrastingForeground(accentBase));
        root.style.setProperty('--input', formatHsl(colors.neutral[200]));
        root.style.setProperty('--ring', formatHsl(colors.primary[500]));
        // Sidebar поверхности
        root.style.setProperty('--sidebar-background', formatHsl(colors.neutral[100]));
        root.style.setProperty('--sidebar-foreground', formatHsl(colors.neutral[800]));
        root.style.setProperty('--sidebar-primary', formatHsl(colors.primary[600]));
        root.style.setProperty('--sidebar-primary-foreground', getContrastingForeground(colors.primary[600]));
        root.style.setProperty('--sidebar-accent', formatHsl(colors.neutral[200]));
        root.style.setProperty('--sidebar-accent-foreground', formatHsl(colors.neutral[700]));
        root.style.setProperty('--sidebar-border', formatHsl(colors.neutral[200]));
        root.style.setProperty('--sidebar-ring', formatHsl(colors.primary[500]));
        // Радиус границ
        root.style.setProperty('--radius-none', theme.spacing.borderRadius.none);
        root.style.setProperty('--radius-sm', theme.spacing.borderRadius.sm);
        root.style.setProperty('--radius-md', theme.spacing.borderRadius.md);
        root.style.setProperty('--radius-lg', theme.spacing.borderRadius.lg);
        root.style.setProperty('--radius-xl', theme.spacing.borderRadius.xl);
        root.style.setProperty('--radius-full', theme.spacing.borderRadius.full);
        // Анимации
        root.style.setProperty('--duration-fast', theme.animations.duration.fast);
        root.style.setProperty('--duration-normal', theme.animations.duration.normal);
        root.style.setProperty('--duration-slow', theme.animations.duration.slow);
        // Базовые переменные (hsl)
        root.style.setProperty('--primary', formatHsl(colors.primary[500]));
        root.style.setProperty('--primary-foreground', getContrastingForeground(colors.primary[500]));
        root.style.setProperty('--border', formatHsl(colors.neutral[200]));
        // Устанавливаем класс для темного режима
        if (effectiveMode === 'dark') {
            root.classList.add('dark');
        }
        else {
            root.classList.remove('dark');
        }
    }, [theme, effectiveMode]);
    const contextValue = {
        theme,
        themeId,
        mode,
        effectiveMode,
        setTheme,
        setMode,
        customTheme,
        setCustomTheme,
        isCustomTheme: !!customTheme,
        resetToDefault
    };
    return (_jsx(ThemeContext.Provider, { value: contextValue, children: children }));
}
// Хук для использования темы
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
// Хук для получения CSS переменной
export function useCSSVariable(variableName) {
    const [value, setValue] = useState('');
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const updateValue = () => {
            const computedValue = getComputedStyle(document.documentElement)
                .getPropertyValue(`--${variableName}`)
                .trim();
            setValue(computedValue);
        };
        updateValue();
        // Слушаем изменения темы
        const handleThemeChange = () => updateValue();
        window.addEventListener('theme-changed', handleThemeChange);
        window.addEventListener('theme-mode-changed', handleThemeChange);
        window.addEventListener('custom-theme-changed', handleThemeChange);
        return () => {
            window.removeEventListener('theme-changed', handleThemeChange);
            window.removeEventListener('theme-mode-changed', handleThemeChange);
            window.removeEventListener('custom-theme-changed', handleThemeChange);
        };
    }, [variableName]);
    return value;
}
// Хук для работы с цветами темы
export function useThemeColors() {
    const { theme, effectiveMode } = useTheme();
    return theme.colors[effectiveMode];
}
// Хелперы для создания кастомных тем
export const createSalonTheme = (_baseThemeId, overrides) => {
    return {
        ...overrides,
        id: overrides.id || `salon-${Date.now()}`,
        category: 'salon',
        metadata: {
            ...overrides.metadata,
            createdAt: new Date().toISOString(),
            version: '1.0.0'
        }
    };
};
export default ThemeProvider;
