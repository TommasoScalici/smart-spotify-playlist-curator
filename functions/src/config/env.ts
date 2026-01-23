import { z } from 'zod';

const envSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1, 'SPOTIFY_CLIENT_ID is missing'),
  SPOTIFY_CLIENT_SECRET: z.string().min(1, 'SPOTIFY_CLIENT_SECRET is missing'),
  SPOTIFY_REFRESH_TOKEN: z.string().min(1, 'SPOTIFY_REFRESH_TOKEN is missing'),
  GOOGLE_AI_API_KEY: z.string().optional(),
  SPOTIFY_REDIRECT_URI: z.string().optional()
});

type Config = z.infer<typeof envSchema>;

let cachedConfig: Config | undefined;

/**
 * Safely retrieves configuration from process.env.
 * This should only be called at runtime (inside functions), not at module level.
 */
export const getConfig = (): Config => {
  if (cachedConfig) return cachedConfig;

  // Validate environment variables
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');

    // In test environment, we might verify validation logic, but we should strictly fail in prod if secrets are missing.
    throw new Error(`Environment validation failed. Missing require secrets:\n${errorMessages}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
};

// Backwards compatibility for now (though we should migrate away from eager access)
// We expose a getter property to prevent eager evaluation on import
export const config = {
  get SPOTIFY_CLIENT_ID() {
    return getConfig().SPOTIFY_CLIENT_ID;
  },
  get SPOTIFY_CLIENT_SECRET() {
    return getConfig().SPOTIFY_CLIENT_SECRET;
  },
  get SPOTIFY_REFRESH_TOKEN() {
    return getConfig().SPOTIFY_REFRESH_TOKEN;
  },
  get GOOGLE_AI_API_KEY() {
    return getConfig().GOOGLE_AI_API_KEY;
  },
  get SPOTIFY_REDIRECT_URI() {
    return getConfig().SPOTIFY_REDIRECT_URI;
  }
};
