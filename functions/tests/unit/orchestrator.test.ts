import { PlaylistOrchestrator } from "../../src/core/orchestrator";
import { SpotifyService } from "../../src/services/spotify-service";
import { AiService } from "../../src/services/ai-service";
import { TrackCleaner } from "../../src/core/track-cleaner";
import { SlotManager } from "../../src/core/slot-manager";
import { PlaylistConfig } from "../../src/types";

// Mock dependencies
jest.mock("../../src/services/spotify-service");
jest.mock("../../src/services/ai-service");
jest.mock("../../src/core/track-cleaner");
jest.mock("../../src/core/slot-manager");

describe("PlaylistOrchestrator", () => {
  let orchestrator: PlaylistOrchestrator;
  let mockSpotifyService: jest.Mocked<SpotifyService>;
  let mockAiService: jest.Mocked<AiService>;
  let mockTrackCleaner: jest.Mocked<TrackCleaner>;
  let mockSlotManager: jest.Mocked<SlotManager>;

  // Type casting to Bypass strict partial matching for test config
  const mockConfig: PlaylistConfig = {
    id: "test-playlist",
    name: "Test Playlist",
    enabled: true,
    settings: { targetTotalTracks: 50 },
    aiGeneration: { prompt: "test", overfetchRatio: 2.0 },
    curationRules: { maxTrackAgeDays: 30, removeDuplicates: true },
    mandatoryTracks: [],
  } as unknown as PlaylistConfig;

  beforeEach(() => {
    mockSpotifyService =
      new (SpotifyService as unknown as new () => SpotifyService)() as unknown as jest.Mocked<SpotifyService>;
    mockAiService = new AiService() as unknown as jest.Mocked<AiService>;
    mockTrackCleaner =
      new TrackCleaner() as unknown as jest.Mocked<TrackCleaner>;
    mockSlotManager = new SlotManager() as unknown as jest.Mocked<SlotManager>;

    orchestrator = new PlaylistOrchestrator(
      mockSpotifyService,
      mockAiService,
      mockTrackCleaner,
      mockSlotManager,
    );

    // Default mocks
    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);
    mockSpotifyService.searchTrack.mockResolvedValue({
      uri: "spotify:track:new-ai-uri",
      artist: "A",
      name: "N",
      addedAt: "",
    });
    mockSpotifyService.getTracks.mockResolvedValue([]); // Default empty
    mockAiService.generateSuggestions.mockResolvedValue([
      { artist: "A", track: "B" },
    ]);
    mockSlotManager.arrangePlaylist.mockReturnValue(["uri1", "uri2"]);
  });

  it("Path 1: Empty Playlist", async () => {
    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);

    mockTrackCleaner.processCurrentTracks.mockReturnValue({
      keptTracks: [],
      tracksToRemove: [],
      slotsNeeded: 50,
    });

    // Mock AI Metadata Fetch
    mockSpotifyService.getTracks.mockResolvedValue([
      {
        uri: "spotify:track:new-ai-uri",
        artist: "Artist A",
        name: "Track A",
        addedAt: "",
      },
    ]);

    await orchestrator.curatePlaylist(mockConfig);

    expect(mockTrackCleaner.processCurrentTracks).toHaveBeenCalled();
    expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(
      expect.any(Object),
      105,
      expect.any(Array),
    );
  });

  it("Path 2: Under Target", async () => {
    // 30 tracks existing (under 50)
    mockSpotifyService.getPlaylistTracks.mockResolvedValue(
      new Array(30).fill({
        uri: "uri",
        addedAt: "timestamp",
        artist: "Artist Existing",
      }),
    );

    mockTrackCleaner.processCurrentTracks.mockReturnValue({
      keptTracks: new Array(30).fill({ uri: "uri", artist: "Artist Existing" }),
      tracksToRemove: [],
      slotsNeeded: 20,
    });

    mockSpotifyService.getTracks.mockResolvedValue(
      new Array(20).fill({ uri: "ai-uri", artist: "AI Artist" }),
    );

    await orchestrator.curatePlaylist(mockConfig);

    expect(mockTrackCleaner.processCurrentTracks).toHaveBeenCalled();
    expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(
      expect.any(Object),
      45,
      expect.any(Array),
    );
  });

  it("Path 3: Over Target (Aggressive Clean)", async () => {
    // 60 tracks existing
    mockSpotifyService.getPlaylistTracks.mockResolvedValue(
      new Array(60).fill({
        uri: "uri",
        addedAt: "timestamp",
        artist: "Artist",
      }),
    );

    mockTrackCleaner.processCurrentTracks.mockReturnValue({
      keptTracks: new Array(35).fill({ uri: "uri", artist: "Survivor" }),
      tracksToRemove: ["removed-uri"],
      slotsNeeded: 0,
    });

    mockSpotifyService.getTracks.mockResolvedValue([]);

    await orchestrator.curatePlaylist(mockConfig);

    expect(mockTrackCleaner.processCurrentTracks).toHaveBeenCalledWith(
      expect.any(Array),
      mockConfig,
      expect.any(Array),
      35,
    );

    expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(
      expect.any(Object),
      35,
      expect.any(Array),
    );
  });


});
