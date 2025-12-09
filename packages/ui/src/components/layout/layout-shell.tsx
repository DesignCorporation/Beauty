import * as React from 'react'

import {
  SidebarInset,
  SidebarProvider,
} from '../ui/sidebar'
import { AppSidebar, type LayoutNavItem } from './app-sidebar'
import { cn } from '../../lib/utils'

export type { LayoutNavItem }

export interface LayoutUser {
  displayName?: string
  email?: string
  roleLabel?: string
  avatarUrl?: string
  initials?: string
}

export interface LayoutShellProps {
  children: React.ReactNode
  primaryNav: LayoutNavItem[]
  secondaryNav?: LayoutNavItem[]
  primaryNavLabel?: string
  primaryNavAction?: React.ReactNode
  secondaryNavLabel?: string
  sidebarHeaderSlot?: React.ReactNode
  sidebarFooterSlot?: React.ReactNode
  isPrimaryItemActive?: (item: LayoutNavItem) => boolean
  isSecondaryItemActive?: (item: LayoutNavItem) => boolean
  renderPrimaryItem?: (
    item: LayoutNavItem,
    defaultContent: React.ReactElement,
    meta: { badge: React.ReactNode }
  ) => React.ReactNode
  renderSecondaryItem?: (
    item: LayoutNavItem,
    defaultContent: React.ReactElement
  ) => React.ReactNode
  sidebarProps?: {
    variant?: 'sidebar' | 'floating' | 'inset'
    collapsible?: 'offcanvas' | 'icon' | 'none'
    side?: 'left' | 'right'
    className?: string
  }
  className?: string
  mainClassName?: string
}

export function LayoutShell({
  children,
  primaryNav,
  secondaryNav = [],
  primaryNavLabel,
  primaryNavAction,
  secondaryNavLabel,
  sidebarHeaderSlot,
  sidebarFooterSlot,
  isPrimaryItemActive,
  isSecondaryItemActive,
  renderPrimaryItem,
  renderSecondaryItem,
  sidebarProps,
  className,
  mainClassName,
}: LayoutShellProps) {
  return (
    <SidebarProvider defaultOpen={true} className={className}>
      <AppSidebar
        primaryNav={primaryNav}
        secondaryNav={secondaryNav}
        primaryNavLabel={primaryNavLabel}
        primaryNavAction={primaryNavAction}
        secondaryNavLabel={secondaryNavLabel}
        sidebarHeaderSlot={sidebarHeaderSlot}
        sidebarFooterSlot={sidebarFooterSlot}
        isPrimaryItemActive={isPrimaryItemActive}
        isSecondaryItemActive={isSecondaryItemActive}
        renderPrimaryItem={renderPrimaryItem}
        renderSecondaryItem={renderSecondaryItem}
        variant={sidebarProps?.variant ?? 'sidebar'}
        collapsible={sidebarProps?.collapsible ?? 'icon'}
        side={sidebarProps?.side ?? 'left'}
        className={sidebarProps?.className}
      />
      <SidebarInset>
        <main className={cn('flex flex-1 flex-col gap-4 p-0', mainClassName)}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

LayoutShell.displayName = 'LayoutShell'
