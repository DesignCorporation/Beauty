// Beauty Platform Backup Service - WebSocket Service
// Real-time мониторинг backup операций

import { Server } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import pino from 'pino'
import { BackupService } from './BackupService'
import { JWTPayload, BackupWebSocketEvent } from '../types/backup'

export class WebSocketService {
  private io: Server
  private logger: pino.Logger
  private authenticatedClients: Map<string, JWTPayload> = new Map()

  constructor(httpServer: HTTPServer, backupService: BackupService) {
    this.logger = pino({ name: 'backup-websocket' })
    
    this.io = new Server(httpServer, {
      cors: {
        origin: [
          'http://localhost:6002',           // Admin Panel (dev)
          'https://test-admin.beauty.designcorp.eu',   // Production Test Admin
          'https://admin.beauty.designcorp.eu',        // Production Admin
          `http://135.181.156.117:6002`              // Direct IP access
        ],
        credentials: true
      },
      path: '/backup-ws/'
    })

    this.setupEventHandlers(backupService)
    this.setupSocketHandlers()
  }

  /**
   * Настройка обработчиков событий от BackupService
   */
  private setupEventHandlers(backupService: BackupService): void {
    // Прогресс backup операции
    backupService.on('backup-progress', (event) => {
      this.logger.debug({ event }, 'Broadcasting backup progress')
      this.broadcastToAuthenticatedClients('backup-progress', event)
    })

    // Завершение backup операции
    backupService.on('backup-completed', (event) => {
      this.logger.info({ event }, 'Broadcasting backup completion')
      this.broadcastToAuthenticatedClients('backup-completed', event)
    })

    // Ошибка backup операции
    backupService.on('backup-error', (event) => {
      this.logger.error({ event }, 'Broadcasting backup error')
      this.broadcastToAuthenticatedClients('backup-error', event)
    })
  }

  /**
   * Настройка WebSocket соединений
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      this.logger.info({ socketId: socket.id }, 'WebSocket connection established')

      // Аутентификация соединения
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          const user = await this.authenticateToken(data.token)
          
          if (user.role !== 'SUPER_ADMIN') {
            socket.emit('auth-error', {
              error: 'Insufficient permissions',
              code: 'INSUFFICIENT_PERMISSIONS'
            })
            socket.disconnect()
            return
          }

          this.authenticatedClients.set(socket.id, user)
          
          socket.emit('authenticated', {
            success: true,
            user: {
              userId: user.userId,
              role: user.role
            }
          })

          this.logger.info({ 
            socketId: socket.id, 
            userId: user.userId 
          }, 'WebSocket client authenticated')

        } catch (error) {
          this.logger.warn({ 
            socketId: socket.id, 
            error 
          }, 'WebSocket authentication failed')
          
          socket.emit('auth-error', {
            error: 'Authentication failed',
            code: 'AUTH_FAILED'
          })
          socket.disconnect()
        }
      })

      // Подписка на события backup
      socket.on('subscribe-backup-events', () => {
        const user = this.authenticatedClients.get(socket.id)
        if (!user) {
          socket.emit('error', {
            error: 'Not authenticated',
            code: 'NOT_AUTHENTICATED'
          })
          return
        }

        socket.join('backup-events')
        socket.emit('subscribed', {
          success: true,
          events: ['backup-progress', 'backup-completed', 'backup-error']
        })

        this.logger.debug({ 
          socketId: socket.id, 
          userId: user.userId 
        }, 'Client subscribed to backup events')
      })

      // Отписка от событий backup
      socket.on('unsubscribe-backup-events', () => {
        socket.leave('backup-events')
        socket.emit('unsubscribed', { success: true })

        const user = this.authenticatedClients.get(socket.id)
        this.logger.debug({ 
          socketId: socket.id, 
          userId: user?.userId 
        }, 'Client unsubscribed from backup events')
      })

      // Получение статуса в реальном времени
      socket.on('get-realtime-status', () => {
        const user = this.authenticatedClients.get(socket.id)
        if (!user) {
          socket.emit('error', {
            error: 'Not authenticated',
            code: 'NOT_AUTHENTICATED'
          })
          return
        }

        // Отправляем текущий статус (это можно расширить)
        socket.emit('realtime-status', {
          timestamp: new Date().toISOString(),
          connections: this.authenticatedClients.size,
          uptime: Math.floor(process.uptime())
        })
      })

      // Обработка отключения
      socket.on('disconnect', (reason) => {
        const user = this.authenticatedClients.get(socket.id)
        this.authenticatedClients.delete(socket.id)
        
        this.logger.info({ 
          socketId: socket.id, 
          userId: user?.userId, 
          reason 
        }, 'WebSocket client disconnected')
      })

      // Обработка ошибок
      socket.on('error', (error) => {
        this.logger.error({ 
          socketId: socket.id, 
          error 
        }, 'WebSocket error')
      })
    })
  }

  /**
   * Аутентификация JWT токена
   */
  private async authenticateToken(token: string): Promise<JWTPayload> {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload
      
      // Проверяем что токен не истек
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired')
      }

      return decoded
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  /**
   * Рассылка событий всем аутентифицированным клиентам
   */
  private broadcastToAuthenticatedClients(event: string, data: BackupWebSocketEvent): void {
    this.io.to('backup-events').emit(event, data)
    
    this.logger.debug({ 
      event, 
      clientsCount: this.authenticatedClients.size 
    }, 'Event broadcasted to authenticated clients')
  }

  /**
   * Отправка персонального сообщения клиенту
   */
  public sendToClient(socketId: string, event: string, data: any): void {
    this.io.to(socketId).emit(event, data)
  }

  /**
   * Получение статистики соединений
   */
  public getConnectionStats(): {
    totalConnections: number
    authenticatedConnections: number
    rooms: string[]
  } {
    return {
      totalConnections: this.io.engine.clientsCount,
      authenticatedConnections: this.authenticatedClients.size,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys())
    }
  }

  /**
   * Принудительное отключение клиента
   */
  public disconnectClient(socketId: string, reason?: string): void {
    const socket = this.io.sockets.sockets.get(socketId)
    if (socket) {
      socket.emit('force-disconnect', { reason })
      socket.disconnect(true)
      
      this.authenticatedClients.delete(socketId)
      
      this.logger.info({ socketId, reason }, 'Client forcefully disconnected')
    }
  }

  /**
   * Широковещательная рассылка системных уведомлений
   */
  public broadcastSystemNotification(notification: {
    type: 'info' | 'warning' | 'error'
    title: string
    message: string
    timestamp?: string
  }): void {
    const payload = {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString()
    }

    this.io.to('backup-events').emit('system-notification', payload)
    
    this.logger.info({ notification: payload }, 'System notification broadcasted')
  }

  /**
   * Закрытие WebSocket сервера
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.info('Closing WebSocket server')
      
      // Отключаем всех клиентов
      this.io.emit('server-shutdown', { 
        message: 'Server is shutting down' 
      })
      
      setTimeout(() => {
        this.io.close(() => {
          this.logger.info('WebSocket server closed')
          resolve()
        })
      }, 1000) // Даем время на отправку сообщения
    })
  }
}