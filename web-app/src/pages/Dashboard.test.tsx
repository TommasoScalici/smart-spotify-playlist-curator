// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { User } from 'firebase/auth';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { FirestoreService } from '../services/firestore-service';
import { useSpotifyStatus } from '../hooks/useSpotifyStatus';
import { AuthContext } from '../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../services/firestore-service');
vi.mock('../hooks/useSpotifyStatus');
vi.mock('@/features/dashboard/components/OnboardingHero', () => ({
  OnboardingHero: () => <div data-testid="onboarding-hero">Onboarding</div>
}));
vi.mock('@/features/playlists/components/PlaylistCard', () => ({
  PlaylistCard: ({ config }: { config: { name: string } }) => (
    <div data-testid="playlist-card">{config.name}</div>
  ),
  PlaylistCardSkeleton: () => <div data-testid="skeleton">Loading...</div>
}));
vi.mock('@/features/playlists/components/RunButton', () => ({
  RunButton: () => <button>Run</button>
}));
vi.mock('@/features/dashboard/components/TutorialDialog', () => ({ TutorialDialog: () => null }));
vi.mock('@/features/dashboard/components/ActivityDrawer', () => ({ ActivityDrawer: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const createWrapper =
  () =>
  ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe('Dashboard', () => {
  const mockUser = { uid: 'user123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboard = (user: Partial<User> = mockUser) => {
    return render(
      <AuthContext.Provider
        value={{ user: user as User, loading: false, signIn: vi.fn(), signOut: vi.fn() }}
      >
        <Dashboard />
      </AuthContext.Provider>,
      { wrapper: createWrapper() }
    );
  };

  it('renders loading state initially', () => {
    (useSpotifyStatus as Mock).mockReturnValue({ data: { isLinked: true }, isLoading: false });
    (FirestoreService.getUserPlaylists as Mock).mockReturnValue(new Promise(() => {})); // Never resolves

    renderDashboard();

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders onboarding hero when spotify is not linked', () => {
    (useSpotifyStatus as Mock).mockReturnValue({ data: { isLinked: false }, isLoading: false });

    renderDashboard();

    expect(screen.getByTestId('onboarding-hero')).toBeInTheDocument();
  });

  it('renders playlists when loaded', async () => {
    (useSpotifyStatus as Mock).mockReturnValue({ data: { isLinked: true }, isLoading: false });
    (FirestoreService.getUserPlaylists as Mock).mockResolvedValue([
      { _docId: '1', name: 'Playlist A', id: 'p1', settings: {} },
      { _docId: '2', name: 'Playlist B', id: 'p2', settings: {} }
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Playlist A')).toBeInTheDocument();
      expect(screen.getByText('Playlist B')).toBeInTheDocument();
    });
  });

  it('renders empty state when no playlists', async () => {
    (useSpotifyStatus as Mock).mockReturnValue({ data: { isLinked: true }, isLoading: false });
    (FirestoreService.getUserPlaylists as Mock).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No Playlists Configured')).toBeInTheDocument();
    });
  });

  it('handles fetch error and retry', async () => {
    (useSpotifyStatus as Mock).mockReturnValue({ data: { isLinked: true }, isLoading: false });

    // First call fails
    (FirestoreService.getUserPlaylists as Mock)
      .mockRejectedValueOnce(new Error('Fetch failed'))
      .mockResolvedValueOnce([{ _docId: '1', name: 'Retry Config', id: 'p1', settings: {} }]);

    renderDashboard();

    // Check for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to load playlists.')).toBeInTheDocument();
    });

    // Click retry
    const retryBtn = screen.getByText('Retry');
    fireEvent.click(retryBtn);

    // Should load
    await waitFor(() => {
      expect(screen.getByText('Retry Config')).toBeInTheDocument();
    });
  });
});
