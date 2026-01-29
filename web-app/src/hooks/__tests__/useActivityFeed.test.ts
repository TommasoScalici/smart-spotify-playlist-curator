// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { onSnapshot, Query } from 'firebase/firestore';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { useAuth } from '../../contexts/AuthContext';
import { useActivityFeed } from '../useActivityFeed';

// Mocks
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  getFirestore: vi.fn(() => ({}))
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../services/firebase', () => ({
  db: {}
}));

describe('useActivityFeed Hook', () => {
  const mockUser = { uid: 'user123' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not subscribe if user is not authenticated', () => {
    (useAuth as Mock).mockReturnValue({ user: null });

    const { result } = renderHook(() => useActivityFeed());

    expect(result.current.activities).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('should subscribe and handle real-time updates', async () => {
    (useAuth as Mock).mockReturnValue({ user: mockUser });

    // Mock unsubscribe function
    const unsubscribe = vi.fn();
    (onSnapshot as Mock).mockImplementation((_q: Query, callback: (snapshot: unknown) => void) => {
      // Immediate callback with mock data
      callback({
        docs: [
          {
            id: '1',
            data: () => ({ message: 'Running', type: 'info', timestamp: '2026-01-25T20:00:00Z' })
          }
        ]
      });
      return unsubscribe;
    });

    const { result, unmount } = renderHook(() => useActivityFeed());

    expect(result.current.loading).toBe(false);
    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].message).toBe('Running');

    // Verify unsubscribe on unmount
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
