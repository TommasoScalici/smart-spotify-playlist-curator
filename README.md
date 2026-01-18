# Smart Spotify Playlist Curator

> **Status**: v2.0.0 (Stable) | **License**: MIT
> **Stack**: React 19, Node 24, Firebase Gen 2, Gemini 2.5 Flash

A powerful, **multi-tenant automation system** that curates Spotify playlists using **Google Gemini 2.5 Flash** for intelligent song recommendations and **Firebase Cloud Functions** for serverless orchestration.

---

## 🚀 Key Features

### 🧠 AI-Powered Curation

- **Context-Aware Recommendations**: Uses Gemini 2.5 Flash to generate tracks based on "Vibe", "Genre", or complex prompts (e.g., "Songs for a rainy cyberpunk drive").
- **Sonic Consistency**: Filters tracks using Spotify's audio features (Energy, Valence, Danceability) to ensure mathematical vibe matching.
- **Smart Slot Management**: Intelligently mixes "VIP" (Mandatory) tracks with AI suggestions while preserving the user's preferred order.

### 🛡️ Enterprise-Grade Reliability

- **Orchestrator Pattern**: Decoupled architecture where HTTP triggers only initiate workflows; Orchestrators handle the complex logic.
- **Dry-Run Mode**: Simulate playlist updates without touching your actual library.
- **Rate-Limit Handling**: Robust retry logic with exponential backoff for Spotify API `429` errors.
- **Observability**: Structured JSON logging via `firebase-functions/logger` with correlation IDs.

### 🎨 Premium User Experience

- **Music Studio UI**: built with **React 19**, **Tailwind CSS**, and **shadcn/ui**.
- **Real-Time Feedback**: Optimistic UI updates for a snappy feel.
- **Security**: OAuth 2.0 Identity Linking (Spotify) + Firebase Authentication.

---

## 🛠 Tech Stack

- **Runtime**: Node.js `v24` (LTS)
- **Language**: TypeScript `v5.9` (Strict Mode)
- **Frontend**: React `v19` + Vite `v6`
- **Backend**: Firebase Cloud Functions (Gen 2)
- **Database**: Cloud Firestore (NoSQL)
- **Validation**: Zod `v4` (Contract-first design)
- **Testing**: Vitest (Monorepo-wide)

---

## 📦 Project Structure (Monorepo)

| Workspace        | Description                                                        |
| :--------------- | :----------------------------------------------------------------- |
| **`functions/`** | Backend Business Logic. Triggers, Schedulers, and API Integration. |
| **`web-app/`**   | React Frontend. The "Command Center" for users.                    |
| **`shared/`**    | Shared Types and Zod Schemas. Single source of truth.              |
| **`scripts/`**   | Maintenance and Automation scripts (Seeding, Tokens).              |

---

## ⚙️ Usage & Configuration

### 1. Prerequisites

- **Node.js v24**
- **Firebase CLI**: `npm install -g firebase-tools`
- **Spotify Developer App**: [Create Here](https://developer.spotify.com/dashboard).
- **Google AI Studio Key**: [Get Key](https://aistudio.google.com/).

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/TommasoScalici/smart-spotify-playlist-curator.git
cd smart-spotify-playlist-curator

# Install dependencies (Root level)
npm install
```

### 3. Application Setup

You need **Firestore** enabled in your Firebase Project.

1.  **Configure Environment**:
    - **Development**: Copy `.env.example` to `.env` in `functions/` and `web-app/`.
    - **Production**: Use Google Cloud Secret Manager.

2.  **Generate Spotify Refresh Token** (for local scripts):

    ```bash
    cd scripts
    npm run get-refresh-token
    ```

3.  **Run Locally (Frontend)**:

    ```bash
    cd web-app
    npm run dev
    ```

4.  **Run Backend Tests**:
    ```bash
    cd functions
    npm test
    ```

---

## 🚀 Deployment

We use **GitHub Actions** for CI/CD, but you can deploy manually:

```bash
# Deploy Backend (Functions + Security Rules)
npm run deploy

# Deploy Frontend (Hosting)
cd web-app
npm run build
firebase deploy --only hosting
```

---

## 🤝 Contributing

**Zero `any` Policy**: We enforce strict TypeScript rules.

1.  Fork the repo.
2.  Create your feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'feat: add amazing feature'`).
    - _Note: We use Conventional Commits._
4.  Run tests (`npm test`).
5.  Push to the branch.
6.  Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE.md` for more information.
