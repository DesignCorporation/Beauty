import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SidebarInset, SidebarProvider } from '../ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { cn } from '../../lib/utils';
export function LayoutShell({ children, primaryNav, secondaryNav = [], primaryNavLabel, primaryNavAction, secondaryNavLabel, sidebarHeaderSlot, sidebarFooterSlot, isPrimaryItemActive, isSecondaryItemActive, renderPrimaryItem, renderSecondaryItem, sidebarProps, className, mainClassName }) {
    return (_jsxs(SidebarProvider, { defaultOpen: true, className: className, children: [_jsx(AppSidebar, { primaryNav: primaryNav, secondaryNav: secondaryNav, primaryNavLabel: primaryNavLabel, primaryNavAction: primaryNavAction, secondaryNavLabel: secondaryNavLabel, sidebarHeaderSlot: sidebarHeaderSlot, sidebarFooterSlot: sidebarFooterSlot, isPrimaryItemActive: isPrimaryItemActive, isSecondaryItemActive: isSecondaryItemActive, renderPrimaryItem: renderPrimaryItem, renderSecondaryItem: renderSecondaryItem, variant: sidebarProps?.variant ?? 'sidebar', collapsible: sidebarProps?.collapsible ?? 'icon', side: sidebarProps?.side ?? 'left', className: sidebarProps?.className }), _jsx(SidebarInset, { children: _jsx("main", { className: cn('flex flex-1 flex-col gap-4 p-0', mainClassName), children: children }) })] }));
}
LayoutShell.displayName = 'LayoutShell';
