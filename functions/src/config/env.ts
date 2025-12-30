import { z } from "zod";
import * as dotenv from "dotenv";
import * as path from 'path';

// Parse .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const envSchema = z.object({
    SPOTIFY_CLIENT_ID: z.string().min(1, "SPOTIFY_CLIENT_ID is missing"),
    SPOTIFY_CLIENT_SECRET: z.string().min(1, "SPOTIFY_CLIENT_SECRET is missing"),
    SPOTIFY_REFRESH_TOKEN: z.string().min(1, "SPOTIFY_REFRESH_TOKEN is missing"),
    GOOGLE_AI_API_KEY: z.string().min(1, "GOOGLE_AI_API_KEY is missing"),
    SPOTIFY_REDIRECT_URI: z.string().optional(),
    TEST_PLAYLIST_ID: z.string().optional(),
});

export const config = envSchema.parse(process.env);
