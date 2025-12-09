import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, } from '../ui/sidebar';
import { Badge } from '../ui/badge';
const defaultIsActive = (item) => {
    if (typeof window === 'undefined')
        return false;
    const currentPath = window.location.pathname;
    if (!item.href)
        return false;
    if (item.href === '/')
        return currentPath === '/';
    return currentPath === item.href || currentPath.startsWith(`${item.href}/`);
};
export function AppSidebar({ primaryNav, secondaryNav = [], primaryNavLabel, primaryNavAction, secondaryNavLabel, sidebarHeaderSlot, sidebarFooterSlot, isPrimaryItemActive, isSecondaryItemActive, renderPrimaryItem, renderSecondaryItem, variant = 'sidebar', collapsible = 'offcanvas', side = 'left', className, }) {
    const primaryIsActive = isPrimaryItemActive ?? defaultIsActive;
    const secondaryIsActive = isSecondaryItemActive ?? defaultIsActive;
    const renderPrimaryNavItem = (item) => {
        const badge = item.badge && item.badge > 0
            ? (_jsx(Badge, { variant: "destructive", className: "ml-auto h-5 min-w-5 px-1 text-xs", children: item.badge }))
            : item.indicator ?? null;
        const defaultContent = (_jsxs("span", { className: "flex items-center gap-3", children: [item.icon ? _jsx(item.icon, { className: "h-6 w-6", "aria-hidden": "true" }) : null, _jsx("span", { className: "flex-1 truncate text-base font-normal", children: item.title }), badge] }));
        const rendered = renderPrimaryItem
            ? renderPrimaryItem(item, defaultContent, { badge })
            : defaultContent;
        if (item.items?.length) {
            return (_jsxs(SidebarMenuItem, { children: [_jsx(SidebarMenuButton, { tooltip: item.tooltip ?? item.title, disabled: item.disabled, isActive: primaryIsActive(item), children: rendered }), _jsx(SidebarMenuSub, { children: item.items.map((sub) => (_jsx(SidebarMenuSubItem, { children: _jsx(SidebarMenuSubButton, { asChild: true, children: _jsx("a", { href: sub.href, onClick: sub.onClick, children: _jsx("span", { children: sub.title }) }) }) }, sub.title))) })] }, item.title));
        }
        return (_jsx(SidebarMenuItem, { children: _jsx(SidebarMenuButton, { asChild: true, tooltip: item.tooltip ?? item.title, disabled: item.disabled, isActive: primaryIsActive(item), children: _jsxs("a", { href: item.href, onClick: item.onClick, className: "flex items-center gap-3", children: [item.icon ? _jsx(item.icon, { className: "h-6 w-6", "aria-hidden": "true" }) : null, _jsx("span", { className: "flex-1 truncate text-base font-normal", children: item.title }), badge] }) }) }, item.title));
    };
    const renderSecondaryNavItem = (item) => {
        const defaultContent = (_jsxs("a", { href: item.href, onClick: item.onClick, className: "flex items-center gap-3", children: [item.icon ? _jsx(item.icon, { className: "h-6 w-6", "aria-hidden": "true" }) : null, _jsx("span", { className: "flex-1 truncate text-base font-normal", children: item.title })] }));
        const rendered = renderSecondaryItem
            ? renderSecondaryItem(item, defaultContent)
            : defaultContent;
        return (_jsx(SidebarMenuItem, { children: _jsx(SidebarMenuButton, { asChild: true, tooltip: item.tooltip ?? item.title, disabled: item.disabled, isActive: secondaryIsActive(item), children: rendered }) }, item.title));
    };
    return (_jsxs(Sidebar, { variant: variant, collapsible: collapsible, side: side, className: className, children: [sidebarHeaderSlot && _jsx(SidebarHeader, { children: sidebarHeaderSlot }), _jsxs(SidebarContent, { children: [_jsxs(SidebarGroup, { children: [(primaryNavLabel || primaryNavAction) ? (_jsxs("div", { className: "flex items-center gap-2 px-2", children: [primaryNavLabel ? (_jsx(SidebarGroupLabel, { children: primaryNavLabel })) : null, primaryNavAction ? (_jsx(SidebarMenuAction, { className: "ml-auto inline-flex h-7 items-center justify-center", children: primaryNavAction })) : null] })) : null, _jsx(SidebarGroupContent, { children: _jsx(SidebarMenu, { children: primaryNav.map((item) => renderPrimaryNavItem(item)) }) })] }), secondaryNav.length > 0 ? (_jsxs(SidebarGroup, { className: "mt-2", children: [secondaryNavLabel ? (_jsx("div", { className: "px-2", children: _jsx(SidebarGroupLabel, { children: secondaryNavLabel }) })) : null, _jsx(SidebarGroupContent, { children: _jsx(SidebarMenu, { children: secondaryNav.map((item) => renderSecondaryNavItem(item)) }) })] })) : null] }), sidebarFooterSlot && _jsx(SidebarFooter, { children: sidebarFooterSlot })] }));
}
AppSidebar.displayName = 'AppSidebar';
