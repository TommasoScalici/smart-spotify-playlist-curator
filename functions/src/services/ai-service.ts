import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/env";
import { AiGenerationConfig } from "../types";

interface AiTrackSuggestion {
    artist: string;
    track: string;
}

export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor() {
        if (!config.GOOGLE_AI_API_KEY) {
            throw new Error("GOOGLE_AI_API_KEY is not set in environment variables.");
        }
        this.genAI = new GoogleGenerativeAI(config.GOOGLE_AI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });
    }

    /**
     * Generates track suggestions based on the playlist vibe and constraints.
     * @param limit Number of suggestions to request
     * @param vipArtists List of VIP artists to influence style (optional)
     * @param excludedTracks List of "Artist - Title" strings to exclude (optional)
     * @returns Array of suggested tracks
     */
    public async generateSuggestions(
        config: AiGenerationConfig,
        count: number,
        existingTracks: string[] = [],
        referenceArtists: string[] = [] // Optional reference artists
    ): Promise<Array<{ artist: string; track: string }>> {
        try {
            const { prompt, isInstrumentalOnly } = config;

            let fullPrompt = `You are a Spotify playlist curator.
        Goal: Suggest ${count} tracks matching this vibe: "${prompt}".
        
        Strict Output Format: JSON Array of objects with "artist" and "track" keys. No markdown.
        Example: [{"artist": "Band", "track": "Song"}]
        `;

            if (referenceArtists && referenceArtists.length > 0) {
                fullPrompt += `\n\nReference Artists (Base your suggestions on these or similar): ${referenceArtists.join(", ")}`;
            }

            if (isInstrumentalOnly) {
                fullPrompt += `\nConstraint: STRICTLY INSTRUMENTAL ONLY. No vocals.`;
            }

            if (existingTracks.length > 0) {
                fullPrompt += `\nConstraint: Do NOT suggest these tracks: ${JSON.stringify(existingTracks.slice(0, 50))}`;
            }

            // 2. Call Gemini
            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();

            // 3. Parse & Validate
            const suggestions = JSON.parse(text) as AiTrackSuggestion[];

            if (!Array.isArray(suggestions)) {
                console.error("AI returned non-array response:", text);
                return [];
            }

            console.log(`AI suggested ${suggestions.length} tracks (requested ${count}).`);
            return suggestions;

        } catch (error) {
            console.error("Error generating AI suggestions:", error);
            return []; // Fail gracefully
        }
    }
}


