import { BaseTrack, MandatoryTrack, TrackDiff, TrackInfo } from '@smart-spotify-curator/shared';

import { TrackWithMeta } from './types-internal';

export interface DiffResult {
  added: BaseTrack[];
  keptMandatory: BaseTrack[];
  removed: TrackDiff[];
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
    newAiTracks: { artist: string; track: string; uri: string }[], // AI selections
    removalReasons?: Map<string, 'artist_limit' | 'duplicate' | 'expired' | 'other' | 'size_limit'>
  ): DiffResult {
    // 1. Identify Added URIs
    const survivorUris = new Set(keptTracks.map((t) => t.uri));
    const tracksToAddUris = finalTrackListUris.filter((uri) => !survivorUris.has(uri));

    // 2. Resolve Added Metadata
    const added = tracksToAddUris.map((uri) => {
      // Priority 1: AI Tracks (Most likely source of newness)
      const aiMatch = newAiTracks.find((t) => t.uri === uri);
      if (aiMatch) return { artist: aiMatch.artist, name: aiMatch.track, uri };

      // Priority 2: Mandatory Tracks (If they were missing and got re-added)
      const vipMatch = mandatoryTracks.find((t) => t.uri === uri);
      if (vipMatch) {
        return {
          artist: vipMatch.artist || 'Unknown Artist',
          name: vipMatch.name || 'Unknown Track',
          uri
        };
      }

      // Priority 3: Fallback (Should be rare)
      return { artist: 'Unknown Artist', name: 'Unknown Track', uri };
    });

    // 3. Identify Removed URIs (Accounting for Duplicates)
    // We compare counts in the original vs final list
    const finalCounts = new Map<string, number>();
    finalTrackListUris.forEach((uri) => finalCounts.set(uri, (finalCounts.get(uri) || 0) + 1));

    const currentCounts = new Map<string, number>();
    currentTracks.forEach((t) => currentCounts.set(t.uri, (currentCounts.get(t.uri) || 0) + 1));

    const removed: TrackDiff[] = [];
    const processedUris = new Set<string>();

    currentTracks.forEach((t) => {
      if (processedUris.has(t.uri)) return;
      processedUris.add(t.uri);

      const cCount = currentCounts.get(t.uri) || 0;
      const fCount = finalCounts.get(t.uri) || 0;
      const removedCount = Math.max(0, cCount - fCount);

      if (removedCount > 0) {
        const reasonLookup = removalReasons?.get(t.uri);
        // Default to 'other' only if not found in map
        const reason = reasonLookup || 'other';

        for (let i = 0; i < removedCount; i++) {
          removed.push({
            artist: t.artist,
            name: t.name,
            reason,
            uri: t.uri
          });
        }
      }
    });

    // 5. Identify Kept Mandatory Tracks
    const finalSet = new Set(finalTrackListUris);
    const keptMandatoryUris = mandatoryTracks.map((m) => m.uri).filter((uri) => finalSet.has(uri));

    const keptMandatory = keptMandatoryUris.map((uri) => {
      const vipMatch = mandatoryTracks.find((t) => t.uri === uri);
      return {
        artist: vipMatch?.artist || 'Unknown Artist',
        name: vipMatch?.name || 'Unknown Track',
        uri
      };
    });

    return { added, keptMandatory, removed };
  }
}
