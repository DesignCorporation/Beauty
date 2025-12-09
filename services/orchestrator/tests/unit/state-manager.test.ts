/**
 * StateManager Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../../src/managers/state-manager';
import { ServiceState } from '../../src/types/orchestrator.types';

// Mock fs/promises
vi.mock('fs/promises', () => {
  const readFile = vi.fn();
  const writeFile = vi.fn();
  const mkdir = vi.fn();

  return {
    default: { readFile, writeFile, mkdir },
    readFile,
    writeFile,
    mkdir,
  };
});

describe('StateManager', () => {
  let stateManager: StateManager;
  const testStateDir = '/tmp/test-orchestrator';

  beforeEach(() => {
    stateManager = new StateManager(testStateDir);
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(stateManager.initialize()).resolves.not.toThrow();
    });
  });

  describe('state persistence', () => {
    it('should load empty state when no file exists', async () => {
      const fsp = await import('fs/promises');
      vi.mocked(fsp.readFile).mockRejectedValue({ code: 'ENOENT' } as any);

      const state = await stateManager.loadState();
      expect(state.size).toBe(0);
    });

    it('should persist runtime state to file', async () => {
      const mockServices = new Map();
      mockServices.set('test-service', {
        serviceId: 'test-service',
        state: ServiceState.RUNNING,
        process: {
          pid: 12345,
          startTime: new Date('2025-01-01T00:00:00Z')
        },
        circuitBreaker: {
          state: 'closed',
          failures: 0,
          backoffSeconds: 1
        },
        autoRestoreAttempts: 0,
        lastStateChange: new Date('2025-01-01T00:00:00Z')
      });

      const fsp = await import('fs/promises');
      vi.mocked(fsp.writeFile).mockResolvedValue(undefined);

      await expect(stateManager.saveState(mockServices)).resolves.not.toThrow();

      expect(vi.mocked(fsp.writeFile)).toHaveBeenCalled();
    });

    it('should convert runtime state to persisted format correctly', () => {
      const runtimeState = {
        serviceId: 'test-service',
        state: ServiceState.RUNNING,
        process: {
          pid: 12345,
          startTime: new Date('2025-01-01T00:00:00Z')
        },
        circuitBreaker: {
          state: 'closed' as const,
          failures: 0,
          lastFailure: new Date('2025-01-01T01:00:00Z'),
          nextRetry: undefined,
          backoffSeconds: 1
        },
        autoRestoreAttempts: 2,
        lastStateChange: new Date('2025-01-01T00:30:00Z')
      };

      const persisted = stateManager.persistedToRuntime({
        serviceId: 'test-service',
        state: ServiceState.RUNNING,
        pid: 12345,
        startTime: '2025-01-01T00:00:00.000Z',
        circuitBreaker: {
          state: 'closed',
          failures: 0,
          lastFailure: '2025-01-01T01:00:00.000Z',
          backoffSeconds: 1
        },
        autoRestoreAttempts: 2,
        lastStateChange: '2025-01-01T00:30:00.000Z'
      }, 'test-service');

      expect(persisted.serviceId).toBe('test-service');
      expect(persisted.state).toBe(ServiceState.RUNNING);
      expect(persisted.process?.pid).toBe(12345);
      expect(persisted.autoRestoreAttempts).toBe(2);
      expect(persisted.circuitBreaker?.state).toBe('closed');
      expect(persisted.circuitBreaker?.failures).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle corrupted state file gracefully', async () => {
      const fsp = await import('fs/promises');
      vi.mocked(fsp.readFile).mockResolvedValue('invalid json' as any);

      const state = await stateManager.loadState();
      expect(state.size).toBe(0);
    });

    it('should use backup file when main file is corrupted', async () => {
      const fsp = await import('fs/promises');
      vi.mocked(fsp.readFile)
        .mockRejectedValueOnce(new Error('Corrupted'))
        .mockResolvedValueOnce(JSON.stringify({
          version: '1.0.0',
          timestamp: '2025-01-01T00:00:00Z',
          services: {
            'test-service': {
              serviceId: 'test-service',
              state: ServiceState.STOPPED,
              circuitBreaker: {
                state: 'closed',
                failures: 0,
                backoffSeconds: 1
              },
              autoRestoreAttempts: 0,
              lastStateChange: '2025-01-01T00:00:00Z'
            }
          }
        }) as any);

      const state = await stateManager.loadState();
      expect(state.size).toBe(1);
      expect(state.has('test-service')).toBe(true);
    });
  });

  describe('state validation', () => {
    it('should skip invalid persisted states', async () => {
      const fsp = await import('fs/promises');
      vi.mocked(fsp.readFile).mockResolvedValue(JSON.stringify({
        version: '1.0.0',
        timestamp: '2025-01-01T00:00:00Z',
        services: {
          'valid-service': {
            serviceId: 'valid-service',
            state: ServiceState.STOPPED,
            circuitBreaker: {
              state: 'closed',
              failures: 0,
              backoffSeconds: 1
            },
            autoRestoreAttempts: 0,
            lastStateChange: '2025-01-01T00:00:00Z'
          },
          'invalid-service': {
            serviceId: 'invalid-service',
            // Missing required fields
            autoRestoreAttempts: 0
          }
        }
      }));

      const state = await stateManager.loadState();
      expect(state.size).toBe(1);
      expect(state.has('valid-service')).toBe(true);
      expect(state.has('invalid-service')).toBe(false);
    });
  });
});