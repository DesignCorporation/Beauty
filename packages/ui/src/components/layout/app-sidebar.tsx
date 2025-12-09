import * as React from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '../ui/sidebar'
import { Badge } from '../ui/badge'

type IconComponent = React.ComponentType<{
  className?: string
}>

export interface LayoutNavItem {
  title: string
  href: string
  icon?: IconComponent
  badge?: number
  indicator?: React.ReactNode
  onClick?: () => void
  tooltip?: string
  disabled?: boolean
  items?: Array<{
    title: string
    href: string
    onClick?: () => void
  }>
}

export interface AppSidebarProps {
  primaryNav: LayoutNavItem[]
  secondaryNav?: LayoutNavItem[] | undefined
  primaryNavLabel?: string | undefined
  primaryNavAction?: React.ReactNode | undefined
  secondaryNavLabel?: string | undefined
  sidebarHeaderSlot?: React.ReactNode | undefined
  sidebarFooterSlot?: React.ReactNode | undefined
  isPrimaryItemActive?: ((item: LayoutNavItem) => boolean) | undefined
  isSecondaryItemActive?: ((item: LayoutNavItem) => boolean) | undefined
  renderPrimaryItem?: ((
    item: LayoutNavItem,
    defaultContent: React.ReactElement,
    meta: { badge: React.ReactNode }
  ) => React.ReactNode) | undefined
  renderSecondaryItem?: ((
    item: LayoutNavItem,
    defaultContent: React.ReactElement
  ) => React.ReactNode) | undefined
  variant?: 'sidebar' | 'floating' | 'inset' | undefined
  collapsible?: 'offcanvas' | 'icon' | 'none' | undefined
  side?: 'left' | 'right' | undefined
  className?: string | undefined
}

const defaultIsActive = (item: LayoutNavItem) => {
  if (typeof window === 'undefined') return false
  const currentPath = window.location.pathname
  if (!item.href) return false
  if (item.href === '/') return currentPath === '/'
  return currentPath === item.href || currentPath.startsWith(`${item.href}/`)
}

export function AppSidebar({
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
  variant = 'sidebar',
  collapsible = 'offcanvas',
  side = 'left',
  className,
}: AppSidebarProps) {
  const primaryIsActive = isPrimaryItemActive ?? defaultIsActive
  const secondaryIsActive = isSecondaryItemActive ?? defaultIsActive

  const renderPrimaryNavItem = (item: LayoutNavItem) => {
    const badge = item.badge && item.badge > 0
      ? (
          <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs">
            {item.badge}
          </Badge>
        )
      : item.indicator ?? null

    const defaultContent = (
      <span className="flex items-center gap-3">
        {item.icon ? <item.icon className="h-6 w-6 stroke-[1.5]" aria-hidden="true" /> : null}
        <span className="flex-1 truncate text-[0.85rem] font-medium">{item.title}</span>
        {badge}
      </span>
    )

    const rendered = renderPrimaryItem
      ? renderPrimaryItem(item, defaultContent, { badge })
      : defaultContent

    if (item.items?.length) {
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            tooltip={item.tooltip ?? item.title}
            disabled={item.disabled}
            isActive={primaryIsActive(item)}
          >
            {rendered}
          </SidebarMenuButton>
          <SidebarMenuSub>
            {item.items.map((sub) => (
              <SidebarMenuSubItem key={sub.title}>
                <SidebarMenuSubButton asChild>
                  <a href={sub.href} onClick={sub.onClick}>
                    <span>{sub.title}</span>
                  </a>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </SidebarMenuItem>
      )
    }

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          tooltip={item.tooltip ?? item.title}
          disabled={item.disabled}
          isActive={primaryIsActive(item)}
        >
          <a href={item.href} onClick={item.onClick} className="flex items-center gap-3">
            {item.icon ? <item.icon className="h-6 w-6" aria-hidden="true" /> : null}
            <span className="flex-1 truncate text-base font-normal">{item.title}</span>
            {badge}
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  const renderSecondaryNavItem = (item: LayoutNavItem) => {
    const defaultContent = (
      <a href={item.href} onClick={item.onClick} className="flex items-center gap-3">
        {item.icon ? <item.icon className="h-6 w-6 stroke-[1.5]" aria-hidden="true" /> : null}
        <span className="flex-1 truncate text-[0.85rem] font-medium">{item.title}</span>
      </a>
    )

    const rendered = renderSecondaryItem
      ? renderSecondaryItem(item, defaultContent)
      : defaultContent

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          tooltip={item.tooltip ?? item.title}
          disabled={item.disabled}
          isActive={secondaryIsActive(item)}
        >
          {rendered}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar variant={variant} collapsible={collapsible} side={side} className={className}>
      {sidebarHeaderSlot && <SidebarHeader>{sidebarHeaderSlot}</SidebarHeader>}

      <SidebarContent>
        <SidebarGroup>
          {(primaryNavLabel || primaryNavAction) ? (
            <div className="flex items-center gap-2 px-2">
              {primaryNavLabel ? (
                <SidebarGroupLabel>{primaryNavLabel}</SidebarGroupLabel>
              ) : null}
              {primaryNavAction ? (
                <SidebarMenuAction className="ml-auto inline-flex h-7 items-center justify-center">
                  {primaryNavAction}
                </SidebarMenuAction>
              ) : null}
            </div>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNav.map((item) => renderPrimaryNavItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {secondaryNav.length > 0 ? (
          <SidebarGroup className="mt-2">
            {secondaryNavLabel ? (
              <div className="px-2">
                <SidebarGroupLabel>{secondaryNavLabel}</SidebarGroupLabel>
              </div>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryNav.map((item) => renderSecondaryNavItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      {sidebarFooterSlot && <SidebarFooter>{sidebarFooterSlot}</SidebarFooter>}
    </Sidebar>
  )
}

AppSidebar.displayName = 'AppSidebar'
