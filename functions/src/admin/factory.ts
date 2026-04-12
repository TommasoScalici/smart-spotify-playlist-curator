import { ConfigService } from '../core/config-service.js';
import { CurationEstimator } from '../core/estimator.js';
import { PlaylistOrchestrator } from '../core/orchestrator.js';
import { SlotManager } from '../core/slot-manager.js';
import { TrackCleaner } from '../core/track-cleaner.js';
import { AiService } from '../services/ai-service.js';
import { FirestoreLogger } from './firestore-logger.js';

/**
 * ServiceFactory implements a lightweight Dependency Injection container
 * to adhere strictly to the Dependency Inversion Principle.
 */
export class ServiceFactory {
  // Singletons or cached instances
  private static aiService?: AiService;
  private static configService?: ConfigService;
  private static firestoreLogger?: FirestoreLogger;
  private static slotManager?: SlotManager;
  private static trackCleaner?: TrackCleaner;

  public static createEstimator(): CurationEstimator {
    return new CurationEstimator(this.createOrchestrator());
  }

  public static createOrchestrator(): PlaylistOrchestrator {
    return new PlaylistOrchestrator(
      this.getAiService(),
      this.getSlotManager(),
      this.getTrackCleaner(),
      this.getFirestoreLogger()
    );
  }

  public static getAiService(): AiService {
    if (!this.aiService) {
      this.aiService = new AiService();
    }
    return this.aiService;
  }

  public static getConfigService(): ConfigService {
    if (!this.configService) {
      this.configService = new ConfigService();
    }
    return this.configService;
  }

  public static getFirestoreLogger(): FirestoreLogger {
    if (!this.firestoreLogger) {
      this.firestoreLogger = new FirestoreLogger();
    }
    return this.firestoreLogger;
  }

  // --- Core Domain Objects ---

  public static getSlotManager(): SlotManager {
    if (!this.slotManager) {
      this.slotManager = new SlotManager();
    }
    return this.slotManager;
  }

  public static getTrackCleaner(): TrackCleaner {
    if (!this.trackCleaner) {
      this.trackCleaner = new TrackCleaner();
    }
    return this.trackCleaner;
  }
}
