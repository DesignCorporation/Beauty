import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beauty-platform/ui'
import { cn } from '@beauty-platform/ui/lib/utils'
import type { ReactNode } from 'react'

interface CatalystCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
  action?: ReactNode
  noPadding?: boolean
  contentClassName?: string
}

export function CatalystCard({
  title,
  description,
  children,
  className,
  action,
  noPadding = false,
  contentClassName
}: CatalystCardProps) {
  return (
    <Card
      className={cn(
        'rounded-none border-0 border-t border-border bg-transparent shadow-none ring-0',
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 px-4 py-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium leading-6 text-foreground">
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="text-sm text-muted-foreground">
              {description}
            </CardDescription>
          ) : null}
        </div>
        {action ? <div className="ml-4 shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn(noPadding ? 'p-0' : 'px-4 pb-4 pt-2', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
