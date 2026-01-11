import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { AiGenerationConfig } from '../types';
import * as logger from 'firebase-functions/logger';

export interface AiSuggestion {
  artist: string;
  track: string;
}

export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    if (!config.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is not set in environment variables.');
    }
    this.genAI = new GoogleGenerativeAI(config.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });
  }

  public async generateSuggestions(
    config: AiGenerationConfig,
    count: number,
    excludedTracks: string[] = [], // Semantic "Artist - Track" strings
    referenceArtists?: string[]
  ): Promise<AiSuggestion[]> {
    logger.info(`Sending request to Gemini 2.5 Flash...`, { count });

    const requestStart = Date.now();

    let prompt = config.prompt;

    // Dynamic Prompt Assembly
    prompt += `\nPlease generate exactly ${count} tracks.`;

    if (referenceArtists && referenceArtists.length > 0) {
      prompt += `\nFor this generation, please bias your selection towards style/vibe of these artists: ${referenceArtists.join(', ')}.`;
    }

    if (excludedTracks.length > 0) {
      // Only send a subset to avoid token limits, e.g. last 50
      prompt += `\nConstraint: Do NOT suggest these specific songs: ${JSON.stringify(excludedTracks.slice(0, 50))}`;
    }

    prompt += `\nReturn ONLY a valid JSON array of objects with 'artist' and 'track' fields.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const duration = Date.now() - requestStart;
      logger.info('AI Response received', {
        durationMs: duration,
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
        suggestions = JSON.parse(cleanText);
      } catch (parseError) {
        logger.error('Failed to parse AI response as JSON', {
          rawText: text,
          cleanText,
          error: parseError
        });
        throw new Error('AI response was not valid JSON.');
      }

      // Basic validation
      if (!Array.isArray(suggestions)) {
        throw new Error('AI did not return an array');
      }

      logger.info('AI suggestions parsed successfully', {
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
