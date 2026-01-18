import { vi } from 'vitest';

// Mock firebase-functions/logger to suppress logs during tests
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn()
}));

// Silence console logs to reduce verbosity as requested by user
global.console.log = vi.fn();
global.console.info = vi.fn();
