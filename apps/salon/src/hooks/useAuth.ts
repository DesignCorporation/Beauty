import { useState, useEffect, useCallback, useRef } from 'react'
import apiClient from '../utils/api-client'
import { useDebugLogger, useEffectDebugger, useStateDebugger } from './useDebugLogger'
import { debugLog, debugWarn } from '../utils/debug'

export type TenantRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'RECEPTIONIST' | 'ACCOUNTANT'

export interface TenantMembership {
  tenantId: string
  tenantName: string
  slug: string
  logoUrl?: string | null
  currency?: string
  role: TenantRole
  roles?: TenantRole[]
  grantedAt?: string
}

interface TenantInfo {
  id: string
  slug: string
  name: string
  status?: string
  logoUrl?: string | null
}

interface ApiUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  avatar?: string | null
  role: string
  color?: string
  status: string
  emailVerified: boolean
  tenantId?: string | null
  createdAt: string
  updatedAt: string
  tenant?: TenantInfo | null
  logoUrl?: string | null
  tenantRole?: TenantRole | null
  tenantRoles?: TenantRole[]
  tenants?: TenantMembership[]
  isClient?: boolean
  hasPassword?: boolean
}

export interface User extends ApiUser {
  tenantRole?: TenantRole | null
  tenantRoles?: TenantRole[]
  tenants?: TenantMembership[]
  tenant?: TenantInfo | null
}

const TENANT_ROLE_VALUES: TenantRole[] = ['OWNER', 'MANAGER', 'STAFF', 'RECEPTIONIST', 'ACCOUNTANT']
const TENANT_ROLE_PRIORITY: Record<TenantRole, number> = {
  OWNER: 5,
  MANAGER: 4,
  RECEPTIONIST: 3,
  ACCOUNTANT: 2,
  STAFF: 1
}

const LEGACY_TENANT_ROLE_MAP: Record<string, TenantRole> = {
  OWNER: 'OWNER',
  SALON_OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF_MEMBER: 'STAFF',
  STAFF: 'STAFF',
  RECEPTIONIST: 'RECEPTIONIST',
  ACCOUNTANT: 'ACCOUNTANT'
}

const normalizeTenantRole = (value?: string | null): TenantRole | null => {
  if (!value) return null
  const upper = value.toUpperCase()
  if (TENANT_ROLE_VALUES.includes(upper as TenantRole)) {
    return upper as TenantRole
  }
  return LEGACY_TENANT_ROLE_MAP[upper] ?? null
}

const normalizeTenantRoles = (value?: string | string[] | null): TenantRole[] => {
  if (!value) return []
  const candidates = Array.isArray(value) ? value : [value]
  const normalized: TenantRole[] = []

  candidates.forEach(candidate => {
    const role = normalizeTenantRole(candidate)
    if (role && !normalized.includes(role)) {
      normalized.push(role)
    }
  })

  return normalized
}

const pickPrimaryRole = (roles: TenantRole[]): TenantRole | null => {
  if (!roles.length) return null
  let primary: TenantRole | null = null
  let bestPriority = -Infinity

  roles.forEach(role => {
    const priority = TENANT_ROLE_PRIORITY[role] ?? 0
    if (priority > bestPriority) {
      primary = role
      bestPriority = priority
    }
  })

  return primary
}

const dedupeRoles = (roles: TenantRole[]): TenantRole[] => {
  const seen = new Set<TenantRole>()
  const unique: TenantRole[] = []
  roles.forEach(role => {
    if (!seen.has(role)) {
      seen.add(role)
      unique.push(role)
    }
  })
  return unique
}

// ✅ MeResponse - ответ GET /me
interface MeResponse {
  success: boolean
  user?: ApiUser
  error?: string
}

// ✅ LoginResponse - ответ POST /login
interface LoginResponse {
  success: boolean;
  error?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Constants - moved outside component to avoid dependency array issues
const SESSION_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 час
const DEBOUNCE_DELAY = 1000; // 1 секунда между запросами
const AVATAR_CACHE_PREFIX = 'userAvatarCache:';

export const useAuth = (): AuthState & {
  login: (credentials: { email: string; password: string; tenantSlug?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refetch: (force?: boolean, skipAuthPageCheck?: boolean) => Promise<User | null>;
  updateUser: (patch: Partial<User>) => User | null;
} => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  const lastUserRef = useRef<User | null>(null);
  useEffect(() => {
    lastUserRef.current = authState.user;
  }, [authState.user]);

  // 🔍 DEBUG: Отслеживаем рендеры и состояние
  useDebugLogger('useAuth', authState);
  useStateDebugger('authState', authState);

  // ✅ DEBOUNCE: Предотвращаем множественные запросы
  const lastFetchTime = useRef<number>(0);
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getCachedAvatar = useCallback((userId: string): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    try {
      return window.localStorage.getItem(`${AVATAR_CACHE_PREFIX}${userId}`) ?? undefined;
    } catch {
      return undefined;
    }
  }, []);

  const setCachedAvatar = useCallback((userId: string, avatar?: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      const key = `${AVATAR_CACHE_PREFIX}${userId}`;
      if (avatar) {
        window.localStorage.setItem(key, avatar);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  }, []);

  // ✅ Реальная проверка аутентификации через Auth Service с DEBOUNCE
  const fetchUser = useCallback(async (force = false, skipAuthPageCheck = false): Promise<User | null> => {
    // 🚫 ПОЛНАЯ БЛОКИРОВКА на страницах аутентификации (кроме принудительных запросов после логина)
    if (typeof window !== 'undefined' && !skipAuthPageCheck) {
      const isAuthPage = window.location.pathname.includes('/login') || 
                        window.location.pathname.includes('/register');
      
      if (isAuthPage && !force) {
        debugLog('🚫 useAuth.fetchUser: BLOCKED on auth page', {
          pathname: window.location.pathname,
          href: window.location.href,
          timestamp: new Date().toISOString()
        });
        return null;
      }
    }
    
    const now = Date.now();
    
    // ✅ DEBOUNCE: Проверяем не слишком ли часто делаем запросы (можно пробить force-флагом)
    if (!force && now - lastFetchTime.current < DEBOUNCE_DELAY) {
      debugLog('⏳ useAuth: Debouncing auth check, skipping request');
      return null;
    }
    
    lastFetchTime.current = now;
    
    try {
      debugLog('🚀 useAuth: Checking authentication with Auth Service');
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      // Проверяем аутентификацию через Auth Service
      debugLog('📡 useAuth: Making API request to /auth/me');
      const response = await apiClient.get<MeResponse>('/auth/me');
      debugLog('📡 useAuth: API response received:', response);
      
      if (response.success && response.user) {
        debugLog('✅ User authenticated:', response.user.email);

        const userTenantRoles = normalizeTenantRoles(response.user.tenantRoles ?? null)

        const mapTenantMembership = (tenant: TenantMembership | Record<string, unknown>): TenantMembership => {
          const rawRoles = (tenant as { roles?: string | string[] }).roles ?? (tenant as { tenantRoles?: string | string[] }).tenantRoles ?? null
          const baseRoles = normalizeTenantRoles(rawRoles)

          if (!baseRoles.length) {
            const fallbackRole = normalizeTenantRole((tenant as { role?: string }).role ?? null)
            if (fallbackRole) {
              baseRoles.push(fallbackRole)
            }
          }

          const effectiveRole = pickPrimaryRole(baseRoles) ?? 'STAFF'
          const effectiveRoles = dedupeRoles(baseRoles.length ? baseRoles : [effectiveRole])

          const result: TenantMembership = {
            tenantId: String((tenant as { tenantId?: string; id?: string }).tenantId ?? (tenant as { id?: string }).id ?? ''),
            tenantName: String((tenant as { tenantName?: string; name?: string }).tenantName ?? (tenant as { name?: string }).name ?? 'Beauty Platform'),
            slug: String((tenant as { slug?: string; tenantSlug?: string }).slug ?? (tenant as { tenantSlug?: string }).tenantSlug ?? ''),
            logoUrl: (tenant as { logoUrl?: string | null }).logoUrl ?? null,
            currency: (tenant as { currency?: string }).currency,
            role: effectiveRole,
            roles: effectiveRoles,
            grantedAt: (tenant as { grantedAt?: string }).grantedAt
          }
          return result
        }

        let tenants: TenantMembership[] = Array.isArray(response.user.tenants)
          ? response.user.tenants.map(mapTenantMembership)
          : [];

        if (!tenants.length) {
          try {
            const tenantResponse = await apiClient.get<{ success: boolean; tenants: TenantMembership[] }>(
              `/auth/users/${response.user.id}/tenants`
            );

            if (tenantResponse?.success && Array.isArray(tenantResponse.tenants)) {
              tenants = tenantResponse.tenants.map(mapTenantMembership);
            }
          } catch (tenantError) {
            debugWarn('⚠️ Failed to load tenant list for user:', tenantError);
          }
        }

        tenants.sort((a, b) => {
          if (a.grantedAt && b.grantedAt) {
            return new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime();
          }
          if (a.grantedAt) return -1;
          if (b.grantedAt) return 1;
          return a.tenantName.localeCompare(b.tenantName);
        });

        const activeTenantId = response.user.tenantId ?? tenants[0]?.tenantId ?? null;
        const activeMembership = activeTenantId
          ? tenants.find(tenant => tenant.tenantId === activeTenantId) ?? null
          : null;

        const combinedRoles: TenantRole[] = []

        if (activeMembership?.roles?.length) {
          combinedRoles.push(...activeMembership.roles)
        }

        const activeMembershipRole = normalizeTenantRole(activeMembership?.role)
        if (activeMembershipRole) {
          combinedRoles.push(activeMembershipRole)
        }

        if (userTenantRoles.length) {
          combinedRoles.push(...userTenantRoles)
        }

        const explicitTenantRole = normalizeTenantRole(response.user.tenantRole)
        if (explicitTenantRole) {
          combinedRoles.push(explicitTenantRole)
        }

        const legacyUserRole = normalizeTenantRole(response.user.role)
        if (legacyUserRole) {
          combinedRoles.push(legacyUserRole)
        }

        const dedupedRoles = dedupeRoles(combinedRoles)
        const resolvedTenantRole = pickPrimaryRole(dedupedRoles)
        const resolvedTenantRoles = dedupedRoles.length
          ? dedupedRoles
          : resolvedTenantRole
            ? [resolvedTenantRole]
            : []

        const tenantRole = resolvedTenantRole ?? null;

        const activeTenant: TenantInfo | null =
          activeMembership
            ? {
                id: activeMembership.tenantId,
                name: activeMembership.tenantName,
                slug: activeMembership.slug,
                ...(response.user.tenant?.status ? { status: response.user.tenant.status } : {}),
                logoUrl: activeMembership.logoUrl ?? response.user.tenant?.logoUrl ?? null
              }
            : response.user.tenant ?? null;

        const normalizedUser: User = {
          ...response.user,
          tenantId: activeTenantId ?? null,
          tenant: activeTenant,
          tenants
        };

        if (typeof response.user.avatar === 'undefined') {
          const cachedAvatar = getCachedAvatar(response.user.id) ?? lastUserRef.current?.avatar;
          if (typeof cachedAvatar !== 'undefined') {
            normalizedUser.avatar = cachedAvatar;
          } else {
            normalizedUser.avatar = undefined;
          }
        } else if (response.user.avatar) {
          setCachedAvatar(response.user.id, response.user.avatar);
        } else {
          setCachedAvatar(response.user.id, null);
        }

        normalizedUser.tenantRole = tenantRole;

        if (resolvedTenantRoles.length) {
          normalizedUser.tenantRoles = resolvedTenantRoles;
        }

        if (typeof response.user.isClient === 'boolean') {
          normalizedUser.isClient = response.user.isClient;
        }

        setAuthState({
          isAuthenticated: true,
          user: normalizedUser,
          loading: false,
          error: null,
        });

        return normalizedUser;
      } else {
        throw new Error('User not authenticated');
      }
    } catch (error) {
      debugLog('❌ Auth check failed - user not authenticated:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null, // Не показываем error если просто не авторизован
      });
      
      // Если мы НЕ на странице логина/регистрации, НЕ делаем редирект
      // ProtectedRoute будет управлять редиректами
      if (typeof window !== 'undefined' && 
          !window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/register')) {
        debugLog('🔐 Auth failed - ProtectedRoute will handle redirect');
      }

      return null;
    }
  }, [getCachedAvatar, setCachedAvatar]);

  // ✅ ПОЛНАЯ БЛОКИРОВКА: НЕ ЗАПУСКАЕМ useEffect на auth страницах
  useEffect(() => {
    debugLog('🔥 useAuth useEffect STARTED', {
      pathname: window?.location?.pathname,
      href: window?.location?.href,
      timestamp: new Date().toISOString()
    });
    
    // 🚫 ПОЛНАЯ БЛОКИРОВКА на страницах логина/регистрации
    if (typeof window !== 'undefined') {
      const isAuthPage = window.location.pathname.includes('/login') || 
                        window.location.pathname.includes('/register');
      
      if (isAuthPage) {
        debugLog('🚫 useAuth useEffect: COMPLETELY BLOCKED on auth page', {
          pathname: window.location.pathname,
          href: window.location.href,
          timestamp: new Date().toISOString()
        });
        
        // Устанавливаем начальное состояние для auth страниц
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false, // ИСПРАВЛЕНО: НЕ загружаем на auth страницах
          error: null,
        });
        
        void debugLog('🚫 useAuth useEffect: EARLY RETURN - no API calls');
        return; // ПОЛНЫЙ ВЫХОД ИЗ useEffect
      }
    }
    
    const checkAuth = (): void => {
      debugLog('🔐 REAL AUTH: Checking authentication with Auth Service');
      void fetchUser();
    };

    // Проверяем только при первом монтировании на не-auth страницах
    void checkAuth();

    // Очистка таймера при размонтировании
    const timeout = debounceTimeout.current;
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 🔍 DEBUG: Отслеживаем useEffect
  void useEffectDebugger('useAuth-main-effect', []);

  // ✅ ВКЛЮЧЕНО - реальный логин через Auth Service
  const login = useCallback(async (credentials: {
    email: string;
    password: string;
    tenantSlug?: string;
  }) => {
    try {
      debugLog('🔧 useAuth.login: Authenticating with Auth Service');
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      // Добавляем salonSlug если есть tenantSlug
      const loginData = {
        ...credentials,
        salonSlug: credentials.tenantSlug
      };

      const response = await apiClient.post<LoginResponse>('/auth/login', loginData);

      if (response.success) {
        debugLog('✅ Login successful');
        // После успешного логина получаем данные пользователя (пропускаем проверку auth страницы)
        await fetchUser(true, true);
        return { success: true };
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Убираем fetchUser из dependencies чтобы избежать цикла

  // Логаут
  const logout = useCallback(async () => {
    try {
      // Вызываем logout endpoint для инвалидации токенов
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      // В любом случае очищаем локальное состояние
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
      
      // Сбрасываем состояние API клиента
      apiClient.reset();
      
      // Перенаправляем на логин
      window.location.href = '/login';
    }
  }, []);

  // Обновление токена (автоматически через API client)
  const refreshAuth = useCallback(async () => {
    // 🚫 ПОЛНАЯ БЛОКИРОВКА на страницах аутентификации
    if (typeof window !== 'undefined') {
      const isAuthPage = window.location.pathname.includes('/login') ||
                        window.location.pathname.includes('/register');

      if (isAuthPage) {
        debugLog('🚫 useAuth.refreshAuth: BLOCKED on auth page');
        return;
      }
    }

    await fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Убираем fetchUser из dependencies чтобы избежать цикла

  useEffect(() => {
    if (authState.isAuthenticated) {
      const performRefresh = async () => {
        try {
          debugLog('🔄 useAuth: автоматическое обновление сессии');
          await apiClient.post('/auth/refresh');
        } catch (error) {
          console.error('❌ useAuth: автоматическое обновление не удалось', error);
        }
      };

      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      refreshIntervalRef.current = setInterval(() => {
        void performRefresh();
      }, SESSION_REFRESH_INTERVAL);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }

    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    return undefined;
  }, [authState.isAuthenticated]);

  const updateUser = useCallback((patch: Partial<User>) => {
    setAuthState(prev => {
      if (!prev.user) {
        return prev
      }
      const nextUser = {
        ...prev.user,
        ...patch
      }
      lastUserRef.current = nextUser
      return {
        ...prev,
        user: nextUser
      }
    })

    const finalUser = lastUserRef.current
    if (!finalUser) {
      return null
    }

    if ('avatar' in patch) {
      if (finalUser.avatar) {
        setCachedAvatar(finalUser.id, finalUser.avatar)
      } else {
        setCachedAvatar(finalUser.id, null)
      }
    }

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('user', JSON.stringify(finalUser))
        window.dispatchEvent(
          new CustomEvent('beauty-user-update', {
            detail: { user: finalUser }
          })
        )
      } catch (error) {
        console.warn('Failed to persist updated auth user:', error)
      }
    }

    return finalUser
  }, [setCachedAvatar])

  return {
    ...authState,
    login,
    logout,
    refreshAuth,
    refetch: fetchUser,
    updateUser
  };
};
