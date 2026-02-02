import dotenv from 'dotenv';
import path from 'path';
import { vi } from 'vitest';

// Try to load .env from repo root (integration tests need real creds)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Mock firebase-functions/logger to suppress logs during tests
vi.mock('firebase-functions/logger', () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  warn: vi.fn()
}));

// Silence console logs to reduce verbosity as requested by user
global.console.log = vi.fn();
global.console.info = vi.fn();
