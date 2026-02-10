// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { onSnapshot, Query } from 'firebase/firestore';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { useAuth } from '../../contexts/AuthContext';
import { useActivityFeed } from '../useActivityFeed';

// Mocks
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getFirestore: vi.fn(() => ({})),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn()
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
            data: () => ({
              metadata: {
                playlistId: 'playlist123',
                playlistName: 'My Playlist',
                state: 'running',
                step: 'Running'
              },
              timestamp: { toDate: () => new Date('2026-01-25T20:00:00Z') },
              type: 'info'
            }),
            id: '1'
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
