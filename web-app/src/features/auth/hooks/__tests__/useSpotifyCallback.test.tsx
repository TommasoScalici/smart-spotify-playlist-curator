// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { User } from 'firebase/auth';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/contexts/AuthContext';

import { useSpotifyCallback } from '../useSpotifyCallback';

vi.mock('@/features/auth/hooks/useSpotifyStatus', () => ({
  useSpotifyStatus: vi.fn(() => ({ data: { isLinked: false } }))
}));

vi.mock('@/services/functions-service', () => ({
  FunctionsService: {
    linkSpotifyAccount: vi.fn().mockResolvedValue({ profile: undefined, success: true })
  }
}));

describe('useSpotifyCallback', () => {
  const queryClient = new QueryClient();

  const createWrapper = (initialEntries: string[]) => {
    return ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider
        value={{
          loading: false,
          signIn: vi.fn(),
          signOut: vi.fn(),
          user: { uid: 'user123' } as unknown as User
        }}
      >
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </QueryClientProvider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles access_denied error gracefully', () => {
    const { result } = renderHook(() => useSpotifyCallback(), {
      wrapper: createWrapper(['/callback?error=access_denied'])
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMsg).toContain('cancelled or denied');
  });

  it('handles generic oauth error with description', () => {
    const { result } = renderHook(() => useSpotifyCallback(), {
      wrapper: createWrapper([
        '/callback?error=invalid_scope&error_description=Scope%20is%20invalid'
      ])
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMsg).toBe('Scope is invalid');
  });

  it('handles missing code and missing error', () => {
    const { result } = renderHook(() => useSpotifyCallback(), {
      wrapper: createWrapper(['/callback'])
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMsg).toBe('No authentication code received from Spotify.');
  });

  it('rejects with error on mismatched state parameter (CSRF protection)', () => {
    sessionStorage.setItem('spotify_auth_state', 'expected-state-123');
    const { result } = renderHook(() => useSpotifyCallback(), {
      wrapper: createWrapper(['/callback?code=valid-code&state=attacker-state-456'])
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMsg).toContain('Possible CSRF security risk detected');
    expect(sessionStorage.getItem('spotify_auth_state')).toBeNull();
  });

  it('proceeds with processing when state parameter matches sessionStorage', async () => {
    sessionStorage.setItem('spotify_auth_state', 'expected-state-123');
    const { result } = renderHook(() => useSpotifyCallback(), {
      wrapper: createWrapper(['/callback?code=valid-code&state=expected-state-123'])
    });

    expect(result.current.status).toBe('processing');
    expect(result.current.errorMsg).toBe('');
    expect(sessionStorage.getItem('spotify_auth_state')).toBeNull();

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
  });
});
