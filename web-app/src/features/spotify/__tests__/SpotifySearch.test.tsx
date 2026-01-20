// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { SpotifySearch } from '../components/SpotifySearch';
import { FunctionsService } from '../../../services/functions-service';
import userEvent from '@testing-library/user-event';

// Mock FunctionsService
vi.mock('@/services/functions-service');

describe('SpotifySearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input field with placeholder', () => {
    render(<SpotifySearch type="track" onSelect={vi.fn()} placeholder="Find a song" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Find a song');
  });

  it('debounces search api calls', async () => {
    const mockSearch = vi.fn().mockResolvedValue([]);
    (FunctionsService.searchSpotify as Mock).mockImplementation(mockSearch);
    const user = userEvent.setup();

    render(<SpotifySearch type="track" onSelect={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));
    const input = screen.getByPlaceholderText('Type to search tracks...');

    // Type
    await user.type(input, 'Hello');

    // Should NOT have called API yet (debounce is 500ms)
    expect(mockSearch).not.toHaveBeenCalled();

    // Wait for debounce (real time)
    await waitFor(
      () => {
        expect(mockSearch).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 }
    );

    expect(mockSearch).toHaveBeenCalledWith('Hello', 'track');
  });

  it('displays results and handles selection', async () => {
    const mockResults = [
      { uri: 'spotify:track:1', name: 'Song 1', artist: 'Artist A', type: 'track' },
      { uri: 'spotify:track:2', name: 'Song 2', artist: 'Artist B', type: 'track' }
    ];
    (FunctionsService.searchSpotify as Mock).mockResolvedValue(mockResults);

    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<SpotifySearch type="track" onSelect={onSelect} />);

    await user.click(screen.getByRole('combobox'));
    const input = screen.getByPlaceholderText('Type to search tracks...');

    await user.type(input, 'Song');

    // Wait for result 1
    await waitFor(
      () => {
        expect(screen.getByText('Song 1')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    expect(screen.getByText('Artist A')).toBeInTheDocument();

    // Select item
    await user.click(screen.getByText('Song 1'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'spotify:track:1',
        name: 'Song 1'
      })
    );
  });

  it('shows no results message', async () => {
    (FunctionsService.searchSpotify as Mock).mockResolvedValue([]);
    const user = userEvent.setup();

    render(<SpotifySearch type="track" onSelect={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));
    const input = screen.getByPlaceholderText('Type to search tracks...');

    await user.type(input, 'UnknownSong');

    await waitFor(
      () => {
        expect(screen.getByText('No results found.')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
