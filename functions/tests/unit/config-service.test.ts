import { ConfigService } from "../../src/services/config-service";
import { db } from "../../src/config/firebase";
import * as logger from "firebase-functions/logger";
import { PlaylistConfig } from "../../src/types";

// Mock dependencies
jest.mock("../../src/config/firebase", () => ({
  db: {
    collection: jest.fn(),
  },
}));

jest.mock("firebase-functions/logger");

describe("ConfigService", () => {
  let service: ConfigService;
  let mockWhere: jest.Mock;
  let mockLimit: jest.Mock;
  let mockGet: jest.Mock;

  const mockConfig: PlaylistConfig = {
    id: "spotify:playlist:49NveLmBkE159Zt6g0Novv", // Valid 22-char ID
    name: "Test Playlist",
    enabled: true,
    dryRun: false, // Defaulted by Zod
    settings: { targetTotalTracks: 10 },
    aiGeneration: {
      prompt: "Test prompt",
      model: "gemini-2.5-flash",
      temperature: 0.7,
    },
    curationRules: { maxTrackAgeDays: 30, removeDuplicates: true },
    mandatoryTracks: [],
  };

  beforeEach(() => {
    service = new ConfigService();
    jest.clearAllMocks();

    // Setup Firestore Mock Chain
    mockGet = jest.fn();
    mockWhere = jest.fn();
    mockLimit = jest.fn();

    (db.collection as jest.Mock).mockReturnValue({
      where: mockWhere,
      doc: jest.fn(), // Not used in reads
    });

    // Default chain behavior for query
    mockWhere.mockReturnValue({
      get: mockGet,
      limit: mockLimit,
    });

    mockLimit.mockReturnValue({
      get: mockGet,
    });
  });

  it("should fetch enabled playlists successfully", async () => {
    const mockSnapshot = {
      empty: false,
      docs: [{ id: "doc1", data: () => mockConfig }],
    };
    mockGet.mockResolvedValue(mockSnapshot);

    const result = await service.getEnabledPlaylists();

    expect(db.collection).toHaveBeenCalledWith("playlists");
    expect(mockWhere).toHaveBeenCalledWith("enabled", "==", true);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockConfig);
  });

  it("should return empty array if no playlists found", async () => {
    const mockSnapshot = {
      empty: true,
      docs: [],
    };
    mockGet.mockResolvedValue(mockSnapshot);

    const result = await service.getEnabledPlaylists();

    expect(result).toEqual([]);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("No enabled playlists"),
    );
  });

  it("should validate fetched config using Zod schema", async () => {
    const invalidConfig = { ...mockConfig, enabled: "not-a-boolean" }; // Invalid type
    const mockSnapshot = {
      empty: false,
      docs: [{ id: "doc1", data: () => invalidConfig }],
    };
    mockGet.mockResolvedValue(mockSnapshot);

    const result = await service.getEnabledPlaylists();

    expect(result).toEqual([]); // Should filter out invalid
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Invalid configuration"),
      expect.any(Object),
    );
  });

  it("should handle Firestore errors", async () => {
    mockGet.mockRejectedValue(new Error("Connection failed"));

    await expect(service.getEnabledPlaylists()).rejects.toThrow(
      "Failed to load configuration",
    );
    expect(logger.error).toHaveBeenCalled();
  });
});
