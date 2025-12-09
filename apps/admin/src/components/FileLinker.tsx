import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui'
import {
  FileText,
  Code,
  Database,
  Settings,
  Folder,
  Copy,
  Search,
  GitBranch,
  Terminal,
  Edit3,
  Eye,
  Clock,
  Star
} from 'lucide-react'

interface FileLink {
  id: string
  path: string
  name: string
  category: 'frontend' | 'backend' | 'config' | 'database' | 'docs'
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  lastModified?: string
  lineNumber?: number
  tags: string[]
  editCommand?: string
  quickActions?: string[]
}

export const FileLinker: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCommands, setShowCommands] = useState<string | null>(null)

  const fileLinks: FileLink[] = [
    // 🔥 КРИТИЧЕСКИЕ ФАЙЛЫ - ЧАСТО НУЖНЫЕ
    {
      id: 'auth-service',
      path: '/root/beauty-platform/services/auth-service/src/index.js',
      name: 'Auth Service Main',
      category: 'backend',
      description: 'Главный файл аутентификации JWT + MFA + Security Logging',
      priority: 'critical',
      lastModified: '2025-08-19',
      tags: ['jwt', 'mfa', 'security', 'auth'],
      editCommand: 'nano /root/beauty-platform/services/auth-service/src/index.js',
      quickActions: ['pm2 restart auth-service-6021', 'pm2 logs auth-service-6021']
    },
    {
      id: 'tenant-prisma',
      path: '/root/beauty-platform/core/database/tenant-isolation.js',
      name: 'Tenant Isolation',
      category: 'database',
      description: 'tenantPrisma() функция - КРИТИЧНО для безопасности данных',
      priority: 'critical',
      tags: ['prisma', 'tenant', 'security', 'isolation'],
      editCommand: 'nano /root/beauty-platform/core/database/tenant-isolation.js',
      quickActions: ['Test tenant isolation', 'Check cross-salon data access']
    },
    {
      id: 'admin-layout',
      path: '/root/beauty-platform/apps/admin-panel/src/components/AdminLayout.tsx',
      name: 'Admin Layout',
      category: 'frontend',
      description: 'Главный layout админки с правой навигацией - НЕ ЛОМАТЬ!',
      priority: 'critical',
      lastModified: '2025-08-22',
      tags: ['react', 'layout', 'navigation', 'sidebar'],
      editCommand: 'nano /root/beauty-platform/apps/admin-panel/src/components/AdminLayout.tsx',
      quickActions: ['npm run dev', 'Check sidebar functionality']
    },

    // 🎯 ВЫСОКИЙ ПРИОРИТЕТ
    {
      id: 'api-gateway',
      path: '/root/beauty-platform/services/api-gateway/src/index.js',
      name: 'API Gateway',
      category: 'backend',
      description: 'Единая точка входа для всех сервисов (порт 6020)',
      priority: 'high',
      lastModified: '2025-08-19',
      tags: ['gateway', 'proxy', 'routing', 'cors'],
      editCommand: 'nano /root/beauty-platform/services/api-gateway/src/index.js',
      quickActions: ['pm2 restart api-gateway', 'curl -s http://localhost:6020/health']
    },
    {
      id: 'nginx-config',
      path: '/etc/nginx/sites-available/beauty-platform.conf',
      name: 'Nginx Config',
      category: 'config',
      description: 'Reverse proxy для всех доменов - beauty, test-admin, test-crm',
      priority: 'high',
      tags: ['nginx', 'proxy', 'ssl', 'domains'],
      editCommand: 'sudo nano /etc/nginx/sites-available/beauty-platform.conf',
      quickActions: ['sudo nginx -t', 'sudo systemctl reload nginx']
    },
    {
      id: 'salon-crm-app',
      path: '/root/beauty-platform/apps/salon-crm/src/App.tsx',
      name: 'Salon CRM App',
      category: 'frontend',
      description: 'Главное приложение CRM с календарем и локализацией',
      priority: 'high',
      lastModified: '2025-08-16',
      tags: ['react', 'crm', 'calendar', 'i18n'],
      editCommand: 'nano /root/beauty-platform/apps/salon-crm/src/App.tsx',
      quickActions: ['pnpm --filter salon-crm dev', 'Check CRM functionality']
    },

    // 📊 СРЕДНИЙ ПРИОРИТЕТ - ПОЛЕЗНЫЕ
    {
      id: 'images-api',
      path: '/root/beauty-platform/services/images-api/src/index.js',
      name: 'Images API',
      category: 'backend',
      description: 'Галерея изображений с Sharp оптимизацией - РАБОТАЕТ ИДЕАЛЬНО!',
      priority: 'medium',
      lastModified: '2025-08-15',
      tags: ['images', 'upload', 'sharp', 'optimization'],
      editCommand: 'nano /root/beauty-platform/services/images-api/src/index.js',
      quickActions: ['pm2 restart images-api', 'Check gallery at /images']
    },
    {
      id: 'registration-flow',
      path: '/root/beauty-platform/apps/admin-panel/src/components/MultiStepRegistration.tsx',
      name: 'Multi-Step Registration',
      category: 'frontend',
      description: 'Регистрация салонов с автоопределением страны/языка',
      priority: 'medium',
      lastModified: '2025-08-16',
      tags: ['registration', 'multi-step', 'country-detection', 'i18n'],
      editCommand: 'nano /root/beauty-platform/apps/admin-panel/src/components/MultiStepRegistration.tsx'
    },
    {
      id: 'database-schema',
      path: '/root/beauty-platform/core/database/schema.prisma',
      name: 'Database Schema',
      category: 'database',
      description: 'Prisma схема с tenant isolation и расширенными ролями',
      priority: 'medium',
      tags: ['prisma', 'schema', 'database', 'roles'],
      editCommand: 'nano /root/beauty-platform/core/database/schema.prisma',
      quickActions: ['npx prisma generate', 'npx prisma db push']
    },

    // 📚 ДОКУМЕНТАЦИЯ И КОНФИГИ
    {
      id: 'claude-memory',
      path: '/root/beauty-platform/CLAUDE.md',
      name: 'Project Memory',
      category: 'docs',
      description: 'Главная память проекта - все что нужно знать AI агентам',
      priority: 'high',
      lastModified: '2025-08-22',
      tags: ['memory', 'ai', 'documentation', 'rules'],
      editCommand: 'nano /root/beauty-platform/CLAUDE.md'
    },
    {
      id: 'package-json',
      path: '/root/beauty-platform/package.json',
      name: 'Root Package.json',
      category: 'config',
      description: 'Monorepo конфигурация с pnpm workspaces',
      priority: 'medium',
      tags: ['pnpm', 'monorepo', 'workspaces', 'dependencies'],
      editCommand: 'nano /root/beauty-platform/package.json'
    },
    {
      id: 'env-example',
      path: '/root/beauty-platform/.env.example',
      name: 'Environment Variables',
      category: 'config',
      description: 'Шаблон переменных окружения для всех сервисов',
      priority: 'low',
      tags: ['env', 'config', 'secrets', 'variables'],
      editCommand: 'nano /root/beauty-platform/.env.example'
    }
  ]

  const categories = [
    { id: 'all', name: 'Все файлы', icon: FileText, count: fileLinks.length },
    { id: 'frontend', name: 'Frontend', icon: Code, count: fileLinks.filter(f => f.category === 'frontend').length },
    { id: 'backend', name: 'Backend', icon: Terminal, count: fileLinks.filter(f => f.category === 'backend').length },
    { id: 'database', name: 'Database', icon: Database, count: fileLinks.filter(f => f.category === 'database').length },
    { id: 'config', name: 'Config', icon: Settings, count: fileLinks.filter(f => f.category === 'config').length },
    { id: 'docs', name: 'Docs', icon: FileText, count: fileLinks.filter(f => f.category === 'docs').length }
  ]

  const filteredFiles = fileLinks.filter(file => {
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesSearch
  })

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <Star className="w-4 h-4 text-red-600" />
      case 'high': return <Star className="w-4 h-4 text-orange-600" />
      case 'medium': return <Star className="w-4 h-4 text-blue-600" />
      default: return <Star className="w-4 h-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-200 bg-red-50'
      case 'high': return 'border-orange-200 bg-orange-50'
      case 'medium': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      frontend: <Code className="w-4 h-4 text-blue-600" />,
      backend: <Terminal className="w-4 h-4 text-green-600" />,
      database: <Database className="w-4 h-4 text-purple-600" />,
      config: <Settings className="w-4 h-4 text-orange-600" />,
      docs: <FileText className="w-4 h-4 text-gray-600" />
    }
    return iconMap[category as keyof typeof iconMap] || <FileText className="w-4 h-4" />
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const openVSCode = (path: string, lineNumber?: number) => {
    const command = lineNumber ? `code -g "${path}:${lineNumber}"` : `code "${path}"`
    copyToClipboard(command)
  }

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Folder className="w-6 h-6 text-purple-600" />
          🔗 Прямые ссылки на файлы
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Поиск */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск файлов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* Фильтры категорий */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                  <Badge variant="outline" className="ml-1 text-xs">
                    {category.count}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Статистика */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="text-lg font-bold text-red-600">
              {fileLinks.filter(f => f.priority === 'critical').length}
            </div>
            <div className="text-sm text-red-700">Критичные файлы</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="text-lg font-bold text-orange-600">
              {fileLinks.filter(f => f.priority === 'high').length}
            </div>
            <div className="text-sm text-orange-700">Высокий приоритет</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-lg font-bold text-blue-600">
              {fileLinks.filter(f => f.priority === 'medium').length}
            </div>
            <div className="text-sm text-blue-700">Средний приоритет</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-lg font-bold text-green-600">
              {filteredFiles.length}
            </div>
            <div className="text-sm text-green-700">Показано файлов</div>
          </div>
        </div>

        {/* Список файлов */}
        <div className="space-y-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className={`border ${getPriorityColor(file.priority)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    {getCategoryIcon(file.category)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{file.name}</h4>
                        {getPriorityIcon(file.priority)}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            file.category === 'frontend' ? 'bg-blue-100 text-blue-800' :
                            file.category === 'backend' ? 'bg-green-100 text-green-800' :
                            file.category === 'database' ? 'bg-purple-100 text-purple-800' :
                            file.category === 'config' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {file.category.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{file.description}</p>
                      
                      {/* Путь к файлу */}
                      <div className="bg-gray-900 text-green-400 p-2 rounded font-mono text-xs mb-2 flex items-center justify-between">
                        <span>{file.path}</span>
                        <button
                          onClick={() => copyToClipboard(file.path)}
                          className="text-gray-400 hover:text-green-400 ml-2"
                          title="Копировать путь"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Теги */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {file.tags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="text-xs bg-gray-100 text-gray-600"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Дата изменения */}
                      {file.lastModified && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          Изменен: {file.lastModified}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Действия */}
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {/* Команда редактирования */}
                  {file.editCommand && (
                    <button
                      onClick={() => copyToClipboard(file.editCommand!)}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      title="Копировать команду редактирования"
                    >
                      <Edit3 className="w-3 h-3" />
                      Редактировать
                    </button>
                  )}

                  {/* VS Code */}
                  <button
                    onClick={() => openVSCode(file.path, file.lineNumber)}
                    className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                    title="Открыть в VS Code"
                  >
                    <Code className="w-3 h-3" />
                    VS Code
                  </button>

                  {/* Просмотр */}
                  <button
                    onClick={() => copyToClipboard(`cat "${file.path}"`)}
                    className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    title="Команда для просмотра"
                  >
                    <Eye className="w-3 h-3" />
                    Просмотр
                  </button>

                  {/* Git blame */}
                  <button
                    onClick={() => copyToClipboard(`git blame "${file.path}"`)}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    title="Git blame"
                  >
                    <GitBranch className="w-3 h-3" />
                    Git blame
                  </button>

                  {/* Быстрые действия */}
                  {file.quickActions && file.quickActions.length > 0 && (
                    <button
                      onClick={() => setShowCommands(showCommands === file.id ? null : file.id)}
                      className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                    >
                      <Terminal className="w-3 h-3" />
                      Команды ({file.quickActions.length})
                    </button>
                  )}
                </div>

                {/* Быстрые команды */}
                {showCommands === file.id && file.quickActions && (
                  <div className="mt-3 p-3 bg-gray-900 text-green-400 rounded">
                    <div className="text-sm font-medium mb-2 text-white">Быстрые команды:</div>
                    {file.quickActions.map((command, index) => (
                      <div key={index} className="flex items-center justify-between mb-1 last:mb-0">
                        <code className="text-xs">{command}</code>
                        <button
                          onClick={() => copyToClipboard(command)}
                          className="text-gray-400 hover:text-green-400 ml-2"
                          title="Копировать команду"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredFiles.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Файлы не найдены. Попробуйте изменить фильтры или поисковый запрос.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FileLinker