import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Alert,
  AlertDescription
} from '@beauty-platform/ui'
import { Crown, AlertCircle, Loader2 } from 'lucide-react'

const LoginForm = () => {
  const { login, isAuthenticated, forceLogout } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // ✅ Если пользователь уже авторизован, редиректим на дашборд
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      // ✅ После успешного логина редиректим на дашборд
      navigate('/dashboard')
    } catch (error) {
      // 🛡️ Проверяем требуется ли MFA
      if (error instanceof Error && (error as any).code === 'MFA_REQUIRED') {
        // Редиректим на страницу MFA с данными пользователя
        navigate('/mfa-verify', { 
          state: { mfaData: (error as any).mfaData } 
        })
        return
      }
      
      setError(error instanceof Error ? error.message : 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    
    <div className="min-h-screen flex items-center justify-center bg-cyan-300 px-4 bg-[url('https://img.freepik.com/free-photo/portrait-woman-with-cool-futuristic-superhero-suit_23-2150944794.jpg')] bg-cover bg-center">
    

      <Card className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md supports-[backdrop-filter]:bg-white/10 dark:border-white/10 dark:bg-slate-900/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-lg">
              <Crown className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white/80">Beauty Platform</CardTitle>
          <CardDescription className="text-white/80">Design Corporation</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2 text-white/80">
              <Input
              className="bg-transparent 
  border-transparent 
  focus:border-transparent 
  focus:ring-0 
  focus:outline-none 
  ring-0 
  focus:ring-transparent 
  focus-visible:ring-0 
  focus-visible:ring-transparent
  text-white 
  placeholder-white text-white/80"
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2 text-white/80">
              <Input
              className="bg-transparent border-0 focus:border-0 focus:ring-0 focus:outline-none ring-0 focus:ring-transparent focus-visible:ring-0 focus-visible:ring-transparent
    text-white"
                id="password"
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </Button>
          </form>

          {/* Кнопка принудительного выхода */}
          {/* Кнопка автозаполнения для тестирования */}
          <div className="mt-4 space-y-2">
            <Button 
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setEmail('admin@beauty-platform.com')
                setPassword('admin123')
              }}
              className="w-full text-xs"
            >
              🚀 Автозаполнение (admin@beauty-platform.com)
            </Button>
            
            <Button 
              type="button"
              variant="outline"
              size="sm"
              onClick={forceLogout}
              className="w-full text-xs"
            >
              🔒 Очистить все cookies (Force Logout)
            </Button>
          </div>
          
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginForm
