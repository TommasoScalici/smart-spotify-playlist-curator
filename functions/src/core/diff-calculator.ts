import { TrackWithMeta } from './types-internal';
import { MandatoryTrack } from '@smart-spotify-curator/shared';
import { TrackInfo } from '../services/spotify-service';

export interface DiffItem {
  uri: string;
  name: string;
  artist: string;
}

export interface DiffResult {
  added: DiffItem[];
  removed: DiffItem[];
}

export class DiffCalculator {
  /**
   * Calculates the difference between the original state, the kept tracks, and the final list.
   * Resolves metadata for added/removed tracks from available sources.
   */
  static calculate(
    currentTracks: TrackInfo[], // Original state (for removed metadata)
    keptTracks: TrackWithMeta[], // Survivors (Internal Model)
    finalTrackListUris: string[], // The final ordered list of URIs
    mandatoryTracks: MandatoryTrack[], // Setup config (source of truth for VIPs)
    newAiTracks: { uri: string; artist: string; track: string }[] // AI selections
  ): DiffResult {
    // 1. Identify Added URIs
    const survivorUris = new Set(keptTracks.map((t) => t.uri));
    const tracksToAddUris = finalTrackListUris.filter((uri) => !survivorUris.has(uri));

    // 2. Resolve Added Metadata
    const added = tracksToAddUris.map((uri) => {
      // Priority 1: AI Tracks (Most likely source of newness)
      const aiMatch = newAiTracks.find((t) => t.uri === uri);
      if (aiMatch) return { uri, name: aiMatch.track, artist: aiMatch.artist };

      // Priority 2: Mandatory Tracks (If they were missing and got re-added)
      const vipMatch = mandatoryTracks.find((t) => t.uri === uri);
      if (vipMatch) {
        return {
          uri,
          name: vipMatch.name || 'Unknown Track',
          artist: vipMatch.artist || 'Unknown Artist'
        };
      }

      // Priority 3: Fallback (Should be rare)
      return { uri, name: 'Unknown Track', artist: 'Unknown Artist' };
    });

    // 3. Identify Removed URIs
    // Tracks that were in currentTracks but NOT in finalTrackListUris
    // (Note: tracksToRemove passed from cleaner logic is also valid, but checking against final list is more robust/truthful)
    const finalSet = new Set(finalTrackListUris);
    const removedUris = currentTracks.filter((t) => !finalSet.has(t.uri)).map((t) => t.uri);

    // 4. Resolve Removed Metadata
    const removed = removedUris.map((uri) => {
      const original = currentTracks.find((t) => t.uri === uri);
      if (original) return { uri, name: original.name, artist: original.artist };
      return { uri, name: 'Unknown Track', artist: 'Unknown Artist' };
    });

    return { added, removed };
  }
}
