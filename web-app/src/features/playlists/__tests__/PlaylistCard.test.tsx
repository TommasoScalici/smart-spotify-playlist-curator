// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { AuthContext } from '@/contexts/AuthContext';
import { FirestoreService } from '@/services/firestore-service';
import { FunctionsService } from '@/services/functions-service';

import { PlaylistCard } from '../components/PlaylistCard';

// Mocks
vi.mock('@/services/firestore-service');
vi.mock('@/services/functions-service');
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn(), loading: vi.fn() }
}));

// Mock Data
const mockConfig: PlaylistConfig & { _docId: string } = {
  id: 'playlist123',
  _docId: 'doc123', // Firestore Doc ID
  name: 'Chill Vibes',
  ownerId: 'user123',
  enabled: true,
  settings: {
    description: 'My cool playlist',
    targetTotalTracks: 20
  },
  mandatoryTracks: [],
  aiGeneration: {
    enabled: true,
    tracksToAdd: 10,
    model: 'gemini-1.5-flash',
    temperature: 0.7
  },
  curationRules: {
    maxTrackAgeDays: 365,
    removeDuplicates: true,
    maxTracksPerArtist: 2,
    shuffleAtEnd: true,
    sizeLimitStrategy: 'drop_random'
  }
};

const mockUser = { uid: 'user123', email: 'test@example.com' };

// Helpers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider
      value={{
        user: mockUser as unknown as import('firebase/auth').User,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn()
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
};

describe('PlaylistCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock default metrics return to avoid undefined query data
    (FunctionsService.getPlaylistMetrics as Mock).mockResolvedValue({
      followers: 10,
      tracks: 20,
      lastUpdated: new Date().toISOString(),
      owner: 'Tommaso'
    });

    // Mock subscribeLatestLog to return a no-op unsubscribe function
    (FirestoreService.subscribeLatestLog as Mock).mockReturnValue(vi.fn());
  });

  it('renders playlist details correctly', async () => {
    render(<PlaylistCard config={mockConfig} />, { wrapper: createWrapper() });

    expect(screen.getByText('Chill Vibes')).toBeInTheDocument();
    expect(await screen.findByText('Tommaso')).toBeInTheDocument();
  });

  it('toggles automation enabled state', async () => {
    render(<PlaylistCard config={mockConfig} />, { wrapper: createWrapper() });

    // Find the switch. It's an accessible element with role="switch"
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked(); // Should be checked initially as config.enabled is true

    fireEvent.click(toggle);

    await waitFor(() => {
      // Expect Firestore Service to be called with flipped value (false)
      expect(FirestoreService.saveUserPlaylist).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({ enabled: false }),
        mockConfig._docId
      );
    });
  });

  it('shows delete confirmation dialog', async () => {
    render(<PlaylistCard config={mockConfig} />, { wrapper: createWrapper() });

    const deleteBtn = screen.getByLabelText('Delete playlist');
    fireEvent.click(deleteBtn);

    // Dialog should open
    expect(screen.getByText('Delete Playlist from App?')).toBeInTheDocument();
  });

  it('triggers dry run when test tube is clicked', async () => {
    render(<PlaylistCard config={mockConfig} />, { wrapper: createWrapper() });

    const testBtn = screen.getByLabelText('Start test run');
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(FunctionsService.triggerCuration).toHaveBeenCalledWith(
        mockConfig.id,
        expect.objectContaining({ dryRun: true })
      );
    });
  });
});
