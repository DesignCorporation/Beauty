/**
 * Orchestrator Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Orchestrator } from '../../src/managers/orchestrator';
import { ServiceState, ServiceAction } from '../../src/types/orchestrator.types';
import { getDefaultConfig } from '../../src/utils/config';

// Mock child_process to prevent actual process spawning
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    kill: vi.fn(),
    pid: 12345
  })),
  spawnSync: vi.fn(() => ({ status: 0, pid: 12345 }))
}));

// Mock service registry
vi.mock('../../../../../core/service-registry', () => ({
  getAllServices: vi.fn().mockReturnValue([
    {
      id: 'test-service',
      name: 'Test Service',
      description: 'Test service for unit tests',
      port: 6999,
      directory: '/tmp/test',
      startCommand: 'node server.js',
      healthEndpoint: '/health',
      dependencies: [],
      timeout: 5000,
      retries: 3,
      warmupTime: 10,
      requiredEnvVars: []
    }
  ]),
  findServiceById: vi.fn().mockImplementation((id: string) => {
    if (id === 'test-service') {
      return {
        id: 'test-service',
        name: 'Test Service',
        description: 'Test service for unit tests',
        port: 6999,
        directory: '/tmp/test',
        startCommand: 'node server.js',
        healthEndpoint: '/health',
        dependencies: [],
        timeout: 5000,
        retries: 3,
        warmupTime: 10,
        requiredEnvVars: []
      };
    }
    return null;
  }),
  calculateStartupOrder: vi.fn().mockReturnValue([]),
  getCriticalServices: vi.fn().mockReturnValue([])
}));

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  const config = getDefaultConfig();

  beforeEach(async () => {
    orchestrator = new Orchestrator(config);
    await orchestrator.initialize();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(orchestrator).toBeInstanceOf(Orchestrator);
    });

    it('should load services from registry', async () => {
      const status = orchestrator.getStatusAll();
      expect(status.services).toHaveLength(1);
      expect(status.services[0].serviceId).toBe('test-service');
      expect(status.services[0].name).toBe('Test Service');
    });
  });

  describe('service management', () => {
    it('should start a service successfully', async () => {
      await expect(orchestrator.startService('test-service')).resolves.not.toThrow();

      const status = orchestrator.getServiceStatus('test-service');
      expect(status?.state).toBe(ServiceState.STARTING);
    });

    it('should stop a service successfully', async () => {
      // First start the service
      await orchestrator.startService('test-service');

      // Then stop it
      await expect(orchestrator.stopService('test-service')).resolves.not.toThrow();
    });

    it('should restart a service successfully', async () => {
      await expect(orchestrator.restartService('test-service')).resolves.not.toThrow();
    });

    it('should reset circuit breaker successfully', async () => {
      await expect(orchestrator.resetCircuitBreaker('test-service')).resolves.not.toThrow();
    });

    it('should throw error for unknown service', async () => {
      await expect(orchestrator.startService('unknown-service')).rejects.toThrow('Service unknown-service not found');
    });

    it('should throw error for duplicate start', async () => {
      await orchestrator.startService('test-service');
      await expect(orchestrator.startService('test-service')).rejects.toThrow('already starting');
    });
  });

  describe('service actions', () => {
    it('should execute start action', async () => {
      await expect(orchestrator.executeServiceAction('test-service', ServiceAction.START)).resolves.not.toThrow();
    });

    it('should execute stop action', async () => {
      await orchestrator.startService('test-service');
      await expect(orchestrator.executeServiceAction('test-service', ServiceAction.STOP)).resolves.not.toThrow();
    });

    it('should execute restart action', async () => {
      await expect(orchestrator.executeServiceAction('test-service', ServiceAction.RESTART)).resolves.not.toThrow();
    });

    it('should execute reset circuit action', async () => {
      await expect(orchestrator.executeServiceAction('test-service', ServiceAction.RESET_CIRCUIT)).resolves.not.toThrow();
    });

    it('should throw error for unknown action', async () => {
      await expect(orchestrator.executeServiceAction('test-service', 'invalid' as ServiceAction)).rejects.toThrow('Unknown action');
    });
  });

  describe('status reporting', () => {
    it('should return status for all services', () => {
      const status = orchestrator.getStatusAll();

      expect(status.orchestrator).toBeDefined();
      expect(status.orchestrator.version).toBe('1.0.0');
      expect(status.orchestrator.servicesTotal).toBe(1);
      expect(status.services).toHaveLength(1);
      expect(status.services[0].serviceId).toBe('test-service');
    });

    it('should return status for specific service', () => {
      const status = orchestrator.getServiceStatus('test-service');

      expect(status).toBeDefined();
      expect(status?.serviceId).toBe('test-service');
      expect(status?.name).toBe('Test Service');
      expect(status?.state).toBe(ServiceState.STOPPED);
    });

    it('should return null for unknown service status', () => {
      const status = orchestrator.getServiceStatus('unknown-service');
      expect(status).toBeNull();
    });
  });

  describe('logs management', () => {
    it('should return service logs', () => {
      const logs = orchestrator.getServiceLogs('test-service', 10);

      expect(logs).toBeDefined();
      expect(logs.stdout).toBeInstanceOf(Array);
      expect(logs.stderr).toBeInstanceOf(Array);
    });

    it('should return empty logs for unknown service', () => {
      const logs = orchestrator.getServiceLogs('unknown-service');

      expect(logs.stdout).toHaveLength(0);
      expect(logs.stderr).toHaveLength(0);
    });
  });

  describe('registry access', () => {
    it('should return registry data', () => {
      const registry = orchestrator.getRegistry();

      expect(registry).toBeInstanceOf(Array);
      expect(registry).toHaveLength(1);
      expect(registry[0].id).toBe('test-service');
    });
  });

  describe('event handling', () => {
    it('should emit events when service starts', async () => {
      const eventPromise = new Promise((resolve) => {
        orchestrator.once('serviceStarted', resolve);
      });

      await orchestrator.startService('test-service');

      const eventData = await eventPromise;
      expect(eventData).toBe('test-service');
    });

    it('should emit events when service stops', async () => {
      const eventPromise = new Promise((resolve) => {
        orchestrator.once('serviceStopped', resolve);
      });

      await orchestrator.startService('test-service');
      await orchestrator.stopService('test-service');

      const eventData = await eventPromise;
      expect(eventData).toBe('test-service');
    });
  });

  describe('graceful shutdown', () => {
    it('should shutdown gracefully', async () => {
      await expect(orchestrator.shutdown()).resolves.not.toThrow();
    });
  });
});