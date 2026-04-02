import { AiGenerationConfig, SearchResult } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';

import { AiService } from '../../services/ai-service';
import { FirestoreLogger } from '../../services/firestore-logger';
import { PromptGenerator } from '../../services/prompt-generator';
import { SpotifyService } from '../../services/spotify-service';

export class AISuggestionEngine {
  constructor(
    private aiService: AiService,
    private spotifyService: SpotifyService,
    private firestoreLogger: FirestoreLogger
  ) {}

  public async generateAndFindTracks(
    playlistName: string,
    description: string | undefined,
    referenceArtists: SearchResult[] | undefined,
    aiConfig: AiGenerationConfig,
    tracksNeeded: number,
    existingTrackSignatures: string[],
    ownerId: string | undefined,
    logId: string | undefined,
    maxTracksPerArtist: number,
    ownerName?: string,
    existingUris: Set<string> = new Set()
  ) {
    const prompt = PromptGenerator.generatePrompt(
      playlistName,
      description,
      aiConfig.isInstrumentalOnly,
      referenceArtists
    );

    const overFetchCount = Math.max(tracksNeeded + 10, Math.ceil(tracksNeeded * 1.5));
    const suggestions = await this.aiService.generateSuggestions(
      aiConfig,
      prompt,
      overFetchCount, // Smart over-fetch to account for API match failures / hallucination limits
      existingTrackSignatures
    );

    const foundTracks = [];
    const foundUris = new Set<string>();
    const artistCounts: Record<string, number> = {};
    const BATCH_SIZE = 5;

    for (let i = 0; i < suggestions.length; i += BATCH_SIZE) {
      if (foundTracks.length >= tracksNeeded) break;

      if (ownerId && logId) {
        const progress = Math.min(Math.round(30 + (i / suggestions.length) * 40), 75);
        await this.firestoreLogger.logActivity(
          ownerId,
          'running',
          `Finding tracks on Spotify (${foundTracks.length}/${tracksNeeded})...`,
          { progress, step: 'Searching tracks...', triggeredBy: ownerName },
          logId
        );
      }

      const batch = suggestions.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (s) => {
          const normAiArtist = s.artist.toLowerCase().trim();
          if ((artistCounts[normAiArtist] || 0) >= maxTracksPerArtist) return null;
          const track = await this.spotifyService.searchTrack(`${s.artist} ${s.track}`);
          return track ? { s, track } : null;
        })
      );

      for (const res of results) {
        if (res && foundTracks.length < tracksNeeded) {
          const spotifyUri = res.track.uri.toLowerCase();

          // Skip if track is already in the playlist OR already found in this run
          if (existingUris.has(spotifyUri) || foundUris.has(spotifyUri)) continue;

          // Double check artist limit with Spotify's normalized artist name
          const spotifyArtist = res.track.artist.split(',')[0].toLowerCase().trim();
          if ((artistCounts[spotifyArtist] || 0) >= maxTracksPerArtist) continue;

          foundTracks.push({
            addedAt: new Date(),
            artist: res.track.artist,
            popularity: res.track.popularity,
            track: res.track.name,
            uri: res.track.uri
          });
          foundUris.add(spotifyUri);
          artistCounts[spotifyArtist] = (artistCounts[spotifyArtist] || 0) + 1;
        }
      }
    }

    if (foundTracks.length < tracksNeeded) {
      logger.warn(
        `Graceful degradation for ${playlistName}: Target was ${tracksNeeded} AI tracks, but only identified ${foundTracks.length} valid tracks in Spotify.`
      );
      if (ownerId && logId) {
        await this.firestoreLogger.logActivity(
          ownerId,
          'warning',
          `AI target missed: found ${foundTracks.length} out of ${tracksNeeded} requested tracks.`,
          { state: 'warning', step: 'AI Generation Degraded', triggeredBy: ownerName },
          logId
        );
      }
    }

    return foundTracks;
  }
}
