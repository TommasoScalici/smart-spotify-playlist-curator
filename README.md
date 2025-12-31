# Smart Spotify Playlist Curator

A powerful automation system that curates Spotify playlists using **Google Gemini 2.5 Flash** for intelligent song recommendations and **Firebase Cloud Functions** for serverless orchestration.

## 🚀 Key Features

-   **🤖 AI-Powered Curation**: Uses Gemini 2.5 Flash to generate context-aware track suggestions (Pop, Rock, specific moods, etc.).
-   **🛡️ Dry-Run Mode**: Simulate playlist updates without modifying your actual Spotify library. Great for testing prompts!
-   **📊 Robust Observability**: Structured JSON logging via `firebase-functions/logger` and Execution Correlation IDs for easy debugging in GCP.
-   **🔄 Smart Slot Management**: Intelligently mixes Mandatory "VIP" tracks with AI suggestions while preserving order logic.
-   **⚡ CI/CD**: Automated GitHub Actions pipeline for Linting, Building, and Testing on every push.

## 🛠️ Prerequisites

-   **Node.js v24** (Required)
-   **Firebase CLI**: `npm install -g firebase-tools`
-   **Spotify Developer Account**: Create an app [here](https://developer.spotify.com/dashboard/applications).
-   **Google AI Studio Key**: Get an API key for Gemini [here](https://aistudio.google.com/).

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd smart-spotify-playlist-curator
    ```

2.  **Install dependencies**:
    ```bash
    # Install backend dependencies
    cd functions
    npm ci
    
    # Install script dependencies
    cd ../scripts
    npm ci
    ```

## ⚙️ Configuration

### 1. Environment Variables
You need `.env` files in both `functions/` (for deployment/tests) and `scripts/` (for local tools).

**Copy the example:**
```bash
cp functions/.env.example functions/.env
cp scripts/.env.example scripts/.env
```

**Fill in the values:**
-   `SPOTIFY_CLIENT_ID`: From Spotify Dashboard.
-   `SPOTIFY_CLIENT_SECRET`: From Spotify Dashboard.
-   `SPOTIFY_REFRESH_TOKEN`: Generated via the auth script (see below).
-   `GOOGLE_AI_API_KEY`: From Google AI Studio.
-   `GOOGLE_APPLICATION_CREDENTIALS`: Absolute path to your Firebase Admin Service Account JSON (required for local scripts).

### 2. Firestore Database
This project uses **Firestore** to store playlist configuration dynamically.

1.  **Create Database**: Go to Firebase Console -> Build -> Firestore Database -> Create Database (Start in Production Mode).
2.  **Define Playlists**: You can define your initial playlists in `functions/src/config/playlists-config.json`.
3.  **Seed Database**: Upload this config to Firestore using the seeding script.
    ```bash
    cd scripts
    npm run seed-config
    ```
    *Note: The local JSON file is now only used for seeding. Runtime changes should be made directly in Firestore.*

### 3. Verification
Verify your config is correctly stored and readable:
```bash
cd scripts
npm run dry-run-check
```
*This script now fetches live configuration from Firestore to simulate a run.*

## 🏃 Usage

### 1. Generate Spotify Tokens
First time setup? Run the auth script to get your Refresh Token.
```bash
cd scripts
npm run get-refresh-token
```
Follow the URL, login, and paste the Refresh Token into your `.env` files.

### 2. Local Verification (Dry Run)
Verify the entire system end-to-end without touching real playlists.
```bash
cd scripts
npm run dry-run-check
```
*Check the logs for "DRY RUN: Would remove..." messages.*

### 3. Running Tests
Run the Unit and Integration test suite.
```bash
cd functions
npm test
```

### 4. Deploying (Production)
For production security, we use **Cloud Secret Manager** instead of `.env` files.

1.  **Set Secrets**:
    ```bash
    firebase functions:secrets:set SPOTIFY_CLIENT_ID
    firebase functions:secrets:set SPOTIFY_CLIENT_SECRET
    firebase functions:secrets:set SPOTIFY_REFRESH_TOKEN
    firebase functions:secrets:set GOOGLE_AI_API_KEY
    ```

2.  **Deploy**:
    ```bash
    cd functions
    npm run deploy
    ```

## 🏗️ Project Structure

-   **`functions/`**: The core application.
    -   `src/core/`: Logic for Orchestration, Slot Management, Cleaning.
    -   `src/services/`: Integrations with Spotify and Gemini AI.
    -   `src/types/`: TypeScript definitions.
-   **`scripts/`**: Local utility tools.
    -   `src/auth/`: Token generation.
    -   `src/dry-run-check.ts`: End-to-end verification script.
-   **`.github/workflows/`**: CI/CD configurations.

## 📄 License
[MIT](LICENSE.md)
