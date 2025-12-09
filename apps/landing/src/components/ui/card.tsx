import * as React from 'react'

type DivProps = React.HTMLAttributes<HTMLDivElement>

const baseCard = 'rounded-2xl border border-border bg-white shadow-sm'
const baseSection = 'flex flex-col space-y-1.5 p-6'

export const Card = React.forwardRef<HTMLDivElement, DivProps>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`${baseCard} ${className}`} {...props} />
))
Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, DivProps>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`${baseSection} ${className}`} {...props} />
))
CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h3 ref={ref} className={`text-2xl font-semibold leading-tight ${className}`} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = '', ...props }, ref) => (
  <p ref={ref} className={`text-sm text-muted-foreground ${className}`} {...props} />
))
CardDescription.displayName = 'CardDescription'

export const CardContent = React.forwardRef<HTMLDivElement, DivProps>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
))
CardContent.displayName = 'CardContent'

export const CardFooter = React.forwardRef<HTMLDivElement, DivProps>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`flex items-center p-6 pt-0 ${className}`} {...props} />
))
CardFooter.displayName = 'CardFooter'
