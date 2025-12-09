import { toast } from 'sonner';

interface NotificationToastOptions {
  title: string;
  message: string;
  type?: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  duration?: number; // в миллисекундах
}

export function useNotificationToast(): {
  showNotification: (options: NotificationToastOptions) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
} {
  const showNotification = ({
    title,
    message,
    priority = 'MEDIUM',
    duration,
  }: NotificationToastOptions): void => {
    // Определяем тип toast на основе приоритета
    const toastType = getPriorityToastType(priority);

    // Определяем duration на основе приоритета
    const toastDuration = duration || getDurationByPriority(priority);

    // Показываем соответствующий toast
    switch (toastType) {
      case 'success':
        toast.success(title, {
          description: message,
          duration: toastDuration,
        });
        break;

      case 'error':
        toast.error(title, {
          description: message,
          duration: toastDuration,
          action: priority === 'URGENT' ? {
            label: 'Закрыть',
            onClick: () => {},
          } : undefined,
        });
        break;

      case 'warning':
        toast.warning(title, {
          description: message,
          duration: toastDuration,
          action: priority === 'HIGH' ? {
            label: 'Закрыть',
            onClick: () => {},
          } : undefined,
        });
        break;

      case 'info':
      default:
        toast.info(title, {
          description: message,
          duration: toastDuration,
        });
        break;
    }
  };

  const showSuccess = (title: string, message?: string) => {
    toast.success(title, {
      description: message,
      duration: 5000,
    });
  };

  const showError = (title: string, message?: string) => {
    toast.error(title, {
      description: message,
      duration: Infinity, // Не исчезает автоматически
      action: {
        label: 'Закрыть',
        onClick: () => {},
      },
    });
  };

  const showWarning = (title: string, message?: string) => {
    toast.warning(title, {
      description: message,
      duration: 8000,
    });
  };

  const showInfo = (title: string, message?: string) => {
    toast.info(title, {
      description: message,
      duration: 5000,
    });
  };

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

// Вспомогательные функции

function getPriorityToastType(priority: string): 'success' | 'error' | 'warning' | 'info' {
  switch (priority) {
    case 'URGENT':
      return 'error';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    case 'LOW':
    default:
      return 'success';
  }
}

function getDurationByPriority(priority: string): number {
  switch (priority) {
    case 'URGENT':
      return Infinity; // Требует ручного закрытия
    case 'HIGH':
      return 10000; // 10 секунд
    case 'MEDIUM':
      return 5000; // 5 секунд
    case 'LOW':
    default:
      return 3000; // 3 секунды
  }
}