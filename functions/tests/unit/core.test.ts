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
    });
});
