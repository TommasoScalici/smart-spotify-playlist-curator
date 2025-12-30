
import { AiService } from '../../src/services/ai-service';
import { AiGenerationConfig } from '../../src/types';

// Mock dependencies
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
    generateContent: mockGenerateContent
}));

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel
    }))
}));

// Mock config to avoid missing env var error during test instantiation
jest.mock('../../src/config/env', () => ({
    config: {
        GOOGLE_AI_API_KEY: 'test-api-key',
        SPOTIFY_CLIENT_ID: 'test',
        SPOTIFY_CLIENT_SECRET: 'test',
        SPOTIFY_REFRESH_TOKEN: 'test'
    }
}));

describe('AiService', () => {
    let aiService: AiService;

    beforeEach(() => {
        jest.clearAllMocks();
        aiService = new AiService();
    });

    const mockPromptConfig: AiGenerationConfig = {
        prompt: 'Upbeat Pop',
        refillBatchSize: 5,
        isInstrumentalOnly: false
    };

    it('should generate suggestions successfully', async () => {
        // Mock Successful response
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => JSON.stringify([
                    { artist: 'Artist A', track: 'Track A' },
                    { artist: 'Artist B', track: 'Track B' }
                ])
            }
        });

        const result = await aiService.generateSuggestions(mockPromptConfig, 2);

        expect(result).toHaveLength(2);
        expect(result[0].artist).toBe('Artist A');
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid JSON response gracefully', async () => {
        // Mock Invalid JSON
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => "I'm sorry, I can't do that." // Not JSON
            }
        });

        // Should catch error and return empty array
        const result = await aiService.generateSuggestions(mockPromptConfig, 2);
        expect(result).toEqual([]);
    });

    it('should include negative constraints in prompt', async () => {
        mockGenerateContent.mockResolvedValue({
            response: { text: () => "[]" }
        });

        const excluded = ['Excluded - Track'];
        await aiService.generateSuggestions(mockPromptConfig, 5, [], excluded);

        // Verify prompt construction logic indirectly via mock call arg
        const callArg = mockGenerateContent.mock.calls[0][0];
        expect(callArg).toContain('Excluded - Track');
    });
});
