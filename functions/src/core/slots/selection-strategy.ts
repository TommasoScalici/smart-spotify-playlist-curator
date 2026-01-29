import { ShuffleEngine } from './shuffle-engine';

export type SizeLimitStrategy =
  | 'drop_newest'
  | 'drop_oldest'
  | 'drop_random'
  | 'drop_most_popular'
  | 'drop_least_popular';

export interface PoolTrack {
  uri: string;
  artist: string;
  addedAt?: Date;
  popularity?: number;
}

export class SelectionStrategy {
  public static truncatePool(
    pool: PoolTrack[],
    limit: number,
    strategy: SizeLimitStrategy
  ): PoolTrack[] {
    if (pool.length <= limit) return pool;

    const sortedPool = [...pool];

    switch (strategy) {
      case 'drop_newest':
        sortedPool.sort((a, b) => (a.addedAt?.getTime() || 0) - (b.addedAt?.getTime() || 0));
        break;
      case 'drop_oldest':
        sortedPool.sort((a, b) => (b.addedAt?.getTime() || 0) - (a.addedAt?.getTime() || 0));
        break;
      case 'drop_most_popular':
        sortedPool.sort((a, b) => (a.popularity || 0) - (b.popularity || 0));
        break;
      case 'drop_least_popular':
        sortedPool.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
      case 'drop_random':
      default:
        ShuffleEngine.shuffleArray(sortedPool);
        break;
    }

    return sortedPool.slice(0, limit);
  }
}
