import { AiGenerationConfig } from '@smart-spotify-curator/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiService } from '../../src/services/ai-service';

// Mock dependencies
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      models: {
        generateContent: mockGenerateContent
      }
    };
  }),
  Type: {
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT',
    STRING: 'STRING'
  }
}));

vi.mock('firebase-functions/logger');

// Mock config to avoid missing env var error during test instantiation
vi.mock('../../src/admin/env', () => ({
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
    aiService = new AiService();
  });

  const mockPromptConfig: AiGenerationConfig = {
    enabled: true,
    isInstrumentalOnly: false,
    model: 'gemini-3.6-flash',
    temperature: 0.5,
    tracksToAdd: 5
  };

  const mockPrompt = 'Upbeat Pop';

  it('should generate suggestions successfully', async () => {
    // Mock Successful response
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([
        { artist: 'Artist A', reasoning: 'Reasoning A', track: 'Track A' },
        { artist: 'Artist B', reasoning: 'Reasoning B', track: 'Track B' }
      ])
    });

    const result = await aiService.generateSuggestions(mockPromptConfig, mockPrompt, 2);

    expect(result).toHaveLength(2);
    expect(result[0].artist).toBe('Artist A');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should handle invalid JSON response by throwing error', async () => {
    // Mock Invalid JSON
    mockGenerateContent.mockResolvedValue({
      text: 'Invalid JSON String' // Not JSON
    });

    // Should throw error now (Robustness)
    await expect(aiService.generateSuggestions(mockPromptConfig, mockPrompt, 2)).rejects.toThrow();
  });

  it('should include negative constraints in prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '[]'
    });

    const excluded = ['Excluded - Track'];
    await aiService.generateSuggestions(mockPromptConfig, mockPrompt, 5, excluded);

    // Verify prompt construction logic via mock call args
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.contents).toContain(
      'Specific Exclusions (Do NOT suggest these - already in playlist):'
    );
    expect(callArg.config.systemInstruction).toContain('QUALITY & NEGATIVE CONSTRAINTS (STRICT):');
  });
});
