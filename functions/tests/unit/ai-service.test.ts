import { AiGenerationConfig } from '@smart-spotify-curator/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiService } from '../../src/services/ai-service';

// Mock dependencies
const mockCreateInteraction = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      interactions: {
        create: mockCreateInteraction
      }
    };
  })
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
    mockCreateInteraction.mockReset();
    aiService = new AiService();
  });

  const mockPromptConfig: AiGenerationConfig = {
    enabled: true,
    isInstrumentalOnly: false,
    model: 'gemini-3.8-flash',
    tracksToAdd: 5
  };

  const mockPrompt = 'Upbeat Pop';

  it('should generate suggestions successfully via Interactions API with store: false and thinking_level: low', async () => {
    // Mock Successful response
    mockCreateInteraction.mockResolvedValue({
      output_text: JSON.stringify([
        { artist: 'Artist A', reasoning: 'Reasoning A', track: 'Track A' },
        { artist: 'Artist B', reasoning: 'Reasoning B', track: 'Track B' }
      ])
    });

    const result = await aiService.generateSuggestions(mockPromptConfig, mockPrompt, 2);

    expect(result).toHaveLength(2);
    expect(result[0].artist).toBe('Artist A');
    expect(mockCreateInteraction).toHaveBeenCalledTimes(1);

    const callArg = mockCreateInteraction.mock.calls[0][0];
    expect(callArg.store).toBe(false);
    expect(callArg.generation_config?.thinking_level).toBe('low');
    expect(callArg.model).toBe('gemini-3.8-flash');
  });

  it('should handle invalid JSON response by throwing error', async () => {
    mockCreateInteraction.mockResolvedValue({
      output_text: 'Invalid JSON String'
    });

    await expect(aiService.generateSuggestions(mockPromptConfig, mockPrompt, 2)).rejects.toThrow();
  });

  it('should include negative constraints and exclusions in input and system instruction', async () => {
    mockCreateInteraction.mockResolvedValue({
      output_text: '[]'
    });

    const excluded = ['Excluded - Track'];
    await aiService.generateSuggestions(mockPromptConfig, mockPrompt, 5, excluded);

    const callArg = mockCreateInteraction.mock.calls[0][0];
    expect(callArg.input).toContain(
      'Specific Exclusions (Do NOT suggest these - already in playlist):'
    );
    expect(callArg.system_instruction).toContain('QUALITY & NEGATIVE CONSTRAINTS (STRICT):');
  });

  it('should route unsupported models to gemini-3.8-flash by default', async () => {
    mockCreateInteraction.mockResolvedValue({
      output_text: JSON.stringify([{ artist: 'Artist', reasoning: 'Reason', track: 'Track' }])
    });

    await aiService.generateSuggestions(
      { ...mockPromptConfig, model: 'unsupported-model' },
      mockPrompt,
      1
    );

    expect(mockCreateInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.8-flash', store: false })
    );
  });

  it('should fall back to gemini-3.5-flash-lite when primary model call fails', async () => {
    mockCreateInteraction
      .mockRejectedValueOnce(new Error('Rate limit exceeded on 3.8'))
      .mockResolvedValueOnce({
        output_text: JSON.stringify([{ artist: 'Artist', reasoning: 'Reason', track: 'Track' }])
      });

    const result = await aiService.generateSuggestions(
      { ...mockPromptConfig, model: 'gemini-3.8-flash' },
      mockPrompt,
      1
    );

    expect(result).toHaveLength(1);
    expect(mockCreateInteraction).toHaveBeenCalledTimes(2);
    expect(mockCreateInteraction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ model: 'gemini-3.8-flash', store: false })
    );
    expect(mockCreateInteraction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        generation_config: expect.objectContaining({ thinking_level: 'minimal' }),
        model: 'gemini-3.5-flash-lite',
        store: false
      })
    );
  });

  it('should suggest artists with thinking_level: minimal and store: false', async () => {
    mockCreateInteraction.mockResolvedValue({
      output_text: JSON.stringify([{ name: 'Artist 1' }, { name: 'Artist 2' }])
    });

    const result = await aiService.suggestArtists(
      mockPromptConfig,
      'Synthwave Dreams',
      'Electronic 80s vibes',
      2
    );

    expect(result).toEqual(['Artist 1', 'Artist 2']);
    const callArg = mockCreateInteraction.mock.calls[0][0];
    expect(callArg.store).toBe(false);
    expect(callArg.generation_config?.thinking_level).toBe('minimal');
  });
});
