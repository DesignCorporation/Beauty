import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, mfaRequired, mfaSetupRequired } = useAuth()
  const location = useLocation()

  // Показываем загрузку пока проверяем токен
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">
            Проверка авторизации...
          </p>
        </div>
      </div>
    )
  }

  // Если требуется MFA проверка
  if (mfaRequired) {
    return <Navigate to="/mfa-verify" state={{ mfaData: mfaRequired }} replace />
  }

  // Если не авторизован, редиректим на логин
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Если требуется настройка MFA, показываем предупреждение но пускаем в админку
  // (пользователь сможет настроить MFA в разделе Security)
  if (mfaSetupRequired) {
    // Показываем предупреждение о необходимости настройки MFA
    console.warn('🛡️ MFA Setup Required: User has limited access until MFA is configured')
  }

  // Если авторизован, показываем защищенный контент
  return <>{children}</>
}

export default ProtectedRoute