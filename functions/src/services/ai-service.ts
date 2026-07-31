import { GoogleGenAI, Type } from '@google/genai';
import { AiGenerationConfig } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';
import { z } from 'zod';

import { config } from '../admin/env.js';

export interface AiSuggestion {
  artist: string;
  reasoning: string;
  track: string;
}

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
  private ai: GoogleGenAI;

  constructor() {
    if (!config.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is not set in environment variables.');
    }
    this.ai = new GoogleGenAI({ apiKey: config.GOOGLE_AI_API_KEY });
  }

  /**
   * Generates track suggestions using Google's Gemini AI.
   * Uses Native Structured Output and System Instruction prompting.
   * @param aiConfig - The AI generation settings (model, temperature, etc.)
   * @param prompt - The base prompt describing the playlist
   * @param count - Number of tracks to request
   * @param excludedTracks - List of "Artist - Track" strings to exclude
   * @param referenceArtists - Optional list of artists to inspire the selection
   * @returns Array of structured AiSuggestion objects
   */
  public async generateSuggestions(
    aiConfig: AiGenerationConfig,
    prompt: string,
    count: number,
    excludedTracks: string[] = [], // Semantic "Artist - Track" strings
    referenceArtists: string[] = []
  ): Promise<AiSuggestion[]> {
    const selectedModel = this.resolveModel(aiConfig.model);

    logger.info(`Sending request to Gemini AI via @google/genai...`, {
      count,
      model: selectedModel
    });

    const requestStart = Date.now();

    let fullPrompt = `Task: Generate exactly ${count} tracks for a Spotify playlist.

User Prompt & Vibe Description:
"${prompt}"`;

    // Inject Reference Artists ("Style Anchors")
    if (referenceArtists.length > 0) {
      fullPrompt += `\n\nStyle Anchors (Vibe & Genre References):
The following artists define the sonic profile and quality bar for this playlist:
${referenceArtists.map((artist) => `- ${artist}`).join('\n')}`;
    }

    if (aiConfig.isInstrumentalOnly) {
      fullPrompt += `\n\nHIGH PRIORITY: This playlist is 100% INSTRUMENTAL. Zero vocals allowed.`;
    }

    if (excludedTracks.length > 0) {
      fullPrompt += `\n\nSpecific Exclusions (Do NOT suggest these - already in playlist):
${JSON.stringify(excludedTracks)}`;
    }

    fullPrompt += `\n\nReasoning Requirement:
For each suggestion, state WHY this track fits the vibe and genre, and confirm its instrumental/vocal status.`;

    try {
      const response = await this.ai.models.generateContent({
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            items: {
              properties: {
                artist: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                track: { type: Type.STRING }
              },
              required: ['artist', 'track', 'reasoning'],
              type: Type.OBJECT
            },
            type: Type.ARRAY
          },
          systemInstruction: this.buildSystemInstruction(aiConfig.isInstrumentalOnly),
          temperature: aiConfig.temperature
        },
        contents: fullPrompt,
        model: selectedModel
      });

      const text = response.text || '';

      logger.info('AI Response received', {
        durationMs: Date.now() - requestStart
      });

      // Native structured output should return valid JSON directly
      let suggestions: AiSuggestion[];
      try {
        const parsed = JSON.parse(text);
        suggestions = AiResponseSchema.parse(parsed);
      } catch (parseError) {
        logger.error('Failed to parse or validate AI response', {
          error: parseError,
          rawText: text
        });
        throw new Error('AI response was not valid JSON matching the schema.', {
          cause: parseError
        });
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
    generationConfig: AiGenerationConfig,
    playlistName: string,
    description: string | undefined,
    count: number,
    excludedArtists: string[] = []
  ): Promise<string[]> {
    const selectedModel = this.resolveModel(generationConfig.model);

    logger.info(`Sending artist suggestion request to Gemini AI...`, {
      count,
      model: selectedModel
    });

    let prompt = `Suggest exactly ${count} famous or representative artists for a Spotify playlist.
Playlist Name: "${playlistName}"`;
    if (description) {
      prompt += `\nPlaylist Description: ${description}`;
    }
    prompt += `\n\nIdentify artists that perfectly capture the sonic profile and "vibe" of this playlist.
Suggest ONLY real, well-known artists that are on Spotify.`;

    if (excludedArtists.length > 0) {
      prompt += `\n\nSpecific Exclusions (Do NOT suggest these - already added):
      ${JSON.stringify(excludedArtists)}`;
    }

    try {
      const response = await this.ai.models.generateContent({
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            items: {
              properties: {
                name: { type: Type.STRING }
              },
              required: ['name'],
              type: Type.OBJECT
            },
            type: Type.ARRAY
          },
          systemInstruction:
            'You are an expert music curator. Suggest only authentic, real artists on Spotify matching the exact playlist genre.',
          temperature: generationConfig.temperature
        },
        contents: prompt,
        model: selectedModel
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);
      const data = ArtistResponseSchema.parse(parsed);

      return data.map((a) => a.name).slice(0, count);
    } catch (error) {
      logger.error('Error suggesting artists:', error);
      throw error;
    }
  }

  /**
   * Builds system instructions ensuring persona separation, genre adherence,
   * instrumental enforcement, and negative constraints.
   */
  private buildSystemInstruction(isInstrumentalOnly?: boolean): string {
    let instruction = `You are an elite, world-class music curator with authoritative knowledge of Spotify's catalog, genres, subgenres, and musical attributes.

CORE DUTIES & MANDATES:
1. STRICT GENRE FIDELITY:
   - Every single track MUST match the exact target genre, subgenre, mood, and vibe of the requested playlist.
   - REJECT any track from incompatible genres (e.g. NEVER suggest rap, hip-hop, or pop songs for a progressive metal or rock playlist; NEVER suggest heavy metal for a lo-fi study playlist).
   - Perform a MANDATORY GENRE SELF-CHECK for each track candidate before selecting it: Ask "Does this artist/track authentically belong to the target genre?" If not, DO NOT INCLUDE IT.

2. VOCAL VS. INSTRUMENTAL ENFORCEMENT:`;

    if (isInstrumentalOnly) {
      instruction += `
   - ABSOLUTE REQUIREMENT - 100% INSTRUMENTAL ONLY:
   - This playlist MUST contain ONLY instrumental music.
   - Strictly FORBIDDEN: Any singing, vocal melodies, rap verses, spoken word, or clear vocal samples.
   - Verify every suggestion is an instrumental piece (e.g., instrumental beats, solos, orchestral, synthwave, ambient, or prog-metal instrumentals).`;
    } else {
      instruction += `
   - Match vocal styles to the target genre norms (e.g., clean/growled vocals for metal, melodic singing for pop/indie).`;
    }

    instruction += `

3. QUALITY & NEGATIVE CONSTRAINTS (STRICT):
   - Do NOT suggest live versions, remixes, radio edits, remaster labels, acoustic versions, commentary, or intro/outro tracks unless explicitly requested.
   - Reject any track titles containing: ${BANNED_TERMS.join(', ')}.
   - Do NOT suggest songs under 1 minute long.
   - Ensure artist names and track titles match official Spotify catalog metadata.

4. REASONING REQUIREMENT:
   - In the 'reasoning' field, explicitly specify: (1) the genre/subgenre classification, and (2) confirmation of vocal/instrumental status proving it meets the playlist criteria.`;

    return instruction;
  }

  private resolveModel(modelName?: string): string {
    if (!modelName || modelName === 'gemini-2.5-flash') {
      return 'gemini-3.6-flash';
    }
    return modelName;
  }
}
