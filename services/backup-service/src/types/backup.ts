// Beauty Platform Backup Service - Type Definitions

import type { AuthenticatedRequest as BaseAuthenticatedRequest } from '@beauty/shared'
import type { JWTPayload as AuthJWTPayload } from '../../../auth-service/src/types/auth'

export interface BackupMetadata {
  id: string
  name: string
  timestamp: Date
  size: number
  path: string
  type: BackupType
  status: BackupStatus
  duration?: number // В секундах
  description?: string
  components: BackupComponent[]
  error?: string
}

export interface BackupComponent {
  name: string
  type: 'database' | 'files' | 'config' | 'system'
  status: ComponentStatus
  size: number
  path?: string
  error?: string
}

export interface BackupConfig {
  enabled: boolean
  schedule: string // Cron expression
  retention: {
    daily: number
    weekly: number
    monthly: number
  }
  compression: boolean
  encryption: boolean
  notifications: {
    email: boolean
    webhook?: string
  }
  components: {
    databases: boolean
    applicationFiles: boolean
    uploads: boolean
    configs: boolean
    nginx: boolean
    ssl: boolean
    systemInfo: boolean
  }
}

export interface BackupOperation {
  id: string
  type: 'create' | 'delete' | 'restore'
  status: OperationStatus
  progress: number // 0-100
  startedAt: Date
  completedAt?: Date
  error?: string
  userId: string
  metadata?: Partial<BackupMetadata>
}

export interface BackupLog {
  id: string
  timestamp: Date
  level: LogLevel
  message: string
  component?: string
  backupId?: string
  operationId?: string
  metadata?: Record<string, any>
}

export interface SystemStatus {
  backupService: {
    status: 'healthy' | 'degraded' | 'down'
    uptime: number
    version: string
  }
  storage: {
    total: number
    used: number
    available: number
    backupsCount: number
  }
  lastBackup?: {
    timestamp: Date
    status: BackupStatus
    size: number
  }
  nextScheduledBackup?: Date
  activeOperations: BackupOperation[]
}

// Enums
export enum BackupType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EMERGENCY = 'emergency'
}

export enum BackupStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum ComponentStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export enum OperationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Request/Response Types
export interface CreateBackupRequest {
  type?: BackupType
  description?: string
  components?: string[] // Опциональный список компонентов для резервного копирования
}

export interface CreateBackupResponse {
  success: boolean
  operation: BackupOperation
  message: string
}

export interface ListBackupsResponse {
  success: boolean
  backups: BackupMetadata[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface DeleteBackupRequest {
  force?: boolean // Принудительное удаление даже если backup используется
}

export interface DeleteBackupResponse {
  success: boolean
  message: string
}

export interface UpdateConfigRequest {
  config: Partial<BackupConfig>
}

export interface UpdateConfigResponse {
  success: boolean
  config: BackupConfig
  message: string
}

// WebSocket Events
export interface BackupProgressEvent {
  type: 'backup-progress'
  operationId: string
  progress: number
  currentStep: string
  message?: string
}

export interface BackupCompletedEvent {
  type: 'backup-completed'
  operationId: string
  backupId: string
  status: BackupStatus
  metadata: BackupMetadata
}

export interface BackupErrorEvent {
  type: 'backup-error'
  operationId: string
  error: string
  component?: string
}

export type BackupWebSocketEvent = 
  | BackupProgressEvent 
  | BackupCompletedEvent 
  | BackupErrorEvent

// Error Types
export class BackupError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'BackupError'
  }
}

export class BackupNotFoundError extends BackupError {
  constructor(backupId: string) {
    super(`Backup not found: ${backupId}`, 'BACKUP_NOT_FOUND', { backupId })
  }
}

export class BackupInProgressError extends BackupError {
  constructor(operationId: string) {
    super('Another backup operation is already in progress', 'BACKUP_IN_PROGRESS', { operationId })
  }
}

export class InsufficientStorageError extends BackupError {
  constructor(required: number, available: number) {
    super(
      `Insufficient storage space. Required: ${required}MB, Available: ${available}MB`,
      'INSUFFICIENT_STORAGE',
      { required, available }
    )
  }
}

export class UnauthorizedError extends BackupError {
  constructor() {
    super('Unauthorized access to backup system', 'UNAUTHORIZED')
  }
}

// Authentication Types (реused от auth service)
export type JWTPayload = AuthJWTPayload

export type BackupAuthenticatedRequest = BaseAuthenticatedRequest<JWTPayload>
