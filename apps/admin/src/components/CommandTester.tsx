import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui'
import {
  Terminal,
  Play,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Eye,
  EyeOff
} from 'lucide-react'

interface CommandTest {
  id: string
  name: string
  description: string
  command: string
  expectedOutput?: string
  category: 'curl' | 'bash' | 'npm' | 'git' | 'custom'
  critical?: boolean
}

interface TestResult {
  success: boolean
  output: string
  error?: string | undefined
  duration: number
  timestamp: Date
}

interface CommandTesterProps {
  commands: CommandTest[]
  title?: string
}

export const CommandTester: React.FC<CommandTesterProps> = ({ 
  commands, 
  title = "🧪 Тестирование команд" 
}) => {
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [runningCommands, setRunningCommands] = useState<Set<string>>(new Set())
  const [showOutput, setShowOutput] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<string>('all')

  const executeCommand = async (test: CommandTest) => {
    if (runningCommands.has(test.id)) return

    setRunningCommands(prev => new Set([...prev, test.id]))
    const startTime = Date.now()

    try {
      // Симуляция выполнения команды (в реальности здесь был бы API вызов)
      const response = await simulateCommand(test)
      
      const result: TestResult = {
        success: response.success,
        output: response.output,
        error: response.error,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }

      setResults(prev => ({ ...prev, [test.id]: result }))
    } catch (error) {
      const result: TestResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: new Date()
      }

      setResults(prev => ({ ...prev, [test.id]: result }))
    } finally {
      setRunningCommands(prev => {
        const newSet = new Set(prev)
        newSet.delete(test.id)
        return newSet
      })
    }
  }

  // Симуляция выполнения команды (в реальности это был бы API endpoint)
  const simulateCommand = async (test: CommandTest): Promise<{success: boolean, output: string, error?: string | undefined}> => {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500)) // 0.5-2.5 секунды

    // Симуляция разных результатов в зависимости от команды
    if (test.command.includes('curl') && test.command.includes('localhost')) {
      return {
        success: false,
        output: '',
        error: 'curl: (7) Failed to connect to localhost: Connection refused'
      }
    }

    if (test.command.includes('pm2 list')) {
      return {
        success: true,
        output: `┌─────┬────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name               │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 8   │ beauty-admin-panel │ default     │ N/A     │ fork    │ 411001   │ 14m    │ 12   │ online    │ 0%       │ 0b       │ root     │ disabled │
│ 21  │ auth-service-6021  │ default     │ N/A     │ fork    │ 234567   │ 1h     │ 0    │ online    │ 0.1%     │ 45.2mb   │ root     │ disabled │
└─────┴────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘`
      }
    }

    if (test.command.includes('health')) {
      return {
        success: Math.random() > 0.5,
        output: Math.random() > 0.5 ? '{"status":"ok","timestamp":"2025-08-22T18:30:00.000Z"}' : '',
        error: Math.random() > 0.5 ? undefined : 'Service unavailable'
      }
    }

    return {
      success: Math.random() > 0.3, // 70% success rate
      output: test.expectedOutput || 'Command executed successfully',
      error: Math.random() > 0.7 ? 'Random error for demo' : undefined
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const toggleOutput = (commandId: string) => {
    setShowOutput(prev => ({ ...prev, [commandId]: !prev[commandId] }))
  }

  const getStatusIcon = (test: CommandTest) => {
    const result = results[test.id]
    const isRunning = runningCommands.has(test.id)

    if (isRunning) return <Clock className="w-4 h-4 text-yellow-600 animate-spin" />
    if (!result) return <Terminal className="w-4 h-4 text-gray-400" />
    if (result.success) return <CheckCircle className="w-4 h-4 text-green-600" />
    return <XCircle className="w-4 h-4 text-red-600" />
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      curl: 'bg-blue-100 text-blue-800',
      bash: 'bg-green-100 text-green-800', 
      npm: 'bg-red-100 text-red-800',
      git: 'bg-purple-100 text-purple-800',
      custom: 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || colors.custom
  }

  const filteredCommands = filter === 'all' 
    ? commands 
    : commands.filter(cmd => cmd.category === filter)

  const runAllTests = async () => {
    for (const command of filteredCommands) {
      if (!runningCommands.has(command.id)) {
        executeCommand(command)
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay between commands
      }
    }
  }

  const getOverallStatus = () => {
    const tested = filteredCommands.filter(cmd => results[cmd.id])
    const successful = tested.filter(cmd => results[cmd.id]?.success)
    
    return {
      total: filteredCommands.length,
      tested: tested.length,
      successful: successful.length,
      running: runningCommands.size
    }
  }

  const status = getOverallStatus()

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-purple-600" />
          {title}
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 border rounded-lg"
            >
              <option value="all">Все команды</option>
              <option value="curl">cURL тесты</option>
              <option value="bash">Bash команды</option>
              <option value="npm">NPM команды</option>
              <option value="git">Git команды</option>
            </select>
            <Badge variant="outline" className="bg-purple-100 text-purple-800">
              {status.successful}/{status.tested} успешно
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAllTests}
              disabled={status.running > 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {status.running > 0 ? `Выполняется ${status.running}...` : 'Запустить все'}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Прогресс */}
        {status.tested > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Прогресс тестирования</span>
              <span>{Math.round((status.successful / status.tested) * 100)}% успешно</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${(status.tested / status.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Список команд */}
        <div className="space-y-4">
          {filteredCommands.map((test) => {
            const result = results[test.id]
            const isRunning = runningCommands.has(test.id)
            const hasOutput = showOutput[test.id]

            return (
              <div key={test.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test)}
                    <div>
                      <h4 className="font-medium">{test.name}</h4>
                      <p className="text-sm text-gray-600">{test.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getCategoryColor(test.category)}>
                      {test.category.toUpperCase()}
                    </Badge>
                    {test.critical && (
                      <Badge variant="outline" className="bg-red-100 text-red-800">
                        CRITICAL
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Команда */}
                <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm mb-3">
                  <div className="flex items-center justify-between">
                    <code className="flex-1">{test.command}</code>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => copyToClipboard(test.command)}
                        className="p-1 text-gray-400 hover:text-green-400"
                        title="Копировать команду"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => executeCommand(test)}
                        disabled={isRunning}
                        className="p-1 text-gray-400 hover:text-green-400 disabled:opacity-50"
                        title="Выполнить команду"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Результат */}
                {result && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          result.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {result.success ? 'Успешно' : 'Ошибка'}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({result.duration}ms • {result.timestamp.toLocaleTimeString()})
                        </span>
                      </div>
                      {(result.output || result.error) && (
                        <button
                          onClick={() => toggleOutput(test.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {hasOutput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {/* Вывод команды */}
                    {hasOutput && (result.output || result.error) && (
                      <div className="bg-gray-50 border rounded-lg p-3">
                        {result.output && (
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Вывод:</div>
                            <pre className="text-sm bg-white p-2 rounded border overflow-x-auto">
                              {result.output}
                            </pre>
                          </div>
                        )}
                        {result.error && (
                          <div className="mt-2">
                            <div className="text-xs text-red-600 mb-1">Ошибка:</div>
                            <pre className="text-sm bg-red-50 text-red-700 p-2 rounded border overflow-x-auto">
                              {result.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Экспорт результатов */}
        {status.tested > 0 && (
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={() => {
                const report = {
                  timestamp: new Date().toISOString(),
                  summary: status,
                  results: Object.entries(results).map(([id, result]) => ({
                    command: commands.find(c => c.id === id)?.name,
                    success: result.success,
                    duration: result.duration,
                    output: result.output,
                    error: result.error
                  }))
                }
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `test-results-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
              }}
              className="flex items-center gap-2 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <Download className="w-4 h-4" />
              Экспорт результатов
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CommandTester