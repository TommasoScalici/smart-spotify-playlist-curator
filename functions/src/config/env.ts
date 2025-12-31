import { z } from "zod";
import * as dotenv from "dotenv";
import * as path from 'path';

// Parse .env file
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z.object({
    SPOTIFY_CLIENT_ID: z.string().min(1, "SPOTIFY_CLIENT_ID is missing"),
    SPOTIFY_CLIENT_SECRET: z.string().min(1, "SPOTIFY_CLIENT_SECRET is missing"),
    SPOTIFY_REFRESH_TOKEN: z.string().min(1, "SPOTIFY_REFRESH_TOKEN is missing"),
    GOOGLE_AI_API_KEY: z.string().min(1, "GOOGLE_AI_API_KEY is missing"),
    SPOTIFY_REDIRECT_URI: z.string().optional(),
    TEST_PLAYLIST_ID: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

let parsedConfig: z.infer<typeof envSchema>;

if (!result.success) {
    if (process.env.NODE_ENV === 'test') {
        console.warn("Missing environment variables in test mode. Using fallback empty config.");
        parsedConfig = {
            SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || "",
            SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || "",
            SPOTIFY_REFRESH_TOKEN: process.env.SPOTIFY_REFRESH_TOKEN || "",
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || "",
            SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
            TEST_PLAYLIST_ID: process.env.TEST_PLAYLIST_ID,
        };
    } else {
        const errorMessages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
        throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
} else {
    parsedConfig = result.data;
}

export const config = parsedConfig;
