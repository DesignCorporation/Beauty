import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Loader2 } from 'lucide-react';
import { debugLog } from '../utils/debug';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  minimumRole?: string;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredRoles,
  minimumRole,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, loading, user } = useAuthContext();
  const { hasRole, hasAnyRole, hasMinimumRole } = usePermissions();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const displayRole = user?.tenantRole ?? user?.role ?? null;

  // 🔍 DEBUG: логируем состояние ProtectedRoute
  debugLog('🛡️ ProtectedRoute check:', {
    path: location.pathname,
    isAuthenticated,
    loading,
    hasUser: !!user,
    userEmail: user?.email,
    timestamp: new Date().toISOString()
  });

  // Показываем загрузку пока проверяем аутентификацию
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Проверка аутентификации...</p>
        </div>
      </div>
    );
  }

  // Если не аутентифицирован, перенаправляем на логин
  if (!isAuthenticated) {
    const currentSalon = searchParams.get('salon') || user?.tenant?.slug;
    const loginUrl = currentSalon 
      ? `${redirectTo}?salon=${currentSalon}&redirect=${encodeURIComponent(location.pathname + location.search)}`
      : `${redirectTo}?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    
    return <Navigate to={loginUrl} replace />;
  }

  // Проверяем роли если они заданы
  let hasAccess = true;

  if (requiredRole && !hasRole(requiredRole)) {
    hasAccess = false;
  }

  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    hasAccess = false;
  }

  if (minimumRole && !hasMinimumRole(minimumRole)) {
    hasAccess = false;
  }

  // Если нет доступа, показываем страницу с ошибкой
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Доступ запрещен
          </h1>
          <p className="text-muted-foreground mb-6">
            У вас недостаточно прав для просмотра этой страницы.
          </p>
          <p className="text-sm text-muted-foreground">
            Ваша роль: <span className="font-medium">{displayRole ?? '—'}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Компонент для условного рендеринга на основе ролей
interface RoleBasedProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  minimumRole?: string;
  fallback?: React.ReactNode;
}

export const RoleBased: React.FC<RoleBasedProps> = ({
  children,
  requiredRole,
  requiredRoles,
  minimumRole,
  fallback = null,
}) => {
  const { hasRole, hasAnyRole, hasMinimumRole } = usePermissions();

  let hasAccess = true;

  if (requiredRole && !hasRole(requiredRole)) {
    hasAccess = false;
  }

  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    hasAccess = false;
  }

  if (minimumRole && !hasMinimumRole(minimumRole)) {
    hasAccess = false;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
