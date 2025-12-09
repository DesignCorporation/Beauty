import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, Alert, AlertDescription } from '@beauty-platform/ui'
import { Shield, Lock, AlertTriangle, RefreshCw, Activity, Users, FileText } from 'lucide-react'
import { MFAManagement } from '../components/security/MFAManagement'
import { DeviceSessionsPanel } from '../components/security/DeviceSessionsPanel'
import { apiService } from '../services/api'

interface SecurityStats {
  mfa: {
    totalUsers: number
    enabledUsers: number
    activeSessions: number
  }
  security: {
    totalEvents: number
    recentFailures: number
    blockedIPs: number
    avgRiskScore: number
    rateLimitEvents: number
  }
  recentEvents: Array<{
    type: string
    timestamp: string
    email?: string
    ip?: string
    details: any
  }>
  blockedIPs: Array<{
    ip: string
    attempts: number
    blocked: boolean
    lastAttempt: string
  }>
}

export default function SecurityPage() {
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchSecurityStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.auth.getMFAStats()
      
      if (response.success) {
        setStats(response.data)
        setLastUpdate(new Date())
      } else {
        setError('Не удалось загрузить статистику безопасности')
      }
    } catch (err) {
      console.error('Security stats error:', err)
      setError('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSecurityStats()
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(fetchSecurityStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Безопасность</h2>
          <p className="text-muted-foreground">
            Управление безопасностью и мониторинг активности в реальном времени
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-sm text-muted-foreground">
              Обновлено: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button 
            onClick={fetchSecurityStats} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* MFA Management Section */}
      <MFAManagement />
      <DeviceSessionsPanel />

      {/* Real-time Security Monitoring */}
      <Card className="border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Мониторинг безопасности в реальном времени
          </CardTitle>
          <CardDescription>
            Статистика и логи безопасности с автообновлением
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Security Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-900">MFA пользователей</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {stats ? `${stats.mfa.enabledUsers}/${stats.mfa.totalUsers}` : '---'}
                </div>
                <div className="text-sm text-green-700">
                  {stats ? `${Math.round((stats.mfa.enabledUsers / stats.mfa.totalUsers) * 100)}%` : ''} активация
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">Активные сессии</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.mfa.activeSessions ?? '---'}
                </div>
                <div className="text-sm text-blue-700">Текущие подключения</div>
              </div>
              
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-orange-900">Неудачные входы</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats?.security.recentFailures ?? '---'}
                </div>
                <div className="text-sm text-orange-700">За последние 24 часа</div>
              </div>
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-purple-900">Rate Limits</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats?.security.rateLimitEvents ?? '---'}
                </div>
                <div className="text-sm text-purple-700">Превышения лимитов</div>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-red-900">Заблокированные IP</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.security.blockedIPs ?? '---'}
                </div>
                <div className="text-sm text-red-700">Активные блокировки</div>
              </div>
            </div>

            {/* Recent Security Events */}
            {stats?.recentEvents && stats.recentEvents.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Последние события безопасности
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.recentEvents.slice(0, 10).map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          event.type.includes('FAILED') || event.type.includes('BLOCK') ? 'destructive' :
                          event.type.includes('SUCCESS') ? 'default' : 'secondary'
                        }>
                          {event.type}
                        </Badge>
                        <span className="text-sm">
                          {event.email && (
                            <span className="font-medium">{event.email}</span>
                          )}
                          {event.ip && (
                            <span className="text-muted-foreground ml-2">({event.ip})</span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blocked IPs */}
            {stats?.blockedIPs && stats.blockedIPs.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Заблокированные IP адреса
                </h4>
                <div className="space-y-2">
                  {stats.blockedIPs.map((blockedIP, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive">ЗАБЛОКИРОВАН</Badge>
                        <span className="font-mono text-sm">{blockedIP.ip}</span>
                        <span className="text-sm text-muted-foreground">
                          {blockedIP.attempts} попыток
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(blockedIP.lastAttempt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && !stats && (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Загрузка данных мониторинга...</p>
              </div>
            )}

            {/* No data state */}
            {!loading && !stats && !error && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2" />
                <p>Нет данных мониторинга</p>
                <Button onClick={fetchSecurityStats} variant="outline" size="sm" className="mt-2">
                  Попробовать еще раз
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
