// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { FunctionsService } from '../../../services/functions-service';
import { SpotifySearch } from '../components/SpotifySearch';

// Mock FunctionsService
vi.mock('@/services/functions-service');

describe('SpotifySearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input field with placeholder', () => {
    render(<SpotifySearch onSelect={vi.fn()} placeholder="Find a song" type="track" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Find a song');
  });

  it('debounces search api calls', async () => {
    const mockSearch = vi.fn().mockResolvedValue([]);
    (FunctionsService.searchSpotify as Mock).mockImplementation(mockSearch);
    const user = userEvent.setup();

    render(<SpotifySearch onSelect={vi.fn()} type="track" />);

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
      { artist: 'Artist A', name: 'Song 1', type: 'track', uri: 'spotify:track:1' },
      { artist: 'Artist B', name: 'Song 2', type: 'track', uri: 'spotify:track:2' }
    ];
    (FunctionsService.searchSpotify as Mock).mockResolvedValue(mockResults);

    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<SpotifySearch onSelect={onSelect} type="track" />);

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
        name: 'Song 1',
        uri: 'spotify:track:1'
      })
    );
  });

  it('shows no results message', async () => {
    (FunctionsService.searchSpotify as Mock).mockResolvedValue([]);
    const user = userEvent.setup();

    render(<SpotifySearch onSelect={vi.fn()} type="track" />);

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
