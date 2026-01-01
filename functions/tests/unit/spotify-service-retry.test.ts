import { SpotifyService } from "../../src/services/spotify-service";
import SpotifyWebApi from "spotify-web-api-node";

// Auto-mock the library (class)
jest.mock("spotify-web-api-node");

// Mock config
jest.mock("../../src/config/env", () => ({
  config: {
    SPOTIFY_CLIENT_ID: "test",
    SPOTIFY_CLIENT_SECRET: "test",
    SPOTIFY_REFRESH_TOKEN: "test",
  },
}));

describe("SpotifyService Retry Logic", () => {
  let service: SpotifyService;
  let mockSpotifyApi: jest.Mocked<SpotifyWebApi>;

  beforeEach(() => {
    // Reset singleton
    (
      SpotifyService as unknown as { instance: SpotifyService | undefined }
    ).instance = undefined;
    jest.clearAllMocks();

    service = SpotifyService.getInstance();

    // Access the private spotifyApi instance which is now a mock
    mockSpotifyApi = (
      service as unknown as { spotifyApi: jest.Mocked<SpotifyWebApi> }
    ).spotifyApi;

    // Mock delay helper to avoid timer issues
    jest
      .spyOn(service as unknown as { delay: () => Promise<void> }, "delay")
      .mockResolvedValue(undefined);
  });

  it("should retry on 429 Rate Limit", async () => {
    // Setup success for token check (if needed)
    // Since we mock the instance methods, we need to ensure refreshAccessToken returns something valid if called
    // or ensureAccessToken logic passes.
    // Initially token is expired (epoch 0).
    // So ensureAccessToken calls refreshAccessToken.

    (mockSpotifyApi.refreshAccessToken as jest.Mock).mockResolvedValue({
      body: { access_token: "valid-token", expires_in: 3600 },
    });

    // Mock getPlaylistTracks to fail once with 429, then succeed
    (mockSpotifyApi.getPlaylistTracks as jest.Mock)
      .mockRejectedValueOnce({
        statusCode: 429,
        headers: { "retry-after": 1 },
      })
      .mockResolvedValueOnce({
        body: { items: [] },
      });

    const result = await service.getPlaylistTracks("test-playlist");

    expect(result).toEqual([]);
    expect(mockSpotifyApi.getPlaylistTracks).toHaveBeenCalledTimes(2);
  });

  it("should refresh token and retry on 401 Unauthorized", async () => {
    (mockSpotifyApi.refreshAccessToken as jest.Mock).mockResolvedValue({
      body: { access_token: "initial-token", expires_in: 3600 },
    });

    // getPlaylistTracks -> 401 -> refresh -> retry -> success
    (mockSpotifyApi.getPlaylistTracks as jest.Mock)
      .mockRejectedValueOnce({ statusCode: 401 })
      .mockResolvedValueOnce({ body: { items: [] } });

    await service.getPlaylistTracks("test-playlist");

    // Should call refresh twice (once at start, once on 401)
    expect(mockSpotifyApi.refreshAccessToken).toHaveBeenCalledTimes(2);
    // Should call setAccessToken with new token?
    expect(mockSpotifyApi.setAccessToken).toHaveBeenCalled();
    expect(mockSpotifyApi.getPlaylistTracks).toHaveBeenCalledTimes(2);
  });

  it("should fail after max retries", async () => {
    (mockSpotifyApi.refreshAccessToken as jest.Mock).mockResolvedValue({
      body: { access_token: "valid-token", expires_in: 3600 },
    });

    (mockSpotifyApi.getPlaylistTracks as jest.Mock).mockRejectedValue({
      statusCode: 429,
      headers: { "retry-after": 1 },
    });

    const promise = service.getPlaylistTracks("test-playlist");

    await expect(promise).rejects.toMatchObject({ statusCode: 429 });

    // Initial call + 3 retries = 4 calls total
    expect(mockSpotifyApi.getPlaylistTracks).toHaveBeenCalledTimes(4);
  });
});
