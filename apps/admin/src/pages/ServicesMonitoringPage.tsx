import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea
} from '@beauty-platform/ui'
import { Activity, AlertTriangle, CheckCircle, GripVertical, Play, RotateCcw, Square, Zap } from 'lucide-react'
import { sdkClient } from '@/services/sdkClient'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                   */
/* -------------------------------------------------------------------------- */

type OrchestratorServiceState = 'running' | 'starting' | 'warmup' | 'stopped' | 'error' | 'circuit_open' | 'external'

type OrchestratorServiceStatus = {
  serviceId: string
  name: string
  state: OrchestratorServiceState
  pid?: number
  uptime?: number
  managed: 'internal' | 'external'
  cwd: string
  health: {
    isHealthy: boolean
    lastCheck: string
    consecutiveFailures: number
    responseTime?: number
    error?: string
  }
  warmup: {
    isInWarmup: boolean
    progress: number
    successfulChecks: number
    requiredChecks: number
  }
  circuitBreaker: {
    state: 'open' | 'closed' | 'cooldown'
    failures: number
    nextRetry?: string
    backoffSeconds: number
  }
  dependencies: string[]
  autoRestoreAttempts: number
  lastStateChange: string
}

type OrchestratorStatusPayload = {
  orchestrator: {
    version: string
    uptime: number
    servicesTotal: number
    servicesRunning: number
    servicesHealthy: number
  }
  services: OrchestratorServiceStatus[]
}

type ServiceRegistryEntry = {
  id: string
  name: string
  description: string
  port: number
  type: string
  criticality: 'critical' | 'important' | 'optional'
  status: string
  run: {
    managed?: 'internal' | 'external'
    autoStart?: boolean
  }
  dependencies: string[]
  gatewayPath?: string
  tags?: string[]
}

type ServiceRegistryResponse = {
  success: boolean
  data: {
    services: ServiceRegistryEntry[]
    count: number
  }
}

type ServiceLogsResponse = {
  success: boolean
  data: {
    serviceId: string
    logs: {
      stdout: string[]
      stderr: string[]
    }
    timestamp: string
  }
}

type ProcessKillPhase = 'idle' | 'sigterm_sent' | 'sigterm_wait' | 'sigkill_sent' | 'killed' | 'zombie'

type ProcessInfo = {
  serviceId: string
  state: string
  mainProcess: {
    pid?: number
    alive: boolean
    startTime?: string
    uptime?: number
  }
  killTracking: {
    phase: ProcessKillPhase
    sigTermSentAt?: string
    sigKillSentAt?: string
    killAttempts: number
    lastKillError?: string
  }
}

type ProcessInfoResponse = {
  success: boolean
  data: ProcessInfo
  timestamp: string
}

type OrchestratorStatusResponse = {
  success: boolean
  data: OrchestratorStatusPayload
  timestamp: string
}

type ServiceAction = 'start' | 'stop' | 'restart' | 'resetCircuit'

type ActionState = {
  running: boolean
  error?: string
}

/* -------------------------------------------------------------------------- */
/*                                 UTILITIES                                  */
/* -------------------------------------------------------------------------- */

const formatDateTime = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatRelativeTime = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diff = Date.now() - date.getTime()
  if (diff < 0) return 'in the future'
  const minutes = Math.floor(diff / (60 * 1000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return `${days} d ago`
}

const formatMilliseconds = (value?: number) => {
  if (value === undefined) return '—'
  return `${value} ms`
}

const formatUptime = (seconds?: number) => {
  if (!seconds && seconds !== 0) return '—'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return [
    hrs ? `${hrs}h` : null,
    mins ? `${mins}m` : null,
    `${secs}s`
  ]
    .filter(Boolean)
    .join(' ')
}

const statusBadgeVariant = (state: OrchestratorServiceState, healthy: boolean) => {
  if (state === 'external') return 'outline'
  if (state === 'running') return healthy ? 'default' : 'destructive'
  if (state === 'starting' || state === 'warmup') return 'secondary'
  if (state === 'circuit_open' || state === 'error') return 'destructive'
  return 'outline'
}

const getKillPhaseColor = (phase: ProcessKillPhase) => {
  switch (phase) {
    case 'idle': return 'bg-slate-100 text-slate-700'
    case 'sigterm_sent': return 'bg-blue-100 text-blue-700'
    case 'sigterm_wait': return 'bg-orange-100 text-orange-700'
    case 'sigkill_sent': return 'bg-red-100 text-red-700'
    case 'killed': return 'bg-green-100 text-green-700'
    case 'zombie': return 'bg-rose-100 text-rose-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getKillPhaseLabel = (phase: ProcessKillPhase, t: any): string => {
  const labels: Record<ProcessKillPhase, string> = {
    idle: t('monitoring.killPhase.idle', 'Idle'),
    sigterm_sent: t('monitoring.killPhase.sigtermSent', 'SIGTERM sent'),
    sigterm_wait: t('monitoring.killPhase.sigtermWait', 'SIGTERM waiting'),
    sigkill_sent: t('monitoring.killPhase.sigkillSent', 'SIGKILL sent'),
    killed: t('monitoring.killPhase.killed', 'Killed'),
    zombie: t('monitoring.killPhase.zombie', 'Zombie'),
  }
  return labels[phase]
}

/* -------------------------------------------------------------------------- */
/*                              REACT COMPONENT                               */
/* -------------------------------------------------------------------------- */

const REFRESH_INTERVAL = 15000

// Sortable Row wrapper для drag&drop
function SortableRow({ id, children, className, onClick }: {
  id: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={className}
      onClick={onClick}
    >
      <TableCell className="w-8 cursor-move" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </TableCell>
      {children}
    </TableRow>
  )
}

export default function ServicesMonitoringPage() {
  const { t } = useTranslation()

  const [orchestratorStatus, setOrchestratorStatus] = useState<OrchestratorStatusPayload | null>(null)
  const [registry, setRegistry] = useState<Record<string, ServiceRegistryEntry>>({})
  const [selectedServiceId, setSelectedServiceId] = useState<string>('api-gateway')
  const [logs, setLogs] = useState<{ stdout: string[]; stderr: string[] }>({ stdout: [], stderr: [] })
  const [processInfo, setProcessInfo] = useState<ProcessInfo | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [loadingProcessInfo, setLoadingProcessInfo] = useState(false)
  const [actionState, setActionState] = useState<Record<string, ActionState>>({})
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [killingProcess, setKillingProcess] = useState(false)
  const [restartingOrchestrator, setRestartingOrchestrator] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [logTab, setLogTab] = useState<'stdout' | 'stderr'>('stdout')
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('services-custom-order')
    return saved ? JSON.parse(saved) : []
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const services = orchestratorStatus?.services ?? []
  const orchestratorInfo = orchestratorStatus?.orchestrator

  /* -------------------------------- FETCHERS ------------------------------- */

  const fetchStatus = async () => {
    setLoadingStatus(true)
    setErrorMessage(null)
    try {
      const [statusJson, registryJson] = await Promise.all([
        sdkClient.request<OrchestratorStatusResponse>('/orchestrator/status-all'),
        sdkClient.request<ServiceRegistryResponse>('/orchestrator/registry')
      ])

      if (!statusJson.success) throw new Error('status-all response not successful')
      if (!registryJson.success) throw new Error('registry response not successful')

      setOrchestratorStatus(statusJson.data)

      const registryMap = registryJson.data.services.reduce<Record<string, ServiceRegistryEntry>>((acc, entry) => {
        acc[entry.id] = entry
        return acc
      }, {})
      setRegistry(registryMap)
    } catch (error) {
      console.error('[ServicesMonitoring] status fetch failed:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load orchestrator status')
    } finally {
      setLoadingStatus(false)
    }
  }

  const fetchLogs = async (serviceId: string) => {
    setLoadingLogs(true)
    try {
      const json = await sdkClient.request<ServiceLogsResponse>(
        `/orchestrator/services/${encodeURIComponent(serviceId)}/logs?lines=200`
      )
      if (!json.success) throw new Error('logs response not successful')
      setLogs(json.data.logs)
    } catch (error) {
      console.error('[ServicesMonitoring] log fetch failed:', error)
      setLogs({ stdout: [], stderr: [] })
    } finally {
      setLoadingLogs(false)
    }
  }

  const fetchProcessInfo = async (serviceId: string) => {
    setLoadingProcessInfo(true)
    try {
      const json = await sdkClient.request<ProcessInfoResponse>(
        `/orchestrator/services/${encodeURIComponent(serviceId)}/processes`
      )
      if (!json.success) throw new Error('processes response not successful')
      setProcessInfo(json.data)
    } catch (error) {
      console.error('[ServicesMonitoring] process info fetch failed:', error)
      setProcessInfo(null)
    } finally {
      setLoadingProcessInfo(false)
    }
  }

  const executeAction = async (serviceId: string, action: ServiceAction) => {
    const key = `${serviceId}:${action}`
    setActionState(prev => ({ ...prev, [key]: { running: true } }))
    try {
      await sdkClient.request(`/orchestrator/services/${encodeURIComponent(serviceId)}/actions`, {
        method: 'POST',
        data: { action }
      })
      await fetchStatus()
      if (serviceId === selectedServiceId) {
        await fetchLogs(serviceId)
        await fetchProcessInfo(serviceId)
      }
    } catch (error) {
      console.error('[ServicesMonitoring] action failed:', error)
      setActionState(prev => ({ ...prev, [key]: { running: false, error: error instanceof Error ? error.message : String(error) } }))
      return
    }
    setActionState(prev => ({ ...prev, [key]: { running: false } }))
  }

  const killServiceProcess = async (serviceId: string, force: boolean = false) => {
    setKillingProcess(true)
    try {
      await sdkClient.request(`/orchestrator/services/${encodeURIComponent(serviceId)}/kill`, {
        method: 'POST',
        data: { force }
      })
      // Refresh after kill
      await new Promise(r => setTimeout(r, 500))
      await fetchProcessInfo(serviceId)
      await fetchStatus()
    } catch (error) {
      console.error('[ServicesMonitoring] kill process failed:', error)
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setKillingProcess(false)
    }
  }

  const restartOrchestratorFull = async () => {
    setRestartingOrchestrator(true)
    setShowRestartConfirm(false)
    try {
      await sdkClient.request('/orchestrator/restart', { method: 'POST' })

      // Show success message
      console.log('[ServicesMonitoring] Orchestrator restart initiated. Admin panel will disconnect shortly...')

      // Wait a bit before showing reconnection message
      await new Promise(r => setTimeout(r, 2000))

      // Try to reconnect after delay
      let attempts = 0
      const maxAttempts = 30 // 30 attempts = 30 seconds

      const reconnectInterval = setInterval(async () => {
        attempts++
        try {
          try {
            await sdkClient.request('/orchestrator/health', { method: 'GET', retry: 0 })
            clearInterval(reconnectInterval)
            setRestartingOrchestrator(false)
            // Refresh the page to reload everything
            window.location.reload()
          } catch {
            // keep retrying
          }
        } catch {
          if (attempts >= maxAttempts) {
            clearInterval(reconnectInterval)
            setRestartingOrchestrator(false)
            setErrorMessage('Orchestrator did not come back online. Please check the server.')
          }
        }
      }, 1000)
    } catch (error) {
      console.error('[ServicesMonitoring] restart failed:', error)
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setRestartingOrchestrator(false)
    }
  }

  /* -------------------------------- EFFECTS -------------------------------- */

  useEffect(() => {
    void fetchStatus()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      void fetchStatus()
      if (selectedServiceId) {
        void fetchLogs(selectedServiceId)
        void fetchProcessInfo(selectedServiceId)
      }
    }, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [autoRefresh, selectedServiceId])

  useEffect(() => {
    if (selectedServiceId) {
      void fetchLogs(selectedServiceId)
      void fetchProcessInfo(selectedServiceId)
    }
  }, [selectedServiceId])

  /* ----------------------------- DERIVED VALUES ---------------------------- */

  const rows = useMemo(() => {
    const mapped = services
      .map(service => {
        const registryEntry = registry[service.serviceId]
        return {
          status: service,
          registry: registryEntry,
          displayName: registryEntry?.name ?? service.name ?? service.serviceId
        }
      })
      .sort((a, b) => {
        // Приоритет 1: criticality (critical > important > optional)
        const criticalityOrder = { critical: 0, important: 1, optional: 2 }
        const aCrit = criticalityOrder[a.registry?.criticality ?? 'optional']
        const bCrit = criticalityOrder[b.registry?.criticality ?? 'optional']
        if (aCrit !== bCrit) return aCrit - bCrit

        // Приоритет 2: type (Frontend > Gateway > Backend > Infrastructure)
        const typeOrder = {
          frontend: 0,
          gateway: 1,
          core: 2,
          business: 3,
          media: 4,
          ai: 5,
          utility: 6,
          infrastructure: 7
        }
        const aType = typeOrder[a.registry?.type?.toLowerCase() as keyof typeof typeOrder] ?? 99
        const bType = typeOrder[b.registry?.type?.toLowerCase() as keyof typeof typeOrder] ?? 99
        if (aType !== bType) return aType - bType

        // Приоритет 3: имя
        return a.displayName.localeCompare(b.displayName)
      })

    // Применить кастомный порядок если есть
    if (customOrder.length > 0) {
      return mapped.sort((a, b) => {
        const aIndex = customOrder.indexOf(a.status.serviceId)
        const bIndex = customOrder.indexOf(b.status.serviceId)

        // Если оба в кастомном порядке - сортировать по индексу
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex

        // Если только один в кастомном порядке - он идёт первым
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1

        // Если оба не в кастомном порядке - оставить как есть
        return 0
      })
    }

    return mapped
  }, [services, registry, customOrder])

  const selectedStatus = services.find(service => service.serviceId === selectedServiceId)

  const isActionDisabled = (service?: OrchestratorServiceStatus, action?: ServiceAction) => {
    if (!service) return true
    if (service.managed === 'external') return true
    if (action === 'start') {
      return service.state === 'running' || service.state === 'starting' || service.state === 'warmup'
    }
    if (action === 'stop') {
      return service.state !== 'running' && service.state !== 'starting' && service.state !== 'warmup'
    }
    if (action === 'resetCircuit') {
      return service.circuitBreaker.state !== 'open'
    }
    return false
  }

  /* -------------------------------- DRAG&DROP ------------------------------ */

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = rows.findIndex(row => row.status.serviceId === active.id)
    const newIndex = rows.findIndex(row => row.status.serviceId === over.id)

    const reordered = arrayMove(rows, oldIndex, newIndex)
    const newOrder = reordered.map(row => row.status.serviceId)

    setCustomOrder(newOrder)
    localStorage.setItem('services-custom-order', JSON.stringify(newOrder))
  }

  /* --------------------------------- RENDER -------------------------------- */

  return (
    <div className="space-y-6">

      {showRestartConfirm && (
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('monitoring.restartWarningTitle', 'Warning: Full Orchestrator Restart')}</AlertTitle>
          <AlertDescription className="mt-4 space-y-3">
            <p>
              {t('monitoring.restartWarningMessage', 'This will restart the entire orchestrator and reload all services. Your admin panel will disconnect momentarily and reconnect automatically when services are back online.')}
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void restartOrchestratorFull()}
                disabled={restartingOrchestrator}
              >
                {restartingOrchestrator ? (
                  <>
                    <Activity className="mr-2 h-3.5 w-3.5 animate-spin" />
                    {t('monitoring.restarting', 'Restarting…')}
                  </>
                ) : (
                  t('monitoring.confirmRestart', 'Confirm Restart')
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRestartConfirm(false)}
                disabled={restartingOrchestrator}
              >
                {t('monitoring.cancel', 'Cancel')}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('monitoring.loadErrorTitle', 'Failed to load status')}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {orchestratorInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('monitoring.orchestratorOverview', 'Services Monitoring')}</CardTitle>
                <CardDescription>
                  {t('monitoring.orchestratorDescription', 'Status and performance of all Beauty Platform components')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={autoRefresh ? 'default' : 'outline'} onClick={() => setAutoRefresh(!autoRefresh)}>
                  {autoRefresh ? t('monitoring.autoRefreshOn', 'Auto refresh ON') : t('monitoring.autoRefreshOff', 'Auto refresh OFF')}
                </Button>
                <Button variant="outline" onClick={() => void fetchStatus()} disabled={loadingStatus}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('monitoring.refresh', 'Refresh')}
                </Button>
                <Button
                  variant="destructive"
                  disabled={restartingOrchestrator}
                  onClick={() => setShowRestartConfirm(true)}
                  title={t('monitoring.orchestratorRestartTitle', 'Full orchestrator restart - all services will reload')}
                >
                  {restartingOrchestrator ? (
                    <>
                      <Activity className="mr-2 h-4 w-4 animate-spin" />
                      {t('monitoring.orchestratorRestarting', 'Restarting…')}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {t('monitoring.orchestratorRestart', 'Restart Orchestrator')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('monitoring.version', 'Version')}</p>
              <p className="text-lg font-semibold">{orchestratorInfo.version}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('monitoring.uptime', 'Uptime')}</p>
              <p className="text-lg font-semibold">{formatUptime(orchestratorInfo.uptime)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('monitoring.servicesRunning', 'Services running')}</p>
              <p className="text-lg font-semibold">{orchestratorInfo.servicesRunning} / {orchestratorInfo.servicesTotal}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('monitoring.servicesHealthy', 'Services healthy')}</p>
              <p className="text-lg font-semibold">{orchestratorInfo.servicesHealthy}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('monitoring.services', 'Services')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>{t('monitoring.table.service', 'Service')}</TableHead>
                  <TableHead>{t('monitoring.table.state', 'State')}</TableHead>
                  <TableHead>{t('monitoring.table.health', 'Health')}</TableHead>
                  <TableHead>{t('monitoring.table.port', 'Port')}</TableHead>
                  <TableHead>{t('monitoring.table.dependencies', 'Dependencies')}</TableHead>
                  <TableHead className="text-right">{t('monitoring.table.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <SortableContext items={rows.map(r => r.status.serviceId)} strategy={verticalListSortingStrategy}>
                <TableBody>
              {rows.map(({ status, registry: entry, displayName }) => {
                const keyPrefix = `${status.serviceId}`
                const actionKey = (action: ServiceAction) => `${status.serviceId}:${action}`
                const actionRunning = (action: ServiceAction) => actionState[actionKey(action)]?.running
                const actionError = (action: ServiceAction) => actionState[actionKey(action)]?.error
                const isSelected = selectedServiceId === status.serviceId

                return (
                  <SortableRow
                    key={status.serviceId}
                    id={status.serviceId}
                    {...(isSelected && { className: 'bg-muted/40' })}
                    onClick={() => setSelectedServiceId(status.serviceId)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{displayName}</span>
                        <span className="text-xs text-muted-foreground">{entry?.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(status.state, status.health.isHealthy)}>
                        {status.state}
                      </Badge>
                      {status.state === 'circuit_open' && status.circuitBreaker.nextRetry && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('monitoring.nextRetry', 'Next retry')}: {formatRelativeTime(status.circuitBreaker.nextRetry)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {status.health.isHealthy ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3.5 w-3.5" /> {t('monitoring.healthOk', 'Healthy')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" /> {status.health.error ?? t('monitoring.healthFail', 'Unhealthy')}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t('monitoring.lastCheck', 'Last check')}: {formatRelativeTime(status.health.lastCheck)}
                      </p>
                    </TableCell>
                    <TableCell>{entry?.port ?? '—'}</TableCell>
                    <TableCell>
                      {status.dependencies.length === 0
                        ? t('monitoring.noDependencies', '—')
                        : status.dependencies.join(', ')}
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isActionDisabled(status, 'start') || actionRunning('start')}
                        title={status.managed === 'external' ? 'External service (managed outside orchestrator)' : undefined}
                        onClick={e => {
                          e.stopPropagation()
                          void executeAction(status.serviceId, 'start')
                        }}
                      >
                        {actionRunning('start') ? <Activity className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-2 h-3.5 w-3.5" />}
                        {t('monitoring.start', 'Start')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isActionDisabled(status, 'stop') || actionRunning('stop')}
                        title={status.managed === 'external' ? 'External service (managed outside orchestrator)' : undefined}
                        onClick={e => {
                          e.stopPropagation()
                          void executeAction(status.serviceId, 'stop')
                        }}
                      >
                        {actionRunning('stop') ? <Activity className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Square className="mr-2 h-3.5 w-3.5" />}
                        {t('monitoring.stop', 'Stop')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionRunning('restart')}
                        title={status.managed === 'external' ? 'External service (managed outside orchestrator)' : undefined}
                        onClick={e => {
                          e.stopPropagation()
                          void executeAction(status.serviceId, 'restart')
                        }}
                      >
                        {actionRunning('restart') ? <Activity className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-2 h-3.5 w-3.5" />}
                        {t('monitoring.restart', 'Restart')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isActionDisabled(status, 'resetCircuit') || actionRunning('resetCircuit')}
                        title={status.managed === 'external' ? 'External service (managed outside orchestrator)' : undefined}
                        onClick={e => {
                          e.stopPropagation()
                          void executeAction(status.serviceId, 'resetCircuit')
                        }}
                      >
                        {actionRunning('resetCircuit') ? <Activity className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-2 h-3.5 w-3.5" />}
                        {t('monitoring.resetCircuit', 'Reset circuit')}
                      </Button>
                      {(['start', 'stop', 'restart', 'resetCircuit'] as ServiceAction[]).map(action => {
                        const err = actionError(action)
                        if (!err) return null
                        return (
                          <p key={`${keyPrefix}-${action}-error`} className="text-xs text-destructive">
                            {action} · {err}
                          </p>
                        )
                      })}
                    </TableCell>
                  </SortableRow>
                )
              })}
                </TableBody>
              </SortableContext>
            </Table>
          </DndContext>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('monitoring.serviceDetails', 'Service details')}</CardTitle>
            <CardDescription>
              {selectedStatus ? selectedStatus.serviceId : t('monitoring.selectService', 'Select a service to inspect details')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedStatus ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('monitoring.healthStatus', 'Health')}</h4>
                  <p className="text-sm">{selectedStatus.health.isHealthy ? t('monitoring.healthOk', 'Healthy') : selectedStatus.health.error || t('monitoring.healthFail', 'Unhealthy')}</p>
                  <p className="text-xs text-muted-foreground">{t('monitoring.lastCheck', 'Last check')}: {formatDateTime(selectedStatus.health.lastCheck)}</p>
                  <p className="text-xs text-muted-foreground">{t('monitoring.latency', 'Latency')}: {formatMilliseconds(selectedStatus.health.responseTime)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('monitoring.runtime', 'Runtime')}</h4>
                  <p className="text-sm">PID: {selectedStatus.pid ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{t('monitoring.uptime', 'Uptime')}: {formatUptime(selectedStatus.uptime)}</p>
                  <p className="text-xs text-muted-foreground">{t('monitoring.cwd', 'Directory')}: {selectedStatus.cwd}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('monitoring.circuitBreaker', 'Circuit breaker')}</h4>
                  <p className="text-sm">{selectedStatus.circuitBreaker.state}</p>
                  <p className="text-xs text-muted-foreground">{t('monitoring.failures', 'Failures')}: {selectedStatus.circuitBreaker.failures}</p>
                  {selectedStatus.circuitBreaker.nextRetry && (
                    <p className="text-xs text-muted-foreground">{t('monitoring.nextRetry', 'Next retry')}: {formatDateTime(selectedStatus.circuitBreaker.nextRetry)}</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('monitoring.dependencies', 'Dependencies')}</h4>
                  <p className="text-sm">
                    {selectedStatus.dependencies.length > 0 ? selectedStatus.dependencies.join(', ') : t('monitoring.noDependencies', 'No dependencies')}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('monitoring.managed', 'Managed by orchestrator')}: {selectedStatus.managed}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('monitoring.selectServicePrompt', 'Select a service from the table above to see details')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('monitoring.processInfo', 'Process Info')}</CardTitle>
            <CardDescription>
              {processInfo ? t('monitoring.processInfoDescription', 'Process details and kill tracking') : t('monitoring.selectService', 'Select a service to inspect process')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {processInfo ? (
              <div className="space-y-4">
                {/* Main Process Section */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('monitoring.mainProcess', 'Main Process')}</h4>
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">
                        PID: <span className="font-mono font-semibold">{processInfo.mainProcess.pid ?? '—'}</span>
                      </p>
                      <Badge
                        variant={processInfo.mainProcess.alive ? 'default' : 'destructive'}
                        className="text-xs font-semibold"
                      >
                        {processInfo.mainProcess.alive ? '✓ RUNNING' : '✗ DEAD'}
                      </Badge>
                    </div>

                    {processInfo.mainProcess.alive && (
                      <div className="rounded-sm bg-green-50 p-2 border border-green-200">
                        <p className="text-xs text-green-700 font-medium">
                          ✓ {t('monitoring.processActive', 'Process is active')}
                        </p>
                      </div>
                    )}

                    {!processInfo.mainProcess.alive && processInfo.killTracking.phase !== 'killed' && (
                      <div className="rounded-sm bg-amber-50 p-2 border border-amber-200">
                        <p className="text-xs text-amber-700 font-medium">
                          ⚠️ {t('monitoring.processHanging', 'Process may be hanging')}
                        </p>
                      </div>
                    )}

                    {processInfo.mainProcess.startTime && (
                      <p className="text-xs text-muted-foreground">
                        {t('monitoring.started', 'Started')}: {formatDateTime(processInfo.mainProcess.startTime)}
                      </p>
                    )}
                    {processInfo.mainProcess.uptime !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {t('monitoring.uptime', 'Uptime')}: {formatUptime(processInfo.mainProcess.uptime)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Kill Tracking Section */}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{t('monitoring.killTracking', 'Kill Tracking')}</h4>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{t('monitoring.phase', 'Phase')}:</span>
                      <Badge className={`${getKillPhaseColor(processInfo.killTracking.phase)} text-sm`}>
                        {getKillPhaseLabel(processInfo.killTracking.phase, t)}
                      </Badge>
                    </div>

                    {processInfo.killTracking.phase === 'zombie' && (
                      <div className="rounded-sm bg-rose-50 p-2 border border-rose-200">
                        <p className="text-xs text-rose-700 font-medium">
                          ⚠️ {t('monitoring.zombieWarning', 'Zombie process detected')}
                        </p>
                      </div>
                    )}

                    <p className="text-sm">
                      {t('monitoring.killAttempts', 'Kill attempts')}: <span className="font-semibold">{processInfo.killTracking.killAttempts}</span>
                    </p>

                    {processInfo.killTracking.sigTermSentAt && (
                      <p className="text-xs text-muted-foreground">
                        SIGTERM: {formatRelativeTime(processInfo.killTracking.sigTermSentAt)}
                      </p>
                    )}

                    {processInfo.killTracking.sigKillSentAt && (
                      <p className="text-xs text-muted-foreground">
                        SIGKILL: {formatRelativeTime(processInfo.killTracking.sigKillSentAt)}
                      </p>
                    )}

                    {processInfo.killTracking.lastKillError && (
                      <p className="text-xs text-destructive">
                        {t('monitoring.lastError', 'Last error')}: {processInfo.killTracking.lastKillError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Manual Kill Actions */}
                {processInfo.mainProcess.alive && (
                  <div className="border-t pt-3 space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">{t('monitoring.manualActions', 'Manual Actions')}</h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={killingProcess}
                        onClick={() => void killServiceProcess(selectedServiceId, false)}
                        className="flex-1"
                      >
                        {killingProcess ? (
                          <>
                            <Activity className="mr-2 h-3.5 w-3.5 animate-spin" />
                            {t('monitoring.killing', 'Killing…')}
                          </>
                        ) : (
                          <>
                            <Square className="mr-2 h-3.5 w-3.5" />
                            {t('monitoring.killGraceful', 'Kill Graceful')}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={killingProcess}
                        onClick={() => void killServiceProcess(selectedServiceId, true)}
                        className="flex-1"
                      >
                        {killingProcess ? (
                          <>
                            <Activity className="mr-2 h-3.5 w-3.5 animate-spin" />
                            {t('monitoring.killing', 'Killing…')}
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                            {t('monitoring.killForce', 'Kill Force')}
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('monitoring.killHint', 'Graceful = SIGTERM, Force = SIGKILL')}
                    </p>
                  </div>
                )}

                {loadingProcessInfo && (
                  <div className="text-center py-2">
                    <p className="text-xs text-muted-foreground">{t('monitoring.loadingProcessInfo', 'Updating…')}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('monitoring.selectServicePrompt', 'Select a service from the table above to see process info')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('monitoring.logs', 'Logs')}</CardTitle>
            <CardDescription>
              {selectedServiceId ? `${selectedServiceId}` : t('monitoring.logsDescription', 'Select a service to view logs')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs value={logTab} onValueChange={value => setLogTab(value as 'stdout' | 'stderr')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stdout">STDOUT</TabsTrigger>
                <TabsTrigger value="stderr">STDERR</TabsTrigger>
              </TabsList>
              <TabsContent value="stdout">
                <Textarea
                  readOnly
                  value={loadingLogs ? t('monitoring.loadingLogs', 'Loading logs…') : (logs.stdout.length ? logs.stdout.join('\n') : t('monitoring.noLogs', 'No logs'))}
                  className="h-[500px] font-mono text-xs"
                />
              </TabsContent>
              <TabsContent value="stderr">
                <Textarea
                  readOnly
                  value={loadingLogs ? t('monitoring.loadingLogs', 'Loading logs…') : (logs.stderr.length ? logs.stderr.join('\n') : t('monitoring.noLogs', 'No logs'))}
                  className="h-[500px] font-mono text-xs"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
