# AGENTS.md - AI Knowledge Base

> [!IMPORTANT]
> This file is a knowledge base for AI Agents working on this project. Read this before modifying code to understand the architecture, patterns, and constraints.

## 🧠 Project Context

**Project Name**: Smart Spotify Playlist Curator
**Goal**: Automate Spotify playlist curation using Gemini 2.5 Flash for intelligent recommendations and audio analysis for sonic consistency.
**Core Philosophy**: "Human-like curation, Machine-like efficiency."

## 🛠 Tech Stack

- **Runtime**: Node.js `v24` (Bleeding edge)
- **Framework**: Firebase Cloud Functions (Gen 2 compatible context)
- **Language**: TypeScript `v5.9`
- **Frontend**: React `v19` + Vite (Command Center Web App)
  - **Optimization**: Manual chunk splitting (`react-vendor`, `firebase-vendor`) to ensure fast loads.
- **AI Model**: Google Gemini 2.5 Flash (`@google/generative-ai`)
- **Spotify Integration**: `spotify-web-api-node` + Custom Retry/Auth Wrapper
- **Database**: Firestore (Configuration & State)
- **Validation**: `zod` (Strict Schema Validation for Runtime & Types)
- **Testing**:
  - **Backend**: `jest`, `ts-jest`
  - **Frontend**: `vitest`, `@testing-library/react`

## 📂 Architecture

### Directory Structure

- `/functions`: Backend logic (Root of the actual app)
  - `src/core`: Business logic
    - `orchestrator.ts`: Main entry point for playlist processing logic. Handles the flow: Config -> Clean -> Fill -> Sort -> Update.
    - `track-cleaner.ts`: Logic for removing tracks (age, popularity, duplicates).
    - `slot-manager.ts`: Logic for merging AI tracks with Mandatory VIP tracks into the final list.
  - `src/services`: External integrations
    - `spotify-service.ts`: Singleton wrapper for Spotify API. Handles rate limits (`429`), auth refresh (`401`), and batching. implements **Hybrid Smart Update**.
    - `ai-service.ts`: Wrapper for Gemini API. Handles prompt construction and JSON parsing/repair.
  - `src/types`: TypeScript definitions.
- `/scripts`: Local tools
  - `dry-run-check.ts`: End-to-end verification without side effects.
  - `auth/`: Token generation scripts.
- `/web-app`: **Command Center UI**
  - React + Vite application for managing playlist configurations via Firestore.
  - Uses Firebase Auth for security.

### Key Design Patterns

1.  **Singleton Services**: `SpotifyService` is a singleton to manage token state and global rate limits.
2.  **Orchestrator Pattern**: `PlaylistOrchestrator` decouples high-level flow from specific service implementations.
3.  **Dry-Run First**: All destructive operations (`removeTracks`, `addTracks`, `performSmartUpdate`) accept a `dryRun` boolean.
4.  **Backend Proxy for Search**: The frontend **NEVER** calls Spotify API directly. It uses the `searchSpotify` Cloud Function to proxy requests, ensuring Secrets (`SPOTIFY_CLIENT_SECRET`) stay server-side.
5.  **Smart Update (Hybrid Strategy)**:
    - **Concept**: Minimizes API calls and preserves timestamps for "VIP" tracks.
6.  **Data Denormalization (Performance)**:
    - **Concept**: Mandatory Tracks in Firestore store `name`, `artist`, and `imageUrl` alongside `uri`.
    - **Why**: Prevents N+1 API calls on frontend load.
    - **Rule**: When updating a URI, simple metadata MUST be updated or cleared to keep cache valid.

## 📏 Code Style & Workflow

- **Formatting**: Root `.prettierrc` enforces standard style.
- **Pre-commit Hooks**: `husky` + `lint-staged` guarantees that:
  - All staged files are formatted (Prettier).
  - Frontend/Backend typescript is linted (ESLint).
- **Linter**: ESLint (Flat Config).
- **Typing**: No `any`. Strict `zod` schemas for boundaries.

## 🤖 AI Development Guidelines

1.  **Strict Types**: Always define return types. Use `Zod` schemas for any data entering the system (Firestore, API, Forms).
2.  **Error Handling**:
    - Spotify API calls **MUST** go through `SpotifyService.executeWithRetry`.
    - AI responses **MUST** be wrapped in try/catch with JSON parsing fallback/validation.
3.  **Logging**: Use `firebase-functions/logger`. Structured logging is preferred.
    - `logger.info("Message", { key: value })`
4.  **Testing**:
    - Write Unit Tests in `tests/unit` for logic (Cleaners, SlotManagers).
    - Write Integration Tests in `tests/integration` for Services (mock network calls).
    - Run `npm test` before submitting changes.
