import React, { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertDescription
} from '@beauty-platform/ui'
import { Laptop, RefreshCw, Trash2, Smartphone, Info } from 'lucide-react'
import { apiService } from '../../services/api'

type DeviceEntry = {
  id: string
  deviceId: string
  deviceName: string | null
  userAgent: string | null
  ipAddress: string | null
  isActive: boolean
  lastUsedAt: string
  createdAt: string
  activeSessions: number
  isCurrent?: boolean
}

type DevicesResponse = {
  success: boolean
  devices: DeviceEntry[]
}

export const DeviceSessionsPanel: React.FC = () => {
  const [devices, setDevices] = useState<DeviceEntry[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState<boolean>(false)

  const loadDevices = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.auth.devices() as DevicesResponse
      if (response.success) {
        setDevices(response.devices)
      } else {
        setError('Не удалось загрузить список устройств')
      }
    } catch (err) {
      console.error('Device list error:', err)
      setError('Ошибка загрузки списка устройств')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [])

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      setRevokingId(deviceId)
      await apiService.auth.revokeDevice(deviceId)
      await loadDevices()
    } catch (err) {
      console.error('Revoke device error:', err)
      setError('Не удалось завершить сессию устройства')
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeAll = async () => {
    try {
      setRevokingAll(true)
      await apiService.auth.revokeAllDevices(true)
      await loadDevices()
    } catch (err) {
      console.error('Revoke all devices error:', err)
      setError('Не удалось завершить другие сессии')
    } finally {
      setRevokingAll(false)
    }
  }

  const formatDate = (value: string) => {
    if (!value) return '—'
    const date = new Date(value)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }

  const renderDeviceIcon = (userAgent?: string | null) => {
    if (!userAgent) {
      return <Laptop className="w-4 h-4 text-muted-foreground" />
    }
    const ua = userAgent.toLowerCase()
    if (ua.includes('iphone') || ua.includes('android') || ua.includes('mobile')) {
      return <Smartphone className="w-4 h-4 text-muted-foreground" />
    }
    return <Laptop className="w-4 h-4 text-muted-foreground" />
  }

  return (
    <Card className="border border-border bg-card text-card-foreground shadow-sm">
      <CardHeader className="flex flex-row justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Laptop className="w-5 h-5" />
            Активные устройства и сессии
          </CardTitle>
          <CardDescription>
            Управляйте доверенными устройствами и завершайте сессии при необходимости
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDevices}
            disabled={loading}
            data-testid="refresh-devices-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRevokeAll}
            disabled={revokingAll || devices.length <= 1}
            data-testid="revoke-all-btn"
          >
            <Trash2 className={`w-4 h-4 mr-2 ${revokingAll ? 'animate-ping' : ''}`} />
            Завершить другие сессии
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 border-destructive/40 bg-destructive/10">
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {devices.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Laptop className="w-10 h-10 mb-3" />
            <p className="text-sm">Активные устройства не найдены</p>
          </div>
        )}

        <div className="space-y-3" data-testid="device-list">
          {devices.map(device => (
            <div
              key={device.id}
              data-testid="device-card"
              data-device-id={device.id}
              className={`flex flex-col gap-2 rounded-lg border p-4 shadow-sm transition ${
                device.isCurrent ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-card/90 hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-muted/40">
                    {renderDeviceIcon(device.userAgent)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {device.deviceName || 'Неизвестное устройство'}
                      </span>
                      {device.isCurrent && (
                        <Badge variant="outline" className="border-primary text-primary">
                          Текущее
                        </Badge>
                      )}
                      <Badge
                        variant={device.isActive ? 'default' : 'secondary'}
                        data-testid={`device-status-${device.id}`}
                      >
                        {device.isActive ? 'Активно' : 'Завершено'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Fingerprint: {device.deviceId.slice(0, 12)}…
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={device.isCurrent ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleRevokeDevice(device.id)}
                    disabled={revokingId === device.id}
                    data-testid={`revoke-device-${device.id}`}
                    title={device.isCurrent ? "Выйти из системы на этом устройстве" : "Завершить сессию на этом устройстве"}
                  >
                    <Trash2 className={`w-4 h-4 mr-2 ${revokingId === device.id ? 'animate-pulse' : ''}`} />
                    {device.isCurrent ? 'Выйти' : 'Завершить'}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex flex-col">
                  <span className="text-xs uppercase text-muted-foreground">IP адрес</span>
                  <span>{device.ipAddress || '—'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase text-muted-foreground">Последняя активность</span>
                  <span>{formatDate(device.lastUsedAt)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase text-muted-foreground">Открытые сессии</span>
                  <span>{device.activeSessions}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-xs">
                    {device.userAgent || 'User Agent не определен'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
