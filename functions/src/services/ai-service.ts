import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { AiGenerationConfig } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';
import { z } from 'zod';

export interface AiSuggestion {
  artist: string;
  track: string;
}

// Global Quality Constraints to reduce hallucinations and bad suggestions
const QUALITY_CONSTRAINTS = [
  'Do NOT suggest live versions, remixes, or acoustic versions unless explicitly asked.',
  'Do NOT suggest intro/outro tracks, commentary, or spoken word tracks.',
  'Do NOT suggest songs that are under 1 minute long.',
  'Ensure the track and artist names match Spotify metadata exactly.'
];

// Validation Schema for AI Response
const AiResponseSchema = z.array(
  z.object({
    artist: z.string().min(1),
    track: z.string().min(1)
  })
);

export class AiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!config.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is not set in environment variables.');
    }
    this.genAI = new GoogleGenerativeAI(config.GOOGLE_AI_API_KEY);
  }

  /**
   * Generates track suggestions using Google's Gemini AI.
   * Uses JSON mode to ensure structured output.
   * @param config - The AI generation settings (model, temperature, etc.)
   * @param prompt - The base prompt describing the playlist
   * @param count - Number of tracks to request
   * @param excludedTracks - List of "Artist - Track" strings to exclude
   * @param referenceArtists - Optional list of artists to inspire the selection
   * @returns Array of structured AiSuggestion objects
   */
  public async generateSuggestions(
    config: AiGenerationConfig,
    prompt: string,
    count: number,
    excludedTracks: string[] = [], // Semantic "Artist - Track" strings
    referenceArtists?: string[]
  ): Promise<AiSuggestion[]> {
    logger.info(`Sending request to Gemini AI...`, { count, model: config.model });

    const requestStart = Date.now();

    // Create model instance with config-specified model
    const model = this.genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: config.temperature
      }
    });

    let fullPrompt = prompt;

    // Dynamic Prompt Assembly
    fullPrompt += `\nPlease generate exactly ${count} tracks.`;

    if (referenceArtists && referenceArtists.length > 0) {
      fullPrompt += `\nFor this generation, please bias your selection towards style/vibe of these artists: ${referenceArtists.join(', ')}.`;
    }

    // Apply Global Quality Constraints
    fullPrompt += `\n\nGlobal Constraints (STRICT):`;
    QUALITY_CONSTRAINTS.forEach((constraint) => {
      fullPrompt += `\n- ${constraint}`;
    });

    if (excludedTracks.length > 0) {
      // Only send a subset to avoid token limits, e.g. last 50
      fullPrompt += `\n\nSpecific Exclusions (Do NOT suggest these): ${JSON.stringify(excludedTracks.slice(0, 50))}`;
    }

    fullPrompt += `\n\nOutput Format: Return ONLY a valid JSON array of objects with 'artist' and 'track' fields.`;

    try {
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      logger.info('AI Response received', {
        durationMs: Date.now() - requestStart,
        candidateCount: response.candidates?.length
      });

      // Since we enforced JSON mimeType, we should be able to parse directly
      // But good to be safe with basic cleanup if model adds markdown blocks
      const cleanText = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      let suggestions: AiSuggestion[];
      try {
        const parsed = JSON.parse(cleanText);
        // Strict Schema Validation
        suggestions = AiResponseSchema.parse(parsed);
      } catch (parseError) {
        logger.error('Failed to parse or validate AI response', {
          rawText: text,
          cleanText,
          error: parseError
        });
        throw new Error('AI response was not valid JSON matching the schema.');
      }

      logger.info('AI suggestions parsed & validated successfully', {
        count: suggestions.length
      });

      return suggestions.slice(0, count);
    } catch (error) {
      logger.error('Error generating AI suggestions:', error);
      // Fallback or rethrow? For now rethrow.
      throw error;
    }
  }
}
