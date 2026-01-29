import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiGenerationConfig } from '@smart-spotify-curator/shared';

import { AiService } from '../../src/services/ai-service';

// Mock dependencies
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function () {
    return {
      getGenerativeModel: mockGetGenerativeModel
    };
  })
}));

vi.mock('firebase-functions/logger');

// Mock config to avoid missing env var error during test instantiation
vi.mock('../../src/config/env', () => ({
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
    vi.clearAllMocks();
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockClear();
    // Re-setup default behavior if needed, or rely on individual tests
    aiService = new AiService();
  });

  const mockPromptConfig: AiGenerationConfig = {
    enabled: true,
    tracksToAdd: 5,
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    isInstrumentalOnly: false
  };

  const mockPrompt = 'Upbeat Pop';

  it('should generate suggestions successfully', async () => {
    // Mock Successful response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify([
            { artist: 'Artist A', track: 'Track A' },
            { artist: 'Artist B', track: 'Track B' }
          ])
      }
    });

    const result = await aiService.generateSuggestions(mockPromptConfig, mockPrompt, 2);

    expect(result).toHaveLength(2);
    expect(result[0].artist).toBe('Artist A');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should handle invalid JSON response by throwing error', async () => {
    // Mock Invalid JSON
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Invalid JSON String' // Not JSON
      }
    });

    // Should throw error now (Robustness)
    await expect(aiService.generateSuggestions(mockPromptConfig, mockPrompt, 2)).rejects.toThrow();
  });

  it('should include negative constraints in prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => '[]' }
    });

    const excluded = ['Excluded - Track'];
    await aiService.generateSuggestions(mockPromptConfig, mockPrompt, 5, excluded);

    // Verify prompt construction logic indirectly via mock call arg
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain('Specific Exclusions (Do NOT suggest these):');
    expect(callArg).toContain('Global Constraints (STRICT):');
  });

  it('should include reference artists in prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => '[]' }
    });

    const referenceArtists = ['Artist 1', 'Artist 2'];
    await aiService.generateSuggestions(mockPromptConfig, mockPrompt, 5, [], referenceArtists);

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain('please bias your selection towards style/vibe of these artists');
    expect(callArg).toContain('Artist 1, Artist 2');
  });
});
