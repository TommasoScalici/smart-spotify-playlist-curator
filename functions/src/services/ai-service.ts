import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { AiGenerationConfig } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';
import { z } from 'zod';

import { config } from '../config/env';

export interface AiSuggestion {
  artist: string;
  reasoning: string;
  track: string;
}

// Global Quality Constraints to reduce hallucinations and bad suggestions
const QUALITY_CONSTRAINTS = [
  'Do NOT suggest live versions, remixes, or acoustic versions unless explicitly asked.',
  'Do NOT suggest intro/outro tracks, commentary, or spoken word tracks.',
  'Do NOT suggest songs that are under 1 minute long.',
  'Ensure the track and artist names match Spotify metadata exactly.'
];

// Strict Negative Constraints (The "No-Go" List)
const BANNED_TERMS = [
  'Live',
  'Remix',
  'Radio Edit',
  'Single Version',
  'Remaster',
  'Orchestral Version',
  'Demo',
  'Commentary'
];

const INSTRUMENTAL_KEYWORDS = ['instrumental', 'lofi', 'beats', 'study', 'focus'];

// Validation Schema for AI Response (Zod acts as a runtime safety net)
const AiResponseSchema = z.array(
  z.object({
    artist: z.string().min(1),
    reasoning: z.string().min(1),
    track: z.string().min(1)
  })
);

const ArtistResponseSchema = z.array(
  z.object({
    name: z.string().min(1)
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
   * Uses Native Structured Output and Chain-of-Thought prompting.
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
    referenceArtists: string[] = []
  ): Promise<AiSuggestion[]> {
    logger.info(`Sending request to Gemini AI...`, { count, model: config.model });

    const requestStart = Date.now();

    // Create model instance with config-specified model
    // Using native responseSchema for structured output
    const model = this.genAI.getGenerativeModel({
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          items: {
            properties: {
              artist: { type: SchemaType.STRING },
              reasoning: { type: SchemaType.STRING },
              track: { type: SchemaType.STRING }
            },
            required: ['artist', 'track', 'reasoning'],
            type: SchemaType.OBJECT
          },
          type: SchemaType.ARRAY
        },
        temperature: config.temperature
      },
      model: config.model
    });

    let fullPrompt = `Task: Generate exactly ${count} tracks for a Spotify playlist based on the user's description.

Context: You are an expert music curator with deep knowledge of Spotify's catalog.
CRITICAL CONSTRAINT: We are running in Spotify Development Mode. This means we CANNOT access the Spotify Audio Features API (tempo, energy, valence, instrumentalness).
You MUST rely entirely on your internal knowledge to ensure tracks match the requested vibe, genre, and sonic characteristics.

User Prompt: "${prompt}"`;

    // Inject Reference Artists ("Style Anchors")
    if (referenceArtists.length > 0) {
      fullPrompt += `\n\nStyle Anchors (Vibe References):
The following artists represent the core sound of this playlist. Use them to ground your suggestions:
${referenceArtists.map((artist) => `- ${artist}`).join('\n')}`;
    }

    // Smart Instrumental Logic
    const isInstrumental = INSTRUMENTAL_KEYWORDS.some((keyword) =>
      prompt.toLowerCase().includes(keyword)
    );

    if (isInstrumental) {
      fullPrompt += `\n\nHIGH PRIORITY: This playlist is INSTRUMENTAL.
Do NOT suggest tracks with vocals or lyrics. Focus on beats, melodies, and atmosphere.`;
    }

    // Apply Global Quality Constraints
    fullPrompt += `\n\nGlobal Constraints (STRICT):`;
    QUALITY_CONSTRAINTS.forEach((constraint) => {
      fullPrompt += `\n- ${constraint}`;
    });

    // Apply Banned Terms Logic
    fullPrompt += `\n\nNegative Constraints (The "No-Go" List):
Unless the user explicitly asks for them, strictly REJECT any track title containing:
${BANNED_TERMS.join(', ')}.`;

    if (excludedTracks.length > 0) {
      // Increased slice limit for Gemini 2.5 Flash context window
      const recentExclusions = excludedTracks.slice(0, 200);
      fullPrompt += `\n\nSpecific Exclusions (Do NOT suggest these - already in playlist):
${JSON.stringify(recentExclusions)}`;
    }

    fullPrompt += `\n\nReasoning Requirement:
For each suggestion, you MUST provide a 'reasoning' field explaining WHY this track fits the vibe and why you are confident it matches the criteria (especially regarding instrumental/vocal status and genre fit), since we cannot verify with audio features.`;

    try {
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      logger.info('AI Response received', {
        candidateCount: response.candidates?.length,
        durationMs: Date.now() - requestStart
      });

      // Native structured output should return valid JSON directly, but we still parse safely
      let suggestions: AiSuggestion[];
      try {
        const parsed = JSON.parse(text);
        // Strict Schema Validation
        suggestions = AiResponseSchema.parse(parsed);
      } catch (parseError) {
        logger.error('Failed to parse or validate AI response', {
          error: parseError,
          rawText: text
        });
        throw new Error('AI response was not valid JSON matching the schema.');
      }

      logger.info('AI suggestions parsed & validated successfully', {
        count: suggestions.length
      });

      return suggestions.slice(0, count);
    } catch (error) {
      logger.error('Error generating AI suggestions:', error);
      throw error;
    }
  }

  /**
   * Suggests reference artists based on playlist metadata.
   */
  public async suggestArtists(
    config: AiGenerationConfig,
    playlistName: string,
    description: string | undefined,
    count: number
  ): Promise<string[]> {
    logger.info(`Sending artist suggestion request to Gemini AI...`, {
      count,
      model: config.model
    });

    // Using native responseSchema for artists too
    const model = this.genAI.getGenerativeModel({
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          items: {
            properties: {
              name: { type: SchemaType.STRING }
            },
            required: ['name'],
            type: SchemaType.OBJECT
          },
          type: SchemaType.ARRAY
        },
        temperature: config.temperature
      },
      model: config.model
    });

    let prompt = `Suggest exactly ${count} famous or representative artists for a Spotify playlist.
Playlist Name: "${playlistName}"`;
    if (description) {
      prompt += `\nPlaylist Description: ${description}`;
    }
    prompt += `\n\nIdentify artists that perfectly capture the sonic profile and "vibe" of this playlist.
Suggest ONLY real, well-known artists that are likely to be on Spotify.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const parsed = JSON.parse(text);
      const data = ArtistResponseSchema.parse(parsed);

      return data.map((a) => a.name).slice(0, count);
    } catch (error) {
      logger.error('Error suggesting artists:', error);
      throw error;
    }
  }
}
