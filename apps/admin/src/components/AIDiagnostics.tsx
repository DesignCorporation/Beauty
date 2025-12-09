import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui'
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Lightbulb,
  Wrench,
  FileText,
  RefreshCw
} from 'lucide-react'

interface Diagnostic {
  id: string
  category: 'error' | 'warning' | 'info' | 'success'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number // 0-100
  solution: string
  commands?: string[]
  files?: string[]
  estimatedTime?: string
}

interface AIDiagnosticsProps {
  systemData?: {
    services: any[]
    errors: string[]
    logs: string[]
  }
}

export const AIDiagnostics: React.FC<AIDiagnosticsProps> = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [analysisProgress, setAnalysisProgress] = useState(0)

  const runDiagnostics = async () => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setDiagnostics([])

    // Симуляция AI анализа с прогрессом
    const steps = [
      'Анализ статуса сервисов...',
      'Проверка логов ошибок...',
      'Анализ конфигураций...',
      'Оценка производительности...',
      'Генерация рекомендаций...'
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setAnalysisProgress(((i + 1) / steps.length) * 100)
    }

    // Симуляция результатов AI анализа
    const mockDiagnostics: Diagnostic[] = [
      {
        id: 'auth-service-down',
        category: 'error',
        title: 'Auth Service недоступен',
        description: 'Сервис аутентификации не отвечает на порту 6021. Это критично для работы всей системы.',
        impact: 'high',
        confidence: 95,
        solution: 'Перезапустить Auth Service через PM2 и проверить логи на наличие ошибок.',
        commands: [
          'pm2 restart auth-service-6021',
          'pm2 logs auth-service-6021 --lines 20',
          'curl -s http://localhost:6021/health'
        ],
        files: [
          '/root/beauty-platform/services/auth-service/src/index.js',
          '/root/beauty-platform/services/auth-service/.env'
        ],
        estimatedTime: '5-10 минут'
      },
      {
        id: 'nginx-routing',
        category: 'error',
        title: 'Неправильная настройка nginx',
        description: 'Маршрутизация /api/auth/* не работает. Запросы не доходят до Auth Service.',
        impact: 'high',
        confidence: 87,
        solution: 'Проверить и исправить конфигурацию nginx для проксирования API запросов.',
        commands: [
          'sudo nginx -t',
          'sudo systemctl reload nginx',
          'curl -I http://localhost/api/auth/health'
        ],
        files: [
          '/etc/nginx/sites-available/beauty-crm.conf',
          '/etc/nginx/nginx.conf'
        ],
        estimatedTime: '15-20 минут'
      },
      {
        id: 'cors-issues',
        category: 'warning',
        title: 'Проблемы с CORS',
        description: 'Браузер блокирует установку cookies из-за неправильных CORS настроек.',
        impact: 'medium',
        confidence: 78,
        solution: 'Добавить правильные CORS заголовки в Auth Service для работы с cookies.',
        commands: [
          'grep -r "cors" /root/beauty-platform/services/auth-service/',
          'curl -H "Origin: https://test-crm.beauty.designcorp.eu" -I http://localhost:6021/auth/login'
        ],
        files: [
          '/root/beauty-platform/services/auth-service/src/middleware/cors.js'
        ],
        estimatedTime: '10-15 минут'
      },
      {
        id: 'db-performance',
        category: 'warning',
        title: 'Медленные запросы к БД',
        description: 'Обнаружены запросы к PostgreSQL с временем выполнения > 2 секунд.',
        impact: 'medium',
        confidence: 65,
        solution: 'Добавить индексы для часто используемых запросов и оптимизировать Prisma queries.',
        commands: [
          'PGPASSWORD=password psql -h localhost -U beauty_crm_user -d beauty_platform_new -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"'
        ],
        files: [
          '/root/beauty-platform/core/database/schema.prisma'
        ],
        estimatedTime: '30-45 минут'
      },
      {
        id: 'mcp-healthy',
        category: 'success',
        title: 'MCP Server работает стабильно',
        description: 'AI сервер контекста отвечает быстро и предоставляет актуальные данные.',
        impact: 'low',
        confidence: 92,
        solution: 'Никаких действий не требуется. Продолжать мониторинг.',
        commands: [],
        files: [],
        estimatedTime: 'Готово'
      },
      {
        id: 'security-check',
        category: 'info',
        title: 'Рекомендация по безопасности',
        description: 'Некоторые сервисы доступны без HTTPS. Рекомендуется настроить SSL для всех внутренних соединений.',
        impact: 'low',
        confidence: 70,
        solution: 'Настроить внутренние TLS сертификаты для сервисов и обновить конфигурации.',
        commands: [
          'openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout internal.key -out internal.crt'
        ],
        files: [
          '/etc/ssl/internal/',
          '/root/beauty-platform/docker-compose.yml'
        ],
        estimatedTime: '1-2 часа'
      }
    ]

    setDiagnostics(mockDiagnostics)
    setIsAnalyzing(false)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />
      default: return <FileText className="w-5 h-5 text-blue-600" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'error': return 'border-red-200 bg-red-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      case 'success': return 'border-green-200 bg-green-50'
      default: return 'border-blue-200 bg-blue-50'
    }
  }

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    }
    return (
      <Badge variant="outline" className={colors[impact as keyof typeof colors]}>
        {impact.toUpperCase()}
      </Badge>
    )
  }

  const filteredDiagnostics = selectedCategory === 'all' 
    ? diagnostics 
    : diagnostics.filter(d => d.category === selectedCategory)

  const getStats = () => {
    const errors = diagnostics.filter(d => d.category === 'error').length
    const warnings = diagnostics.filter(d => d.category === 'warning').length
    const success = diagnostics.filter(d => d.category === 'success').length
    const highImpact = diagnostics.filter(d => d.impact === 'high').length
    
    return { errors, warnings, success, highImpact }
  }

  const stats = getStats()

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-indigo-600" />
          🤖 AI Диагностика системы
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 border rounded-lg"
            >
              <option value="all">Все результаты</option>
              <option value="error">Ошибки</option>
              <option value="warning">Предупреждения</option>
              <option value="success">Успешные проверки</option>
              <option value="info">Информация</option>
            </select>
            {diagnostics.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  {stats.errors} ошибок
                </Badge>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                  {stats.warnings} предупреждений
                </Badge>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {stats.success} OK
                </Badge>
              </div>
            )}
          </div>
          <button
            onClick={runDiagnostics}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Анализирую...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Запустить диагностику
              </>
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Прогресс анализа */}
        {isAnalyzing && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>AI анализ системы</span>
              <span>{Math.round(analysisProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Статистика */}
        {diagnostics.length > 0 && !isAnalyzing && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <div className="text-sm text-red-700">Критичных ошибок</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
              <div className="text-sm text-yellow-700">Предупреждений</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              <div className="text-sm text-green-700">Все в порядке</div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-600">{stats.highImpact}</div>
              <div className="text-sm text-indigo-700">Высокий приоритет</div>
            </div>
          </div>
        )}

        {/* Результаты диагностики */}
        {filteredDiagnostics.length > 0 ? (
          <div className="space-y-4">
            {filteredDiagnostics.map((diagnostic) => (
              <Card key={diagnostic.id} className={`border ${getCategoryColor(diagnostic.category)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(diagnostic.category)}
                      <div>
                        <h4 className="font-semibold text-gray-900">{diagnostic.title}</h4>
                        <p className="text-sm text-gray-600">{diagnostic.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getImpactBadge(diagnostic.impact)}
                      <Badge variant="outline" className="bg-gray-100 text-gray-800">
                        {diagnostic.confidence}% уверенность
                      </Badge>
                    </div>
                  </div>

                  {/* Решение */}
                  <div className="bg-white p-3 rounded-lg border mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium text-gray-900">Рекомендуемое решение:</span>
                    </div>
                    <p className="text-sm text-gray-700">{diagnostic.solution}</p>
                  </div>

                  {/* Команды */}
                  {diagnostic.commands && diagnostic.commands.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">Команды для исправления:</span>
                      </div>
                      <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm space-y-1">
                        {diagnostic.commands.map((command, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <code>{command}</code>
                            <button
                              onClick={() => navigator.clipboard.writeText(command)}
                              className="text-gray-400 hover:text-green-400 ml-2"
                            >
                              📋
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Файлы для редактирования */}
                  {diagnostic.files && diagnostic.files.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-gray-900">Файлы для проверки:</span>
                      </div>
                      <div className="space-y-1">
                        {diagnostic.files.map((file, index) => (
                          <div key={index} className="text-sm text-blue-600 hover:underline cursor-pointer">
                            📁 {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Время выполнения */}
                  {diagnostic.estimatedTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Ориентировочное время: {diagnostic.estimatedTime}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          !isAnalyzing && (
            <div className="text-center py-8">
              <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                AI диагностика поможет найти и исправить проблемы в системе
              </p>
              <button
                onClick={runDiagnostics}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Начать анализ
              </button>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}

export default AIDiagnostics