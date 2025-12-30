import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/env";
import { AiGenerationConfig } from "../types";

interface AiTrackSuggestion {
    artist: string;
    track: string;
}

export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        if (!config.GOOGLE_AI_API_KEY) {
            throw new Error("GOOGLE_AI_API_KEY is not set in environment variables.");
        }
        this.genAI = new GoogleGenerativeAI(config.GOOGLE_AI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });
    }

    /**
     * Generates track suggestions based on the playlist vibe and constraints.
     * @param promptConfig Configuration for the AI prompt (vibe description)
     * @param limit Number of suggestions to request
     * @param vipArtists List of VIP artists to influence style (optional)
     * @param excludedTracks List of "Artist - Title" strings to exclude (optional)
     * @returns Array of suggested tracks
     */
    public async generateSuggestions(
        promptConfig: AiGenerationConfig,
        limit: number,
        vipArtists: string[] = [],
        excludedTracks: string[] = []
    ): Promise<AiTrackSuggestion[]> {
        try {
            // 1. Construct Prompt
            const prompt = this.constructPrompt(promptConfig, limit, vipArtists, excludedTracks);

            // 2. Call Gemini
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // 3. Parse & Validate
            const suggestions = JSON.parse(text) as AiTrackSuggestion[];

            if (!Array.isArray(suggestions)) {
                console.error("AI returned non-array response:", text);
                return [];
            }

            console.log(`AI suggested ${suggestions.length} tracks (requested ${limit}).`);
            return suggestions;

        } catch (error) {
            console.error("Error generating AI suggestions:", error);
            return []; // Fail gracefully
        }
    }

    private constructPrompt(
        config: AiGenerationConfig,
        limit: number,
        vipArtists: string[],
        excludedTracks: string[]
    ): string {
        // Truncate exclude list if too long to save tokens (last 50)
        const safeExcluded = excludedTracks.slice(-50);

        return `
            You are an expert music curator.
            Your task is to suggest ${limit} songs that strictly match the following vibe:
            "${config.prompt}"

            ${vipArtists.length > 0 ? `The vibe is similar to these artists: ${vipArtists.join(", ")}.` : ""}
            
            ${config.isInstrumentalOnly ? "Strictly INSTRUMENTAL tracks only. No vocals." : ""}

            Constraints:
            - Return a strict JSON array of objects with keys: "artist" and "track".
            - Do NOT include markdown formatting (like \`\`\`json).
            - Do NOT suggest these specific tracks (duplicates):
              ${safeExcluded.join(", ")}
            
            Example Output:
            [{"artist": "Pink Floyd", "track": "Time"}, {"artist": "Rush", "track": "YYZ"}]
        `;
    }
}
