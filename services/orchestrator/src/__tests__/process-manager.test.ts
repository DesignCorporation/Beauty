/**
 * Unit Tests for ProcessManager
 * Tests process management, PATH augmentation, and external service handling
 */

import { jest } from '@jest/globals';
import { ProcessManager } from '../managers/process-manager';
import { ServiceRuntimeState, ServiceState, OrchestratorConfig } from '../types/orchestrator.types';
import { ServiceConfig, ServiceType, ServiceCriticality, ServiceStatus } from '@beauty-platform/service-registry';
import * as path from 'path';

// Mock execa
const mockExeca = jest.fn();
jest.mock('execa', () => ({
  execa: mockExeca
}));

// Mock service registry functions
jest.mock('@beauty-platform/service-registry', () => ({
  isExternallyManaged: jest.fn(),
  getServiceWorkingDirectory: jest.fn(),
  buildServiceEnvironment: jest.fn(),
  ServiceType: {
    Core: 'core',
    Business: 'business',
    Infrastructure: 'infrastructure'
  },
  ServiceCriticality: {
    Critical: 'critical'
  },
  ServiceStatus: {
    Active: 'active'
  }
}));

const { isExternallyManaged, getServiceWorkingDirectory, buildServiceEnvironment } = require('@beauty-platform/service-registry');

describe('ProcessManager', () => {
  let processManager: ProcessManager;
  let mockConfig: OrchestratorConfig;
  let mockServiceConfig: ServiceConfig;
  let mockRuntimeState: ServiceRuntimeState;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      server: { port: 8080, host: 'localhost' },
      stateFile: '/tmp/state',
      logsDir: '/tmp/logs',
      healthCheck: { interval: 5000, timeout: 3000, retries: 3 },
      circuitBreaker: { threshold: 5, timeout: 30000, backoffMultiplier: 2, maxBackoff: 300000 },
      process: { killTimeout: 10000, logLines: 100 }
    };

    mockServiceConfig = {
      id: 'test-service',
      name: 'Test Service',
      description: 'Test service for unit tests',
      port: 3000,
      directory: 'services/test-service', // legacy field
      startCommand: 'pnpm dev', // legacy field
      healthEndpoint: '/health',
      run: {
        command: 'pnpm',
        args: ['dev'],
        cwd: 'services/test-service',
        env: { NODE_ENV: 'test' },
        managed: 'internal'
      },
      type: ServiceType.Core,
      criticality: ServiceCriticality.Critical,
      status: ServiceStatus.Active,
      dependencies: [],
      timeout: 5000,
      retries: 3,
      warmupTime: 10,
      requiredEnvVars: [],
      optionalEnvVars: []
    };

    mockRuntimeState = {
      serviceId: 'test-service',
      state: ServiceState.STOPPED,
      process: {},
      health: {
        isHealthy: false,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        consecutiveSuccesses: 0
      },
      circuitBreaker: {
        state: 'closed',
        failures: 0,
        backoffSeconds: 1
      },
      warmup: {
        isInWarmup: false,
        successfulChecks: 0,
        requiredChecks: 5
      },
      autoRestoreAttempts: 0,
      lastStateChange: new Date(),
      dependencies: [],
      logs: {
        stdout: [],
        stderr: []
      }
    };

    processManager = new ProcessManager(mockConfig);

    // Setup default mocks
    (isExternallyManaged as jest.Mock).mockReturnValue(false);
    (getServiceWorkingDirectory as jest.Mock).mockReturnValue('/root/projects/beauty/services/test-service');
    (buildServiceEnvironment as jest.Mock).mockReturnValue({
      NODE_ENV: 'test',
      PORT: '3000'
    });

    // Setup default execa mock
    mockExeca.mockResolvedValue({
      pid: 12345,
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn(),
      killed: false,
      catch: jest.fn().mockResolvedValue()
    });
  });

  describe('startService', () => {
    it('should start a service with correct parameters', async () => {
      await processManager.startService(mockServiceConfig, mockRuntimeState);

      expect(getServiceWorkingDirectory).toHaveBeenCalledWith(mockServiceConfig, process.cwd());
      expect(buildServiceEnvironment).toHaveBeenCalledWith(mockServiceConfig, process.env);

      expect(mockExeca).toHaveBeenCalledWith('pnpm', ['dev'], {
        cwd: '/root/projects/beauty/services/test-service',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: expect.objectContaining({
          NODE_ENV: 'test',
          PORT: '3000',
          PATH: expect.stringContaining('/root/.local/share/pnpm')
        }),
        cleanup: true,
        killSignal: 'SIGTERM'
      });

      expect(mockRuntimeState.state).toBe(ServiceState.STARTING);
      expect(mockRuntimeState.warmup.isInWarmup).toBe(true);
    });

    it('should augment PATH with pnpm and other common paths', async () => {
      await processManager.startService(mockServiceConfig, mockRuntimeState);

      const execaCall = mockExeca.mock.calls[0];
      const env = execaCall[2].env;
      const pathValue = env.PATH;

      expect(pathValue).toContain('/root/.local/share/pnpm');
      expect(pathValue).toContain('/usr/local/bin');
      expect(pathValue).toContain('/usr/bin');
      expect(pathValue).toContain('/bin');
    });

    it('should throw error for externally managed services', async () => {
      (isExternallyManaged as jest.Mock).mockReturnValue(true);

      await expect(processManager.startService(mockServiceConfig, mockRuntimeState))
        .rejects
        .toThrow('Service test-service is externally managed and cannot be started by orchestrator');

      expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should throw error if service is already running', async () => {
      // Start the service first
      await processManager.startService(mockServiceConfig, mockRuntimeState);

      // Try to start again
      await expect(processManager.startService(mockServiceConfig, mockRuntimeState))
        .rejects
        .toThrow('Service test-service is already running');
    });

    it('should throw error if run configuration is missing', async () => {
      const serviceWithoutRun = { ...mockServiceConfig, run: undefined };

      await expect(processManager.startService(serviceWithoutRun, mockRuntimeState))
        .rejects
        .toThrow('Service test-service has no run configuration');

      expect(mockExeca).not.toHaveBeenCalled();
    });
  });

  describe('stopService', () => {
    it('should stop a running service', async () => {
      // Start the service first
      await processManager.startService(mockServiceConfig, mockRuntimeState);

      // Mock the process
      const mockProcess = mockExeca.mock.results[0].value;

      // Stop the service
      await processManager.stopService('test-service', mockRuntimeState);

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockRuntimeState.state).toBe(ServiceState.STOPPING);
    });

    it('should handle stopping non-running service gracefully', async () => {
      await processManager.stopService('test-service', mockRuntimeState);

      expect(mockRuntimeState.state).toBe(ServiceState.STOPPED);
      expect(mockRuntimeState.process.pid).toBeUndefined();
    });

    it('should throw error for externally managed services', async () => {
      (isExternallyManaged as jest.Mock).mockReturnValue(true);

      await expect(processManager.stopService('test-service', mockRuntimeState))
        .rejects
        .toThrow('Service test-service is externally managed and cannot be stopped by orchestrator');
    });
  });

  describe('restartService', () => {
    it('should restart a service', async () => {
      // Start the service first
      await processManager.startService(mockServiceConfig, mockRuntimeState);

      jest.clearAllMocks();
      mockExeca.mockResolvedValue({
        pid: 54321,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
        catch: jest.fn().mockResolvedValue()
      });

      // Restart the service
      await processManager.restartService(mockServiceConfig, mockRuntimeState);

      // Should have been called twice - once for stop, once for start
      expect(mockExeca).toHaveBeenCalled();
    });

    it('should throw error for externally managed services', async () => {
      (isExternallyManaged as jest.Mock).mockReturnValue(true);

      await expect(processManager.restartService(mockServiceConfig, mockRuntimeState))
        .rejects
        .toThrow('Service test-service is externally managed and cannot be restarted by orchestrator');
    });
  });

  describe('PATH augmentation', () => {
    it('should correctly augment PATH environment variable', () => {
      const originalPath = '/usr/local/bin:/usr/bin:/bin';

      // Access the private method via reflection for testing
      const augmentPathMethod = (processManager as any).augmentPathForPackageManagers.bind(processManager);
      const augmentedPath = augmentPathMethod(originalPath);

      expect(augmentedPath).toContain('/root/.local/share/pnpm');
      expect(augmentedPath).toContain('/usr/local/bin');
      expect(augmentedPath).toContain('/usr/bin');
      expect(augmentedPath).toContain('/bin');

      // pnpm path should be at the beginning for priority
      expect(augmentedPath.split(':')[0]).toBe('/root/.local/share/pnpm');
    });

    it('should not duplicate existing paths', () => {
      const originalPath = '/root/.local/share/pnpm:/usr/local/bin:/usr/bin:/bin';

      const augmentPathMethod = (processManager as any).augmentPathForPackageManagers.bind(processManager);
      const augmentedPath = augmentPathMethod(originalPath);

      // Count occurrences of pnpm path
      const pnpmPathCount = augmentedPath.split(':').filter(p => p === '/root/.local/share/pnpm').length;
      expect(pnpmPathCount).toBe(1);
    });
  });

  describe('External service handling', () => {
    beforeEach(() => {
      mockServiceConfig.run!.managed = 'external';
      (isExternallyManaged as jest.Mock).mockReturnValue(true);
    });

    it('should reject starting external services', async () => {
      await expect(processManager.startService(mockServiceConfig, mockRuntimeState))
        .rejects
        .toThrow('externally managed');
    });

    it('should reject stopping external services', async () => {
      await expect(processManager.stopService('test-service', mockRuntimeState))
        .rejects
        .toThrow('externally managed');
    });

    it('should reject restarting external services', async () => {
      await expect(processManager.restartService(mockServiceConfig, mockRuntimeState))
        .rejects
        .toThrow('externally managed');
    });
  });

  describe('Working directory resolution', () => {
    it('should use correct working directory from run config', async () => {
      await processManager.startService(mockServiceConfig, mockRuntimeState);

      expect(getServiceWorkingDirectory).toHaveBeenCalledWith(
        mockServiceConfig,
        process.cwd()
      );
    });

    it('should pass resolved working directory to execa', async () => {
      await processManager.startService(mockServiceConfig, mockRuntimeState);

      expect(mockExeca).toHaveBeenCalledWith(
        'pnpm',
        ['dev'],
        expect.objectContaining({
          cwd: '/root/projects/beauty/services/test-service'
        })
      );
    });
  });

  describe('Environment variables', () => {
    it('should merge service environment with system environment', async () => {
      await processManager.startService(mockServiceConfig, mockRuntimeState);

      expect(buildServiceEnvironment).toHaveBeenCalledWith(mockServiceConfig, process.env);

      const execaCall = mockExeca.mock.calls[0];
      const env = execaCall[2].env;

      expect(env).toEqual(expect.objectContaining({
        NODE_ENV: 'test',
        PORT: '3000'
      }));
    });
  });
});