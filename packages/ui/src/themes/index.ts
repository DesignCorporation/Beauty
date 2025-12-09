// Enterprise Theme System для Beauty Platform
// Система тем с полной кастомизацией для салонов красоты

export interface ThemeColors {
  // Основные цвета бренда
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string; // основной
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  
  // Акцентные цвета
  accent: {
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };
  
  // Нейтральные цвета
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  
  // Семантические цвета
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  category: 'preset' | 'custom' | 'salon';
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  typography: {
    fontFamily: {
      sans: string[];
      serif: string[];
      mono: string[];
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
  };
  spacing: {
    borderRadius: {
      none: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      full: string;
    };
  };
  animations: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
  metadata?: {
    salonId?: string;
    createdAt?: string;
    updatedAt?: string;
    version?: string;
  };
}

// Предустановленные темы для салонов красоты
export const beautyThemes: Record<string, ThemeConfig> = {
  // Элегантная фиолетовая тема (текущая)
  elegant: {
    id: 'elegant',
    name: 'Elegant Purple',
    description: 'Современная элегантная тема с фиолетовыми акцентами',
    category: 'preset',
    colors: {
      light: {
        primary: {
          50: '#f0f1ff',
          100: '#e4e6ff',
          200: '#cdd2fe',
          300: '#a6b0fc',
          400: '#7984f8',
          500: '#6366f1',
          600: '#524ce6',
          700: '#453dcb',
          800: '#3932a4',
          900: '#332e82',
          950: '#1f1c4f'
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed'
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        semantic: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6'
        }
      },
      dark: {
        primary: {
          50: '#1f1c4f',
          100: '#332e82',
          200: '#3932a4',
          300: '#453dcb',
          400: '#524ce6',
          500: '#6366f1',
          600: '#7984f8',
          700: '#a6b0fc',
          800: '#cdd2fe',
          900: '#e4e6ff',
          950: '#f0f1ff'
        },
        accent: {
          50: '#7c3aed',
          100: '#9333ea',
          500: '#a855f7',
          600: '#fae8ff',
          700: '#fdf4ff'
        },
        neutral: {
          50: '#020617',
          100: '#0f172a',
          200: '#1e293b',
          300: '#334155',
          400: '#475569',
          500: '#64748b',
          600: '#94a3b8',
          700: '#cbd5e1',
          800: '#e2e8f0',
          900: '#f1f5f9',
          950: '#f8fafc'
        },
        semantic: {
          success: '#22c55e',
          warning: '#eab308',
          error: '#f87171',
          info: '#60a5fa'
        }
      }
    },
    typography: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem'
      }
    },
    spacing: {
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      }
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms'
      },
      easing: {
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    }
  },

  // Роскошная золотая тема
  luxury: {
    id: 'luxury',
    name: 'Luxury Gold',
    description: 'Роскошная тема с золотыми акцентами для премиум салонов',
    category: 'preset',
    colors: {
      light: {
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03'
        },
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207'
        },
        neutral: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09'
        },
        semantic: {
          success: '#16a34a',
          warning: '#ea580c',
          error: '#dc2626',
          info: '#0284c7'
        }
      },
      dark: {
        primary: {
          50: '#451a03',
          100: '#78350f',
          200: '#92400e',
          300: '#b45309',
          400: '#d97706',
          500: '#f59e0b',
          600: '#fbbf24',
          700: '#fcd34d',
          800: '#fde68a',
          900: '#fef3c7',
          950: '#fffbeb'
        },
        accent: {
          50: '#a16207',
          100: '#ca8a04',
          500: '#eab308',
          600: '#fef9c3',
          700: '#fefce8'
        },
        neutral: {
          50: '#0c0a09',
          100: '#1c1917',
          200: '#292524',
          300: '#44403c',
          400: '#57534e',
          500: '#78716c',
          600: '#a8a29e',
          700: '#d6d3d1',
          800: '#e7e5e4',
          900: '#f5f5f4',
          950: '#fafaf9'
        },
        semantic: {
          success: '#22c55e',
          warning: '#f97316',
          error: '#ef4444',
          info: '#0ea5e9'
        }
      }
    },
    typography: {
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'serif'],
        mono: ['Source Code Pro', 'monospace']
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem'
      }
    },
    spacing: {
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px'
      }
    },
    animations: {
      duration: {
        fast: '200ms',
        normal: '350ms',
        slow: '600ms'
      },
      easing: {
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    }
  },

  // Свежая зеленая тема
  nature: {
    id: 'nature',
    name: 'Fresh Nature',
    description: 'Свежая зеленая тема для eco-friendly салонов',
    category: 'preset',
    colors: {
      light: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16'
        },
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e'
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        semantic: {
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626',
          info: '#0284c7'
        }
      },
      dark: {
        primary: {
          50: '#052e16',
          100: '#14532d',
          200: '#166534',
          300: '#15803d',
          400: '#16a34a',
          500: '#22c55e',
          600: '#4ade80',
          700: '#86efac',
          800: '#bbf7d0',
          900: '#dcfce7',
          950: '#f0fdf4'
        },
        accent: {
          50: '#0f766e',
          100: '#0d9488',
          500: '#14b8a6',
          600: '#ccfbf1',
          700: '#f0fdfa'
        },
        neutral: {
          50: '#020617',
          100: '#0f172a',
          200: '#1e293b',
          300: '#334155',
          400: '#475569',
          500: '#64748b',
          600: '#94a3b8',
          700: '#cbd5e1',
          800: '#e2e8f0',
          900: '#f1f5f9',
          950: '#f8fafc'
        },
        semantic: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6'
        }
      }
    },
    typography: {
      fontFamily: {
        sans: ['Nunito Sans', 'system-ui', 'sans-serif'],
        serif: ['Crimson Text', 'serif'],
        mono: ['Fira Code', 'monospace']
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem'
      }
    },
    spacing: {
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      }
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms'
      },
      easing: {
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    }
  },

  // Современная розовая тема
  modern: {
    id: 'modern',
    name: 'Modern Rose',
    description: 'Современная розовая тема для стильных салонов',
    category: 'preset',
    colors: {
      light: {
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724'
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c'
        },
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712'
        },
        semantic: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6'
        }
      },
      dark: {
        primary: {
          50: '#500724',
          100: '#831843',
          200: '#9d174d',
          300: '#be185d',
          400: '#db2777',
          500: '#ec4899',
          600: '#f472b6',
          700: '#f9a8d4',
          800: '#fbcfe8',
          900: '#fce7f3',
          950: '#fdf2f8'
        },
        accent: {
          50: '#c2410c',
          100: '#ea580c',
          500: '#f97316',
          600: '#ffedd5',
          700: '#fff7ed'
        },
        neutral: {
          50: '#030712',
          100: '#111827',
          200: '#1f2937',
          300: '#374151',
          400: '#4b5563',
          500: '#6b7280',
          600: '#9ca3af',
          700: '#d1d5db',
          800: '#e5e7eb',
          900: '#f3f4f6',
          950: '#f9fafb'
        },
        semantic: {
          success: '#22c55e',
          warning: '#eab308',
          error: '#f87171',
          info: '#60a5fa'
        }
      }
    },
    typography: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'serif'],
        mono: ['Cascadia Code', 'monospace']
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem'
      }
    },
    spacing: {
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px'
      }
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms'
      },
      easing: {
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    }
  }
};

// Дефолтная тема
export const defaultTheme = beautyThemes.elegant!;

// Тип для ID темы
export type ThemeId = keyof typeof beautyThemes;

// Экспорт всех тем
export const getAllThemes = (): ThemeConfig[] => Object.values(beautyThemes);

// Получение темы по ID
export const getTheme = (themeId: ThemeId): ThemeConfig => {
  const theme = beautyThemes[themeId];
  if (!theme) {
    return defaultTheme;
  }
  return theme;
};