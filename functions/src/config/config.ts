import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { AppConfig } from "../types";

// Zod schema for PositionRange
const PositionRangeSchema = z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
});

// Zod schema for MandatoryTrack
const MandatoryTrackSchema = z.object({
    uri: z.string().regex(/^spotify:track:[a-zA-Z0-9]{22}$/, "Invalid Spotify Track URI"),
    positionRange: PositionRangeSchema,
    note: z.string().optional(),
});

// Zod schema for AiGenerationConfig
const AiGenerationConfigSchema = z.object({
    prompt: z.string().min(1, "Prompt cannot be empty"),
    refillBatchSize: z.number().int().positive().optional(),
    isInstrumentalOnly: z.boolean().optional(),
});

// Zod schema for CurationRules
const CurationRulesSchema = z.object({
    maxTrackAgeDays: z.number().int().nonnegative(),
    removeDuplicates: z.boolean(),
});

// Zod schema for PlaylistConfig
const PlaylistConfigSchema = z.object({
    id: z.string().regex(/^spotify:playlist:[a-zA-Z0-9]{22}$/, "Invalid Spotify Playlist URI"),
    name: z.string().min(1),
    enabled: z.boolean(),
    settings: z.object({
        targetTotalTracks: z.number().int().positive(),
        description: z.string().optional(),
        allowExplicit: z.boolean().optional(),
    }),
    aiGeneration: AiGenerationConfigSchema,
    curationRules: CurationRulesSchema,
    mandatoryTracks: z.array(MandatoryTrackSchema),
});

// Root AppConfig Schema (Array of Playlists)
const AppConfigSchema = z.array(PlaylistConfigSchema);

/**
 * Loads the playlist configuration from the JSON file.
 * Validates the content against the Zod schema.
 * @throws Error if validation fails or file is missing.
 */
export function loadAppConfig(): AppConfig {
    const configPath = path.join(__dirname, "playlists-config.json");

    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found at: ${configPath}`);
    }

    const fileContent = fs.readFileSync(configPath, "utf-8");
    let rawConfig;

    try {
        rawConfig = JSON.parse(fileContent);
    } catch (error) {
        throw new Error(`Failed to parse configuration JSON: ${(error as Error).message}`);
    }

    // Validate against Zod schema
    const parseResult = AppConfigSchema.safeParse(rawConfig);

    if (!parseResult.success) {
        const errorMessages = parseResult.error.issues
            .map((e) => `[${e.path.join(".")}] ${e.message}`)
            .join("\n");
        throw new Error(`Configuration validation failed:\n${errorMessages}`);
    }

    return parseResult.data;
}
