/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

import { jest } from '@jest/globals';

// Mock process.env for consistent test environment
Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '8080'
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);
