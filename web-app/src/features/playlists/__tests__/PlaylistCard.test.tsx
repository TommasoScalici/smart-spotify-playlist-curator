import { PlaylistConfig } from '@smart-spotify-curator/shared';
// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { AuthContext } from '@/contexts/AuthContext';
import { FirestoreService } from '@/services/firestore-service';
import { FunctionsService } from '@/services/functions-service';

import { PlaylistCard } from '../components/PlaylistCard';

// Mocks
vi.mock('@/services/firestore-service');
vi.mock('@/services/functions-service');
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), loading: vi.fn(), promise: vi.fn(), success: vi.fn() }
}));

// Mock Data
const mockConfig: { _docId: string } & PlaylistConfig = {
  _docId: 'doc123', // Firestore Doc ID
  aiGeneration: {
    enabled: true,
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    tracksToAdd: 10
  },
  curationRules: {
    maxTrackAgeDays: 365,
    maxTracksPerArtist: 2,
    removeDuplicates: true,
    shuffleAtEnd: true,
    sizeLimitStrategy: 'drop_random'
  },
  enabled: true,
  id: 'playlist123',
  mandatoryTracks: [],
  name: 'Chill Vibes',
  ownerId: 'user123',
  settings: {
    description: 'My cool playlist',
    referenceArtists: [],
    targetTotalTracks: 20
  }
};

const mockUser = { email: 'test@example.com', uid: 'user123' };

// Helpers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider
      value={{
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        user: mockUser as unknown as import('firebase/auth').User
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
      lastUpdated: new Date().toISOString(),
      owner: 'Tommaso',
      tracks: 20
    });

    // Mock subscribeLatestLog to return a no-op unsubscribe function
    (FirestoreService.subscribeLatestLog as Mock).mockReturnValue(vi.fn());
  });

  it('renders playlist details correctly', async () => {
    render(<PlaylistCard config={mockConfig} />, { wrapper: createWrapper() });

    expect(await screen.findByText('Chill Vibes')).toBeInTheDocument();
    expect(await screen.findByText('Tommaso')).toBeInTheDocument();
  });

  it('toggles automation enabled state', async () => {
    render(<PlaylistCard config={mockConfig} />, { wrapper: createWrapper() });

    // The shadcn Switch component is a button with role="switch", but we might need to find it by type or value
    const buttons = await screen.findAllByRole('switch');
    // Assuming there's only one switch per card
    const toggle = buttons[0];

    expect(toggle).toHaveAttribute('data-state', 'checked');

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

    const deleteBtn = await screen.findByLabelText('Delete playlist');
    fireEvent.click(deleteBtn);

    // Dialog should open
    expect(await screen.findByText('Delete Playlist from App?')).toBeInTheDocument();
  });
});
