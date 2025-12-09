import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui'
import {
  Wand2,
  Copy,
  Play,
  RefreshCw,
  Code,
  Database,
  Globe,
  Lock,
  Terminal
} from 'lucide-react'

interface CommandTemplate {
  id: string
  name: string
  description: string
  template: string
  category: 'auth' | 'database' | 'testing' | 'deployment' | 'monitoring'
  variables: Array<{
    key: string
    label: string
    type: 'text' | 'select' | 'number' | 'email'
    default?: string
    options?: string[]
    placeholder?: string
    required?: boolean
  }>
  examples?: string[]
}

interface DynamicCommandGeneratorProps {
  onCommandGenerated?: (command: string) => void
}

export const DynamicCommandGenerator: React.FC<DynamicCommandGeneratorProps> = ({
  onCommandGenerated
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [generatedCommand, setGeneratedCommand] = useState<string>('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])

  const commandTemplates: CommandTemplate[] = [
    {
      id: 'user-login-test',
      name: 'Тест логина пользователя',
      description: 'Проверка аутентификации с подставляемыми данными',
      template: 'curl -X POST http://localhost:6021/auth/login -H "Content-Type: application/json" -d \'{"email":"{{email}}","password":"{{password}}","salonSlug":"{{salonSlug}}"}\'',
      category: 'auth',
      variables: [
        { key: 'email', label: 'Email пользователя', type: 'email', default: 'owner@beauty-test-salon.ru', placeholder: 'user@example.com', required: true },
        { key: 'password', label: 'Пароль', type: 'text', default: 'owner123', placeholder: 'password', required: true },
        { key: 'salonSlug', label: 'Slug салона', type: 'select', default: 'beauty-test-salon', options: ['beauty-test-salon', 'test-beauty-dc', 'test-beauty-salon'], required: true }
      ],
      examples: [
        'Админ: admin@beauty-platform.com / admin123',
        'Владелец: owner@beauty-test-salon.ru / owner123 / beauty-test-salon',
        'Сотрудник: staff@test.com / staff123 / beauty-test-salon'
      ]
    },
    {
      id: 'db-query-users',
      name: 'Запрос пользователей из БД',
      description: 'Получение списка пользователей для салона',
      template: 'PGPASSWORD={{dbPassword}} psql -h {{dbHost}} -U {{dbUser}} -d {{dbName}} -c "SELECT id, first_name, last_name, email, role FROM users WHERE salon_id = {{salonId}} LIMIT {{limit}};"',
      category: 'database',
      variables: [
        { key: 'dbPassword', label: 'Пароль БД', type: 'text', default: 'your_secure_password_123', required: true },
        { key: 'dbHost', label: 'Хост БД', type: 'text', default: 'localhost', required: true },
        { key: 'dbUser', label: 'Пользователь БД', type: 'text', default: 'beauty_crm_user', required: true },
        { key: 'dbName', label: 'Имя БД', type: 'select', default: 'beauty_platform_new', options: ['beauty_platform_new', 'beauty_crm', 'beauty_audit'], required: true },
        { key: 'salonId', label: 'ID салона', type: 'select', default: '2', options: ['1', '2', '3'], required: true },
        { key: 'limit', label: 'Лимит записей', type: 'number', default: '10', required: true }
      ]
    },
    {
      id: 'service-health-check',
      name: 'Проверка здоровья сервиса',
      description: 'Проверка статуса любого сервиса',
      template: 'curl -s {{protocol}}://{{host}}:{{port}}{{healthEndpoint}} | jq .',
      category: 'monitoring',
      variables: [
        { key: 'protocol', label: 'Протокол', type: 'select', default: 'http', options: ['http', 'https'], required: true },
        { key: 'host', label: 'Хост', type: 'text', default: 'localhost', placeholder: 'localhost или IP', required: true },
        { key: 'port', label: 'Порт', type: 'select', default: '6021', options: ['6020', '6021', '6022', '6023', '6024', '6025', '6026'], required: true },
        { key: 'healthEndpoint', label: 'Health endpoint', type: 'text', default: '/health', placeholder: '/health или /status', required: true }
      ],
      examples: [
        'Auth Service: http://localhost:6021/health',
        'API Gateway: http://localhost:6020/health',
        'MCP Server: http://localhost:6025/health'
      ]
    },
    {
      id: 'mfa-setup',
      name: 'Настройка MFA для пользователя',
      description: 'Генерация TOTP секрета и QR кода',
      template: 'curl -X POST http://localhost:6021/auth/mfa/setup -H "Content-Type: application/json" -d \'{"userId":"{{userId}}","method":"{{method}}"}\'',
      category: 'auth',
      variables: [
        { key: 'userId', label: 'ID пользователя', type: 'text', default: 'admin', placeholder: 'user ID или email', required: true },
        { key: 'method', label: 'Метод MFA', type: 'select', default: 'totp', options: ['totp', 'email', 'sms'], required: true }
      ]
    },
    {
      id: 'deployment-check',
      name: 'Проверка деплоймента',
      description: 'Комплексная проверка после деплоя',
      template: 'echo "=== Проверка деплоймента {{deploymentName}} ===" && curl -s -w "HTTP: %{http_code} | Time: %{time_total}s\\n" {{appUrl}} && pm2 list | grep {{processName}} && echo "=== Логи ===" && pm2 logs {{processName}} --lines {{logLines}}',
      category: 'deployment',
      variables: [
        { key: 'deploymentName', label: 'Название деплоймента', type: 'text', default: 'beauty-platform', placeholder: 'название проекта', required: true },
        { key: 'appUrl', label: 'URL приложения', type: 'select', default: 'https://test-admin.beauty.designcorp.eu', options: ['https://test-admin.beauty.designcorp.eu', 'https://test-crm.beauty.designcorp.eu', 'https://client.beauty.designcorp.eu'], required: true },
        { key: 'processName', label: 'Имя процесса PM2', type: 'select', default: 'beauty-admin-panel-6002', options: ['beauty-admin-panel-6002', 'auth-service-6021', 'api-gateway-6020'], required: true },
        { key: 'logLines', label: 'Строк логов', type: 'number', default: '20', required: true }
      ]
    },
    {
      id: 'tenant-data-check',
      name: 'Проверка данных салона',
      description: 'Проверка изоляции данных между салонами',
      template: 'echo "=== Салон {{salonName}} (ID: {{salonId}}) ===" && PGPASSWORD={{dbPassword}} psql -h localhost -U beauty_crm_user -d beauty_platform_new -c "SELECT \'Пользователей:\' as type, COUNT(*) as count FROM users WHERE salon_id = {{salonId}} UNION SELECT \'Клиентов:\', COUNT(*) FROM clients WHERE salon_id = {{salonId}} UNION SELECT \'Записей:\', COUNT(*) FROM appointments WHERE salon_id = {{salonId}};"',
      category: 'testing',
      variables: [
        { key: 'salonName', label: 'Название салона', type: 'select', default: 'Beauty Test Salon', options: ['Beauty Test Salon', 'Test Beauty DC', 'Test Beauty Salon'], required: true },
        { key: 'salonId', label: 'ID салона', type: 'select', default: '2', options: ['1', '2', '3'], required: true },
        { key: 'dbPassword', label: 'Пароль БД', type: 'text', default: 'your_secure_password_123', required: true }
      ]
    }
  ]

  // Автозаполнение переменных при выборе шаблона
  useEffect(() => {
    if (selectedTemplate) {
      const template = commandTemplates.find(t => t.id === selectedTemplate)
      if (template) {
        const newVariables: Record<string, string> = {}
        template.variables.forEach(variable => {
          newVariables[variable.key] = variable.default || ''
        })
        setVariables(newVariables)
      }
    }
  }, [selectedTemplate])

  // Генерация команды при изменении переменных
  useEffect(() => {
    if (selectedTemplate) {
      const template = commandTemplates.find(t => t.id === selectedTemplate)
      if (template) {
        let command = template.template
        Object.entries(variables).forEach(([key, value]) => {
          command = command.replace(new RegExp(`{{${key}}}`, 'g'), value)
        })
        setGeneratedCommand(command)
      }
    }
  }, [selectedTemplate, variables])

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }))
  }

  const copyCommand = () => {
    navigator.clipboard.writeText(generatedCommand)
  }

  const executeCommand = () => {
    onCommandGenerated?.(generatedCommand)
    // Добавляем в историю
    setCommandHistory(prev => [generatedCommand, ...prev.slice(0, 9)]) // Храним последние 10
  }

  const loadFromHistory = (command: string) => {
    setGeneratedCommand(command)
  }

  const selectedTemplateData = commandTemplates.find(t => t.id === selectedTemplate)

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth': return <Lock className="w-4 h-4" />
      case 'database': return <Database className="w-4 h-4" />
      case 'testing': return <Terminal className="w-4 h-4" />
      case 'deployment': return <Globe className="w-4 h-4" />
      case 'monitoring': return <RefreshCw className="w-4 h-4" />
      default: return <Code className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth': return 'bg-red-100 text-red-800'
      case 'database': return 'bg-blue-100 text-blue-800'
      case 'testing': return 'bg-green-100 text-green-800'
      case 'deployment': return 'bg-purple-100 text-purple-800'
      case 'monitoring': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="border-2 border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Wand2 className="w-6 h-6 text-emerald-600" />
          ⚡ Динамический генератор команд
        </CardTitle>
        <p className="text-gray-600">
          Автоматическая подстановка переменных в команды для быстрого тестирования
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Выбор шаблона */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Выберите тип команды:
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">-- Выберите шаблон команды --</option>
            {commandTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.category})
              </option>
            ))}
          </select>
        </div>

        {/* Информация о выбранном шаблоне */}
        {selectedTemplateData && (
          <Card className="bg-gray-50 border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{selectedTemplateData.name}</h4>
                <Badge variant="outline" className={getCategoryColor(selectedTemplateData.category)}>
                  {getCategoryIcon(selectedTemplateData.category)}
                  <span className="ml-1">{selectedTemplateData.category.toUpperCase()}</span>
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">{selectedTemplateData.description}</p>
              
              {selectedTemplateData.examples && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Примеры использования:</div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {selectedTemplateData.examples.map((example, index) => (
                      <li key={index}>• {example}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Настройка переменных */}
        {selectedTemplateData && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Настройка параметров:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedTemplateData.variables.map((variable) => (
                <div key={variable.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {variable.label}
                    {variable.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {variable.type === 'select' ? (
                    <select
                      value={variables[variable.key] || ''}
                      onChange={(e) => handleVariableChange(variable.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {variable.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={variable.type}
                      value={variables[variable.key] || ''}
                      onChange={(e) => handleVariableChange(variable.key, e.target.value)}
                      placeholder={variable.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Сгенерированная команда */}
        {generatedCommand && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Сгенерированная команда:</h4>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <div className="flex items-start justify-between">
                <pre className="flex-1 whitespace-pre-wrap break-all">{generatedCommand}</pre>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={copyCommand}
                    className="p-1 text-gray-400 hover:text-green-400"
                    title="Копировать команду"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={executeCommand}
                    className="p-1 text-gray-400 hover:text-green-400"
                    title="Выполнить команду"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* История команд */}
        {commandHistory.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">История команд:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {commandHistory.map((command, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 p-3 rounded-lg border cursor-pointer hover:bg-gray-100"
                  onClick={() => loadFromHistory(command)}
                >
                  <code className="text-xs text-gray-700 break-all">{command}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DynamicCommandGenerator