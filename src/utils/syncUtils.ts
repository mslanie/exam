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
  cloudGames: GameQuiz[],
  isFreshClient: boolean = false
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

  // 2. If this is a fresh client (e.g. Incognito mode, new browser, student device without prior localStorage):
  // They MUST strictly adopt Cloud games directly as the single source of truth!
  // No mock INITIAL_GAMES should ever be revived, and nothing should be pushed to Cloud.
  if (isFreshClient) {
    return {
      merged: cleanCloud,
      shouldPushToCloud: false,
      gamesToPush: [],
      deletedToPurgeFromCloud
    };
  }

  // 3. If cloud is empty (e.g. all games were deleted by teacher on Cloud):
  // Only keep local games that were freshly created offline; wipe any old deleted games.
  if (!cleanCloud || cleanCloud.length === 0) {
    const offlineCreated = cleanLocal.filter((g) => g._isOfflineCreated);
    return {
      merged: offlineCreated,
      shouldPushToCloud: offlineCreated.length > 0,
      gamesToPush: offlineCreated,
      deletedToPurgeFromCloud
    };
  }

  // 4. Cloud has games: Cloud is authoritative for active game IDs!
  const map = new Map<string, GameQuiz>();
  const gamesToPush: GameQuiz[] = [];

  // Initialize map with clean cloud games
  for (const cloudG of cleanCloud) {
    if (cloudG && cloudG.id) {
      map.set(cloudG.id, cloudG);
    }
  }

  // Compare with clean local games
  for (const localG of cleanLocal) {
    if (!localG || !localG.id) continue;

    const cloudG = map.get(localG.id);
    if (cloudG) {
      // Game exists in both: preserve newer local edits
      const localTime = localG.updatedAt || 0;
      const cloudTime = cloudG.updatedAt || 0;

      if (localTime > cloudTime) {
        map.set(localG.id, localG);
        gamesToPush.push(localG);
      }
    } else if (localG._isOfflineCreated) {
      // Newly created offline game that hasn't been uploaded yet
      map.set(localG.id, localG);
      gamesToPush.push(localG);
    }
    // CRITICAL: If localG is absent from cloud and NOT _isOfflineCreated,
    // IT WAS DELETED FROM CLOUD by the teacher on another device or session!
    // We do NOT add it back to map, and do NOT push to cloud! It remains deleted!
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
