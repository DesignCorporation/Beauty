import React, { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
  Alert,
  AlertDescription,
  AlertTitle
} from '@beauty-platform/ui'
import { 
  Shield, 
  Smartphone, 
  Key, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle,
  QrCode,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

interface MFAStatus {
  enabled: boolean
  required: boolean
  trustedDevice: boolean
  status: {
    enabled: boolean
    lastVerified?: string
    backupCodesCount: number
    trustedDevicesCount: number
    method?: string
  }
}

interface MFASetupData {
  qrCodeUrl: string
  backupCodes: string[]
  setupToken: string
}

export const MFAManagement: React.FC = () => {
  const { user, isAuthenticated } = useAuth()
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null)
  const [setupData, setSetupData] = useState<MFASetupData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [password, setPassword] = useState('')
  const [mfaToken, setMfaToken] = useState('')
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false)
  const [currentStep, setCurrentStep] = useState<'status' | 'setup' | 'verify' | 'complete'>('status')

  // Загрузка статуса MFA из API
  const fetchMFAStatus = async () => {
    console.log('🔐 Auth check - isAuthenticated:', isAuthenticated, 'user:', user)
    
    if (!isAuthenticated) {
      setError('Необходимо войти в систему для настройки MFA')
      return
    }

    setIsLoading(true)
    try {
      console.log('🔐 Fetching MFA status...')
      const response = await apiService.auth.getMFAStatus()
      console.log('✅ MFA status response:', response)
      
      if (response.success) {
        setMfaStatus(response.data)
      } else {
        setError(response.error || 'Ошибка загрузки статуса MFA')
      }
    } catch (err) {
      console.error('❌ MFA status fetch error:', err)
      // Проверяем, является ли это 401 ошибкой
      if (err instanceof Error && err.message.includes('401')) {
        setError('Необходимо перезайти в систему для настройки MFA')
      } else {
        setError('Ошибка загрузки статуса MFA')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const setupMFA = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await apiService.post('/api/auth/mfa/setup/initiate', {})
      
      if (response.success) {
        setSetupData(response.data)
        setCurrentStep('setup')
        setPassword('')
        setSuccess('QR-код и backup коды сгенерированы!')
      } else {
        setError(response.error || 'Ошибка настройки MFA')
      }
    } catch (err) {
      console.error('MFA setup error:', err)
      setError('Ошибка настройки MFA')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyMFA = async () => {
    if (!mfaToken) {
      setError('Введите код из Google Authenticator')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const response = await apiService.post('/api/auth/mfa/setup/complete', { 
        code: mfaToken,
        setupToken: setupData?.setupToken
      })
      
      if (response.success) {
        setCurrentStep('complete')
        setSuccess('MFA активирована успешно!')
        setMfaToken('')
        
        // Обновляем статус после активации
        await fetchMFAStatus()
      } else {
        setError(response.error || 'Неверный код MFA')
      }
    } catch (err) {
      console.error('MFA verify error:', err)
      setError('Неверный код MFA')
    } finally {
      setIsLoading(false)
    }
  }

  const disableMFA = async () => {
    if (!password || !mfaToken) {
      setError('Введите пароль и MFA код для отключения')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const response = await apiService.post('/api/auth/mfa/disable', { 
        password, 
        token: mfaToken 
      })
      
      if (response.success) {
        setCurrentStep('status')
        setSuccess('MFA отключена')
        setSetupData(null)
        
        // Обновляем статус после отключения
        await fetchMFAStatus()
      } else {
        setError(response.error || 'Ошибка отключения MFA')
      }
    } catch (err) {
      console.error('MFA disable error:', err)
      setError('Ошибка отключения MFA')
    } finally {
      setIsLoading(false)
      setPassword('')
      setMfaToken('')
    }
  }

  const copyBackupCodes = () => {
    if (setupData) {
      navigator.clipboard.writeText(setupData.backupCodes.join(', '))
      setCopiedBackupCodes(true)
      setTimeout(() => setCopiedBackupCodes(false), 2000)
    }
  }

  const downloadBackupCodes = () => {
    if (setupData) {
      const content = `Beauty Platform - MFA Backup Codes\n\n${setupData.backupCodes.join('\n')}\n\nСохраните эти коды в безопасном месте!`
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'beauty-platform-backup-codes.txt'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  useEffect(() => {
    fetchMFAStatus()
  }, [])

  if (isLoading && !mfaStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Загрузка...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 text-green-700">
          <Check className="h-4 w-4" />
          <AlertTitle>Успех</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Статус MFA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Двухфакторная аутентификация (MFA)
            {mfaStatus?.enabled ? (
              <Badge className="bg-green-500">Включена</Badge>
            ) : (
              <Badge variant="destructive">Отключена</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Дополнительный уровень безопасности для вашего аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaStatus?.required && (
            <Alert className="border-orange-500">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Требуется MFA</AlertTitle>
              <AlertDescription>
                Для роли SUPER_ADMIN двухфакторная аутентификация обязательна
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Статус MFA</Label>
              <div className="flex items-center gap-2">
                {mfaStatus?.enabled ? (
                  <>
                    <Lock className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Активна</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">Не настроена</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Backup коды</Label>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span>{mfaStatus?.status?.backupCodesCount || 0} шт.</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Метод</Label>
              <Badge variant="outline">{mfaStatus?.status?.method?.toUpperCase() || 'TOTP'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Управление MFA */}
      {!mfaStatus?.enabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Настройка MFA
            </CardTitle>
            <CardDescription>
              Настройте двухфакторную аутентификацию для максимальной безопасности
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 'status' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    Вы настроите двухфакторную аутентификацию для дополнительной безопасности вашего аккаунта.
                    Вам понадобится приложение Google Authenticator или Authy.
                  </p>
                </div>
                <Button onClick={setupMFA} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  Начать настройку MFA
                </Button>
              </div>
            )}

            {currentStep === 'setup' && setupData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* QR Code */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <QrCode className="w-5 h-5" />
                        Шаг 1: Сканируйте QR-код
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-center p-4 bg-white rounded-lg border">
                        <img 
                          src={setupData.qrCodeUrl} 
                          alt="MFA QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Используйте Google Authenticator, Authy или другое TOTP приложение
                      </p>
                    </CardContent>
                  </Card>

                  {/* Instructions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        Инструкции
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm">1. Откройте приложение аутентификатора на телефоне</p>
                        <p className="text-sm">2. Нажмите "Добавить аккаунт" или "+"</p>
                        <p className="text-sm">3. Выберите "Сканировать QR-код"</p>
                        <p className="text-sm">4. Направьте камеру на QR-код выше</p>
                        <p className="text-sm">5. Введите 6-значный код ниже для подтверждения</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Backup Codes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Backup коды для восстановления
                    </CardTitle>
                    <CardDescription>
                      Сохраните эти коды в безопасном месте. Каждый код можно использовать только один раз.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-4 bg-gray-50 rounded-lg">
                      {setupData.backupCodes.map((code, index) => (
                        <div key={index} className="font-mono text-sm text-center p-2 bg-white rounded border">
                          {code}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={copyBackupCodes}>
                        {copiedBackupCodes ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        {copiedBackupCodes ? 'Скопировано!' : 'Копировать'}
                      </Button>
                      <Button variant="outline" onClick={downloadBackupCodes}>
                        <Download className="w-4 h-4 mr-2" />
                        Скачать
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Verification Step */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Шаг 2: Подтвердите настройку
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mfaToken">Введите код из приложения</Label>
                      <Input
                        id="mfaToken"
                        type="text"
                        value={mfaToken}
                        onChange={(e) => setMfaToken(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="font-mono text-center text-lg"
                      />
                    </div>
                    <Button onClick={verifyMFA} disabled={isLoading}>
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Активировать MFA
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">MFA успешно настроена!</h3>
                <p className="text-muted-foreground">
                  Теперь при входе в систему вам потребуется ввести код из приложения
                </p>
                <Button onClick={() => {
                  setCurrentStep('status')
                  setSetupData(null)
                  setSuccess('')
                }}>
                  Вернуться к настройкам
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              MFA активна
            </CardTitle>
            <CardDescription>
              Ваш аккаунт защищен двухфакторной аутентификацией
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-500">
              <Check className="h-4 w-4" />
              <AlertTitle>Защита активна</AlertTitle>
              <AlertDescription>
                У вас осталось {(mfaStatus as any).backupCodesRemaining || 0} backup кодов для восстановления
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h4 className="font-semibold">Отключить MFA</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="disablePassword">Пароль</Label>
                  <Input
                    id="disablePassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ваш пароль"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disableMfaToken">MFA код</Label>
                  <Input
                    id="disableMfaToken"
                    type="text"
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="font-mono"
                  />
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={disableMFA} 
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Unlock className="w-4 h-4 mr-2" />
                )}
                Отключить MFA
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}