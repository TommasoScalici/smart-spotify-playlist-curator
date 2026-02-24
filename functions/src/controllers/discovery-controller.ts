import * as logger from 'firebase-functions/logger';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { AiService } from '../services/ai-service.js';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from '../services/auth-service.js';

const AiConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().optional()
});

const SuggestReferenceArtistsSchema = z.object({
  aiConfig: AiConfigSchema.optional(),
  count: z.number().optional(),
  description: z.string().optional(),
  excludedArtists: z.array(z.string()).optional(),
  playlistName: z.string().min(1)
});

type SuggestReferenceArtistsRequest = z.infer<typeof SuggestReferenceArtistsSchema>;

export async function suggestReferenceArtistsHandler(
  request: CallableRequest<SuggestReferenceArtistsRequest>
) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const parseResult = SuggestReferenceArtistsSchema.safeParse(request.data);
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Playlist name is required.');
  }

  const { aiConfig, count, description, excludedArtists, playlistName } = parseResult.data;
  const uid = request.auth.uid;

  try {
    const aiService = new AiService();

    const finalAiConfig = {
      enabled: true,
      model: aiConfig?.model || 'gemini-2.5-flash',
      temperature: aiConfig?.temperature || 0.7,
      tracksToAdd: 0
    };

    const artistNames = await aiService.suggestArtists(
      finalAiConfig,
      playlistName,
      description,
      count || 5,
      excludedArtists || []
    );

    logger.info('AI suggested artists', { artistNames });

    const { originalRefreshToken, service: spotifyService } =
      await getAuthorizedSpotifyService(uid);

    const searchResults = await Promise.all(
      artistNames.map(async (name) => {
        try {
          const results = await spotifyService.search(name, ['artist'], 1);
          return results.length > 0 ? results[0] : null;
        } catch (err) {
          logger.warn(`Search failed for suggested artist: ${name}`, err);
          return null;
        }
      })
    );

    await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);

    // Deduplicate by URI to prevent duplicate objects inside the response
    const validArtists = searchResults.filter((r): r is NonNullable<typeof r> => r !== null);
    const uniqueArtistsMap = new Map();
    for (const artist of validArtists) {
      if (!uniqueArtistsMap.has(artist.uri)) {
        uniqueArtistsMap.set(artist.uri, artist);
      }
    }

    return {
      artists: Array.from(uniqueArtistsMap.values())
    };
  } catch (error) {
    logger.error('suggestReferenceArtists failed', error);
    throw new HttpsError('internal', (error as Error).message);
  }
}
