import { loadAppConfig } from '../../src/config/config';
import * as fs from 'fs';


// Mock fs to avoid writing to disk
jest.mock('fs');

describe('Config Loader', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load a valid configuration correctly', () => {
        const validConfig = [{
            id: "spotify:playlist:49NveLmBkE159Zt6g0Novv",
            name: "Heavy Riffs | Hard Rock, Metal & Alternative",
            enabled: true,
            settings: { targetTotalTracks: 50, referenceArtists: ["Artist A"] },
            aiGeneration: { prompt: "Test", refillBatchSize: 5 },
            curationRules: { maxTrackAgeDays: 90, removeDuplicates: true },
            mandatoryTracks: []
        }];

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(validConfig));

        const result = loadAppConfig();

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Heavy Riffs | Hard Rock, Metal & Alternative');
    });

    it('should throw error if config file is missing', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        expect(() => loadAppConfig()).toThrow('Configuration file not found');
    });

    it('should throw error for invalid schema (missing required field)', () => {
        const invalidConfig = [{
            // Missing 'id'
            name: "Heavy Riffs | Hard Rock, Metal & Alternative",
            enabled: true,
            settings: { targetTotalTracks: 50 },
            aiGeneration: { prompt: "Test" },
            curationRules: { maxTrackAgeDays: 90, removeDuplicates: true },
            mandatoryTracks: []
        }];

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

        expect(() => loadAppConfig()).toThrow('Configuration validation failed');
    });
});

