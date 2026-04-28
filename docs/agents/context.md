# Agent Context & Patterns

This document provides AI coding assistants (like Antigravity) with critical context and common implementation patterns used in the Smart Spotify Playlist Curator.

## 🧠 Core Patterns

### 1. The Orchestrator Pattern

Business logic flows (especially long-running ones like playlist curation) must reside in an **Orchestrator** class, not directly in the HTTP handler.

- **Location**: `functions/src/core/orchestrator.ts`
- **Pattern**: `Handler -> UseCase -> Orchestrator -> Services`

### 2. Service Factory

Always use the `ServiceFactory` to instantiate backend services. This ensures that dependencies (like `FirestoreLogger` or `AiService`) are injected correctly and consistently.

- **Location**: `functions/src/admin/factory.ts`

### 3. Spotify Service Lifecycle

Spotify services are instantiated **per-user** using their refresh token.

- **Factory Helper**: `getAuthorizedSpotifyService(uid)` in `functions/src/core/auth-service.ts`.
- **Constraint**: Never call Spotify APIs directly from the frontend; use the backend proxy.

### 4. Structured Progress Tracking

Long-running tasks must update a Firestore "Activity Log" to provide real-time feedback to the UI.

- **Backend**: Use `firestoreLogger.logActivity`.
- **Frontend**: Use the `usePlaylistRealtime` hook to subscribe to the latest log.

## ⚠️ Known Gotchas

- **Spotify Dev Mode**: We cannot use "Audio Features" (valence, energy, etc.). AI must infer these from its internal knowledge of the tracks.
- **CJS/ESM Bundle**: The project uses a custom Esbuild script to bundle ESM source code into a CJS file for Firebase deployment. Check `scripts/src/admin/build.ts` if build issues occur.
- **Zod Boundaries**: Every API boundary (onCall handler) and Firestore read should be validated with the corresponding Zod schema from the `shared` workspace.

## 🛠 Useful Terminal Commands

- `npm run deploy-firebase`: Full bundle and deploy.
- `npm test`: Run all workspace tests.
- `npm run lint:fix`: Automated formatting and linting.
