// Beauty Platform Backup Service - Main Service Class
// Интеграция с существующим production-backup.sh скриптом

import { spawn, exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { EventEmitter } from 'events'
import pino from 'pino'
import { buildOptional, normalizeOptional } from '@beauty/shared'
import {
  BackupMetadata,
  BackupOperation,
  BackupConfig,
  BackupLog,
  SystemStatus,
  BackupType,
  BackupStatus,
  OperationStatus,
  LogLevel,
  ComponentStatus,
  BackupError,
  BackupNotFoundError,
  BackupInProgressError,
  InsufficientStorageError,
  CreateBackupRequest,
  CreateBackupResponse
} from '../types/backup'

export class BackupService extends EventEmitter {
  private logger: pino.Logger
  private activeOperations: Map<string, BackupOperation> = new Map()
  private config: BackupConfig
  private readonly BACKUP_ROOT = '/root/BACKUPS/production'
  private readonly BACKUP_SCRIPT = '/root/SCRIPTS/production-backup.sh'
  private readonly LOG_FILE = '/var/log/beauty-backup.log'

  constructor() {
    super()
    this.logger = pino({
      name: 'backup-service',
      level: process.env.LOG_LEVEL || 'info'
    })

    // Загружаем конфигурацию по умолчанию
    this.config = this.getDefaultConfig()
  }

  /**
   * Получение статуса системы резервного копирования
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const [storageInfo, backupsResult, activeOperations] = await Promise.all([
        this.getStorageInfo(),
        this.listBackups(),
        this.getActiveOperations()
      ])

      const lastBackup = backupsResult.backups[0]
      const nextScheduledBackup = this.getNextScheduledBackup()

      return {
        backupService: {
          status: 'healthy',
          uptime: Math.floor(process.uptime()),
          version: '1.0.0'
        },
        storage: storageInfo,
        activeOperations,
        ...(lastBackup
          ? {
              lastBackup: {
                timestamp: lastBackup.timestamp,
                status: lastBackup.status,
                size: lastBackup.size
              }
            }
          : {}),
        ...(nextScheduledBackup ? { nextScheduledBackup } : {})
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to get system status')
      throw new BackupError('Failed to get system status', 'STATUS_ERROR')
    }
  }

  /**
   * Получение списка всех backup'ов
   */
  async listBackups(page: number = 1, limit: number = 20): Promise<{
    backups: BackupMetadata[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    try {
      const backupDirs = await this.getBackupDirectories()
      const backups: BackupMetadata[] = []

      for (const dir of backupDirs) {
        try {
          const metadata = await this.parseBackupMetadata(dir)
          backups.push(metadata)
        } catch (error) {
          this.logger.warn({ dir, error }, 'Failed to parse backup metadata')
        }
      }

      // Сортируем по дате (новые сначала)
      backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      // Пагинация
      const total = backups.length
      const pages = Math.ceil(total / limit)
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedBackups = backups.slice(startIndex, endIndex)

      return {
        backups: paginatedBackups,
        pagination: {
          page,
          limit,
          total,
          pages
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to list backups')
      throw new BackupError('Failed to list backups', 'LIST_ERROR')
    }
  }

  /**
   * Создание нового backup'а
   */
  async createBackup(request: CreateBackupRequest, userId: string): Promise<CreateBackupResponse> {
    const operationId = crypto.randomUUID()
    
    // Проверяем, нет ли уже активных операций
    const existingOperation = this.activeOperations.values().next()
    if (!existingOperation.done) {
      throw new BackupInProgressError(existingOperation.value.id)
    }

    // Проверяем свободное место
    const storageInfo = await this.getStorageInfo()
    const requiredSpace = 1024 // Минимум 1GB
    if (storageInfo.available < requiredSpace) {
      throw new InsufficientStorageError(requiredSpace, storageInfo.available)
    }

    const operation: BackupOperation = {
      id: operationId,
      type: 'create',
      status: OperationStatus.PENDING,
      progress: 0,
      startedAt: new Date(),
      userId,
      metadata: {
        type: request.type ?? BackupType.MANUAL,
        ...buildOptional('description', normalizeOptional(request.description))
      }
    }

    this.activeOperations.set(operationId, operation)

    // Запускаем backup асинхронно
    this.executeBackup(operation).catch(error => {
      this.logger.error({ operationId, error }, 'Backup execution failed')
    })

    return {
      success: true,
      operation,
      message: 'Backup operation started'
    }
  }

  /**
   * Удаление backup'а
   */
  async deleteBackup(backupId: string, _force: boolean = false): Promise<void> {
    const backupPath = path.join(this.BACKUP_ROOT, `backup-${backupId}`)
    
    try {
      // Проверяем существование backup'а
      await fs.access(backupPath)
      
      // Удаляем директорию
      await fs.rm(backupPath, { recursive: true, force: true })
      
      this.logger.info({ backupId }, 'Backup deleted successfully')
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new BackupNotFoundError(backupId)
      }
      throw new BackupError(`Failed to delete backup: ${backupId}`, 'DELETE_ERROR')
    }
  }

  /**
   * Получение конфигурации
   */
  getConfig(): BackupConfig {
    return { ...this.config }
  }

  /**
   * Обновление конфигурации
   */
  async updateConfig(updates: Partial<BackupConfig>): Promise<BackupConfig> {
    this.config = { ...this.config, ...updates }
    
    // Сохраняем конфигурацию в файл
    await this.saveConfig()
    
    this.logger.info({ config: this.config }, 'Backup configuration updated')
    return this.config
  }

  /**
   * Получение логов
   */
  async getLogs(limit: number = 100, level?: LogLevel): Promise<BackupLog[]> {
    try {
      const logContent = await fs.readFile(this.LOG_FILE, 'utf-8')
      const lines = logContent.split('\n').filter(Boolean)
      
      const logs: BackupLog[] = []
      
      for (const line of lines.slice(-limit)) {
        try {
          const parsed = this.parseLogLine(line)
          if (!level || parsed.level === level) {
            logs.push(parsed)
          }
        } catch (error) {
          // Игнорируем строки которые не удалось распарсить
        }
      }
      
      return logs.reverse() // Новые сначала
    } catch (error) {
      this.logger.error({ error }, 'Failed to read logs')
      throw new BackupError('Failed to read logs', 'LOG_ERROR')
    }
  }

  /**
   * Выполнение backup'а через существующий скрипт
   */
  private async executeBackup(operation: BackupOperation): Promise<void> {
    try {
      operation.status = OperationStatus.RUNNING
      operation.progress = 0
      this.activeOperations.set(operation.id, operation)
      
      this.emit('backup-progress', {
        type: 'backup-progress',
        operationId: operation.id,
        progress: 0,
        currentStep: 'Starting backup process...'
      })

      // Выполняем backup скрипт
      const backupResult = await this.runBackupScript(operation.id)
      
      // Парсим результат и создаем метаданные
      const metadata = await this.parseBackupResult(backupResult)
      
      operation.status = OperationStatus.COMPLETED
      operation.progress = 100
      operation.completedAt = new Date()
      operation.metadata = metadata
      
      this.activeOperations.delete(operation.id)
      
      this.emit('backup-completed', {
        type: 'backup-completed',
        operationId: operation.id,
        backupId: metadata.id,
        status: BackupStatus.COMPLETED,
        metadata
      })
      
      this.logger.info({ operationId: operation.id, backupId: metadata.id }, 'Backup completed successfully')
      
    } catch (error) {
      operation.status = OperationStatus.FAILED
      operation.error = error instanceof Error ? error.message : String(error)
      operation.completedAt = new Date()
      
      this.activeOperations.delete(operation.id)
      
      this.emit('backup-error', {
        type: 'backup-error',
        operationId: operation.id,
        error: operation.error
      })
      
      this.logger.error({ operationId: operation.id, error }, 'Backup failed')
      throw error
    }
  }

  /**
   * Запуск production-backup.sh скрипта
   */
  private async runBackupScript(operationId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('bash', [this.BACKUP_SCRIPT], {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      process.stdout.on('data', (data) => {
        const output = data.toString()
        stdout += output
        
        // Парсим вывод для отслеживания прогресса
        this.parseBackupProgress(output, operationId)
      })

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new BackupError(`Backup script failed with code ${code}: ${stderr}`, 'SCRIPT_ERROR'))
        }
      })

      process.on('error', (error) => {
        reject(new BackupError(`Failed to start backup script: ${error.message}`, 'SCRIPT_START_ERROR'))
      })
    })
  }

  /**
   * Парсинг прогресса backup из вывода скрипта
   */
  private parseBackupProgress(output: string, operationId: string): void {
    const lines = output.split('\n')
    
    for (const line of lines) {
      let progress = 0
      let currentStep = ''
      
      if (line.includes('Backing up PostgreSQL')) {
        progress = 10
        currentStep = 'Backing up databases...'
      } else if (line.includes('Backing up Beauty Platform files')) {
        progress = 30
        currentStep = 'Backing up application files...'
      } else if (line.includes('Backing up uploaded images')) {
        progress = 50
        currentStep = 'Backing up uploaded images...'
      } else if (line.includes('Backing up nginx')) {
        progress = 70
        currentStep = 'Backing up nginx configuration...'
      } else if (line.includes('Collecting system information')) {
        progress = 85
        currentStep = 'Collecting system information...'
      } else if (line.includes('Backup completed successfully')) {
        progress = 100
        currentStep = 'Backup completed successfully!'
      }
      
      if (progress > 0) {
        const operation = this.activeOperations.get(operationId)
        if (operation) {
          operation.progress = progress
          this.activeOperations.set(operationId, operation)
          
          this.emit('backup-progress', {
            type: 'backup-progress',
            operationId,
            progress,
            currentStep
          })
        }
      }
    }
  }

  /**
   * Вспомогательные методы
   */
  private async getBackupDirectories(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.BACKUP_ROOT, { withFileTypes: true })
      return entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
        .map(entry => entry.name)
        .sort((a, b) => b.localeCompare(a)) // Новые сначала
    } catch (error) {
      this.logger.error({ error }, 'Failed to read backup directory')
      return []
    }
  }

  private async parseBackupMetadata(dirName: string): Promise<BackupMetadata> {
    const dirPath = path.join(this.BACKUP_ROOT, dirName)
    const stats = await fs.stat(dirPath)
    
    // Извлекаем timestamp из имени директории (backup-20250821_030001)
    const timestampMatch = dirName.match(/backup-(\d{8}_\d{6})/)
    const timestampStr = timestampMatch ? timestampMatch[1] : undefined
    const timestamp = this.parseBackupTimestamp(timestampStr) ?? stats.birthtime

    // Вычисляем размер backup'а
    const size = await this.calculateDirectorySize(dirPath)
    
    // Определяем компоненты backup'а
    const components = await this.analyzeBackupComponents(dirPath)
    
    return {
      id: dirName.replace('backup-', ''),
      name: dirName,
      timestamp,
      size,
      path: dirPath,
      type: BackupType.SCHEDULED,
      status: BackupStatus.COMPLETED,
      components
    }
  }

  private parseBackupTimestamp(timestampStr?: string): Date | undefined {
    if (!timestampStr || timestampStr.length !== 15) {
      return undefined
    }

    const [date, time] = timestampStr.split('_')
    if (!date || !time) {
      return undefined
    }

    const year = Number.parseInt(date.slice(0, 4), 10)
    const month = Number.parseInt(date.slice(4, 6), 10) - 1
    const day = Number.parseInt(date.slice(6, 8), 10)
    const hour = Number.parseInt(time.slice(0, 2), 10)
    const minute = Number.parseInt(time.slice(2, 4), 10)
    const second = Number.parseInt(time.slice(4, 6), 10)

    if ([year, month, day, hour, minute, second].some((value) => Number.isNaN(value))) {
      return undefined
    }

    return new Date(year, month, day, hour, minute, second)
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        exec(`du -sb "${dirPath}"`, (error, stdout) => {
          if (error) reject(error)
          else resolve(stdout)
        })
      })
      
      const [rawSize] = result.split('\t')
      const size = rawSize ? Number.parseInt(rawSize, 10) : 0
      return Math.round(size / (1024 * 1024)) // Convert to MB
    } catch {
      return 0
    }
  }

  private async analyzeBackupComponents(dirPath: string): Promise<BackupMetadata['components']> {
    try {
      const entries = await fs.readdir(dirPath)
      const components: BackupMetadata['components'] = []
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry)
        const stats = await fs.stat(entryPath).catch(() => null)
        const size = stats ? Math.round(stats.size / (1024 * 1024)) : 0
        
        if (entry.includes('.sql')) {
          components.push({
            name: entry,
            type: 'database',
            status: ComponentStatus.COMPLETED,
            size,
            path: entryPath
          })
        } else if (entry.includes('.tar.gz')) {
          components.push({
            name: entry,
            type: 'files',
            status: ComponentStatus.COMPLETED,
            size,
            path: entryPath
          })
        } else if (entry === 'configs') {
          components.push({
            name: 'Configuration Files',
            type: 'config',
            status: ComponentStatus.COMPLETED,
            size,
            path: entryPath
          })
        } else if (entry === 'system-info') {
          components.push({
            name: 'System Information',
            type: 'system',
            status: ComponentStatus.COMPLETED,
            size,
            path: entryPath
          })
        }
      }
      
      return components
    } catch (error) {
      this.logger.warn({ dirPath, error }, 'Failed to analyze backup components')
      return []
    }
  }

  private async parseBackupResult(output: string): Promise<BackupMetadata> {
    // Извлекаем информацию из вывода скрипта
    const lines = output.split('\n')
    
    let backupPath = ''
    let size = 0
    
    for (const line of lines) {
      if (line.includes('Backup ready at:')) {
        const [, pathMatch] = line.split('Backup ready at: ')
        backupPath = pathMatch?.trim() ?? ''
      } else if (line.includes('Total size:')) {
        const sizeMatch = line.match(/Total size: ([\d.]+)(\w+)/)
        if (sizeMatch) {
          const [, rawValue, unit] = sizeMatch
          if (rawValue && unit) {
            const sizeValue = Number.parseFloat(rawValue)
            size = unit === 'GB' ? sizeValue * 1024 : sizeValue
          }
        }
      }
    }
    
    const backupId = path.basename(backupPath).replace('backup-', '')
    if (!backupPath) {
      throw new BackupError('Backup script did not return target path', 'SCRIPT_PARSE_ERROR')
    }

    const components = await this.analyzeBackupComponents(backupPath)
    
    return {
      id: backupId,
      name: path.basename(backupPath),
      timestamp: new Date(),
      size: Number.isFinite(size) ? size : 0,
      path: backupPath,
      type: BackupType.MANUAL,
      status: BackupStatus.COMPLETED,
      components
    }
  }

  private async getStorageInfo(): Promise<{
    total: number
    used: number
    available: number
    backupsCount: number
  }> {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        exec(`df -BM "${this.BACKUP_ROOT}"`, (error, stdout) => {
          if (error) reject(error)
          else resolve(stdout)
        })
      })
      
      const lines = result.trim().split('\n')
      const dataLine = lines[1] ?? ''
      const data = dataLine.split(/\s+/)

      const parseColumn = (index: number): number => {
        const value = data[index]
        if (!value) return 0
        const numeric = Number.parseInt(value.replace('M', ''), 10)
        return Number.isFinite(numeric) ? numeric : 0
      }

      const total = parseColumn(1)
      const used = parseColumn(2)
      const available = parseColumn(3)
      
      const backups = await this.listBackups(1, 1000) // Получаем все backup'ы для подсчета
      
      return {
        total,
        used,
        available,
        backupsCount: backups.backups.length
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to get storage info')
      return {
        total: 0,
        used: 0,
        available: 0,
        backupsCount: 0
      }
    }
  }

  private getActiveOperations(): BackupOperation[] {
    return Array.from(this.activeOperations.values()).map((operation) => ({
      ...operation
    }))
  }

  private getNextScheduledBackup(): Date | undefined {
    if (!this.config.enabled) return undefined
    
    // Простая логика - следующий backup завтра в 03:00
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(3, 0, 0, 0)
    
    return tomorrow
  }

  private parseLogLine(line: string): BackupLog {
    // Простой парсер для логов
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)
    const timestamp =
      timestampMatch?.[1] !== undefined ? new Date(timestampMatch[1]) : new Date()
    
    let level = LogLevel.INFO
    if (line.includes('ERROR')) level = LogLevel.ERROR
    else if (line.includes('WARNING')) level = LogLevel.WARN
    else if (line.includes('DEBUG')) level = LogLevel.DEBUG
    
    return {
      id: crypto.randomUUID(),
      timestamp,
      level,
      message: line,
      metadata: {}
    }
  }

  private getDefaultConfig(): BackupConfig {
    return {
      enabled: true,
      schedule: '0 3 * * *', // Ежедневно в 3:00
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12
      },
      compression: true,
      encryption: false,
      notifications: {
        email: false
      },
      components: {
        databases: true,
        applicationFiles: true,
        uploads: true,
        configs: true,
        nginx: true,
        ssl: true,
        systemInfo: true
      }
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const configPath = path.join(this.BACKUP_ROOT, '.backup-config.json')
      await fs.writeFile(configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      this.logger.error({ error }, 'Failed to save config')
    }
  }
}
