# Agent Guidelines

As an AI coding assistant, you must follow these strict rules to maintain the integrity and quality of the Smart Spotify Playlist Curator codebase.

## 📏 Mandatory Rules

1.  **Zero `any` Policy**: Never use `any`. If a type is complex, define it in `shared/src/schemas.ts` using Zod and infer the type.
2.  **Contract-First Design**: Always update the Zod schema in `shared` before changing API payloads or Firestore document structures.
3.  **Proxy All Spotify Calls**: The Frontend **MUST** proxy all Spotify operations through Cloud Functions. Direct calls to Spotify from the browser are strictly forbidden.
4.  **Aesthetics Matter**: When working on the frontend, maintain the "Premium Studio" look:
    - Use Tailwind v4 utility classes.
    - Use `shadcn/ui` components.
    - Implement glassmorphism (`bg-card/40 backdrop-blur-xl`).
    - Use `sonner` for all user notifications.
5.  **Dry Run First**: Any destructive or large-scale data operation must support a `dryRun: true` or `isSimulation: true` mode.

## 🔄 Workflow Expectations

- **Trophy-Shape Testing**: Prioritize integration tests over unit tests. Use `vitest`.
- **Conventional Commits**: All commit messages must follow the Conventional Commits specification (e.g., `feat: ...`, `fix: ...`) to satisfy `@semantic-release`.
- **Linting & Formatting**: Always run `npm run fix` after modifying multiple files to ensure style consistency.

## 🧱 Architectural Constraints

- **No Global Stores**: Do not introduce Redux, MobX, or Zustand. Use TanStack Query for server state and standard React Context for application-wide UI state (like Auth).
- **Functional Firebase**: Use Firebase Gen 2 `onCall` handlers for all backend operations.
- **Node 24+**: Ensure all code is compatible with Node 24 runtime features.
