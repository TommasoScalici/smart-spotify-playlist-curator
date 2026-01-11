---
trigger: always_on
---

# Smart Spotify Playlist Curator - AI Developer Rules

This file is optimized for AI context. Follow these rules strictly when modifying the codebase.

## 🧠 Core Philosophy

- **Goal**: Automate Spotify playlist curation with "Human-like curation, Machine-like efficiency."
- **Model**: Use Gemini 2.5 Flash for intelligence; local logic for deterministic tasks.
- **Identity**: Linked to a single Google Identity controlling multiple Spotify accounts.

## 🛠 Technology Stack (Strict)

- **Runtime**: Node.js `v24` (Current)
- **FaaS**: Firebase Cloud Functions (Gen 2 context)
- **Language**: TypeScript `v5.9` (Strict Mode)
- **Frontend**: React `v19` + Vite
- **Database**: Firestore (Configuration, State, Cache)
- **Validation**: `zod` (REQUIRED for all data boundaries)
- **Testing**: `jest`/`ts-jest` (Backend), `vitest` (Frontend)
- **Bleeding Edge**: Use ESNext and latest options available in tsconfig, always install packages using @latest

## 🏛 Architecture & Patterns

### Directory Structure

- `/functions/src/core`: Business Logic (Clean, Fill, Sort).
- `/functions/src/services`: External APIs (Spotify, AI).
- `/web-app`: Command Center UI (React).

### Critical Design Patterns

1.  **Singleton Services**: `SpotifyService` MUST be a singleton to manage rate limits (`429`) and auth tokens globally.
2.  **Orchestrator Pattern**: Use `PlaylistOrchestrator` to coordinate steps. Do not put business logic in HTTP handlers; orchestrators handle flow.
3.  **Proxy Requests**: Frontend **NEVER** calls Spotify API directly. Use `searchSpotify` Cloud Function.
4.  **Dry-Run Capability**: All destructive actions (`removeTracks`, `performSmartUpdate`) MUST accept and respect a `dryRun: boolean` flag.
5.  **Hybrid Smart Update**: Minimize API calls. Preserve "VIP" tracks.
6.  **Data Denormalization**: Store `name`, `artist`, `imageUrl` in Firestore validation documents to prevent N+1 reads in the UI.

## 📏 Coding Standards

### Type Safety

- **NO `any`**: Explicitly type everything.
- **Zod Schemas**: Use `zod` to validate ALL runtime inputs (API responses, Firestore docs, User input).

### Error Handling & Logging

- **Spotify API**: Must use `SpotifyService.executeWithRetry` wrapper.
- **AI Responses**: Wrap in `try/catch` and use a JSON repair/validation fallback mechanism.
- **Logging**: Use `firebase-functions/logger`.
  - Preferred: `logger.info("Event", { metadata: value })`
  - Avoid: `console.log`

### Testing Requirements

- **Unit Tests**: Required for logic (Cleaners, Slot Managers) in `tests/unit`.
- **Integration Tests**: Required for Services in `tests/integration` (mock network calls).
- **Run Before Commit**: `npm test` checks are mandatory.

## 🔄 Workflow

- **Linting**: Respect `.prettierrc` and `eslint` flat config. Code MUST pass `npm run lint`.
- **Pre-commit**: `husky` ensures formatting and linting pass before commit.
