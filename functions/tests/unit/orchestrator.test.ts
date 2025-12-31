
import { PlaylistOrchestrator } from '../../src/core/orchestrator';
import { SpotifyService } from '../../src/services/spotify-service';
import { AiService } from '../../src/services/ai-service';
import { TrackCleaner } from '../../src/core/track-cleaner';
import { SlotManager } from '../../src/core/slot-manager';
import { PlaylistConfig } from '../../src/types';

// Mock dependencies
jest.mock('../../src/services/spotify-service');
jest.mock('../../src/services/ai-service');
jest.mock('../../src/core/track-cleaner');
jest.mock('../../src/core/slot-manager');

describe('PlaylistOrchestrator', () => {
    let orchestrator: PlaylistOrchestrator;
    let mockSpotifyService: jest.Mocked<SpotifyService>;
    let mockAiService: jest.Mocked<AiService>;
    let mockTrackCleaner: jest.Mocked<TrackCleaner>;
    let mockSlotManager: jest.Mocked<SlotManager>;

    const mockConfig: PlaylistConfig = {
        id: 'test-playlist',
        name: 'Test Playlist',
        enabled: true,
        settings: { targetTotalTracks: 50 },
        aiGeneration: { prompt: 'test', refillBatchSize: 10 },
        curationRules: { maxTrackAgeDays: 30, removeDuplicates: true },
        mandatoryTracks: []
    } as any;

    beforeEach(() => {
        mockSpotifyService = new (SpotifyService as any)();
        mockAiService = new AiService() as any;
        mockTrackCleaner = new TrackCleaner() as any;
        mockSlotManager = new SlotManager() as any;

        orchestrator = new PlaylistOrchestrator(
            mockSpotifyService,
            mockAiService,
            mockTrackCleaner,
            mockSlotManager
        );

        // Default mocks
        mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);
        mockSpotifyService.searchTrack.mockResolvedValue('spotify:track:new-ai-uri');
        mockAiService.generateSuggestions.mockResolvedValue([{ artist: 'A', track: 'B' }]);
        mockSlotManager.arrangePlaylist.mockReturnValue(['uri1', 'uri2']);
    });

    it('Path 1: Empty Playlist', async () => {
        mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);

        mockTrackCleaner.processCurrentTracks.mockReturnValue({
            keptTracks: [],
            tracksToRemove: [],
            slotsNeeded: 50 // Full refill
        });

        await orchestrator.curatePlaylist(mockConfig);

        // Verify cleaner called (with default target implicit)
        expect(mockTrackCleaner.processCurrentTracks).toHaveBeenCalled();
        // Verify AI called for full amount
        expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(expect.any(Object), 50, expect.any(Array), undefined);
    });

    it('Path 2: Under Target', async () => {
        // 30 tracks existing (under 50)
        mockSpotifyService.getPlaylistTracks.mockResolvedValue(new Array(30).fill({ uri: 'uri', addedAt: 'timestamp' }));

        mockTrackCleaner.processCurrentTracks.mockReturnValue({
            keptTracks: new Array(30).fill({ uri: 'uri' }), // Keep all
            tracksToRemove: [],
            slotsNeeded: 20 // 50 - 30
        });

        await orchestrator.curatePlaylist(mockConfig);

        expect(mockTrackCleaner.processCurrentTracks).toHaveBeenCalled();
        // Verify AI called for gap
        expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(expect.any(Object), 20, expect.any(Array), undefined);
    });

    it('Path 3: Over Target (Aggressive Clean)', async () => {
        // 60 tracks existing (over 50)
        mockSpotifyService.getPlaylistTracks.mockResolvedValue(new Array(60).fill({ uri: 'uri', addedAt: 'timestamp' }));

        mockTrackCleaner.processCurrentTracks.mockReturnValue({
            keptTracks: new Array(35).fill({ uri: 'uri' }), // Cut down to 35 (50 - 15)
            tracksToRemove: ['removed-uri'],
            slotsNeeded: 0 // Cleaner internal logic might say 0 relative to aggressive target, but orchestrator recalc
        });

        await orchestrator.curatePlaylist(mockConfig);

        // Expected Aggressive Target = 50 - 15 = 35
        expect(mockTrackCleaner.processCurrentTracks).toHaveBeenCalledWith(
            expect.any(Array),
            mockConfig,
            expect.any(Array),
            35 // <--- verify aggressive override 
        );

        // Orchestrator logic: kept 35. Target 50. Gap needed = 15.
        expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(expect.any(Object), 15, expect.any(Array), undefined);
    });
});
