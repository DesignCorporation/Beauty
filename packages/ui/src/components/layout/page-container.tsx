import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * PageContainer - унифицированный контейнер для всех страниц CRM
 *
 * Решает проблему несогласованности padding между страницами:
 * - standard: p-6 для большинства страниц (Dashboard, Payments, Analytics, etc.)
 * - full-width: p-0 для специальных страниц (Calendar)
 *
 * @example
 * ```tsx
 * // Обычная страница
 * <PageContainer variant="standard">
 *   <YourPageContent />
 * </PageContainer>
 *
 * // Календарь (весь экран)
 * <PageContainer variant="full-width">
 *   <CalendarGrid />
 * </PageContainer>
 * ```
 */

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant определяет padding стратегию:
   * - standard: p-6 (стандартный отступ для большинства страниц)
   * - full-width: p-0 (без отступов, для календаря и подобных полноразмерных компонентов)
   */
  variant?: 'standard' | 'full-width'

  /**
   * maxWidth определяет максимальную ширину контента:
   * - full (default): 100% ширины экрана
   * - 7xl: max-w-7xl (1280px) - для большинства страниц изначально
   * - full: max-w-full - без ограничений (для календаря)
   * - 4xl: max-w-4xl (896px) - для узких форм
   * - 6xl: max-w-6xl (1152px) - средняя ширина
   */
  maxWidth?: '4xl' | '6xl' | '7xl' | 'full'

  /**
   * centered: центрировать контент по горизонтали (mx-auto)
   * Default: true для standard, false для full-width
   */
  centered?: boolean
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({
    children,
    variant = 'standard',
    maxWidth = 'full',
    centered,
    className,
    ...props
  }, ref) => {
    // Auto-determine centered based on variant if not explicitly set
    const isCentered = centered !== undefined ? centered : (variant === 'standard' && maxWidth !== 'full')

    const paddingClasses = variant === 'standard' ? 'p-6' : 'p-0'

    const maxWidthClasses = {
      '4xl': 'max-w-4xl',
      '6xl': 'max-w-6xl',
      '7xl': 'max-w-7xl',
      'full': 'max-w-full'
    }[maxWidth]

    const centerClasses = isCentered ? 'mx-auto' : ''

    return (
      <div
        ref={ref}
        className={cn(
          'w-full min-h-screen bg-background text-foreground', // theme-aware background/foreground
          paddingClasses,
          maxWidthClasses,
          centerClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

PageContainer.displayName = 'PageContainer'

export { PageContainer }
