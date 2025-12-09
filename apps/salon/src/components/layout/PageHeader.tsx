import type { ReactNode } from 'react'
import { cn } from '@beauty-platform/ui'

interface PageHeaderProps {
  title: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-center md:justify-between', className)}>
      <div>
        <h1 className="text-3xl font-medium tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {actions ? (
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
