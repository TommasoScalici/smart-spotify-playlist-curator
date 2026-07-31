import { beforeAll, describe, expect, it } from 'vitest';

import { SpotifyService } from '../../src/services/spotify-service';

describe('Spotify Integration: Search', () => {
  let service: SpotifyService;

  beforeAll(() => {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_REFRESH_TOKEN) {
      console.warn('Skipping integration tests: No credentials found');
      // Create with dummy token to avoid crash, tests will skip anyway due to conditionalDescribe
      service = new SpotifyService('dummy-token-for-skip');
      return;
    }
    service = new SpotifyService(process.env.SPOTIFY_REFRESH_TOKEN);
  });

  const conditionalDescribe =
    process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_REFRESH_TOKEN ? describe : describe.skip;

  conditionalDescribe('searchTrack', () => {
    it('should find exact matches for known tracks', async () => {
      try {
        const track = await service.searchTrack('Pink Floyd Time');
        expect(track).not.toBeNull();
        expect(track?.uri).toMatch(/^spotify:track:[a-zA-Z0-9]{22}$/);
        expect(track?.artist).toBeDefined();
      } catch (err) {
        if (err instanceof Error && err.message.includes('Failed to refresh Spotify token')) {
          console.warn('Skipping integration test: invalid/expired Spotify token');
          return;
        }
        throw err;
      }
    });

    it('should handle non-existent tracks without crashing', async () => {
      try {
        const track = await service.searchTrack('NonExistentSong123456789');
        expect(track === null || typeof track === 'object').toBe(true);
        if (track) {
          expect(track.uri).toBeDefined();
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Failed to refresh Spotify token')) {
          console.warn('Skipping integration test: invalid/expired Spotify token');
          return;
        }
        throw err;
      }
    });
  });
});
