import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RightSidebar, createDocumentationConfig } from '../components/RightSidebar'
import { OverviewSection, ArchitectureSection, ChecklistSection, AuthSection, AgentsSection, QuickStartSection, SecuritySection, DevOpsSection, FrontendSection, ApiSection, IdeasSection, BusinessSection, RoadmapSection, MigrationSection, SystemLogicSection, LegacySection, LocalizationSection, RegistrationSection, ApiGatewaySection, CrmDevelopmentSection, SystemIntegrationSection, InvitationSystemSection, OrchestratorSection, AiTeamStrategySection, NotificationServiceSection, SalonLogoFeatureSection, ClientSystemSection, MarketingMonetizationSection, UiGuidelinesSection, PluginsSection, PhoneVerificationSetupSection, ServiceCategoriesSection, MarkdownSection } from '../components/documentation/sections'
import {
  Globe,
  Palette,
  Layout,
  BookOpen,
  Settings,
  Shield,
  Code,
  Briefcase,
  Rocket,
  Home,
  Bot,
  Users,
  ClipboardCheck,
  Lightbulb,
  Lock,
  GitBranch,
  Archive,
  UserPlus,
  Network,
  Target,
  Zap,
  BrainCircuit,
  Bell,
  Image,
  Smartphone,
  Puzzle,
  FolderTree,
  Wrench
} from 'lucide-react'
import { sdkClient } from '@/services/sdkClient'

interface DocsSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

const DocumentationPage: React.FC = () => {
  const navigate = useNavigate()
  const params = useParams()
  const [dynamicSections, setDynamicSections] = useState<any[]>([])

  // Получаем секцию из URL
  const activeSection = params['*'] || 'overview'

  // Загружаем меню из MCP через API Gateway
  useEffect(() => {
    const fetchSections = async () => {
      try {
        // Используем абсолютный URL к API Gateway через /api/mcp/*
        const apiUrl = (import.meta.env.VITE_MCP_URL as string | undefined)?.replace?.(/\/$/, '') ||
          `https://${window.location.hostname.replace('admin.', 'api.')}/api/mcp/project-state`
        const data = await sdkClient.request<any>(apiUrl, { method: 'GET', retry: 0, skipCsrf: true })
        if (data.data?.criticalSections) {
          console.log('📚 DocumentationPage loaded MCP sections:', data.data.criticalSections.map((s: any) => s.id))
          setDynamicSections(data.data.criticalSections)
        }
      } catch (error) {
        console.error('Failed to load sections from MCP:', error)
      }
    }

    // Начальная загрузка
    fetchSections()

    // WebSocket для real-time обновления меню
    const wsUrl = (import.meta.env.VITE_MCP_WS_URL as string | undefined)?.replace?.(/\/$/, '') ||
      `wss://${window.location.hostname.replace('admin.', 'api.')}/ws`

    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('📡 DocumentationPage: WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'file-changed') {
            console.log('🔄 Reloading documentation menu due to file change')
            fetchSections()
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ DocumentationPage WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('📡 DocumentationPage: WebSocket disconnected')
      }
    } catch (err) {
      console.error('Failed to connect DocumentationPage WebSocket:', err)
    }

    // Cleanup
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [])

  // Функция для изменения секции через роутинг
  const setActiveSection = (sectionId: string) => {
    navigate(`/documentation/${sectionId}`)
  }

  // Жесткие секции (с компонентами)
  const hardcodedSections: DocsSection[] = [
    { id: 'overview', title: 'Обзор', icon: Home, component: OverviewSection },
    { id: 'ai-team-strategy', title: 'AI Team Strategy', icon: BrainCircuit, component: AiTeamStrategySection },
    { id: 'quick-start', title: 'Onboarding Guide', icon: Rocket, component: QuickStartSection },
    { id: 'architecture', title: 'Архитектура', icon: Globe, component: ArchitectureSection },
    { id: 'checklist', title: 'Чек-лист задач', icon: ClipboardCheck, component: ChecklistSection },
    { id: 'crm-development', title: 'CRM Development', icon: Code, component: CrmDevelopmentSection },
    { id: 'client-system', title: 'Client System Architecture', icon: Users, component: ClientSystemSection },
    { id: 'service-categories', title: 'Service Categories System', icon: FolderTree, component: ServiceCategoriesSection },
    { id: 'marketing-monetization', title: 'Marketing Monetization', icon: Target, component: MarketingMonetizationSection },
    { id: 'salon-logo-feature', title: 'Salon Logo Feature', icon: Image, component: SalonLogoFeatureSection },
    { id: 'registration', title: 'Регистрация салонов', icon: UserPlus, component: RegistrationSection },
    { id: 'localization', title: 'Локализация', icon: Globe, component: LocalizationSection },
    { id: 'ideas', title: 'Идеи', icon: Lightbulb, component: IdeasSection },
    { id: 'auth', title: 'Auth', icon: Shield, component: AuthSection },
    { id: 'phone-verification-setup', title: 'Phone Verification Setup', icon: Smartphone, component: PhoneVerificationSetupSection },
    { id: 'api', title: 'API', icon: Code, component: ApiSection },
    { id: 'api-gateway', title: 'API Gateway', icon: Network, component: ApiGatewaySection },
    { id: 'notification-service', title: 'Notification Service', icon: Bell, component: NotificationServiceSection },
    { id: 'frontend', title: 'Frontend', icon: Palette, component: FrontendSection },
    { id: 'ui-guidelines', title: 'UI Guidelines', icon: Layout, component: UiGuidelinesSection },
    { id: 'plugins', title: 'Claude Code Plugins', icon: Puzzle, component: PluginsSection },
    { id: 'agents', title: 'Агенты', icon: Bot, component: AgentsSection },
    { id: 'security', title: 'Security', icon: Lock, component: SecuritySection },
    { id: 'devops', title: 'DevOps', icon: Settings, component: DevOpsSection },
    { id: 'orchestrator', title: 'Orchestrator System', icon: Zap, component: OrchestratorSection },
    { id: 'business', title: 'Бизнес', icon: Briefcase, component: BusinessSection },
    { id: 'roadmap', title: 'Roadmap', icon: Target, component: RoadmapSection },
    { id: 'migration', title: 'Миграция', icon: GitBranch, component: MigrationSection },
    { id: 'system-logic', title: 'Система ролей', icon: Users, component: SystemLogicSection },
    { id: 'system-integration', title: 'Схематичная документация', icon: Zap, component: SystemIntegrationSection },
    { id: 'invitation-system', title: 'Invitation System', icon: UserPlus, component: InvitationSystemSection },
    { id: 'legacy', title: 'Legacy', icon: Archive, component: LegacySection }
  ]

  // Helper: Get icon for dynamic category
  const getIconForCategory = (categoryId: string) => {
    const iconMap: Record<string, any> = {
      'tools': Wrench,
      'tier2': ClipboardCheck,
      'tier3': Rocket,
      'guides': BookOpen,
      'api': Code,
      'default': Home
    }
    return iconMap[categoryId] || iconMap['default']
  }

  // Комбинируем: hardcoded + только динамические категории из MCP (isCategory: true)
  const allSections = [
    ...hardcodedSections,
    ...dynamicSections
      .filter((s: any) => s.isCategory === true) // Только категории из /docs/sections/
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        icon: getIconForCategory(s.id),
        component: () => <MarkdownSection categoryId={s.id} />
      }))
  ]

  // Удаляем дубликаты
  const uniqueSections = Array.from(
    new Map(allSections.map(s => [s.id, s])).values()
  )

  const ActiveComponent = uniqueSections.find(s => s.id === activeSection)?.component || OverviewSection

  // Создаем конфигурацию для правого сайдбара с динамическими секциями из MCP
  const sidebarConfig = createDocumentationConfig(
    uniqueSections.map(s => {
      // Проверяем, является ли секция динамической категорией (из MCP с isCategory: true)
      const dynamicCategory = dynamicSections.find((ds: any) => ds.id === s.id && ds.isCategory === true)
      return {
        id: s.id,
        title: s.title,
        icon: s.icon,
        isDynamic: !!dynamicCategory
      }
    }),
    activeSection,
    setActiveSection
  )

  return (
    <div className="h-full flex overflow-hidden">
      {/* Основной контент */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <ActiveComponent />
        </div>
      </div>

      {/* Правый сайдбар с динамическим меню из MCP */}
      <RightSidebar config={sidebarConfig} />
    </div>
  )
}





export default DocumentationPage
