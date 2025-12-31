import { PlaylistConfig } from '../types';
import { ProcessingResult, TrackWithMeta } from '../types/core-types';

export class TrackCleaner {
    /**
     * Processes current tracks to apply VIP protection, age cleanup, and size limits.
     * @param currentTracks List of track objects from Spotify (must contain uri and added_at)
     * @param config The playlist configuration
     * @param vipUris Set or array of VIP track URIs
     * @returns ProcessingResult containing kept tracks, tracks to remove, and needed slots
     */
    public processCurrentTracks(
        currentTracks: { track: { uri: string }; added_at: string }[],
        config: PlaylistConfig,
        vipUris: string[],
        targetSizeAfterCleanup?: number // Optional override for aggressive cleaning
    ): ProcessingResult {
        const { curationRules, settings } = config;
        const maxAgeDays = curationRules.maxTrackAgeDays;

        // Use override if provided, otherwise default to settings target
        const effectiveTarget = targetSizeAfterCleanup !== undefined ? targetSizeAfterCleanup : settings.targetTotalTracks;

        const now = new Date();

        // 1. Map to internal format and Identify VIPs
        let tracks: TrackWithMeta[] = currentTracks.map((t, index) => {
            const addedAt = new Date(t.added_at);
            const isVip = vipUris.includes(t.track.uri);
            return {
                uri: t.track.uri,
                addedAt: addedAt,
                isVip: isVip,
                originalIndex: index,
            };
        });


        const removedUris: string[] = [];

        // 2. Age Cleanup
        // Filter out non-VIP tracks where (Today - addedAt) > maxTrackAgeDays
        tracks = tracks.filter((track) => {
            if (track.isVip) return true; // VIPs are protected from age cleanup

            const ageInMs = now.getTime() - track.addedAt.getTime();
            const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

            if (ageInDays > maxAgeDays) {
                removedUris.push(track.uri);
                return false;
            }
            return true;
        });

        // 3. Size Cleanup (Hard Limit)
        // If totalTracks > effectiveTarget, remove oldest non-VIPs
        if (tracks.length > effectiveTarget) {
            // Separate VIPs and Non-VIPs
            const vips = tracks.filter((t) => t.isVip);
            let nonVips = tracks.filter((t) => !t.isVip);

            // Sort non-VIPs by addedAt (Oldest first)
            // If dates are equal, keep original order to be stable
            nonVips.sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime());

            // Calculate how many we need to remove
            // We want (vips.length + nonVips.length) <= effectiveTarget
            // So newNonVipsCount = effectiveTarget - vips.length
            const slotsForNonVips = Math.max(0, effectiveTarget - vips.length);

            // If we have more non-VIPs than slots available for them, remove the oldest (start of array)
            if (nonVips.length > slotsForNonVips) {
                const tracksToKeep = nonVips.slice(nonVips.length - slotsForNonVips);
                const tracksToDrop = nonVips.slice(0, nonVips.length - slotsForNonVips);

                tracksToDrop.forEach((t) => removedUris.push(t.uri));
                nonVips = tracksToKeep;
            }

            // Recombine
            tracks = [...vips, ...nonVips];
        }

        const slotsNeeded = Math.max(0, effectiveTarget - tracks.length);

        return {
            keptTracks: tracks,
            tracksToRemove: removedUris,
            slotsNeeded: slotsNeeded,
        };
    }
}



