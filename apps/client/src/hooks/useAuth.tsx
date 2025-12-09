import { createContext, useCallback, useContext, useMemo, ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientApi } from '../services'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  phoneVerified: boolean
  emailVerified?: boolean
  avatar: string | null
  birthdate: string | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null
  preferredLanguage: 'RU' | 'EN' | 'PL' | 'UA'
  marketingConsent: boolean
  phoneVerifiedAt?: string | null
  joinedPortalAt?: string | null
  source?: string | null
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  isLoading: boolean
  loginWithGoogle: () => void
  refreshProfile: () => Promise<AuthUser | null>
  logout: () => Promise<void>
  isLoggingOut: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const PROFILE_QUERY_KEY = ['auth', 'profile']

const mapUser = (raw: any): AuthUser => ({
  id: raw.id,
  email: raw.email,
  firstName: raw.firstName,
  lastName: raw.lastName,
  phone: raw.phone ?? null,
  phoneVerified: Boolean(raw.phoneVerified), // ✅ ИСПРАВЛЕНО: используем реальное поле phoneVerified из backend
  emailVerified: raw.emailVerified,
  avatar: raw.avatar ?? null,
  birthdate: raw.birthdate ?? null,
  gender: raw.gender ?? null,
  preferredLanguage: (raw.preferredLanguage ?? 'RU') as AuthUser['preferredLanguage'],
  marketingConsent: raw.marketingConsent ?? false,
  phoneVerifiedAt: raw.phoneVerifiedAt ?? null,
  joinedPortalAt: raw.joinedPortalAt ?? null,
  source: raw.source ?? null
})

async function fetchProfile() {
  const response = await clientApi.getClientProfile()
  if (!response.success) {
    throw new Error(response.error || 'Failed to load profile')
  }
  return response.data as any
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchProfile,
    retry: false,
    refetchOnWindowFocus: false
  })

  // Мемоизируем user объект чтобы избежать бесконечных re-render
  const user: AuthUser | null = useMemo(
    () => (profileQuery.data ? mapUser(profileQuery.data) : null),
    [profileQuery.data]
  )

  let status: AuthStatus = 'loading'
  if (profileQuery.isLoading) {
    status = 'loading'
  } else if (profileQuery.isSuccess) {
    status = 'authenticated'
  } else if (profileQuery.isError) {
    status = 'unauthenticated'
  }

  const refreshProfile = useCallback(async (): Promise<AuthUser | null> => {
    const result = await profileQuery.refetch()
    if (result.data) {
      return mapUser(result.data)
    }
    return null
  }, [profileQuery])

  const loginWithGoogle = useCallback(() => {
    const base = clientApi.getAuthBaseUrl()
    window.location.href = `${base}/google`
  }, [])

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await clientApi.logoutClient() // POST /api/auth/logout-client
      if (!response.success) {
        throw new Error(response.error || 'Logout failed')
      }
    }
  })

  const logout = useCallback(async () => {
    const logMessages: string[] = []
    const log = (msg: string) => {
      console.log(msg)
      logMessages.push(`[${new Date().toISOString()}] ${msg}`)
    }

    log('🚪 [LOGOUT] Начинаем logout...')

    if (logoutMutation.isPending) {
      log('🚪 [LOGOUT] Уже выполняется, пропускаем')
      return
    }

    try {
      log('🚪 [LOGOUT] Отправляем POST запрос...')
      // Выполняем logout запрос и ЖДЕМ его завершения
      await logoutMutation.mutateAsync()
      log('✅ [LOGOUT] POST запрос успешно завершен')
    } catch (error) {
      const errorMsg = `❌ [LOGOUT] POST запрос провалился: ${error}`
      console.error(errorMsg)
      logMessages.push(`[${new Date().toISOString()}] ${errorMsg}`)
    }

    // ПОСЛЕ завершения запроса - очищаем кэш
    try {
      log('🧹 [LOGOUT] Очищаем React Query кэш...')
      await queryClient.removeQueries({ queryKey: PROFILE_QUERY_KEY })
      await queryClient.removeQueries({ queryKey: ['mySalons'] })
      await queryClient.removeQueries({ queryKey: ['notifications'] })
      log('✅ [LOGOUT] Кэш очищен')
    } catch (error) {
      const warnMsg = `⚠️ [LOGOUT] Не удалось очистить кэш: ${error}`
      console.warn(warnMsg)
      logMessages.push(`[${new Date().toISOString()}] ${warnMsg}`)
    }

    // Сохраняем логи в localStorage перед redirect
    log('🔄 [LOGOUT] Редиректим на /login...')
    try {
      localStorage.setItem('LOGOUT_DEBUG_LOGS', JSON.stringify(logMessages))
    } catch (e) {
      console.warn('Не удалось сохранить debug логи:', e)
    }

    // ТОЛЬКО ПОТОМ редиректим
    window.location.href = '/login'
  }, [logoutMutation, queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      // Показываем loading только если действительно загружаем И еще нет результата (success/error)
      isLoading: profileQuery.isLoading && !profileQuery.isSuccess && !profileQuery.isError,
      loginWithGoogle,
      refreshProfile,
      logout,
      isLoggingOut: logoutMutation.isPending
    }),
    [status, user, profileQuery.isLoading, profileQuery.isSuccess, profileQuery.isError, loginWithGoogle, refreshProfile, logout, logoutMutation.isPending]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
