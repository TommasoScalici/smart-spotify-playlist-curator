import { TrackCleaner } from '../../src/core/track-cleaner';
import { SlotManager } from '../../src/core/slot-manager';
import { PlaylistConfig } from '../../src/types';

describe('Core Logic', () => {
    // --- MOCK DATA SETUP ---
    const mockConfig: PlaylistConfig = {
        id: 'test-playlist',
        name: 'Test Playlist Logic',
        enabled: true,
        settings: {
            targetTotalTracks: 10,
            description: 'Unit Test',
        },
        aiGeneration: {
            prompt: 'Test Prompt',
            refillBatchSize: 10,
            isInstrumentalOnly: false
        },
        curationRules: {
            maxTrackAgeDays: 30,
            removeDuplicates: true
        },
        mandatoryTracks: [
            {
                uri: 'spotify:track:VIP_FIXED_POS_5',
                positionRange: { min: 5, max: 5 },
                note: 'Fixed VIP'
            },
            {
                uri: 'spotify:track:VIP_RANGED',
                positionRange: { min: 1, max: 3 },
                note: 'Ranged VIP'
            }
        ]
    };

    const vipUris = mockConfig.mandatoryTracks.map(t => t.uri);
    const today = new Date();
    const fortyDaysAgo = new Date(); fortyDaysAgo.setDate(today.getDate() - 40);
    const twoDaysAgo = new Date(); twoDaysAgo.setDate(today.getDate() - 2);

    const currentTracksRaw = [
        { uri: 'spotify:track:OLD_TRACK', addedAt: fortyDaysAgo },
        { uri: 'spotify:track:NEW_TRACK', addedAt: twoDaysAgo },
        { uri: 'spotify:track:VIP_FIXED_POS_5', addedAt: fortyDaysAgo }, // Old but VIP
        { uri: 'spotify:track:EXTRA_OLD', addedAt: fortyDaysAgo }
    ];

    describe('TrackCleaner', () => {
        it('should remove old tracks but keep VIPs', () => {
            const cleaner = new TrackCleaner();
            const cleanResult = cleaner.processCurrentTracks(
                currentTracksRaw.map(t => ({
                    track: { uri: t.uri },
                    added_at: t.addedAt.toISOString(),
                })),
                mockConfig,
                vipUris
            );

            const keptUris = cleanResult.keptTracks.map(t => t.uri);

            // Assertions
            expect(keptUris).not.toContain('spotify:track:OLD_TRACK'); // Expired
            expect(keptUris).not.toContain('spotify:track:EXTRA_OLD'); // Expired
            expect(keptUris).toContain('spotify:track:NEW_TRACK'); // Fresh
            expect(keptUris).toContain('spotify:track:VIP_FIXED_POS_5'); // VIP Protected

            expect(cleanResult.keptTracks.length).toBe(2);
            expect(cleanResult.slotsNeeded).toBe(8); // 10 - 2 = 8
        });
    });

    describe('SlotManager', () => {
        it('should place Fixed VIPs in exact spots', () => {
            const slotManager = new SlotManager();
            const survivorTracks = ['spotify:track:NEW_TRACK', 'spotify:track:VIP_FIXED_POS_5'];

            const aiTracks = Array.from({ length: 8 }, (_, i) => `spotify:track:AI_GEN_${i}`);

            const finalPlaylist = slotManager.arrangePlaylist(
                mockConfig.mandatoryTracks,
                survivorTracks,
                aiTracks,
                10
            );

            // Check Fixed VIP (Position 5 -> Index 4)
            expect(finalPlaylist[4]).toBe('spotify:track:VIP_FIXED_POS_5');

            // Check Ranged VIP (Position 1-3 -> Index 0-2)
            const rangedVipIndex = finalPlaylist.indexOf('spotify:track:VIP_RANGED');
            expect(rangedVipIndex).toBeGreaterThanOrEqual(0);
            expect(rangedVipIndex).toBeLessThanOrEqual(2);

            // Check Length
            expect(finalPlaylist.length).toBe(10);
        });

        it('should find nearest empty slot when range is full', () => {
            const slotManager = new SlotManager();

            // Setup: Fill slots 0 and 2 (indices for range 1-3)
            // Range is 1-3 (Indices 0, 1, 2)
            // Let's force a collision logic test
            // Actually, let's test the specific "Nearest Neighbor" logic.
            // Setup a scenario where the preferred range is totally full.

            // Config with a mandatory track in range 5-6 (indices 4, 5)
            const specificTrack = {
                uri: 'spotify:track:VIP_SQUEEZE',
                positionRange: { min: 5, max: 6 } // Indices 4, 5
            };

            // Pre-fill indices 4 and 5 with other Fixed VIPs
            const blockers = [
                { uri: 'spotify:track:BLOCKER_1', positionRange: { min: 5, max: 5 } }, // Index 4
                { uri: 'spotify:track:BLOCKER_2', positionRange: { min: 6, max: 6 } }  // Index 5
            ];

            const allMandatory = [...blockers, specificTrack];

            // We need enough survivors/ai to fill the rest
            const others = Array.from({ length: 7 }, (_, i) => `spotify:track:OTHER_${i}`);

            const final = slotManager.arrangePlaylist(
                allMandatory,
                others,
                [],
                10
            );

            const index1 = final.indexOf('spotify:track:BLOCKER_1');
            const index2 = final.indexOf('spotify:track:BLOCKER_2');
            const targetIndex = final.indexOf('spotify:track:VIP_SQUEEZE');

            expect(index1).toBe(4);
            expect(index2).toBe(5);

            // Should be pushed to nearest neighbor (3 or 6)
            // Since we search outwards, 4-1=3, 5+1=6.
            expect([3, 6]).toContain(targetIndex);
        });

        it('should throw error if Fixed Position is already taken', () => {
            const slotManager = new SlotManager();
            const conflictMandatory = [
                { uri: 'spotify:track:A', positionRange: { min: 1, max: 1 } },
                { uri: 'spotify:track:B', positionRange: { min: 1, max: 1 } }
            ];

            expect(() => {
                slotManager.arrangePlaylist(conflictMandatory, [], [], 10);
            }).toThrow(/Collision detected/);
        });

        it('should prioritize AI tracks in top 30 (Stratified Placement)', () => {
            const slotManager = new SlotManager();
            const mandatory: any[] = [];
            const survivors: string[] = [];
            // Create 50 AI tracks
            const aiTracks = Array.from({ length: 50 }, (_, i) => `ai-${i}`);

            const result = slotManager.arrangePlaylist(mandatory, survivors, aiTracks, 100);

            // Indices 0-29 should be filled with ai-0 to ai-29 (since they are shifted in order)
            // Check a sample in top 30
            expect(result[0]).toBe('ai-0');
            expect(result[29]).toBe('ai-29');
            // Index 30 might be anything after shuffle, but let's check count
            expect(result.length).toBe(50);

            // Ensure standard fill still works for overflow
            expect(result).toContain('ai-49');
        });
    });
});
