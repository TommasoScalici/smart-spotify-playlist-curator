import * as dotenv from 'dotenv';
import { setGlobalOptions } from 'firebase-functions/v2';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from root .env ONLY for local development
// In Cloud Functions, credentials are automatically provided
const isLocalDevelopment = !process.env.FUNCTION_TARGET && !process.env.K_SERVICE;
if (isLocalDevelopment) {
  const envPath = resolve(__dirname, '../../.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

// Set max instances to 1 for sequential processing (safety against rate limits)
setGlobalOptions({ maxInstances: 1 });

// Export Controllers
export { exchangeSpotifyToken } from './controllers/auth-controller.js';
export {
  estimateCuration,
  runOrchestrator,
  triggerCuration
} from './controllers/curation-controller.js';
export { suggestReferenceArtists } from './controllers/discovery-controller.js';
export { getPlaylistMetrics } from './controllers/playlist-controller.js';
export { getTrackDetails, searchSpotify } from './controllers/spotify-controller.js';
