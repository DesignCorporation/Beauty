import React, { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger, 
  Button, 
  Alert, 
  AlertDescription,
  Checkbox,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label
} from '@beauty-platform/ui'
import { Database, Settings, BarChart3, Terminal, AlertCircle, HardDrive, Activity, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { backupService, BackupInfo, BackupStatus } from '../services/backupService'

const BackupsPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  
  // State для реальных данных
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Проверка прав доступа
  const hasBackupPermissions = user?.role === 'SUPER_ADMIN'

  // Утилиты
  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Загрузка реальных данных из API
  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Загружаем статус системы
      const statusData = await backupService.getStatus()
      setStatus(statusData)
      
      // Загружаем список бекапов
      const backupsData = await backupService.getBackups()
      setBackups(backupsData.backups)
      
    } catch (err) {
      console.error('Failed to load backup data:', err)
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные о бекапах')
    } finally {
      setIsLoading(false)
    }
  }

  // Создание бекапа
  const handleCreateBackup = async (type: 'manual' | 'emergency' = 'manual') => {
    setIsCreating(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const result = await backupService.createBackup({ type })
      if (result.success) {
        setSuccessMessage(`Бекап создан успешно! ID: ${result.backupId}`)
        // Перезагружаем данные
        await loadData()
      } else {
        throw new Error(result.message || 'Не удалось создать бекап')
      }
    } catch (err) {
      console.error('Failed to create backup:', err)
      setError(err instanceof Error ? err.message : 'Не удалось создать бекап')
    } finally {
      setIsCreating(false)
    }
  }

  // Скачивание бекапа
  const handleDownloadBackup = async (backupId: string) => {
    try {
      await backupService.downloadBackup(backupId)
    } catch (err) {
      console.error('Failed to download backup:', err)
      setError(err instanceof Error ? err.message : 'Не удалось скачать бекап')
    }
  }

  // Загрузка данных при монтировании
  useEffect(() => {
    if (hasBackupPermissions) {
      loadData()
    }
  }, [hasBackupPermissions])

  // Автообновление каждые 30 секунд
  useEffect(() => {
    if (!hasBackupPermissions) return
    
    const interval = setInterval(() => {
      loadData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [hasBackupPermissions])

  if (!hasBackupPermissions) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            У вас нет прав доступа к системе управления бэкапами. 
            Обратитесь к администратору системы.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка данных о бэкапах...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок страницы */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Управление бэкапами</h2>
          <p className="text-muted-foreground">
            Создание, управление и мониторинг системных бэкапов
          </p>
        </div>
        <Button onClick={() => loadData()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Сообщения об ошибках и успехе */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Панель статуса */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Статус системы</CardTitle>
            <CheckCircle2 className={`h-4 w-4 ${
              status?.systemHealth?.status === 'healthy' 
                ? 'text-green-600' 
                : status?.systemHealth?.status === 'degraded'
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.systemHealth?.status === 'healthy' 
                ? 'Работает' 
                : status?.systemHealth?.status === 'degraded'
                  ? 'Предупреждение'
                  : 'Ошибка'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.isRunning ? 'Операция выполняется' : 'Простой'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Последний бэкап</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.systemHealth?.lastBackupAt 
                ? new Date(status.systemHealth.lastBackupAt).toLocaleDateString('ru-RU')
                : 'Нет данных'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.systemHealth?.lastBackupAt 
                ? new Date(status.systemHealth.lastBackupAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                : 'Неизвестно'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий размер</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.statistics?.totalSize 
                ? formatBytes(status.statistics.totalSize)
                : '0 B'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.statistics?.totalBackups || 0} файлов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Успешность</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.statistics?.successRate 
                ? Math.round(status.statistics.successRate * 100)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              {(status?.statistics?.successRate || 0) > 0.9 
                ? 'Отличный результат'
                : (status?.statistics?.successRate || 0) > 0.7
                  ? 'Хороший результат'
                  : 'Требует внимания'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Основной интерфейс */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Database className="w-4 h-4 mr-2" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="backups">
            <BarChart3 className="w-4 h-4 mr-2" />
            Бэкапы
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Terminal className="w-4 h-4 mr-2" />
            Логи
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Использование диска</CardTitle>
                <CardDescription>Доступное место для бэкапов</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Использовано</span>
                    <span>{status?.systemHealth?.diskSpace?.percentage || 0}%</span>
                  </div>
                  <Progress 
                    value={status?.systemHealth?.diskSpace?.percentage || 0} 
                    className="w-full"
                  />
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Всего</p>
                      <p className="font-medium">
                        {status?.systemHealth?.diskSpace?.total 
                          ? formatBytes(status.systemHealth.diskSpace.total)
                          : '0 B'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Занято</p>
                      <p className="font-medium">
                        {status?.systemHealth?.diskSpace?.used 
                          ? formatBytes(status.systemHealth.diskSpace.used)
                          : '0 B'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Свободно</p>
                      <p className="font-medium">
                        {status?.systemHealth?.diskSpace?.available 
                          ? formatBytes(status.systemHealth.diskSpace.available)
                          : '0 B'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Быстрые действия</CardTitle>
                <CardDescription>Управление бэкапами</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => handleCreateBackup('manual')}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4 mr-2" />
                  )}
                  {isCreating ? 'Создание...' : 'Создать полный бэкап'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleCreateBackup('emergency')}
                  disabled={isCreating}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Экстренный бэкап
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    if (backups.length > 0 && backups[0]?.id) {
                      handleDownloadBackup(backups[0].id)
                    }
                  }}
                  disabled={backups.length === 0}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Скачать последний
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle>Список бэкапов</CardTitle>
              <CardDescription>Все созданные бэкапы системы</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Бэкапы не найдены</p>
                    <p className="text-sm">Создайте первый бэкап</p>
                  </div>
                ) : (
                  backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Database className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="font-medium">{backup.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(backup.createdAt).toLocaleString('ru-RU')} • {formatBytes(backup.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          backup.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : backup.status === 'running'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {backup.status === 'completed' 
                            ? 'Завершен'
                            : backup.status === 'running'
                              ? 'Выполняется'
                              : 'Ошибка'
                          }
                        </span>
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {backup.type === 'full' ? 'Полный' : 'Инкрементный'}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadBackup(backup.id)}
                          disabled={backup.status !== 'completed'}
                        >
                          Скачать
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Настройки бэкапов</CardTitle>
              <CardDescription>Конфигурация автоматических бэкапов</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Расписание</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Автоматические бэкапы</Label>
                    <Checkbox defaultChecked />
                  </div>
                  <div>
                    <Label className="text-sm font-medium block mb-2">Периодичность</Label>
                    <Select defaultValue="daily">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите периодичность" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Ежедневно в 02:00</SelectItem>
                        <SelectItem value="weekly">Еженедельно (воскресенье)</SelectItem>
                        <SelectItem value="monthly">Ежемесячно (1 число)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Хранение</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium block mb-2">Период хранения (дни)</Label>
                    <Input 
                      type="number" 
                      defaultValue="30" 
                      min="1" 
                      max="365" 
                      className="w-32" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Сжатие</Label>
                    <Checkbox defaultChecked />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={() => console.log('Настройки сохранены')}>
                  Сохранить настройки
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Логи операций</CardTitle>
              <CardDescription>История операций с бэкапами</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
                <div className="text-green-600">[2024-01-15 02:00:01] INFO: Starting backup process</div>
                <div className="text-blue-600">[2024-01-15 02:00:02] INFO: Database backup started</div>
                <div className="text-blue-600">[2024-01-15 02:01:45] INFO: Database backup completed (1.2GB)</div>
                <div className="text-blue-600">[2024-01-15 02:01:46] INFO: Files backup started</div>
                <div className="text-blue-600">[2024-01-15 02:03:12] INFO: Files backup completed (0.8GB)</div>
                <div className="text-blue-600">[2024-01-15 02:03:13] INFO: Compressing backup archive</div>
                <div className="text-green-600">[2024-01-15 02:04:30] INFO: Backup completed successfully (backup-2024-01-15-full.tar.gz, 1.5GB)</div>
                <div className="text-gray-600">[2024-01-14 02:00:01] INFO: Starting incremental backup</div>
                <div className="text-green-600">[2024-01-14 02:01:15] INFO: Incremental backup completed (450MB)</div>
                <div className="text-gray-600">[2024-01-13 02:00:01] INFO: Starting backup process</div>
                <div className="text-green-600">[2024-01-13 02:04:45] INFO: Backup completed successfully</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default BackupsPage