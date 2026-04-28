# Playlist Curation Feature

The Curation engine is the core differentiator of this project. It uses a multi-stage process to transform a user's prompt and current playlist state into a perfectly curated list.

## 🛠 The Curation Pipeline

### 1. Analysis & Cleaning (`TrackCleaner`)

Before adding anything new, the engine audits the existing playlist:

- **Duplicate Removal**: Normalizes URIs and removes duplicates.
- **Age Filtering**: Removes tracks older than the configured `maxTrackAgeDays` (unless they are VIPs).
- **Vibe Check**: Evaluates if existing tracks still fit the overarching prompt (using AI inference).

### 2. AI Generation (`AiSuggestionEngine`)

If the playlist is below the `targetTotalTracks` count, the AI generates suggestions:

- **Context Injection**: The AI is given the playlist name, description, and "Reference Artists" (Style Anchors).
- **Quality Control**: Strict prompts prevent the AI from suggesting remixes, live versions, or acoustic tracks (unless explicitly requested).
- **Reasoning**: The AI must explain _why_ each track was suggested.

### 3. Arrangement & Slot Management (`SlotManager`)

The final list is assembled using a priority-based slot system:

1.  **VIPs (Mandatory)**: These are placed first or in their fixed positions.
2.  **Surviving Tracks**: Current tracks that passed the cleaning stage.
3.  **AI Suggestions**: New tracks added to reach the target count.
4.  **Shuffle**: If enabled, the final list is shuffled while respecting VIP constraints.

### 4. Smart Update (`SpotifyPlaylistManager`)

The engine doesn't just clear and refill the playlist (which would break "Date Added" metadata and follower notifications). It calculates the minimum number of additions and removals to reach the target state.

## 📊 Curation Rules

Users can fine-tune the engine via:

- `maxTracksPerArtist`: Prevents a single artist from dominating the playlist.
- `sizeLimitStrategy`: Decides which tracks to drop if the playlist exceeds the target count (e.g., `drop_oldest`, `drop_random`).
- `shuffleAtEnd`: Toggle for maintaining a specific order vs. a fresh vibe each run.
