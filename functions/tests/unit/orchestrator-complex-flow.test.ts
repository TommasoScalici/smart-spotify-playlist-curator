import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SpotifyService } from '../../src/services/spotify-service';

import { PlaylistOrchestrator } from '../../src/core/orchestrator';
import { SlotManager } from '../../src/core/slot-manager';
import { TrackCleaner } from '../../src/core/track-cleaner';
import { AiService } from '../../src/services/ai-service';
import { FirestoreLogger } from '../../src/services/firestore-logger';

// Mock dependencies
vi.mock('../../src/services/spotify-service');
vi.mock('../../src/services/ai-service');
vi.mock('../../src/services/firestore-logger');

interface MockAiService {
  generateSuggestions: ReturnType<typeof vi.fn>;
}

interface MockLogger {
  logActivity: ReturnType<typeof vi.fn>;
}

// Mock interfaces
interface MockSpotifyService {
  getPlaylistTracks: ReturnType<typeof vi.fn>;
  performSmartUpdate: ReturnType<typeof vi.fn>;
  searchTrack: ReturnType<typeof vi.fn>;
}

describe('PlaylistOrchestrator - Complex Flow ("The Perfect Storm")', () => {
  let orchestrator: PlaylistOrchestrator;
  let mockSpotifyService: MockSpotifyService;
  let mockAiService: MockAiService;
  let mockLogger: MockLogger;
  let slotManager: SlotManager;
  let trackCleaner: TrackCleaner;

  const baseConfig: PlaylistConfig = {
    aiGeneration: { enabled: true, model: 'gemini', temperature: 0.7, tracksToAdd: 5 },
    curationRules: {
      maxTrackAgeDays: 30,
      maxTracksPerArtist: 1, // Strict artist limit
      removeDuplicates: true,
      shuffleAtEnd: false,
      sizeLimitStrategy: 'drop_random'
    },
    enabled: true,
    id: 'spotify:playlist:complex',
    mandatoryTracks: [],
    name: 'Complex Playlist',
    ownerId: 'user1',
    settings: { description: '', referenceArtists: [], targetTotalTracks: 10 } // Small target for easy math
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSpotifyService = {
      getPlaylistTracks: vi.fn(),
      performSmartUpdate: vi.fn().mockResolvedValue(undefined),
      searchTrack: vi.fn()
    };
    mockAiService = {
      generateSuggestions: vi.fn()
    };
    mockLogger = {
      logActivity: vi.fn().mockResolvedValue('log-id')
    };

    slotManager = new SlotManager();
    trackCleaner = new TrackCleaner();

    // We use REAL SlotManager and TrackCleaner to test logic integration
    orchestrator = new PlaylistOrchestrator(
      mockAiService as unknown as AiService,
      slotManager,
      trackCleaner,
      mockLogger as unknown as FirestoreLogger
    );
  });

  it('should prioritize VIPs over all other rules and fill remaining slots with valid tracks + AI', async () => {
    const now = Date.now();
    const oldDate = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString();
    const newDate = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();

    const currentTracks = [
      {
        addedAt: oldDate,
        album: 'Album V',
        artist: 'Artist V',
        name: 'VIP Old',
        popularity: 50,
        uri: 'spotify:track:vip_old'
      },
      {
        addedAt: newDate,
        album: 'Album A',
        artist: 'Artist A',
        name: 'VIP A',
        popularity: 50,
        uri: 'spotify:track:vip_artist_a'
      },
      {
        addedAt: newDate,
        album: 'Album A',
        artist: 'Artist A',
        name: 'Normal A',
        popularity: 50,
        uri: 'spotify:track:track_artist_a'
      },
      {
        addedAt: oldDate,
        album: 'Album O',
        artist: 'Artist O',
        name: 'Old',
        popularity: 50,
        uri: 'spotify:track:old_track'
      },
      {
        addedAt: newDate,
        album: 'Album B',
        artist: 'Artist B',
        name: 'Valid B',
        popularity: 50,
        uri: 'spotify:track:valid_b'
      },
      {
        addedAt: newDate,
        album: 'Album C',
        artist: 'Artist C',
        name: 'Valid C',
        popularity: 50,
        uri: 'spotify:track:valid_c'
      }
    ];

    // Config with mandatory VIPs (Distinct positions)
    const configWithVIPs = {
      ...baseConfig,
      mandatoryTracks: [
        { positionRange: { max: 1, min: 1 }, uri: 'spotify:track:vip_old' },
        { positionRange: { max: 2, min: 2 }, uri: 'spotify:track:vip_artist_a' }
      ]
    };

    mockSpotifyService.getPlaylistTracks.mockResolvedValue(currentTracks);

    // AI Suggestions with different artists to bypass 1-per-artist limit
    mockAiService.generateSuggestions.mockResolvedValue([
      { artist: 'AI 1', track: 'Song 1' },
      { artist: 'AI 2', track: 'Song 2' },
      { artist: 'AI 3', track: 'Song 3' },
      { artist: 'AI 4', track: 'Song 4' },
      { artist: 'AI 5', track: 'Song 5' }
    ]);

    // Mock Search to succeed
    mockSpotifyService.searchTrack.mockImplementation(async (query: string) => ({
      // Use the artist from query to ensure they are distinct for artist limits
      artist: query.split(' ')[0],
      name: query,
      popularity: 50,
      uri: `spotify:track:ai_${Math.random()}`
    }));

    await orchestrator.curatePlaylist(
      configWithVIPs,
      mockSpotifyService as unknown as SpotifyService,
      false
    );

    // Verification
    const updateCall = mockSpotifyService.performSmartUpdate.mock.calls[0];

    expect(updateCall).toBeDefined();

    // 2nd arg is uris (index 1) - Corrected index
    const finalUris = updateCall[1];

    // 1. Check Survivors
    expect(finalUris).toContain('spotify:track:vip_old'); // VIP Kept despite age
    expect(finalUris).toContain('spotify:track:vip_artist_a'); // VIP Kept
    expect(finalUris).not.toContain('spotify:track:track_artist_a'); // Removed due to Artist Limit (VIP took the slot)
    expect(finalUris).not.toContain('spotify:track:old_track'); // Removed due to Age
    expect(finalUris).toContain('spotify:track:valid_b');
    expect(finalUris).toContain('spotify:track:valid_c');

    // 2. Check AI Addition
    // We expect survivors (4) + AI (5) = 9
    expect(finalUris.length).toBe(9);
  });
});
