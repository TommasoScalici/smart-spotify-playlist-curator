import { z } from 'zod';

export const SpotifyProfileSchema = z.object({
  authError: z.string().optional(),
  avatarUrl: z.string().url().nullable(),
  displayName: z.string().nullable(),
  email: z.string().email(),
  id: z.string(),
  linkedAt: z.date(),
  product: z.string(),
  status: z.enum(['active', 'invalid']).default('active')
});

export type SpotifyProfile = z.infer<typeof SpotifyProfileSchema>;

export const UserSchema = z.object({
  createdAt: z.date(),
  displayName: z.string().optional(),
  email: z.string().email(),
  lastLoginAt: z.date(),
  photoURL: z.string().url().optional(),
  spotifyProfile: SpotifyProfileSchema.optional().nullable(),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  uid: z.string()
});

export type UserProfile = z.infer<typeof UserSchema>;

export const SpotifyTokensSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional()
});

export type SpotifyTokens = z.infer<typeof SpotifyTokensSchema>;
