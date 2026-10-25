import { GameQuiz, LeaderboardEntry } from '../types';

export const SYNC_CHANNEL_NAME = 'mslanie_sync_channel';

export type SyncMessage =
  | { type: 'GAMES_UPDATED'; payload: GameQuiz[] }
  | { type: 'GAME_DELETED'; payload: string }
  | { type: 'LEADERBOARD_UPDATED'; payload: LeaderboardEntry[] }
  | { type: 'AUTH_UPDATED'; payload: boolean };

// Create singleton BroadcastChannel if supported
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch (e) {
    console.warn('[Sync] BroadcastChannel not supported:', e);
  }
}

/**
 * Broadcast an update to all open tabs/windows
 */
export function broadcastSync(message: SyncMessage) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch (e) {
      console.warn('[Sync] broadcast error:', e);
    }
  }
}

/**
 * Subscribe to cross-tab updates
 */
export function subscribeToSync(handler: (msg: SyncMessage) => void): () => void {
  if (!broadcastChannel) return () => {};

  const listener = (event: MessageEvent<SyncMessage>) => {
    if (event.data && event.data.type) {
      handler(event.data);
    }
  };

  broadcastChannel.addEventListener('message', listener);
  return () => {
    broadcastChannel?.removeEventListener('message', listener);
  };
}

export const DELETED_GAMES_STORAGE_KEY = 'mslanie_deleted_game_ids';

export function getDeletedGameIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_GAMES_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

export function markGameAsDeleted(gameId: string): void {
  if (typeof window === 'undefined' || !gameId) return;
  try {
    const set = getDeletedGameIds();
    set.add(gameId);
    localStorage.setItem(DELETED_GAMES_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function unmarkGameAsDeleted(gameId: string): void {
  if (typeof window === 'undefined' || !gameId) return;
  try {
    const set = getDeletedGameIds();
    if (set.has(gameId)) {
      set.delete(gameId);
      localStorage.setItem(DELETED_GAMES_STORAGE_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
}

/**
 * Intelligently merge local and cloud games:
 * Preserves newer local edits so they NEVER get reverted on page refresh (F5).
 * Strictly honors deleted games so deleted items are NEVER resurrected.
 * Detects games that need to be pushed back to cloud or purged from cloud.
 */
export function mergeGamesWithLocal(
  localGames: GameQuiz[],
  cloudGames: GameQuiz[]
): {
  merged: GameQuiz[];
  shouldPushToCloud: boolean;
  gamesToPush: GameQuiz[];
  deletedToPurgeFromCloud: string[];
} {
  const deletedIds = getDeletedGameIds();

  // 1. Filter out deleted games from local and cloud datasets
  const cleanLocal = (localGames || []).filter(
    (g) => g && g.id && !deletedIds.has(g.id)
  );
  const cleanCloud = (cloudGames || []).filter(
    (g) => g && g.id && !deletedIds.has(g.id)
  );

  // Identify any games lingering in cloud that were deleted by the teacher
  const deletedToPurgeFromCloud: string[] = [];
  if (cloudGames && cloudGames.length > 0) {
    for (const cg of cloudGames) {
      if (cg && cg.id && deletedIds.has(cg.id)) {
        deletedToPurgeFromCloud.push(cg.id);
      }
    }
  }

  // If cloud has no clean games, retain clean local games
  if (!cleanCloud || cleanCloud.length === 0) {
    return {
      merged: cleanLocal,
      shouldPushToCloud: cleanLocal.length > 0,
      gamesToPush: cleanLocal,
      deletedToPurgeFromCloud
    };
  }

  // If local has no clean games, use clean cloud games
  if (!cleanLocal || cleanLocal.length === 0) {
    return {
      merged: cleanCloud,
      shouldPushToCloud: false,
      gamesToPush: [],
      deletedToPurgeFromCloud
    };
  }

  const map = new Map<string, GameQuiz>();
  const gamesToPush: GameQuiz[] = [];

  // Load all clean local games into map
  for (const localG of cleanLocal) {
    if (localG && localG.id) {
      map.set(localG.id, localG);
    }
  }

  // Compare each clean cloud game with local
  for (const cloudG of cleanCloud) {
    if (!cloudG || !cloudG.id) continue;

    const localG = map.get(cloudG.id);
    if (!localG) {
      // Cloud game doesn't exist locally -> add it
      map.set(cloudG.id, cloudG);
    } else {
      // Game exists in both local and cloud!
      const localTime = localG.updatedAt || 0;
      const cloudTime = cloudG.updatedAt || 0;

      if (cloudTime > localTime) {
        // Cloud has a strictly newer version
        map.set(cloudG.id, cloudG);
      } else if (localTime > cloudTime) {
        // Local has a strictly newer version! Keep local edits!
        map.set(localG.id, localG);
        gamesToPush.push(localG);
      } else {
        // Equal timestamps or neither has updatedAt
        const localQCount = localG.questions?.length || 0;
        const cloudQCount = cloudG.questions?.length || 0;
        if (localQCount >= cloudQCount) {
          map.set(localG.id, localG);
        } else {
          map.set(cloudG.id, cloudG);
        }
      }
    }
  }

  // Check for clean locally created games not present in cloud
  for (const localG of cleanLocal) {
    if (!cleanCloud.some((cg) => cg && cg.id === localG.id)) {
      gamesToPush.push(localG);
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const timeA = a.updatedAt || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const timeB = b.updatedAt || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    return timeB - timeA;
  });

  return {
    merged,
    shouldPushToCloud: gamesToPush.length > 0,
    gamesToPush,
    deletedToPurgeFromCloud
  };
}

/**
 * Intelligently merge local and cloud leaderboards
 */
export function mergeLeaderboardWithLocal(
  localLb: LeaderboardEntry[],
  cloudLb: LeaderboardEntry[]
): LeaderboardEntry[] {
  if (!cloudLb || cloudLb.length === 0) return localLb || [];
  if (!localLb || localLb.length === 0) return cloudLb;

  const map = new Map<string, LeaderboardEntry>();
  for (const item of localLb) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of cloudLb) {
    if (item && item.id) map.set(item.id, item);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
  );
}
