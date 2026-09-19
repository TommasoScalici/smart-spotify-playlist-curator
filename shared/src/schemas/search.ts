import { z } from 'zod';

export const SearchTypeSchema = z.enum(['track', 'playlist', 'artist']);
export type SearchType = z.infer<typeof SearchTypeSchema>;

export const SearchResultSchema = z.object({
  artist: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  name: z.string(),
  owner: z.string().optional(),
  ownerId: z.string().optional(),
  popularity: z.number().optional(),
  type: SearchTypeSchema,
  uri: z.string()
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchSpotifyRequestSchema = z.object({
  limit: z.number().optional().default(10),
  query: z.string().min(1),
  type: z.preprocess((val) => (Array.isArray(val) ? val : [val]), z.array(SearchTypeSchema))
});

export type SearchSpotifyRequest = z.infer<typeof SearchSpotifyRequestSchema>;

export const SearchSpotifyResponseSchema = z.object({
  results: z.array(SearchResultSchema)
});

export type SearchSpotifyResponse = z.infer<typeof SearchSpotifyResponseSchema>;

export const SuggestReferenceArtistsRequestSchema = z.object({
  aiConfig: z
    .object({
      model: z.string().optional(),
      temperature: z.number().optional()
    })
    .optional(),
  count: z.number().optional().default(5),
  description: z.string().optional(),
  excludedArtists: z.array(z.string()).optional(),
  playlistName: z.string().min(1)
});

export type SuggestReferenceArtistsRequest = z.infer<typeof SuggestReferenceArtistsRequestSchema>;

export const SuggestReferenceArtistsResponseSchema = z.object({
  artists: z.array(SearchResultSchema)
});

export type SuggestReferenceArtistsResponse = z.infer<typeof SuggestReferenceArtistsResponseSchema>;
