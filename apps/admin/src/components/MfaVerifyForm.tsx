import React, { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiService } from '@/services/api'
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription
} from '@beauty-platform/ui'
import { Shield, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'

interface MfaVerifyFormProps {
  onComplete?: (token: string) => void
}

const MfaVerifyForm: React.FC<MfaVerifyFormProps> = ({ onComplete }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [mfaCode, setMfaCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Получаем данные MFA из state (переданные с LoginForm)
  const mfaData = location.state?.mfaData

  // Если нет MFA данных, возвращаемся на логин
  React.useEffect(() => {
    if (!mfaData) {
      console.warn('🚨 MFA verification: No MFA data provided, redirecting to login')
      navigate('/login')
    }
  }, [mfaData, navigate])

  const handleCodeChange = (value: string, index: number) => {
    // Разрешаем только цифры
    const numericValue = value.replace(/\D/g, '')
    if (numericValue.length <= 1) {
      const newCode = mfaCode.split('')
      newCode[index] = numericValue
      const updatedCode = newCode.join('')
      setMfaCode(updatedCode)

      // Автоматический переход к следующему полю
      if (numericValue && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    // Backspace - переход к предыдущему полю
    if (e.key === 'Backspace' && !mfaCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    // Вставка полного кода (Ctrl+V)
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      navigator.clipboard.readText().then(text => {
        const numericCode = text.replace(/\D/g, '').slice(0, 6)
        setMfaCode(numericCode.padEnd(6, ''))
        // Фокус на последнем заполненном поле
        const lastIndex = Math.min(numericCode.length - 1, 5)
        inputRefs.current[lastIndex]?.focus()
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (mfaCode.length !== 6) {
      setError('Введите 6-значный код')
      setIsLoading(false)
      return
    }

    try {
      // ✅ Отправляем MFA код на завершение логина
      const data = await apiService.post<{ success: boolean; token?: string }>(
        '/api/auth/mfa/complete-login',
        {
          userId: mfaData.userId,
          verificationCode: mfaCode,
          setupToken: mfaData.setupToken
        }
      )

      if (data.success) {
        // ✅ MFA успешно, пользователь авторизован
        console.log('🎉 MFA verification successful!')
        
        // Если есть callback, вызываем его
        if (onComplete) {
          onComplete(data.token)
        } else {
          // Редиректим на дашборд
          navigate('/dashboard')
        }
      }
    } catch (error) {
      console.error('🚨 MFA verification error:', error)
      setError(error instanceof Error ? error.message : 'Ошибка верификации MFA')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    navigate('/login')
  }

  if (!mfaData) {
    return null // Компонент редиректится на логин
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyan-300 px-4 bg-[url('https://img.freepik.com/free-photo/portrait-woman-with-cool-futuristic-superhero-suit_23-2150944794.jpg')] bg-cover bg-center">
      <Card className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md supports-[backdrop-filter]:bg-white/10 dark:border-white/10 dark:bg-slate-900/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-lg">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white/80">Двухфакторная аутентификация</CardTitle>
          <CardDescription className="text-white/70">
            Введите 6-значный код из Google Authenticator
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-3">
              <Label className="text-white/80 text-center block">Код аутентификации</Label>
              <div className="flex justify-center gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <Input
                    key={index}
                    ref={el => {
                      inputRefs.current[index] = el
                    }}
                    className="w-12 h-12 text-center text-lg font-mono bg-white/10 border-white/30 text-white focus:border-primary focus:ring-primary"
                    maxLength={1}
                    value={mfaCode[index] || ''}
                    onChange={(e) => handleCodeChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    disabled={isLoading}
                    autoComplete="off"
                  />
                ))}
              </div>
              <p className="text-xs text-white/60 text-center">
                Откройте Google Authenticator и введите 6-значный код
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || mfaCode.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  'Подтвердить'
                )}
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBackToLogin}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад к входу
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-white/60">
            <p>Не получили код?</p>
            <p className="mt-1">
              Убедитесь, что время на устройстве синхронизировано
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MfaVerifyForm
