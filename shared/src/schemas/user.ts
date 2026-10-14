import { z } from 'zod';

export const SpotifyProfileSchema = z.object({
  authError: z.string().optional(),
  avatarUrl: z.string().url().nullable(),
  displayName: z.string().nullable(),
  email: z.string().email(),
  id: z.string(),
  linkedAt: z.coerce.date(),
  product: z.string(),
  status: z.enum(['active', 'invalid']).default('active')
});

export type SpotifyProfile = z.infer<typeof SpotifyProfileSchema>;

export const UserSchema = z.object({
  createdAt: z.coerce.date(),
  displayName: z.string().optional(),
  email: z.string().email(),
  lastLoginAt: z.coerce.date(),
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

export const ExchangeSpotifyTokenRequestSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  redirectUri: z.string().url('Valid redirect URI is required')
});

export type ExchangeSpotifyTokenRequest = z.infer<typeof ExchangeSpotifyTokenRequestSchema>;

export const ExchangeSpotifyTokenResponseSchema = z.object({
  profile: SpotifyProfileSchema.optional(),
  success: z.boolean()
});

export type ExchangeSpotifyTokenResponse = z.infer<typeof ExchangeSpotifyTokenResponseSchema>;
