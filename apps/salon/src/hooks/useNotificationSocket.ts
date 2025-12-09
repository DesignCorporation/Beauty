import { useEffect } from 'react'
import { useBeautyWebSocket } from '@beauty-platform/client-sdk'
import { resolveWsUrl, WS_PATH } from '../services/sdkClient'

export interface NotificationEvent {
  type?: string
  title?: string
  message?: string
  target?: string
  [key: string]: unknown
}

interface UseNotificationSocketOptions {
  onNotification?: (event: NotificationEvent) => void
  onError?: (error: Error) => void
}

export function useNotificationSocket(options: UseNotificationSocketOptions = {}): void {
  const { socket, error } = useBeautyWebSocket({
    wsPath: WS_PATH,
    wsUrl: resolveWsUrl()
  })

  // Пробрасываем ошибку соединения
  useEffect(() => {
    if (error && options.onError) {
      options.onError(error);
    }
  }, [error, options]);

  // Подписка на события
  useEffect(() => {
    if (!socket) return

    const handleNotification = (event: NotificationEvent) => {
      options.onNotification?.(event)
    }

    socket.on('notification:new', handleNotification)

    return () => {
      socket.off('notification:new', handleNotification)
    }
  }, [socket, options])
}
