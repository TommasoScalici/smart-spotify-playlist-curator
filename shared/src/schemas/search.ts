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
