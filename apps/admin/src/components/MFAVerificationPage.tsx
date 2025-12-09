import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
import { Shield, AlertCircle, Loader2, Smartphone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface MFAVerificationPageProps {
  mfaData?: {
    userId: string
    email: string
    role: string
  }
}

const MFAVerificationPage: React.FC<MFAVerificationPageProps> = ({ mfaData }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { completeMFA } = useAuth()
  const [mfaToken, setMfaToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(30)

  // Получаем данные из state или props
  const userData = mfaData || location.state?.mfaData

  useEffect(() => {
    // Если нет данных о пользователе, редиректим на логин
    if (!userData) {
      navigate('/login')
      return
    }

    // Countdown для показа времени обновления токена
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 30)
    }, 1000)

    return () => clearInterval(timer)
  }, [userData, navigate])

  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!userData) {
      setError('Отсутствуют данные пользователя')
      setIsLoading(false)
      return
    }

    try {
      // Используем completeMFA из AuthContext для правильного обновления состояния
      await completeMFA(userData.userId, mfaToken)
      
      // MFA успешно пройдена, редиректим в админку
      navigate('/dashboard')
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Произошла ошибка при проверке MFA')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    navigate('/login')
  }

  if (!userData) {
    return null // Компонент не рендерится если нет данных
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyan-300 px-4 bg-[url('https://img.freepik.com/free-photo/portrait-woman-with-cool-futuristic-superhero-suit_23-2150944794.jpg')] bg-cover bg-center">
      <Card className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md supports-[backdrop-filter]:bg-white/10 dark:border-white/10 dark:bg-slate-900/20 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-lg">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white/80">Двухфакторная аутентификация</CardTitle>
          <CardDescription className="text-white/70">
            Введите код из Google Authenticator
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleMFASubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Информация о пользователе */}
            <div className="text-center text-white/80 space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Smartphone className="w-4 h-4" />
                <span>Пользователь: {userData.email}</span>
              </div>
              <div className="text-xs text-white/60">
                Роль: {userData.role}
              </div>
            </div>

            {/* Поле ввода MFA кода */}
            <div className="space-y-2">
              <Label htmlFor="mfaToken" className="text-white/80">
                6-значный код из приложения
              </Label>
              <Input
                id="mfaToken"
                type="text"
                placeholder="123456"
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="bg-transparent border-transparent focus:border-transparent focus:ring-0 focus:outline-none ring-0 focus:ring-transparent focus-visible:ring-0 focus-visible:ring-transparent text-white placeholder-white/60 text-center text-2xl font-mono tracking-widest"
                required
                disabled={isLoading}
                autoComplete="off"
                autoFocus
              />
            </div>

            {/* Countdown для обновления токена */}
            <div className="text-center text-xs text-white/60">
              Код обновляется через: {countdown} сек
            </div>

            {/* Кнопки */}
            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || mfaToken.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Подтвердить
                  </>
                )}
              </Button>

              <Button 
                type="button"
                variant="outline" 
                className="w-full bg-transparent border-white/20 text-white/80 hover:bg-white/10" 
                onClick={handleBackToLogin}
                disabled={isLoading}
              >
                Вернуться к входу
              </Button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-sm text-white/60">
            <p>Используйте Google Authenticator, Authy или</p>
            <p>другое TOTP приложение для получения кода</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MFAVerificationPage