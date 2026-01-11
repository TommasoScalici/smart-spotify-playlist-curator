import { SpotifyService } from '../../src/services/spotify-service';

describe('Spotify Integration: Search', () => {
  let service: SpotifyService;

  beforeAll(() => {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_REFRESH_TOKEN) {
      console.warn('Skipping integration tests: No credentials found');
    }
    service = SpotifyService.getInstance();
  });

  const conditionalDescribe = process.env.SPOTIFY_CLIENT_ID ? describe : describe.skip;

  conditionalDescribe('searchTrack', () => {
    it('should find exact matches for known tracks', async () => {
      const track = await service.searchTrack('Pink Floyd Time');
      expect(track).not.toBeNull();
      expect(track?.uri).toMatch(/^spotify:track:[a-zA-Z0-9]{22}$/);
      expect(track?.artist).toBeDefined();
    });

    it('should handle non-existent tracks without crashing', async () => {
      // Because Spotify search is fuzzy, we can't guarantee null,
      // but we ensure it returns an object or null, not undefined or error.
      const track = await service.searchTrack('NonExistentSong123456789');
      expect(track === null || typeof track === 'object').toBe(true);
      if (track) {
        expect(track.uri).toBeDefined();
      }
    });
  });
});
