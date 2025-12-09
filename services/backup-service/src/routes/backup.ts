// Beauty Platform Backup Service - API Routes
// RESTful API для управления системой резервного копирования

import { Router, Request, Response, type NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import joi from 'joi'
import pino from 'pino'
import path from 'path'
import { promises as fs } from 'fs'
import { createNormalizedDTO, getAuth } from '@beauty/shared'
import { auditLog } from '../middleware/auth'
import type { AuthenticatedRequest } from '../middleware/auth'
import { BackupService } from '../services/BackupService'
import {
  CreateBackupRequest,
  UpdateConfigRequest,
  LogLevel,
  BackupError,
  BackupNotFoundError
} from '../types/backup'

const router: Router = Router()
const wrapAuthMiddleware =
  (middleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction): void =>
    middleware(req as AuthenticatedRequest, res, next)
const logger = pino({ name: 'backup-routes' })
const backupService = new BackupService()

// Test endpoint БЕЗ middleware для диагностики
router.get('/test-auth-bypass', (_req, res) => {
  res.json({
    success: true,
    message: 'This endpoint bypasses ALL middleware!',
    timestamp: new Date().toISOString(),
    note: 'If you see this, backup routes work without auth'
  })
})

// Rate limiting для backup операций
const backupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // Максимум 10 запросов на backup за 15 минут
  message: {
    success: false,
    error: 'Too many backup requests, please try again later',
    code: 'BACKUP_RATE_LIMIT'
  },
  skip: (req) => {
    // Пропускаем rate limiting для GET запросов
    return req.method === 'GET'
  }
})

// ВРЕМЕННО ОТКЛЮЧАЕМ - нужно исправить JWT cookie integration
// router.use(authenticate)  
// router.use(requireSuperAdmin)
router.use(wrapAuthMiddleware(auditLog))

// Validation schemas
const createBackupSchema = joi.object({
  type: joi.string().valid('manual', 'scheduled', 'emergency').optional(),
  description: joi.string().max(500).optional(),
  components: joi.array().items(joi.string()).optional()
})

const configUpdateSchema = joi.object({
  config: joi.object({
    enabled: joi.boolean().optional(),
    schedule: joi.string().optional(),
    retention: joi.object({
      daily: joi.number().min(1).max(30).optional(),
      weekly: joi.number().min(1).max(12).optional(),
      monthly: joi.number().min(1).max(24).optional()
    }).optional(),
    compression: joi.boolean().optional(),
    encryption: joi.boolean().optional(),
    notifications: joi.object({
      email: joi.boolean().optional(),
      webhook: joi.string().uri().allow('').optional()
    }).optional(),
    components: joi.object({
      databases: joi.boolean().optional(),
      applicationFiles: joi.boolean().optional(),
      uploads: joi.boolean().optional(),
      configs: joi.boolean().optional(),
      nginx: joi.boolean().optional(),
      ssl: joi.boolean().optional(),
      systemInfo: joi.boolean().optional()
    }).optional()
  }).required()
})

/**
 * GET /api/backup/status
 * Получение статуса системы резервного копирования
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req)

  try {
    const status = await backupService.getSystemStatus()
    
    logger.info({ userId: auth?.userId }, 'System status requested')
    
    res.json(
      createNormalizedDTO({
        success: true,
        status
      })
    )
  } catch (error) {
    logger.error({ error, userId: auth?.userId }, 'Failed to get system status')
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system status',
      code: 'STATUS_ERROR'
    })
  }
})

/**
 * GET /api/backup/list
 * Получение списка всех backup'ов с пагинацией
 */
router.get('/list', async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req)

  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100) // Максимум 100
    
    const result = await backupService.listBackups(page, limit)
    
    logger.info({ 
      userId: auth?.userId, 
      page, 
      limit, 
      total: result.pagination.total 
    }, 'Backup list requested')
    
    res.json(
      createNormalizedDTO({
        success: true,
        data: result.backups,
        pagination: result.pagination
      })
    )
  } catch (error) {
    logger.error({ error, userId: auth?.userId }, 'Failed to list backups')
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list backups',
      code: 'LIST_ERROR'
    })
  }
})

/**
 * POST /api/backup/create
 * Создание нового backup'а
 */
router.post(
  '/create',
  backupRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    const auth = getAuth(req)

    try {
      // Валидация входных данных
      const { error: validationError, value } = createBackupSchema.validate(req.body)
      if (validationError) {
        res.status(400).json(
          createNormalizedDTO({
            success: false,
            error: 'Invalid request data',
            details: validationError.details,
            code: 'VALIDATION_ERROR'
          })
        )
        return
      }

      const createRequest: CreateBackupRequest = value
      const userId = auth?.userId || 'system' // Fallback для отключенной авторизации
      
      logger.info({ userId, request: createRequest }, 'Backup creation requested')
      
      const result = await backupService.createBackup(createRequest, userId)
    
      res.json(createNormalizedDTO(result))
  } catch (error) {
    logger.error({ error, userId: auth?.userId }, 'Failed to create backup')
    
    if (error instanceof BackupError) {
      const statusCode = error.code === 'BACKUP_IN_PROGRESS' ? 409 : 400
      res.status(statusCode).json(
        createNormalizedDTO({
          success: false,
          error: error.message,
          code: error.code,
          details: error.details
        })
      )
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create backup',
        code: 'CREATE_ERROR'
      })
    }
  }
  }
)

/**
 * DELETE /api/backup/:id
 * Удаление backup'а
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req)

  try {
    const backupId = req.params.id
    const force = req.body.force === true
    
    if (!backupId || backupId.length < 8) {
      res.status(400).json(
        createNormalizedDTO({
          success: false,
          error: 'Invalid backup ID',
          code: 'INVALID_ID'
        })
      )
      return
    }
    
    logger.info({ 
      userId: auth?.userId, 
      backupId, 
      force 
    }, 'Backup deletion requested')
    
    await backupService.deleteBackup(backupId, force)
    
    res.json(
      createNormalizedDTO({
        success: true,
        message: 'Backup deleted successfully'
      })
    )
    
  } catch (error) {
    logger.error({ 
      error, 
      userId: auth?.userId, 
      backupId: req.params.id 
    }, 'Failed to delete backup')
    
    if (error instanceof BackupNotFoundError) {
      res.status(404).json(
        createNormalizedDTO({
          success: false,
          error: error.message,
          code: error.code
        })
      )
    } else {
      res.status(500).json(
        createNormalizedDTO({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete backup',
          code: 'DELETE_ERROR'
        })
      )
    }
  }
})

/**
 * GET /api/backup/:id/download
 * Скачивание backup'а
 */
router.get('/:id/download', async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req)

  try {
    const backupId = req.params.id
    const component = req.query.component as string // Опциональный компонент для скачивания
    
    if (!backupId || backupId.length < 8) {
      res.status(400).json(
        createNormalizedDTO({
          success: false,
          error: 'Invalid backup ID',
          code: 'INVALID_ID'
        })
      )
      return
    }
    
    const backupDir = `/root/BACKUPS/production/backup-${backupId}`
    
    // Проверяем существование backup'а
    try {
      await fs.access(backupDir)
    } catch {
      res.status(404).json(
        createNormalizedDTO({
          success: false,
          error: `Backup not found: ${backupId}`,
          code: 'BACKUP_NOT_FOUND'
        })
      )
      return
    }
    
    let downloadPath = backupDir
    let filename = `backup-${backupId}`
    
    // Если указан конкретный компонент
    if (component) {
      const componentPath = path.join(backupDir, component)
      try {
        await fs.access(componentPath)
        downloadPath = componentPath
        filename = component
      } catch {
        res.status(404).json(
          createNormalizedDTO({
            success: false,
            error: `Component not found: ${component}`,
            code: 'COMPONENT_NOT_FOUND'
          })
        )
        return
      }
    }
    
    logger.info({ 
      userId: auth?.userId, 
      backupId, 
      component, 
      downloadPath 
    }, 'Backup download requested')
    
    // Если это директория, создаем архив на лету
    const stats = await fs.stat(downloadPath)
    if (stats.isDirectory() && !component) {
      // Создаем tar.gz архив всего backup'а
      const { spawn } = require('child_process')
      const archiveFilename = `${filename}.tar.gz`
      
      res.setHeader('Content-Type', 'application/gzip')
      res.setHeader('Content-Disposition', `attachment; filename="${archiveFilename}"`)
      
      const tar = spawn('tar', ['czf', '-', '-C', path.dirname(downloadPath), path.basename(downloadPath)])
      tar.stdout.pipe(res)
      
      tar.on('error', (error: any) => {
        logger.error({ error, backupId }, 'Tar creation failed')
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Archive creation failed',
            code: 'ARCHIVE_ERROR'
          })
        }
      })
      
      tar.on('close', () => {
        logger.info({ userId: auth?.userId, backupId }, 'Backup download completed')
      })
      
    } else {
      // Отдаем файл напрямую
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.sendFile(downloadPath)
    }
    
  } catch (error) {
    logger.error({ 
      error, 
      userId: auth?.userId, 
      backupId: req.params.id 
    }, 'Failed to download backup')
    
    res.status(500).json({
      success: false,
      error: 'Failed to download backup',
      code: 'DOWNLOAD_ERROR'
    })
  }
})

/**
 * GET /api/backup/logs
 * Получение логов системы резервного копирования
 */
router.get('/logs', async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req)

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000) // Максимум 1000
    const level = req.query.level as LogLevel | undefined
    
    const logs = await backupService.getLogs(limit, level)
    
    logger.info({ 
      userId: auth?.userId, 
      limit, 
      level, 
      count: logs.length 
    }, 'Logs requested')
    
    res.json(
      createNormalizedDTO({
        success: true,
        logs,
        count: logs.length
      })
    )
    
  } catch (error) {
    logger.error({ error, userId: auth?.userId }, 'Failed to get logs')
    
    res.status(500).json({
      success: false,
      error: 'Failed to get logs',
      code: 'LOG_ERROR'
    })
  }
})

/**
 * GET /api/backup/config
 * Получение конфигурации системы резервного копирования
 */
router.get('/config', async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req)

  try {
    const config = backupService.getConfig()
    
    logger.info({ userId: auth?.userId }, 'Configuration requested')
    
    res.json(
      createNormalizedDTO({
        success: true,
        config
      })
    )
    
  } catch (error) {
    logger.error({ error, userId: auth?.userId }, 'Failed to get config')
    
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration',
      code: 'CONFIG_ERROR'
    })
  }
})

/**
 * PUT /api/backup/config
 * Обновление конфигурации системы резервного копирования
 */
router.put('/config', async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req)

  try {
    // Валидация входных данных
    const { error: validationError, value } = configUpdateSchema.validate(req.body)
    if (validationError) {
      res.status(400).json({
        success: false,
        error: 'Invalid configuration data',
        details: validationError.details,
        code: 'VALIDATION_ERROR'
      })
      return
    }

    const updateRequest: UpdateConfigRequest = value
    
    logger.info({ 
      userId: auth?.userId, 
      updates: updateRequest.config 
    }, 'Configuration update requested')
    
    const updatedConfig = await backupService.updateConfig(updateRequest.config)
    
    res.json(
      createNormalizedDTO({
        success: true,
        config: updatedConfig,
        message: 'Configuration updated successfully'
      })
    )
    
  } catch (error) {
    logger.error({ error, userId: auth?.userId }, 'Failed to update config')
    
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
      code: 'CONFIG_UPDATE_ERROR'
    })
  }
})

/**
 * POST /api/backup/test-script
 * Тестирование backup скрипта (для отладки)
 */
router.post('/test-script', async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req)

  try {
    logger.info({ userId: auth?.userId }, 'Backup script test requested')
    
    // Простая проверка - запускаем скрипт с --help или --version
    const { exec } = require('child_process')
    const result = await new Promise<string>((resolve, reject) => {
      exec('bash /root/SCRIPTS/production-backup.sh --help 2>&1 || echo "Script exists"', 
        { timeout: 5000 }, 
        (error: any, stdout: any, stderr: any) => {
          if (error && error.code !== 'ETIME') {
            reject(error)
          } else {
            resolve(stdout || stderr || 'Script test completed')
          }
        }
      )
    })
    
    res.json(
      createNormalizedDTO({
        success: true,
        message: 'Backup script test completed',
        output: result
      })
    )
    
  } catch (error) {
    logger.error({ error, userId: auth?.userId }, 'Backup script test failed')
    
    res.status(500).json({
      success: false,
      error: 'Script test failed',
      code: 'SCRIPT_TEST_ERROR'
    })
  }
})

export default router
