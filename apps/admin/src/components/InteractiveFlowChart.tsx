import React, { useState } from 'react'
import { Card, CardContent, Badge } from '@beauty-platform/ui'
import { ChevronRight, Play, Pause, RotateCcw, Eye, Code, Terminal } from 'lucide-react'

interface FlowStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'active' | 'success' | 'error' | 'warning'
  details?: string
  code?: string
  command?: string
  endpoint?: string
  expectedResponse?: string
}

interface InteractiveFlowChartProps {
  title: string
  steps: FlowStep[]
  onStepClick?: (step: FlowStep) => void
  autoPlay?: boolean
}

export const InteractiveFlowChart: React.FC<InteractiveFlowChartProps> = ({
  title,
  steps,
  onStepClick
}) => {
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [playState, setPlayState] = useState<'stopped' | 'playing' | 'paused'>('stopped')
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})

  const getStepColor = (step: FlowStep, isActive: boolean) => {
    if (isActive) return 'border-blue-500 bg-blue-50'
    
    switch (step.status) {
      case 'success':
        return 'border-green-500 bg-green-50'
      case 'error':
        return 'border-red-500 bg-red-50'
      case 'warning':
        return 'border-yellow-500 bg-yellow-50'
      case 'active':
        return 'border-blue-500 bg-blue-50 animate-pulse'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  const getStepIcon = (step: FlowStep) => {
    switch (step.status) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'active':
        return '⚡'
      default:
        return '⚪'
    }
  }

  const handleStepClick = (step: FlowStep) => {
    setActiveStep(activeStep === step.id ? null : step.id)
    onStepClick?.(step)
  }

  const toggleDetails = (stepId: string) => {
    setShowDetails(prev => ({ ...prev, [stepId]: !prev[stepId] }))
  }

  const playFlow = () => {
    if (playState === 'playing') {
      setPlayState('paused')
      return
    }

    setPlayState('playing')
    setCurrentStepIndex(0)

    const playInterval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= steps.length - 1) {
          setPlayState('stopped')
          clearInterval(playInterval)
          return 0
        }
        return prev + 1
      })
    }, 2000) // 2 секунды на шаг
  }

  const resetFlow = () => {
    setPlayState('stopped')
    setCurrentStepIndex(0)
    setActiveStep(null)
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={playFlow}
              className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              {playState === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playState === 'playing' ? 'Пауза' : 'Проиграть'}
            </button>
            <button
              onClick={resetFlow}
              className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <RotateCcw className="w-4 h-4" />
              Сброс
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = activeStep === step.id || (playState === 'playing' && currentStepIndex === index)
            const isPlaying = playState === 'playing' && currentStepIndex === index
            
            return (
              <div key={step.id} className="relative">
                {/* Соединительная линия */}
                {index < steps.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300" />
                )}
                
                {/* Шаг */}
                <div
                  className={`
                    flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${getStepColor(step, isActive)}
                    ${isPlaying ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                    hover:shadow-md
                  `}
                  onClick={() => handleStepClick(step)}
                >
                  {/* Иконка шага */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center text-lg">
                    {getStepIcon(step)}
                  </div>
                  
                  {/* Содержимое шага */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{step.title}</h4>
                      <div className="flex items-center gap-2">
                        {step.status !== 'pending' && (
                          <Badge variant="outline" className={
                            step.status === 'success' ? 'bg-green-100 text-green-800' :
                            step.status === 'error' ? 'bg-red-100 text-red-800' :
                            step.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {step.status.toUpperCase()}
                          </Badge>
                        )}
                        {(step.code || step.command || step.endpoint) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleDetails(step.id)
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight 
                          className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    
                    {step.details && (
                      <p className="text-xs text-gray-500 mt-2">{step.details}</p>
                    )}
                  </div>
                </div>

                {/* Детали шага */}
                {(isActive || showDetails[step.id]) && (
                  <div className="ml-12 mt-2 space-y-3">
                    {/* Код */}
                    {step.code && (
                      <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="w-4 h-4" />
                          <span className="text-gray-300">Код:</span>
                        </div>
                        <pre className="whitespace-pre-wrap">{step.code}</pre>
                      </div>
                    )}
                    
                    {/* Команда */}
                    {step.command && (
                      <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Terminal className="w-4 h-4" />
                          <span className="text-gray-300">Команда:</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <code>{step.command}</code>
                          <button
                            onClick={() => navigator.clipboard.writeText(step.command!)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Копировать
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* API endpoint */}
                    {step.endpoint && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                        <div className="font-medium text-blue-900 mb-1">API Endpoint:</div>
                        <code className="text-blue-700">{step.endpoint}</code>
                        {step.expectedResponse && (
                          <div className="mt-2">
                            <div className="text-sm text-blue-700">Ожидаемый ответ:</div>
                            <pre className="text-xs bg-blue-100 p-2 rounded mt-1">{step.expectedResponse}</pre>
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

        {/* Общий прогресс */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Прогресс выполнения</span>
            <span>{Math.round((currentStepIndex / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStepIndex / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default InteractiveFlowChart