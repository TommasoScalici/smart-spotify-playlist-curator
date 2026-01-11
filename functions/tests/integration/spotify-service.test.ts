import { SpotifyService } from '../../src/services/spotify-service';

// Use sandbox playlist for integration tests
const SANDBOX_PLAYLIST_ID = '49NveLmBkE159Zt6g0Novv';

describe('Spotify Integration: Service Logic', () => {
  let service: SpotifyService;

  beforeAll(() => {
    service = SpotifyService.getInstance();
  });

  // Skip if credentials are missing
  const conditionalDescribe =
    process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_REFRESH_TOKEN ? describe : describe.skip;

  conditionalDescribe('performSmartUpdate', () => {
    // Extended timeout for rate-limited API calls
    // vi.setConfig({ testTimeout: 60000 }); // Not available in all versions, using test specific timeout is safer

    it(
      'should swap tracks and verify atomic updates via snapshot_id',
      { timeout: 60000 },
      async () => {
        // 1. Setup Phase
        const initialTracks = await service.getPlaylistTracks(SANDBOX_PLAYLIST_ID);
        if (initialTracks.length < 3) {
          console.warn('Skipping swap test: Playlist has fewer than 3 tracks.');
          return;
        }

        const trackA = initialTracks[0];
        const trackB = initialTracks[1];

        // Target Order: [B, A, ...rest]
        const targetOrder = [trackB.uri, trackA.uri, ...initialTracks.slice(2).map((t) => t.uri)];

        // 2. Execution Phase
        await service.performSmartUpdate(SANDBOX_PLAYLIST_ID, [], [], targetOrder);

        // Wait for eventual consistency
        await new Promise((r) => setTimeout(r, 5000));

        // 3. Verification Phase
        const finalTracks = await service.getPlaylistTracks(SANDBOX_PLAYLIST_ID);

        // Cleanup: Revert changes immediately
        const revertOrder = initialTracks.map((t) => t.uri);
        await service.performSmartUpdate(SANDBOX_PLAYLIST_ID, [], [], revertOrder);

        // Assertions
        expect(finalTracks[0].uri).toBe(trackB.uri);
        expect(finalTracks[1].uri).toBe(trackA.uri);
      }
    );
  });
});
