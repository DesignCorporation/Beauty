import { useState } from 'react'
import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import {
  BookOpen,
  Search,
  Settings,
  BarChart3,
  Users,
  Building2,
  Shield
} from 'lucide-react'

// Types for different sidebar content
export interface SidebarConfig {
  type: 'navigation' | 'filters' | 'tools' | 'controls' | 'settings'
  title: string
  icon: React.ComponentType<any>
  searchPlaceholder?: string
  items: SidebarItem[]
}

export interface SidebarItem {
  id: string
  title: string
  icon: React.ComponentType<any>
  action?: () => void
  href?: string
  isActive?: boolean
  badge?: string | number
  children?: SidebarItem[]
  status?: 'updated' | 'deprecated' | undefined
  isDynamic?: boolean | undefined
}

interface RightSidebarProps {
  config: SidebarConfig | null
  className?: string
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ 
  config, 
  className = '' 
}) => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!config) return null

  const handleItemClick = (item: SidebarItem) => {
    if (item.action) {
      item.action()
    } else if (item.href) {
      navigate(item.href)
    }
  }

  // Filter items based on search query
  const filteredItems = config.items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={`${isCollapsed ? 'w-12' : 'w-64'} border-l border-border bg-sidebar transition-all duration-300 ${className}`}>
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground">
              {config.title}
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-sidebar-accent rounded"
            title={isCollapsed ? 'Развернуть' : 'Свернуть'}
          >
            <ChevronLeft className={`size-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </div>
      
      <div className="p-2 h-full flex flex-col">
        {/* Search (if enabled) */}
        {config.searchPlaceholder && !isCollapsed && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={config.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-input bg-background rounded-md"
              />
            </div>
          </div>
        )}

        {/* Navigation/Action Menu */}
        <div className="space-y-1 flex-1">
          {filteredItems.map((item) => {
            const ItemIcon = item.icon
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  item.isActive
                    ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                    : 'hover:bg-sidebar-accent/50'
                } ${!item.isActive && item.status === 'updated' ? 'text-green-600' : ''} ${!item.isActive && item.isDynamic ? 'text-red-600 font-medium' : ''}`}
                title={isCollapsed ? item.title : undefined}
              >
                <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
                  <ItemIcon className="size-4 flex-shrink-0" />
                  {!isCollapsed && <span>{item.title}</span>}
                </div>
                {item.badge && !isCollapsed && (
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer info */}
        {!isCollapsed && (
          <div className="mt-auto pt-2 border-t border-sidebar-border">
            <div className="text-xs text-muted-foreground text-center">
              {filteredItems.length} {config.type === 'navigation' ? 'разделов' : 'элементов'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Predefined configurations for different page types
export const createDocumentationConfig = (
  sections: Array<{
    id: string
    title: string
    icon: React.ComponentType<any>
    status?: 'updated' | 'deprecated'
    isDynamic?: boolean
  }>,
  activeSection: string,
  onSectionChange: (id: string) => void
): SidebarConfig => ({
  type: 'navigation',
  title: 'Навигация',
  icon: BookOpen,
  searchPlaceholder: 'Поиск...',
  items: sections.map(section => ({
    id: section.id,
    title: section.title,
    icon: section.icon,
    status: section.status,
    isDynamic: section.isDynamic,
    isActive: activeSection === section.id,
    action: () => onSectionChange(section.id)
  }))
})

export const createSalonsConfig = (): SidebarConfig => ({
  type: 'filters',
  title: 'Фильтры',
  icon: Building2,
  searchPlaceholder: 'Поиск салонов...',
  items: [
    {
      id: 'active',
      title: 'Активные салоны',
      icon: Building2,
      badge: '12',
      action: () => console.log('Filter: Active salons')
    },
    {
      id: 'pending',
      title: 'Ожидают активации',
      icon: Settings,
      badge: '3',
      action: () => console.log('Filter: Pending salons')
    },
    {
      id: 'blocked',
      title: 'Заблокированные',
      icon: Shield,
      badge: '1',
      action: () => console.log('Filter: Blocked salons')
    }
  ]
})

export const createUsersConfig = (): SidebarConfig => ({
  type: 'tools',
  title: 'Инструменты',
  icon: Users,
  items: [
    {
      id: 'bulk-actions',
      title: 'Массовые действия',
      icon: Settings,
      action: () => console.log('Bulk actions')
    },
    {
      id: 'export',
      title: 'Экспорт пользователей',
      icon: BarChart3,
      action: () => console.log('Export users')
    }
  ]
})

export const createAnalyticsConfig = (): SidebarConfig => ({
  type: 'controls',
  title: 'Настройки',
  icon: BarChart3,
  items: [
    {
      id: 'period',
      title: 'Период: 30 дней',
      icon: Settings,
      action: () => console.log('Change period')
    },
    {
      id: 'charts',
      title: 'Настройки графиков',
      icon: BarChart3,
      action: () => console.log('Chart settings')
    }
  ]
})

export default RightSidebar