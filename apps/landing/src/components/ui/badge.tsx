import * as React from 'react'

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement>

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className = '', ...props }, ref) => (
  <span
    ref={ref}
    className={`inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${className}`}
    {...props}
  />
))
Badge.displayName = 'Badge'

export const badgeVariants = {
  default: 'bg-muted text-muted-foreground'
}
