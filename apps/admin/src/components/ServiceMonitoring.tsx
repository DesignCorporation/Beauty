import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  BellOff,
  Eye,
  BarChart3
} from 'lucide-react'
import { useServiceStatus } from '../hooks/useServiceStatus'

interface ServiceMonitoringProps {
  services: Array<{
    name: string
    port: number
    endpoint?: string
    url?: string
    description?: string
    critical?: boolean
  }>
}

interface ServiceEvent {
  timestamp: Date
  service: string
  event: 'up' | 'down' | 'slow'
  details?: string
  responseTime?: number | undefined
}

export const ServiceMonitoring: React.FC<ServiceMonitoringProps> = ({ services }) => {
  const { statuses, isChecking, checkAllServices } = useServiceStatus(services)
  const [events, setEvents] = useState<ServiceEvent[]>([])
  const [alerts, setAlerts] = useState<Record<string, boolean>>({})
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Мониторинг изменений статусов
  useEffect(() => {
    Object.values(statuses).forEach(status => {
      if (!status) return
      
      // Проверяем изменения статуса
      const lastEvent = events.find(e => e.service === status.name)
      const isNewEvent = !lastEvent || 
        (lastEvent.event === 'down' && status.status === 'online') ||
        (lastEvent.event === 'up' && status.status === 'offline')

      if (isNewEvent) {
        const newEvent: ServiceEvent = {
          timestamp: new Date(),
          service: status.name,
          event: status.status === 'online' ? 'up' : 'down',
          responseTime: status.responseTime
        }

        setEvents(prev => [newEvent, ...prev.slice(0, 49)]) // Храним последние 50 событий

        // Алерт для критичных сервисов
        const service = services.find(s => s.name === status.name)
        if (service?.critical && status.status === 'offline') {
          setAlerts(prev => ({ ...prev, [status.name]: true }))
        }
      }

      // Алерт на медленный ответ
      if (status.responseTime && status.responseTime > 3000) {
        const slowEvent: ServiceEvent = {
          timestamp: new Date(),
          service: status.name,
          event: 'slow',
          details: `Slow response: ${status.responseTime}ms`,
          responseTime: status.responseTime
        }
        setEvents(prev => [slowEvent, ...prev.slice(0, 49)])
      }
    })
  }, [statuses, services, events])

  const getServiceHealth = () => {
    const total = Object.keys(statuses).length
    const online = Object.values(statuses).filter(s => s?.status === 'online').length
    const offline = Object.values(statuses).filter(s => s?.status === 'offline').length
    
    return { total, online, offline, percentage: total ? Math.round((online / total) * 100) : 0 }
  }

  const dismissAlert = (serviceName: string) => {
    setAlerts(prev => ({ ...prev, [serviceName]: false }))
  }

  const formatEventTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const health = getServiceHealth()

  return (
    <div className="space-y-6">
      {/* Алерты */}
      {Object.entries(alerts).some(([_, active]) => active) && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              🚨 Критичные алерты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(alerts).map(([serviceName, active]) => 
                active && (
                  <div key={serviceName} className="flex items-center justify-between bg-red-100 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-red-900">{serviceName} недоступен</span>
                    </div>
                    <button
                      onClick={() => dismissAlert(serviceName)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <BellOff className="w-4 h-4" />
                    </button>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Общее здоровье системы */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            📊 Здоровье системы
          </CardTitle>
          <div className="flex items-center gap-4">
            <button
              onClick={checkAllServices}
              disabled={isChecking}
              className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Проверка...' : 'Обновить'}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <Eye className="w-4 h-4" />
              {showHistory ? 'Скрыть историю' : 'История событий'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{health.online}/{health.total}</div>
              <div className="text-sm text-green-700">Сервисов онлайн</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{health.percentage}%</div>
              <div className="text-sm text-blue-700">Доступность</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{health.offline}</div>
              <div className="text-sm text-red-700">Недоступно</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{events.length}</div>
              <div className="text-sm text-purple-700">Событий сегодня</div>
            </div>
          </div>

          {/* Прогресс-бар общего здоровья */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Общее здоровье системы</span>
              <span>{health.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${
                  health.percentage > 80 ? 'bg-green-600' : 
                  health.percentage > 60 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${health.percentage}%` }}
              />
            </div>
          </div>

          {/* Детальная таблица сервисов */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Сервис</th>
                  <th className="px-4 py-2 text-left">Статус</th>
                  <th className="px-4 py-2 text-left">Время ответа</th>
                  <th className="px-4 py-2 text-left">Последняя проверка</th>
                  <th className="px-4 py-2 text-left">Действия</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => {
                  const status = statuses[service.name]
                  const isSelected = selectedService === service.name
                  
                  return (
                    <tr 
                      key={service.name} 
                      className={`border-t cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedService(isSelected ? null : service.name)}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{service.name}</span>
                          {service.critical && (
                            <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">
                              CRITICAL
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">:{service.port} • {service.description}</div>
                      </td>
                      <td className="px-4 py-2">
                        {status ? (
                          <div className="flex items-center gap-2">
                            {status.status === 'online' && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {status.status === 'offline' && <XCircle className="w-4 h-4 text-red-600" />}
                            {status.status === 'checking' && <Clock className="w-4 h-4 text-yellow-600" />}
                            <span className={
                              status.status === 'online' ? 'text-green-600 font-medium' :
                              status.status === 'offline' ? 'text-red-600 font-medium' :
                              'text-yellow-600 font-medium'
                            }>
                              {status.status.toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Загрузка...</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {status?.responseTime && (
                          <div className="flex items-center gap-1">
                            <span className={
                              status.responseTime < 500 ? 'text-green-600' :
                              status.responseTime < 2000 ? 'text-yellow-600' : 'text-red-600'
                            }>
                              {status.responseTime}ms
                            </span>
                            {status.responseTime < 500 && <TrendingUp className="w-3 h-3 text-green-600" />}
                            {status.responseTime > 2000 && <TrendingDown className="w-3 h-3 text-red-600" />}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {status?.lastChecked && formatEventTime(status.lastChecked)}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {service.url && (
                            <a 
                              href={service.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              🔗 Открыть
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Здесь можно добавить индивидуальную проверку сервиса
                            }}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* История событий */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              📜 История событий
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Событий пока нет</p>
              ) : (
                events.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {event.event === 'up' && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {event.event === 'down' && <XCircle className="w-4 h-4 text-red-600" />}
                      {event.event === 'slow' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                      <div>
                        <span className="font-medium">{event.service}</span>
                        <span className="ml-2 text-sm text-gray-600">
                          {event.event === 'up' && 'сервис восстановлен'}
                          {event.event === 'down' && 'сервис недоступен'}
                          {event.event === 'slow' && event.details}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatEventTime(event.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ServiceMonitoring