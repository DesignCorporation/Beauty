/**
 * WebSocket/Socket.IO Server для Real-time Notifications
 * Namespace: /socket.io/notifications
 * Auth: JWT из httpOnly cookies (beauty_access_token)
 * Rooms: user:{userId} и salon:{tenantId}
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { parseCookies } from './utils/cookie-parser';

const JWT_SECRET = process.env.JWT_SECRET || 'your-development-jwt-secret-key';

/**
 * Расширенный Socket с информацией о пользователе
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  email?: string;
  role?: string;
}

interface SocketJWTPayload extends JwtPayload {
  userId?: string;
  email?: string;
  tenantId?: string;
  role?: string;
  type?: 'access' | 'refresh';
}

/**
 * Инициализировать Socket.IO сервер
 */
export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : true,
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ['websocket', 'polling']
  });

  /**
   * Middleware для проверки JWT при подключении
   */
  io.use((socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
      // Получить cookies из заголовков
      const cookies = parseCookies(socket.handshake.headers.cookie || '');
      const accessToken = cookies['beauty_access_token'];

      if (!accessToken) {
        console.warn(`[WebSocket] No token provided for connection from ${socket.handshake.address}`);
        return next(new Error('Authentication required - no token provided'));
      }

      // Проверить JWT
      const decoded = jwt.verify(accessToken, JWT_SECRET) as SocketJWTPayload;

      if (!decoded.userId && !decoded.email) {
        console.warn(`[WebSocket] Invalid token payload: ${JSON.stringify(decoded)}`);
        return next(new Error('Authentication failed - invalid token payload'));
      }

      // Сохранить данные в socket
      socket.userId = decoded.userId || decoded.email;
      socket.email = decoded.email;
      socket.tenantId = decoded.tenantId;
      socket.role = decoded.role;

      console.log(`[WebSocket] Auth successful for user: ${socket.userId}, tenant: ${socket.tenantId}`);
      next();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WebSocket] Authentication error: ${errorMsg}`);
      next(new Error(`Authentication failed: ${errorMsg}`));
    }
  });

  /**
   * Обработчик подключения
   */
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    const tenantId = socket.tenantId;

    console.log(`[WebSocket] ✅ Client connected: ${socket.id}`);
    console.log(`   - User: ${userId}`);
    console.log(`   - Tenant: ${tenantId}`);
    console.log(`   - Email: ${socket.email}`);
    console.log(`   - Role: ${socket.role}`);

    // Подписать на комнаты
    if (userId) {
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
      console.log(`[WebSocket] 📍 Joined room: ${userRoom}`);
    }

    if (tenantId) {
      const salonRoom = `salon:${tenantId}`;
      socket.join(salonRoom);
      console.log(`[WebSocket] 📍 Joined room: ${salonRoom}`);
    }

    /**
     * Обработчик ping (noop keepalive)
     */
    socket.on('ping', (callback?: (payload: { status: string; timestamp: string }) => void) => {
      console.log(`[WebSocket] 🏓 Ping from ${userId}`);
      if (typeof callback === 'function') {
        callback({ status: 'pong', timestamp: new Date().toISOString() });
      }
    });

    /**
     * Обработчик отметить уведомление как прочитанное
     */
    socket.on('notification:mark_read', (data: { notificationId?: string }, callback?: (result: { success: boolean; notificationId?: string; error?: string; readAt?: string }) => void) => {
      try {
        const { notificationId } = data || {};

        if (!notificationId) {
          const error = 'notificationId is required';
          console.warn(`[WebSocket] ❌ mark_read error: ${error}`);
          if (typeof callback === 'function') {
            callback({ success: false, error });
          }
          return;
        }

        console.log(`[WebSocket] ✅ Marked notification ${notificationId} as read by ${userId}`);

        // TODO: Обновить в БД через Prisma
        // await prisma.notification.update({
        //   where: { id: notificationId },
        //   data: { isRead: true, readAt: new Date() }
        // });

        // Отправить подтверждение
        if (typeof callback === 'function') {
          callback({
            success: true,
            notificationId,
            readAt: new Date().toISOString()
          });
        }

        // Эмитировать событие для других клиентов того же пользователя
        socket.emit('notification:marked', { notificationId });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[WebSocket] 💥 mark_read error: ${errorMsg}`);
        if (typeof callback === 'function') {
          callback({ success: false, error: errorMsg });
        }
      }
    });

    /**
     * Обработчик отключения
     */
    socket.on('disconnect', (reason: string) => {
      console.log(`[WebSocket] ❌ Client disconnected: ${socket.id}`);
      console.log(`   - User: ${userId}`);
      console.log(`   - Reason: ${reason}`);
    });

    /**
     * Обработчик ошибок
     */
    socket.on('error', (error: unknown) => {
      console.error(`[WebSocket] 💥 Socket error for ${socket.id}: ${error}`);
    });
  });

  console.log('[WebSocket] ✅ Socket.IO server initialized on namespace: /socket.io/notifications');
  return io;
}

/**
 * Экспортировать тип для использования в других модулях
 */
export type { AuthenticatedSocket, SocketJWTPayload };
export { SocketIOServer };
