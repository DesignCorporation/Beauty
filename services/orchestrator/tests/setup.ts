/**
 * Test setup file
 * Global test configuration and mocks
 */

import { vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock file system operations for tests
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{}'),
  access: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined)
}));

// Mock execa for process management
vi.mock('execa', () => ({
  execa: vi.fn().mockReturnValue({
    pid: 12345,
    killed: false,
    kill: vi.fn(),
    on: vi.fn(),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    catch: vi.fn().mockResolvedValue(undefined)
  })
}));

// Mock fetch for health checks
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue({ status: 'ok' })
});

// Create test directories
beforeAll(() => {
  const testLogsDir = path.join(__dirname, '../test-logs');
  if (!fs.existsSync(testLogsDir)) {
    fs.mkdirSync(testLogsDir, { recursive: true });
  }
});

// Clean up after tests
afterAll(() => {
  vi.clearAllMocks();
});
