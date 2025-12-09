import { useEffect, useRef, useState } from 'react';
import { User, Settings, Lock, LogOut } from 'lucide-react';
import apiClient from '../utils/api-client';
import { useAuthContext } from '../contexts/AuthContext';
import { debugLog, debugWarn } from '../utils/debug';

interface UserDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDropdown({ isOpen, onClose }: UserDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuthContext();

  const [storedUser, setStoredUser] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      debugWarn('Failed to parse stored user in dropdown:', error);
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'user') {
        try {
          const raw = event.newValue;
          setStoredUser(raw ? JSON.parse(raw) : null);
        } catch (error) {
          debugWarn('Failed to sync user from storage (dropdown):', error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (authUser) {
      try {
        window.localStorage.setItem('user', JSON.stringify(authUser));
        setStoredUser(authUser);
      } catch (error) {
        debugWarn('Failed to persist auth user (dropdown):', error);
      }
    }
  }, [authUser]);

  const user = authUser ?? storedUser;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const menuItems = [
    {
      label: 'Профиль пользователя',
      icon: <User className="h-4 w-4" />,
      action: () => {
        // TODO: Implement profile page
        debugLog('Переход в профиль');
        onClose();
      }
    },
    {
      label: 'Настройки салона',
      icon: <Settings className="h-4 w-4" />,
      action: () => {
        // TODO: Implement settings page
        debugLog('Переход в настройки');
        onClose();
      }
    },
    {
      label: 'Изменить пароль',
      icon: <Lock className="h-4 w-4" />,
      action: () => {
        // TODO: Implement change password
        debugLog('Изменение пароля');
        onClose();
      }
    }
  ];

  const handleLogout = async () => {
    try {
      // Вызов API logout для инвалидации refresh token
      try {
        await apiClient.post('/auth/logout', {
          refreshToken: localStorage.getItem('refreshToken') || ''
        });
      } catch (error) {
        debugWarn('Logout API call failed:', error);
      }

      // Сброс состояния API клиента
      apiClient.reset();

      // Очистка локального хранилища
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('salonLoginData');
      localStorage.removeItem('salonLogoUrl');

      // Перенаправление на страницу входа
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // В случае ошибки всё равно очищаем данные и редиректим
      apiClient.reset();
      localStorage.clear();
      window.location.href = '/login';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-64 bg-card rounded-lg shadow-2xl border border-border z-50"
    >
      {/* User Info Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div 
            className="h-10 w-10 rounded-full flex items-center justify-center bg-primary/10"
          >
            <span className="text-sm font-medium text-primary">
              {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.email || 'Пользователь'
              }
            </p>
            <p className="text-sm text-muted-foreground capitalize">
              {user?.role?.replace('_', ' ').toLowerCase() || 'Пользователь'}
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-2">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-muted transition-colors text-muted-foreground"
          >
            <div className="text-muted-foreground">
              {item.icon}
            </div>
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-error/10 text-error transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Выйти из системы</span>
        </button>
      </div>
    </div>
  );
}
