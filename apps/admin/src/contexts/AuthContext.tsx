import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { apiService } from '../services/api'

const metaEnv =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

const ADMIN_TENANT_HINT =
  metaEnv.VITE_ADMIN_TENANT_ID ||
  metaEnv.VITE_ADMIN_TENANT_SLUG ||
  'global-admin'

// Типы для пользователя и контекста
export interface TenantSummary {
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: string
  logoUrl?: string | null
}

export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  tenantId: string | null
  tenantSlug?: string | null
  tenantName?: string | null
  permissions: string[]
  tenants?: TenantSummary[]
  onboardingRequired?: boolean
  tenantSelectionRequired?: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface MFARequiredData {
  userId: string
  email: string
  role: string
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  completeMFA: (userId: string, token: string) => Promise<void>
  forceLogout: () => Promise<void>
  mfaRequired?: MFARequiredData | null
  mfaSetupRequired?: boolean
}

type TenantInput = Partial<TenantSummary> & {
  id?: string
  slug?: string
  tenant?: { slug?: string }
  name?: string
  tenantName?: string
  tenantSlug?: string
  logoUrl?: string | null
}

// Создаем контекст
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook для использования контекста
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Провайдер контекста
interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  })
  
  const [mfaRequired, setMfaRequired] = useState<MFARequiredData | null>(null)
  const [mfaSetupRequired, setMfaSetupRequired] = useState<boolean>(false)
  const tenantAutoSyncRef = useRef(false)

  const normalizeUser = (payload: any): User => {
    if (!payload) {
      throw new Error('Empty user payload received')
    }

    const baseUser = payload.user ?? payload
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions
      : Array.isArray(baseUser.permissions)
        ? baseUser.permissions
        : []

    const rawTenants: TenantInput[] = Array.isArray(baseUser.tenants)
      ? (baseUser.tenants as TenantInput[])
      : []
    const tenants: TenantSummary[] = rawTenants.map((tenant) => ({
      tenantId: tenant.tenantId ?? tenant.id ?? '',
      tenantName: tenant.tenantName ?? tenant.name ?? '',
      tenantSlug: tenant.tenantSlug ?? tenant.slug ?? '',
      role: tenant.role ?? '',
      logoUrl: tenant.logoUrl ?? null
    })).filter((tenant) => tenant.tenantId)

    const tenantId = baseUser.tenantId ?? null
    const onboardingRequired =
      typeof baseUser.onboardingRequired === 'boolean'
        ? baseUser.onboardingRequired
        : typeof payload.onboardingRequired === 'boolean'
          ? payload.onboardingRequired
          : (tenantId === null && baseUser.role !== 'SUPER_ADMIN')

    const tenantSelectionRequiredValue =
      typeof baseUser.tenantSelectionRequired === 'boolean'
        ? baseUser.tenantSelectionRequired
        : typeof payload.tenantSelectionRequired === 'boolean'
          ? payload.tenantSelectionRequired
          : (baseUser.role === 'SUPER_ADMIN' && tenantId === null && tenants.length > 0)

    return {
      id: baseUser.id,
      email: baseUser.email,
      firstName: baseUser.firstName ?? null,
      lastName: baseUser.lastName ?? null,
      role: baseUser.role,
      tenantId,
      tenantSlug: baseUser.tenantSlug ?? baseUser.tenant?.slug ?? null,
      tenantName: baseUser.tenantName ?? baseUser.tenant?.name ?? null,
      permissions,
      tenants,
      onboardingRequired,
      tenantSelectionRequired: tenantSelectionRequiredValue
    }
  }

  const ensureTenantContext = async (user: User, allowRetry = true): Promise<User> => {
    if (user.role !== 'SUPER_ADMIN') {
      return {
        ...user,
        tenantSelectionRequired: false
      }
    }

    if (user.tenantId && !user.tenantSelectionRequired) {
      tenantAutoSyncRef.current = false
      return user
    }

    if (!allowRetry || tenantAutoSyncRef.current) {
      return {
        ...user,
        tenantSelectionRequired: true
      }
    }

    const preferredTenant =
      user.tenants?.find((tenant) => {
        const hint = ADMIN_TENANT_HINT.toLowerCase()
        return tenant.tenantId.toLowerCase() === hint || tenant.tenantSlug.toLowerCase() === hint
      }) ?? user.tenants?.[0]

    if (!preferredTenant) {
      tenantAutoSyncRef.current = true
      return {
        ...user,
        tenantSelectionRequired: true
      }
    }

    try {
      tenantAutoSyncRef.current = true
      await apiService.post('/api/auth/switch-tenant', { tenantId: preferredTenant.tenantId })
      const refreshed = await apiService.auth.me()
      const normalized = normalizeUser(refreshed)
      const mergedUser: User = {
        ...normalized,
        permissions: normalized.permissions.length ? normalized.permissions : user.permissions
      }

      if (mergedUser.tenantId) {
        tenantAutoSyncRef.current = false
        return mergedUser
      }

      return {
        ...mergedUser,
        tenantSelectionRequired: true
      }
    } catch (error) {
      console.error('❌ Failed to synchronize tenant context automatically:', error)
      return {
        ...user,
        tenantSelectionRequired: true
      }
    }
  }

  // ✅ БЕЗОПАСНО: Токены в httpOnly cookies + CSRF защита
  // Браузер автоматически отправляет cookies
  // JavaScript не может получить доступ к httpOnly cookies (защита от XSS)
  // CSRF токены защищают от межсайтовых запросов

  // Функция для получения информации о пользователе
  const fetchUserInfo = async (): Promise<User> => {
    try {
      const data = await apiService.auth.me()
      return normalizeUser(data)
    } catch (error) {
      throw new Error('Failed to fetch user info')
    }
  }

  // Функция логина
  const login = async (email: string, password: string): Promise<void> => {
    try {
      tenantAutoSyncRef.current = false
      const data = await apiService.auth.login(email, password)
      
      // 🛡️ Проверяем требуется ли MFA
      if (!data.success && data.code === 'MFA_REQUIRED') {
        console.log('🔍 Login: MFA Required detected:', {
          userId: data.userId,
          email: data.email,
          role: data.role,
          currentStep: 'login_mfa_required'
        });
        
        // MFA требуется - сохраняем данные и НЕ устанавливаем аутентификацию
        const mfaData = {
          userId: data.userId,
          email: data.email,
          role: data.role
        };
        
        setMfaRequired(mfaData);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        
        console.log('🔍 Login: MFA data saved to state:', mfaData);
        
        // Бросаем специальную ошибку которую LoginForm может обработать
        const mfaError = new Error('MFA verification required')
        ;(mfaError as any).code = 'MFA_REQUIRED'
        ;(mfaError as any).mfaData = mfaData
        throw mfaError
      }

      const normalizedUser = normalizeUser(data)

      // Проверяем права доступа к админке
      if (normalizedUser.role !== 'SUPER_ADMIN') {
        throw new Error('Недостаточно прав для доступа к админ-панели')
      }

      const resolvedUser = await ensureTenantContext(normalizedUser)
      // 🔧 Проверяем требуется ли настройка MFA
      if (data.mfaSetupRequired) {
        setMfaSetupRequired(true)
        setAuthState({
          user: resolvedUser,
          isAuthenticated: true, // Частичная аутентификация для настройки MFA
          isLoading: false
        })
        return // Выходим с ограниченным доступом
      }

      // ✅ Полная аутентификация
      setMfaRequired(null)
      setMfaSetupRequired(false)
      setAuthState({
        user: resolvedUser,
        isAuthenticated: true,
        isLoading: false
      })
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false
      }))
      throw error
    }
  }

  // Функция обновления токена
  const refreshToken = async (): Promise<void> => {
    try {
      tenantAutoSyncRef.current = false
      const data = await apiService.auth.refresh()
      const normalizedUser = normalizeUser(data)
      const finalUser = await ensureTenantContext(normalizedUser)

      // Обновляем состояние
      setAuthState({
        user: finalUser,
        isAuthenticated: true,
        isLoading: false
      })
    } catch (error) {
      // Если обновление токена не удалось, выходим
      logout()
      throw error
    }
  }

  // Функция выхода
  const logout = async (): Promise<void> => {
    try {
      // Уведомляем сервер о выходе (очистит cookies сервер)
      await apiService.auth.logout()
    } catch (logoutError) {
      // Игнорируем ошибки logout - сервер очистит cookies в любом случае
    console.log('Server logout failed (expected if token expired):', logoutError)
  } finally {
    // Очищаем CSRF токен и состояние приложения
    tenantAutoSyncRef.current = false
    // Сброс CSRF кэша в SDK (при смене пользователя/tenant)
    apiService.clearCsrf()
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false
      })
      
      // Очищаем MFA состояния
      setMfaRequired(null)
      setMfaSetupRequired(false)
    }
  }

  // Завершение MFA аутентификации
  const completeMFA = async (userId: string, token: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      // 🚨 ДИАГНОСТИКА: Проверяем состояние mfaRequired
      console.log('🔍 MFA State Diagnosis:', {
        mfaRequired: mfaRequired,
        mfaRequiredKeys: mfaRequired ? Object.keys(mfaRequired) : 'NULL',
        authState: authState,
        currentStep: 'completeMFA_start'
      });
      
      // 🔐 Используем email из mfaRequired вместо хардкода
      const email = mfaRequired?.email || 'admin@beauty-platform.com'
      console.log('🔐 MFA Completion Request:', { 
        userId, 
        code: token, 
        email,
        emailSource: mfaRequired?.email ? 'from_mfaRequired' : 'fallback_hardcode',
        requestPayload: { userId, code: token, email }
      })
      
      const data = await apiService.auth.completeMFA(userId, token, email)
      console.log('🔐 MFA API Response:', data)
      
      if (data.success) {
        // Получаем данные пользователя после успешного MFA
        const baseUser = await fetchUserInfo()
        const resolvedUser = await ensureTenantContext(baseUser)
        console.log('✅ MFA Success - User data retrieved:', resolvedUser.email)
        
        setAuthState({
          user: resolvedUser,
          isAuthenticated: true,
          isLoading: false
        })
        
        // Очищаем MFA состояния
        setMfaRequired(null)
        setMfaSetupRequired(false)
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        throw new Error(data.error || 'MFA verification failed')
      }
    } catch (error) {
      console.error('🚨 MFA Completion Error:', error)
      console.error('🚨 Debug Info:', { userId, token: token.substring(0, 4) + '...', mfaRequired })
      setAuthState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  // Принудительный выход с очисткой всех cookies
  const forceLogout = async (): Promise<void> => {
    try {
      // Вызываем force-logout endpoint
      await apiService.get('/auth/force-logout')
    } catch (error) {
      // Игнорируем ошибки API, главное очистить состояние
      console.log('Force logout API failed (expected):', error)
    } finally {
      // Очищаем CSRF токен и состояние приложения
      tenantAutoSyncRef.current = false
      apiService.clearCsrf()
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      })
      
      // Очищаем MFA состояния
      setMfaRequired(null)
      setMfaSetupRequired(false)
      
      // Перезагружаем страницу для полной очистки
      window.location.href = '/login'
    }
  }

  // Проверка аутентификации при загрузке (через httpOnly cookies)
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Проверяем аутентификацию через cookie (автоматически отправляется)
        const user = await fetchUserInfo()
        
        // Проверяем права доступа к админке
        if (user.role !== 'SUPER_ADMIN') {
          logout()
          return
        }

        const resolvedUser = await ensureTenantContext(user)

        setAuthState({
          user: resolvedUser,
          isAuthenticated: true,
          isLoading: false
        })
      } catch (error) {
        // Если access token недействителен, пробуем обновить через refresh
        console.log('🔒 No valid access token, trying refresh...')
        try {
          await refreshToken()
        } catch (refreshError) {
          // Если refresh тоже не удался, пользователь не аутентифицирован
          console.log('🔒 No valid refresh token, user needs to login')
          tenantAutoSyncRef.current = false
          setAuthState({
            user: null,
            isAuthenticated: false,  // Явно указываем что пользователь НЕ аутентифицирован
            isLoading: false
          })
        }
      }
    }

    initAuth()
  }, [])

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshToken,
    completeMFA,
    forceLogout,
    mfaRequired,
    mfaSetupRequired
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
