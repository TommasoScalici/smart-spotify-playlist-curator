---
trigger: always_on
---

# Smart Spotify Playlist Curator - Developer & Architecture Guide

> **Version**: 2.0.0
> **Last Updated**: January 2026
> **Context**: Senior Fullstack Monorepo (React + Firebase + Node.js)

This document serves as the absolute source of truth for all contributors (Human & AI). It defines the strict standards required to maintain the "Senior" status of this codebase.

---

## 🧠 Core Philosophy

1.  **"Machine-like Efficiency, Human-like Curation"**: The system automates tedious tasks (track scanning, removing duplicates) but respects user intent ("Vibe").
2.  **SaaS-First Identity**: We are building a multi-tenant product. Every feature must support multiple isolated users relying on valid subscriptions (or quotas).
3.  **Bleeding Edge & Robust**: We use the latest stable tools (`Node 24`, `React 19`, `ESNext`) but never compromise on type safety or linting.

---

## 🛠 Technology Stack (Strict)

| Layer            | Technology               | Version / Config                                              |
| :--------------- | :----------------------- | :------------------------------------------------------------ |
| **Runtime**      | Node.js                  | `v24` (LTS/Current)                                           |
| **Language**     | TypeScript               | `v5.9` (Strict Mode)                                          |
| **FaaS Backend** | Firebase Cloud Functions | Gen 2, Region `us-central1`, Memory 512MB+                    |
| **Frontend**     | React                    | `v19` + Vite `v6`                                             |
| **Styling**      | Tailwind CSS `v3.4`      | + `shadcn/ui`, `lucide-react`, `tailwindcss-animate`          |
| **State**        | TanStack Query `v5`      | No global stores (Redux/Zustand) unless absolutely necessary. |
| **Database**     | Firestore                | User-centric Schema: `users/{uid}/playlists`                  |
| **Validation**   | Zod `v4`                 | **MANDATORY** for all inputs/outputs.                         |
| **Testing**      | Vitest                   | Workspace-native runner for Unit & Integration tests.         |
| **Versioning**   | standard-version         | Semantic Versioning & Automated Changelogs.                   |

---

## 🏛 Architecture: The Monorepo

We use npm workspaces to manage dependencies and code sharing.

### Directory Structure

```text
/
├── functions/       # Backend Business Logic (Firebase)
│   ├── src/
│   │   ├── admin/       # Admin SDK interactions (Privileged)
│   │   ├── auth/        # Auth Tokens & Secrets
│   │   ├── services/    # Business Logic (SpotifyService, AiService)
│   │   └── index.ts     # Entry Point (Triggers)
│   └── tests/           # Integration & Unit Tests
│
├── web-app/         # Command Center UI
│   ├── src/
│   │   ├── components/  # Reusable UI (Atomic design-ish)
│   │   ├── contexts/    # AuthContext, ThemeProvider
│   │   ├── services/    # Frontend Services (Firestore, Functions)
│   │   └── pages/       # Route Views
│
├── shared/          # The Knowledge Base
│   ├── src/
│   │   ├── types.ts     # Shared Interfaces (PlaylistConfig, User)
│   │   └── schemas.ts   # Zod Schemas used by both FE and BE
│
└── scripts/         # Automation & Maintenance (Release, Cleanup)
```

---

## 📏 Coding Standards

### 1. Type Safety & Validation

- **Zero `any` Policy**: Explicitly type everything. If complex, use `shared/src/types.ts`.
- **Boundary Validation**:
  - **API Responses**: Always validate using `zod`.
  - **Firestore Reads**: Use `zod` schemas to parse documents.
  - **Forms**: Use `react-hook-form` + `zodResolver`.

### 2. Design Patterns

- **Singleton Services (Backend)**:
  - `SpotifyService` is a Singleton to manage global rate limits (`429`) and connection pooling.
- **Factory Pattern (Multi-Tenancy)**:
  - For curation jobs, `SpotifyService` is instantiated _per-user_ using a factory method that injects the user's Refresh Token.
- **Orchestrator Pattern**:
  - Business logic flow (check condition -> fetch tracks -> filter -> update) lives in `PlaylistOrchestrator`, not in the HTTP handler.
- **Optimistic UI (Frontend)**:
  - Mutations should update the UI immediately (`onMutate` in TanStack Query) and rollback on error.

### 3. Frontend / UX Guidelines

- **Component Library**: Use `shadcn/ui` components (in `@/components/ui`) for consistency.
- **Styling**: Use utility classes (Tailwind). Avoid `style={{}}` prop unless dynamic coordinates.
- **Glassmorphism**: Use `bg-black/40 backdrop-blur-md` for panels to achieve the "Premium Studio" look.
- **Feedback**:
  - **Loading**: Use Skeletons (`PlaylistCardSkeleton`), not just spinners.
  - **Success/Error**: Use `sonner` toasts.

---

## 🧪 Testing Strategy

We follow the **"Trophy Shape"**: Many Integration tests, some Unit tests, few E2E.

- **Runner**: `vitest` (configured in root & workspaces).
- **Backend Integration**:
  - Mock external calls (Spotify API) but test service logic flow.
  - Use `functions/tests/setup.ts` to silence verbose logs (`console.log`) during runs.
- **Frontend Smoke Tests**:
  - Render components and check for crashes or basic element presence.
  - Environment: `jsdom`.
- **Command**: `npm test` runs all workspace tests.

---

## 🔄 Development Workflow

### 1. Commits & Versioning

We use **Conventional Commits** to automate releases.

- `feat: ...` -> Minor Version Bump (v1.1.0)
- `fix: ...` -> Patch Version Bump (v1.0.1)
- `chore: ...` -> No Release (or Patch)
- `BREAKING CHANGE: ...` -> Major Version Bump (v2.0.0)

**Release Command**:

```bash
npm run release
# This bumps version, updates CHANGELOG.md, and creates a git tag.
```

### 2. CI/CD Pipeline

- **Pre-commit**: `husky` runs `lint-staged` (Format & Lint) and `npm run type-check`.
- **Deployment**:
  - **Bundling**: We use `esbuild` to bundle functions into a single file before deploying to Firebase.
  - **Config**: Secrets are managed via Google Cloud Secret Manager (accessed via Firestore for user secrets).

---

## ⚠️ Critical Rules (Do Not Ignore)

1.  **Never Hardcode Secrets**: Use `process.env` (locally) or Firestore `secrets` collection (prod).
2.  **Respect Rate Limits**: The `SpotifyService` includes retry logic. Do not bypass it.
3.  **Dry Run First**: All destructive backend operations must support `{ dryRun: true }`.
4.  **No Direct Spotify Calls from Client**: The Frontend **MUST** proxy all Spotify operations through Cloud Functions (`searchSpotify`, etc.) to keep secrets server-side.

---

**End of Guide**
