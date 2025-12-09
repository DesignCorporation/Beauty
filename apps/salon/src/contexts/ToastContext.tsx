// Заглушка для Toast контекста
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive' | 'warning';
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }): JSX.Element => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Автоматически скрыть через duration (по умолчанию 5 секунд)
    setTimeout(() => {
      hideToast(id);
    }, toast.duration || 5000);
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
      {/* Простая реализация toast уведомлений */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              p-4 rounded-lg shadow-lg min-w-[300px] max-w-[400px]
              ${toast.variant === 'success'
                ? 'bg-success text-success-foreground'
                : toast.variant === 'destructive'
                  ? 'bg-error text-error-foreground'
                  : toast.variant === 'warning'
                    ? 'bg-warning text-warning-foreground'
                    : 'bg-primary text-primary-foreground'}
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{toast.title}</div>
                {toast.description && (
                  <div className="text-sm opacity-90 mt-1">{toast.description}</div>
                )}
              </div>
              <button
                onClick={() => hideToast(toast.id)}
                className="ml-4 opacity-80 hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
