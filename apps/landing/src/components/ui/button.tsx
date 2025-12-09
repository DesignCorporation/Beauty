import * as React from 'react'

type ButtonVariant = 'default' | 'outline' | 'secondary'
type ButtonSize = 'default' | 'lg' | 'sm'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const baseClass =
  'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60'

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-pink-500 text-white hover:bg-pink-600',
  outline: 'border border-border text-muted-foreground hover:bg-muted',
  secondary: 'bg-slate-900 text-white hover:bg-slate-800'
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  lg: 'h-12 px-6 text-base',
  sm: 'h-9 px-3 text-xs'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const composed = [baseClass, variantClasses[variant], sizeClasses[size], className]
      .filter(Boolean)
      .join(' ')

    return <button ref={ref} className={composed} {...props} />
  }
)

Button.displayName = 'Button'

export const buttonVariants = { baseClass, variantClasses, sizeClasses }
