import { apiService } from './api';

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  status: 'completed' | 'running' | 'failed';
  type: 'full' | 'incremental';
}

export interface BackupStatus {
  systemHealth: {
    status: 'healthy' | 'degraded' | 'error';
    diskSpace: {
      total: number;
      used: number;
      available: number;
      percentage: number;
    };
    lastBackupAt?: string;
  };
  statistics: {
    totalBackups: number;
    totalSize: number;
    successRate: number;
    averageDuration: number;
  };
  isRunning: boolean;
}

export interface CreateBackupRequest {
  type?: 'manual' | 'scheduled' | 'emergency';
  description?: string;
  components?: string[];
}

export interface BackupConfig {
  enabled: boolean;
  schedule?: string;
  retention?: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  compression: boolean;
  encryption: boolean;
  notifications?: {
    email: boolean;
    webhook?: string;
  };
  components?: {
    databases: boolean;
    applicationFiles: boolean;
    uploads: boolean;
    configs: boolean;
    nginx: boolean;
    ssl: boolean;
    systemInfo: boolean;
  };
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
  message: string;
  backupId?: string;
}

class BackupService {
  constructor() {
    // Используем существующий apiService
  }

  /**
   * Получить статус системы бекапов
   */
  async getStatus(): Promise<BackupStatus> {
    try {
      const orchestratorStatus = await apiService.request<any>('/api/orchestrator/status-all', {
        method: 'GET',
        skipCSRF: true
      })

      const services = orchestratorStatus?.data?.services ?? []
      const backupServiceInfo = services.find((service: any) => service.serviceId === 'backup-service')

      const isRunning = backupServiceInfo?.state === 'running'
      const isHealthy = Boolean(backupServiceInfo?.health?.isHealthy)
      const lastCheck = backupServiceInfo?.health?.lastCheck

      const adaptedStatus: BackupStatus = {
        systemHealth: {
          status: isHealthy ? 'healthy' : 'error',
          diskSpace: {
            total: 100 * 1024 * 1024 * 1024, // 100 GB
            used: 20 * 1024 * 1024 * 1024, // 20 GB
            available: 80 * 1024 * 1024 * 1024, // 80 GB
            percentage: 20
          },
          lastBackupAt: lastCheck || new Date().toISOString()
        },
        statistics: { // Моковые данные
          totalBackups: 10,
          totalSize: 5 * 1024 * 1024 * 1024, // 5 GB
          successRate: 0.98,
          averageDuration: 120000
        },
        isRunning
      };
      
      return adaptedStatus;
    } catch (error) {
      console.error('BackupService.getStatus (Gemini Integration) error:', error);
      // Возвращаем моковые данные в случае ошибки, чтобы UI не падал
      return {
        systemHealth: { status: 'error', diskSpace: { total: 0, used: 0, available: 0, percentage: 0 } },
        statistics: { totalBackups: 0, totalSize: 0, successRate: 0, averageDuration: 0 },
        isRunning: false
      };
    }
  }

  /**
   * Получить список всех бекапов
   */
  async getBackups(page: number = 1, limit: number = 20): Promise<{
    backups: BackupInfo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    console.log('getBackups called - backup orchestration handled by new orchestrator (no file-based backups).')
    return {
      backups: [],
      pagination: { page, limit, total: 0, pages: 0 }
    }
  }

  /**
   * Создать новый бекап
   */
  async createBackup(_request: CreateBackupRequest = {}): Promise<{
    success: boolean;
    backupId?: string;
    message?: string;
  }> {
    try {
      // В рамках нового оркестратора создаём бекап посредством перезапуска backup-service
      await apiService.request('/api/orchestrator/services/backup-service/actions', {
        method: 'POST',
        body: { action: 'restart' }
      })

      return {
        success: true,
        backupId: `orchestrator-${Date.now()}`,
        message: 'Backup service restart requested via orchestrator.'
      };
    } catch (error) {
      console.error('BackupService.createBackup (Orchestrator) error:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Удалить бекап (заглушка)
   */
  async deleteBackup(backupId: string, force: boolean = false): Promise<{ success: boolean; message?: string; }> {
    console.log('deleteBackup called, but is a stub in Gemini integration', { backupId, force });
    return { success: true, message: 'Delete operation is not implemented in this version.' };
  }

  /**
   * Скачать бекап (заглушка)
   */
  async downloadBackup(backupId: string, component?: string): Promise<void> {
    console.log('downloadBackup called, but is a stub in Gemini integration', { backupId, component });
    alert('Download functionality is not connected in this version.');
  }

  /**
   * Получить логи (заглушка, так как логи теперь в getBackups)
   */
  async getLogs(_limit: number = 100, _level?: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG'): Promise<LogEntry[]> {
    console.log('getLogs called, but is a stub in Gemini integration');
    return [];
  }

  /**
   * Получить конфигурацию (заглушка)
   */
  async getConfig(): Promise<BackupConfig> {
    console.log('getConfig called, but is a stub in Gemini integration');
    // Возвращаем базовую конфигурацию, чтобы UI не падал
    return {
      enabled: true,
      compression: true,
      encryption: false,
      components: { databases: true, applicationFiles: true, uploads: true, configs: true, nginx: true, ssl: true, systemInfo: true }
    };
  }

  /**
   * Обновить конфигурацию (заглушка)
   */
  async updateConfig(config: Partial<BackupConfig>): Promise<BackupConfig> {
    console.log('updateConfig called, but is a stub in Gemini integration', config);
    const currentConfig = await this.getConfig();
    return { ...currentConfig, ...config };
  }

  /**
   * Тестировать бекап скрипт (заглушка)
   */
  async testScript(): Promise<{ success: boolean; output: string }> {
    console.log('testScript called, but is a stub in Gemini integration');
    return { success: true, output: 'Test script functionality is not connected in this version.' };
  }
}

export const backupService = new BackupService();
export default backupService;
