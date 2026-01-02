import { AiService } from "../../src/services/ai-service";
import { AiGenerationConfig } from "../../src/types";

// Mock dependencies
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

// Mock config to avoid missing env var error during test instantiation
jest.mock("../../src/config/env", () => ({
  config: {
    GOOGLE_AI_API_KEY: "test-api-key",
    SPOTIFY_CLIENT_ID: "test",
    SPOTIFY_CLIENT_SECRET: "test",
    SPOTIFY_REFRESH_TOKEN: "test",
  },
}));

describe("AiService", () => {
  let aiService: AiService;

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AiService();
  });

  const mockPromptConfig: AiGenerationConfig = {
    prompt: "Upbeat Pop",
    model: "gemini-2.5-flash",
    temperature: 0.7,
    overfetchRatio: 2.0,
    isInstrumentalOnly: false,
  };

  it("should generate suggestions successfully", async () => {
    // Mock Successful response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify([
            { artist: "Artist A", track: "Track A" },
            { artist: "Artist B", track: "Track B" },
          ]),
      },
    });

    const result = await aiService.generateSuggestions(mockPromptConfig, 2);

    expect(result).toHaveLength(2);
    expect(result[0].artist).toBe("Artist A");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("should handle invalid JSON response by throwing error", async () => {
    // Mock Invalid JSON
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "I'm sorry, I can't do that.", // Not JSON
      },
    });

    // Should throw error now (Robustness)
    await expect(
      aiService.generateSuggestions(mockPromptConfig, 2),
    ).rejects.toThrow();
  });

  it("should include negative constraints in prompt", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "[]" },
    });

    const excluded = ["Excluded - Track"];
    await aiService.generateSuggestions(mockPromptConfig, 5, excluded);

    // Verify prompt construction logic indirectly via mock call arg
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain("Constraint: Do NOT suggest these specific songs");
  });

  it("should include reference artists in prompt", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "[]" },
    });

    const referenceArtists = ["Artist 1", "Artist 2"];
    await aiService.generateSuggestions(
      mockPromptConfig,
      5,
      [],
      referenceArtists,
    );

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg).toContain(
      "please bias your selection towards style/vibe of these artists",
    );
    expect(callArg).toContain("Artist 1, Artist 2");
  });
});
