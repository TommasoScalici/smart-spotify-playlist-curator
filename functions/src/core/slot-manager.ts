import { MandatoryTrack } from '../types';

export class SlotManager {
    /**
     * Arranges tracks into the playlist grid according to VIP rules and filling remaining slots with shuffled content.
     * @param mandatoryTracks List of mandatory tracks with position ranges
     * @param survivorTracks URIs of existing tracks that survived cleaning
     * @param newAiTracks URIs of newly generated AI tracks
     * @param totalSlots Total size of the playlist
     * @returns Array of track URIs in their final positions
     */
    public arrangePlaylist(
        mandatoryTracks: MandatoryTrack[],
        survivorTracks: string[],
        newAiTracks: string[],
        totalSlots: number
    ): string[] {
        // 1. Grid Initialization
        const playlist: (string | null)[] = new Array(totalSlots).fill(null);

        // 2. Phase A: Fixed Positions (min == max)
        for (const meta of mandatoryTracks) {
            const { min, max } = meta.positionRange;
            if (min === max) {
                // Adjust for 1-based index usually used in configs vs 0-based array
                // Assuming config is 1-based (position 1 is index 0)
                const index = min - 1;

                if (index < 0 || index >= totalSlots) {
                    console.warn(`Fixed position ${min} for ${meta.uri} is out of bounds (1-${totalSlots}). Skipping.`);
                    continue;
                }

                if (playlist[index] !== null) {
                    throw new Error(`Collision detected at fixed position ${min}. Slot already taken by ${playlist[index]}.`);
                }

                playlist[index] = meta.uri;
            }
        }

        // 3. Phase B: Ranged VIPs (min != max)
        for (const meta of mandatoryTracks) {
            const { min, max } = meta.positionRange;
            if (min !== max) {
                // Adjust for 1-based index
                const start = Math.max(0, min - 1);
                const end = Math.min(totalSlots - 1, max - 1);

                if (start > end) {
                    console.warn(`Invalid range ${min}-${max} for ${meta.uri}. Skipping.`);
                    continue;
                }

                // Collect available slots in range
                const availableSlots: number[] = [];
                for (let i = start; i <= end; i++) {
                    if (playlist[i] === null) {
                        availableSlots.push(i);
                    }
                }

                if (availableSlots.length > 0) {
                    // Pick a random available slot
                    const randomIndex = Math.floor(Math.random() * availableSlots.length);
                    const chosenSlot = availableSlots[randomIndex];
                    playlist[chosenSlot] = meta.uri;
                } else {
                    // Range full - try nearest neighbor
                    console.warn(`Range ${min}-${max} full for ${meta.uri}. Attempting nearest empty slot.`);
                    let placed = false;

                    // Search outwards from the range
                    // Look before 'start' and after 'end'
                    let offset = 1;
                    while (!placed) {
                        const checkLeft = start - offset;
                        const checkRight = end + offset;
                        const validLeft = checkLeft >= 0 && checkLeft < totalSlots;
                        const validRight = checkRight >= 0 && checkRight < totalSlots;

                        if (!validLeft && !validRight) break; // No more slots to check

                        // Try left
                        if (validLeft && playlist[checkLeft] === null) {
                            playlist[checkLeft] = meta.uri;
                            placed = true;
                            break;
                        }
                        // Try right
                        if (validRight && playlist[checkRight] === null) {
                            playlist[checkRight] = meta.uri;
                            placed = true;
                            break;
                        }
                        offset++;
                    }

                    if (!placed) {
                        console.error(`Could not place mandatory track ${meta.uri} anywhere near range ${min}-${max}.`);
                    }
                }
            }
        }

        // 4. Phase C: Stratified Fill (Top 30 Priority for AI)
        const topSlotsLimit = 30;
        const newAiTracksPool = [...newAiTracks]; // Copy to mutate (consume)

        // Try to place AI tracks in empty slots < 30 first
        for (let i = 0; i < Math.min(topSlotsLimit, totalSlots); i++) {
            if (playlist[i] === null && newAiTracksPool.length > 0) {
                // Must not be a mandatory URI (though usually AI tracks are new)
                // Just take the first one
                const track = newAiTracksPool.shift();
                if (track) playlist[i] = track;
            }
        }

        // 5. Phase D: Shuffle & Fill Remaining
        // Combine survivors and REMAINING AI tracks
        const mandatoryUris = new Set(mandatoryTracks.map(m => m.uri));
        const pool = [...survivorTracks, ...newAiTracksPool].filter(uri => !mandatoryUris.has(uri));

        // Fisher-Yates Shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // Fill remaining slots
        let poolIndex = 0;
        for (let i = 0; i < totalSlots; i++) {
            if (playlist[i] === null) {
                if (poolIndex < pool.length) {
                    playlist[i] = pool[poolIndex];
                    poolIndex++;
                } else {
                    // Run out of tracks to fill
                    // Depending on requirements, we can leave null (and filter later) or cycle?
                    // "Fill all remaining empty slots" implies we should have enough.
                    // If not, we just leave it or stop. 
                    // Let's assume we stop and filter nulls at return.
                }
            }
        }

        // If we have extra tracks in pool that didn't fit (shouldn't happen if math was right, but safety first)
        // logic says "Fill all remaining empty slots".

        // Remove nulls (empty slots that couldn't be filled)
        const finalPlaylist = playlist.filter((uri): uri is string => uri !== null);

        return finalPlaylist;
    }
}
