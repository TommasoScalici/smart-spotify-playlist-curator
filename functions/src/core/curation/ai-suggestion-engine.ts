import { AiGenerationConfig, SearchResult } from '@smart-spotify-curator/shared';

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
    ownerName?: string
  ) {
    const prompt = PromptGenerator.generatePrompt(
      playlistName,
      description,
      aiConfig.isInstrumentalOnly,
      referenceArtists
    );

    const suggestions = await this.aiService.generateSuggestions(
      aiConfig,
      prompt,
      tracksNeeded + 5,
      existingTrackSignatures
    );

    const foundTracks = [];
    const artistCounts: Record<string, number> = {};
    const BATCH_SIZE = 5;

    for (let i = 0; i < suggestions.length; i += BATCH_SIZE) {
      if (foundTracks.length >= tracksNeeded) break;

      if (ownerId && logId) {
        const progress = Math.round(30 + (i / suggestions.length) * 40);
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
          if ((artistCounts[s.artist] || 0) >= maxTracksPerArtist) return null;
          const track = await this.spotifyService.searchTrack(`${s.artist} ${s.track}`);
          return track ? { s, track } : null;
        })
      );

      for (const res of results) {
        if (res && foundTracks.length < tracksNeeded) {
          if ((artistCounts[res.s.artist] || 0) >= maxTracksPerArtist) continue;

          foundTracks.push({
            addedAt: new Date(),
            artist: res.track.artist,
            popularity: res.track.popularity,
            track: res.track.name,
            uri: res.track.uri
          });
          artistCounts[res.s.artist] = (artistCounts[res.s.artist] || 0) + 1;
        }
      }
    }

    return foundTracks;
  }
}
