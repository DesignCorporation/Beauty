// UI Components
export { Button, buttonVariants } from './components/ui/button'
export type { ButtonProps } from './components/ui/button'

export { Input } from './components/ui/input'
export type { InputProps } from './components/ui/input'

export { Label } from './components/ui/label'

export { Checkbox } from './components/ui/checkbox'

export { Switch } from './components/ui/switch'

export { Textarea } from './components/ui/textarea'
export type { TextareaProps } from './components/ui/textarea'

export { Progress } from './components/ui/progress'

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './components/ui/select'

export { 
  Alert, 
  AlertTitle, 
  AlertDescription 
} from './components/ui/alert'

export { Badge, badgeVariants } from './components/ui/badge'
export type { BadgeProps } from './components/ui/badge'

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from './components/ui/tabs'

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from './components/ui/card'

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './components/ui/table/table'

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './components/ui/sidebar'

export {
  LayoutShell
} from './components/layout/layout-shell'
export type {
  LayoutShellProps,
  LayoutNavItem,
  LayoutUser
} from './components/layout/layout-shell'

export {
  AppSidebar
} from './components/layout/app-sidebar'
export type {
  AppSidebarProps
} from './components/layout/app-sidebar'

export {
  PageContainer
} from './components/layout/page-container'
export type {
  PageContainerProps
} from './components/layout/page-container'

// Theme System
export { 
  ThemeProvider, 
  useTheme, 
  useCSSVariable, 
  useThemeColors,
  createSalonTheme 
} from './themes/theme-provider'
export type { ThemeMode } from './themes/theme-provider'

export { 
  beautyThemes, 
  defaultTheme, 
  getAllThemes, 
  getTheme 
} from './themes'
export type { 
  ThemeConfig, 
  ThemeColors, 
  ThemeId 
} from './themes'

export {
  getThemeColor,
  cssVar,
  getColorVar,
  withOpacity,
  createGradient,
  beautyGradients,
  createShadow,
  beautyShadows,
  beautyAnimations,
  generateComponentCSS,
  darkenColor,
  lightenColor,
  getContrastRatio,
  isAccessible
} from './themes/theme-utils'

export { ThemeSelector } from './components/ThemeSelector'

// Notification Bell Component
export { NotificationBell } from './components/NotificationBell'
export type { Notification, NotificationBellProps } from './components/NotificationBell'

// Billing Components - полностью переписаны с TypeScript + Zod валидацией
export { BillingCard } from './components/billing/BillingCard'
export { SubscriptionStatusCard } from './components/billing/SubscriptionStatusCard'
export { PlanTable } from './components/billing/PlanTable'

// Billing Types - экспорт всех типов и схем
export type {
  SubscriptionPlan,
  BillingPlanId,
  SubscriptionStatus,
  SubscriptionBilling,
  SubscriptionLifecycle,
  Subscription,
  SubscriptionResponse,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  Plan
} from './types/billing'
export {
  SubscriptionPlanSchema,
  SubscriptionStatusSchema,
  SubscriptionBillingSchema,
  SubscriptionLifecycleSchema,
  SubscriptionSchema,
  SubscriptionResponseSchema,
  CreateSubscriptionRequestSchema,
  CreateSubscriptionResponseSchema,
  PLAN_DETAILS,
  getStatusBadgeVariant,
  getStatusText,
  formatPrice,
  formatDate,
  isTrialExpiringSoon,
  canUpgradeTo
} from './types/billing'

// Dropdown Menu Components
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/ui/dropdown-menu'

export { Separator } from './components/ui/separator'

// Sheet Components (used internally by Sidebar for mobile)
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './components/ui/sheet'

// Dialog Components
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog'

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './components/ui/alert-dialog'

// Hooks
export { useIsMobile } from './hooks/use-mobile'

// Utilities
export { cn } from './lib/utils'

// Styles (re-export for CSS imports)
import './styles/globals.css'
