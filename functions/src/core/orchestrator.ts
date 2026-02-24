import { CurationDiff, PlaylistConfig } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';

import { AiService } from '../services/ai-service';
import { FirestoreLogger } from '../services/firestore-logger';
import { SpotifyService } from '../services/spotify-service';
import { AISuggestionEngine } from './curation/ai-suggestion-engine';
import { CurationSession } from './curation/curation-session';
import { DiffCalculator } from './diff-calculator';
import { SlotManager } from './slot-manager';
import { RemovalReason, RemovedTrack, TrackCleaner } from './track-cleaner';

export class PlaylistOrchestrator {
  constructor(
    private aiService: AiService,
    private slotManager: SlotManager,
    private trackCleaner: TrackCleaner,
    private firestoreLogger: FirestoreLogger
  ) {}

  public async createPlan(
    config: PlaylistConfig,
    spotifyService: SpotifyService,
    ownerName?: string,
    existingLogId?: string,
    isSimulation: boolean = false
  ): Promise<CurationSession> {
    const session: CurationSession = {
      config,
      currentTracks: [],
      finalTrackList: [],

      isSimulation,
      newAiTracks: [],
      ownerName,
      playlistId: config.id.replace('spotify:playlist:', ''),
      survivingTracks: []
    };

    if (existingLogId) {
      session.logId = existingLogId;
    } else {
      await this.initializeSession(session);
    }

    // Logic split from curatePlaylist
    try {
      const { removedTracks } = await this.fetchAndCleanTracks(session, spotifyService);
      await this.generateSuggestions(session, spotifyService);
      await this.assembleAndPlan(session, removedTracks);
    } catch (e) {
      if (session.logId) {
        await this.handleCurationError(session, e as Error);
      }
      throw e;
    }

    return session;
  }

  public async curatePlaylist(
    config: PlaylistConfig,
    spotifyService: SpotifyService,
    ownerName?: string
  ): Promise<void> {
    logger.info(`Starting automation curation: ${config.name}`);

    // Legacy flow wrapper
    const session = await this.createPlan(config, spotifyService, ownerName);

    await this.executePlan(session, spotifyService);
  }

  public async executePlan(
    session: CurationSession,
    spotifyService: SpotifyService
  ): Promise<void> {
    try {
      if (session.isSimulation) {
        session.isSimulation = false;
      }

      if (!session.logId) {
        await this.initializeSession(session);
      }

      await this.executeUpdates(session, spotifyService);
      await this.finalizeSession(session);
    } catch (error) {
      await this.handleCurationError(session, error as Error);
      throw error;
    }
  }

  private async assembleAndPlan(session: CurationSession, initiallyRemoved: RemovedTrack[]) {
    await this.updateProgress(session, 80, 'Arranging and sorting...');

    session.finalTrackList = this.slotManager.arrangePlaylist(
      session.config.mandatoryTracks,
      session.survivingTracks,
      session.newAiTracks,
      session.config.settings.targetTotalTracks,
      session.config.curationRules.shuffleAtEnd,
      session.config.curationRules.sizeLimitStrategy
    );

    const removalReasons = new Map<string, 'other' | 'size_limit' | RemovalReason>();
    initiallyRemoved.forEach((rt) => removalReasons.set(rt.uri, rt.reason));

    const finalSet = new Set(session.finalTrackList);
    for (const track of session.survivingTracks) {
      if (!finalSet.has(track.uri) && !removalReasons.has(track.uri)) {
        removalReasons.set(track.uri, 'size_limit');
      }
    }

    session.diff = DiffCalculator.calculate(
      session.currentTracks,
      session.survivingTracks,
      session.finalTrackList,
      session.config.mandatoryTracks,
      session.newAiTracks,
      removalReasons
    );
  }

  private async executeUpdates(session: CurationSession, spotifyService: SpotifyService) {
    await this.updateProgress(session, 90, 'Updating Spotify playlist...', session.diff);

    await spotifyService.performSmartUpdate(session.playlistId, session.finalTrackList);
  }

  private async fetchAndCleanTracks(session: CurationSession, spotifyService: SpotifyService) {
    session.currentTracks = await spotifyService.getPlaylistTracks(session.playlistId);

    const vipUris = session.config.mandatoryTracks.map((m) => m.uri);
    const { removedTracks, survivingTracks } = this.trackCleaner.processCurrentTracks(
      session.currentTracks,
      session.config,
      vipUris
    );
    session.survivingTracks = survivingTracks;

    await this.updateProgress(session, 20, 'Cleaning existing tracks...');
    return { removedTracks };
  }

  private async finalizeSession(session: CurationSession) {
    if (session.isSimulation) return;
    if (!session.config.ownerId || !session.logId) return;

    await this.firestoreLogger.logActivity(
      session.config.ownerId,
      'success',
      `Curation completed for "${session.config.name}"`,
      {
        diff: session.diff,
        progress: 100,
        state: 'completed',
        step: 'Done',
        triggeredBy: session.ownerName
      },
      session.logId
    );
  }

  private async generateSuggestions(session: CurationSession, spotifyService: SpotifyService) {
    const { aiGeneration } = session.config;
    if (!aiGeneration.enabled || aiGeneration.tracksToAdd <= 0) return;

    const engine = new AISuggestionEngine(this.aiService, spotifyService, this.firestoreLogger);

    session.newAiTracks = await engine.generateAndFindTracks(
      session.config.name,
      session.config.settings.description,
      session.config.settings.referenceArtists,
      aiGeneration,
      aiGeneration.tracksToAdd,
      session.survivingTracks.map((t) => `${t.artist} - ${t.name}`),
      session.config.ownerId,
      session.logId,
      session.config.curationRules.maxTracksPerArtist,
      session.ownerName
    );
  }

  private async handleCurationError(session: CurationSession, error: Error) {
    logger.error(`Curation failed for ${session.config.name}`, error);
    if (session.isSimulation) return;
    if (!session.config.ownerId || !session.logId) return;

    await this.firestoreLogger.logActivity(
      session.config.ownerId,
      'error',
      `Failed to curate "${session.config.name}"`,
      {
        error: error.message,
        state: 'error',
        triggeredBy: session.ownerName
      },
      session.logId
    );
  }

  private async initializeSession(session: CurationSession) {
    if (session.isSimulation) return;
    if (!session.config.ownerId) return;

    session.logId = await this.firestoreLogger.logActivity(
      session.config.ownerId,
      'running',
      `Curating "${session.config.name}"...`,
      {
        playlistId: session.config.id,
        playlistName: session.config.name,
        progress: 0,
        state: 'running',
        step: 'Initializing...',
        triggeredBy: session.ownerName
      }
    );
  }

  private async updateProgress(
    session: CurationSession,
    progress: number,
    step: string,
    diff?: CurationDiff
  ) {
    if (session.isSimulation) return;
    if (!session.config.ownerId || !session.logId) return;
    await this.firestoreLogger.logActivity(
      session.config.ownerId,
      'running',
      undefined,
      { diff, progress, state: 'running', step },
      session.logId
    );
  }
}
