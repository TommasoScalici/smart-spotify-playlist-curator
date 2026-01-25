import { TrackWithMeta } from './types-internal';
import { MandatoryTrack } from '@smart-spotify-curator/shared';
import { TrackInfo } from '../services/spotify-service';

export interface DiffItem {
  uri: string;
  name: string;
  artist: string;
}

export interface RemovedDiffItem extends DiffItem {
  reason?: 'duplicate' | 'expired' | 'artist_limit' | 'size_limit' | 'other';
}

export interface DiffResult {
  added: DiffItem[];
  removed: RemovedDiffItem[];
  keptMandatory: DiffItem[];
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
    newAiTracks: { uri: string; artist: string; track: string }[], // AI selections
    removalReasons?: Map<string, 'duplicate' | 'expired' | 'artist_limit' | 'size_limit' | 'other'>
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

    // 3. Identify Removed URIs (Accounting for Duplicates)
    // We compare counts in the original vs final list
    const finalCounts = new Map<string, number>();
    finalTrackListUris.forEach((uri) => finalCounts.set(uri, (finalCounts.get(uri) || 0) + 1));

    const currentCounts = new Map<string, number>();
    currentTracks.forEach((t) => currentCounts.set(t.uri, (currentCounts.get(t.uri) || 0) + 1));

    const removed: RemovedDiffItem[] = [];
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
            uri: t.uri,
            name: t.name,
            artist: t.artist,
            reason
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
        uri,
        name: vipMatch?.name || 'Unknown Track',
        artist: vipMatch?.artist || 'Unknown Artist'
      };
    });

    return { added, removed, keptMandatory };
  }
}
