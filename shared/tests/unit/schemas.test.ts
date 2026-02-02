import { describe, expect, it } from 'vitest';

import { PlaylistConfigSchema, SearchResultSchema, TrackInfoSchema } from '../../src/schemas';

describe('Shared Schema Validation', () => {
  describe('PlaylistConfigSchema', () => {
    it('should validate a valid config', () => {
      const validConfig = {
        aiGeneration: {
          enabled: true,
          model: 'gemini-2.5-flash',
          temperature: 0.5,
          tracksToAdd: 5
        },
        curationRules: {
          maxTrackAgeDays: 30,
          maxTracksPerArtist: 2
        },
        enabled: true,
        id: 'spotify:playlist:1234567890',
        name: 'My Playlist',
        ownerId: 'user123',
        settings: {
          targetTotalTracks: 20
        }
      };

      const result = PlaylistConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid playlist URIs', () => {
      const invalidConfig = {
        enabled: true,
        id: 'invalid-uri',
        name: 'My Playlist',
        ownerId: 'user123',
        settings: { targetTotalTracks: 20 }
      };

      const result = PlaylistConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Must be a valid Spotify Playlist URI');
      }
    });

    it('should reject invalid targetTotalTracks (< 5)', () => {
      const invalidConfig = {
        id: 'spotify:playlist:123',
        name: 'My Playlist',
        ownerId: 'user123',
        settings: { targetTotalTracks: 4 } // Too low
      };

      const result = PlaylistConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('TrackInfoSchema', () => {
    it('should validate correct track info', () => {
      const track = {
        addedAt: new Date().toISOString(),
        album: 'Album',
        artist: 'Artist',
        name: 'Song',
        popularity: 50,
        uri: 'spotify:track:123'
      };
      const result = TrackInfoSchema.safeParse(track);
      expect(result.success).toBe(true);
    });

    it('should fail if missing required fields', () => {
      const track = {
        // name missing
        artist: 'Artist',
        uri: 'spotify:track:123'
      };
      const result = TrackInfoSchema.safeParse(track);
      expect(result.success).toBe(false);
    });
  });

  describe('SearchResultSchema', () => {
    it('should allow valid types', () => {
      const valid = {
        name: 'Song',
        type: 'track',
        uri: 'spotify:track:123'
      };
      expect(SearchResultSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject invalid types', () => {
      const invalid = {
        name: 'Song',
        type: 'invalid_type',
        uri: 'spotify:track:123'
      };
      expect(SearchResultSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
