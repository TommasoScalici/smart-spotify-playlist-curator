import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '../../src/services/config-service';
import { db } from '../../src/config/firebase';
import * as logger from 'firebase-functions/logger';
import { PlaylistConfig } from '../../src/types';

// Mock dependencies
// Mock dependencies
vi.mock('../../src/config/firebase', () => ({
  db: {
    collection: vi.fn(),
    collectionGroup: vi.fn()
  }
}));

vi.mock('firebase-functions/logger');

describe('ConfigService', () => {
  let service: ConfigService;
  let mockWhere: ReturnType<typeof vi.fn>;
  let mockLimit: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;

  const mockConfig: PlaylistConfig = {
    id: 'spotify:playlist:49NveLmBkE159Zt6g0Novv', // Valid 22-char ID
    name: 'Test Playlist',
    ownerId: 'test-user',
    enabled: true,
    dryRun: false, // Defaulted by Zod
    settings: { targetTotalTracks: 10 },
    aiGeneration: {
      prompt: 'Test prompt',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      overfetchRatio: 2.0,
      isInstrumentalOnly: false
    },
    curationRules: { maxTrackAgeDays: 30, removeDuplicates: true },
    mandatoryTracks: []
  };

  beforeEach(() => {
    service = new ConfigService();
    vi.clearAllMocks();

    // Setup Firestore Mock Chain
    mockGet = vi.fn();
    mockWhere = vi.fn();
    mockLimit = vi.fn();

    (db.collectionGroup as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      where: mockWhere
    });

    // Default chain behavior for query
    mockWhere.mockReturnValue({
      get: mockGet,
      limit: mockLimit
    });

    mockLimit.mockReturnValue({
      get: mockGet
    });
  });

  it('should fetch enabled playlists successfully', async () => {
    const mockSnapshot = {
      empty: false,
      docs: [
        {
          id: 'doc1',
          data: () => mockConfig,
          ref: { parent: { parent: { id: 'test-user' } } }
        }
      ]
    };
    mockGet.mockResolvedValue(mockSnapshot);

    const result = await service.getEnabledPlaylists();

    expect(db.collectionGroup).toHaveBeenCalledWith('playlists');
    expect(mockWhere).toHaveBeenCalledWith('enabled', '==', true);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockConfig);
  });

  it('should return empty array if no playlists found', async () => {
    const mockSnapshot = {
      empty: true,
      docs: []
    };
    mockGet.mockResolvedValue(mockSnapshot);

    const result = await service.getEnabledPlaylists();

    expect(result).toEqual([]);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('No enabled playlists'));
  });

  it('should validate fetched config using Zod schema', async () => {
    const invalidConfig = { ...mockConfig, enabled: 'not-a-boolean' }; // Invalid type
    const mockSnapshot = {
      empty: false,
      docs: [
        {
          id: 'doc1',
          data: () => invalidConfig,
          ref: { parent: { parent: { id: 'test-user' } } }
        }
      ]
    };
    mockGet.mockResolvedValue(mockSnapshot);

    const result = await service.getEnabledPlaylists();

    expect(result).toEqual([]); // Should filter out invalid
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid configuration'),
      expect.any(Object)
    );
  });

  it('should handle Firestore errors', async () => {
    mockGet.mockRejectedValue(new Error('Connection failed'));

    await expect(service.getEnabledPlaylists()).rejects.toThrow('Failed to load configuration');
    expect(logger.error).toHaveBeenCalled();
  });
});
