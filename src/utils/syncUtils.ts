import { GameQuiz, LeaderboardEntry } from '../types';

export const SYNC_CHANNEL_NAME = 'mslanie_sync_channel';

export type SyncMessage =
  | { type: 'GAMES_UPDATED'; payload: GameQuiz[] }
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

/**
 * Intelligently merge local and cloud games:
 * Preserves newer local edits so they NEVER get reverted on page refresh (F5).
 * Detects games that need to be pushed back to cloud.
 */
export function mergeGamesWithLocal(
  localGames: GameQuiz[],
  cloudGames: GameQuiz[]
): {
  merged: GameQuiz[];
  shouldPushToCloud: boolean;
  gamesToPush: GameQuiz[];
} {
  // If cloud has no games, retain all local games and mark them to push to cloud
  if (!cloudGames || cloudGames.length === 0) {
    return {
      merged: localGames || [],
      shouldPushToCloud: (localGames || []).length > 0,
      gamesToPush: localGames || []
    };
  }

  // If local has no games, use cloud games
  if (!localGames || localGames.length === 0) {
    return {
      merged: cloudGames,
      shouldPushToCloud: false,
      gamesToPush: []
    };
  }

  const map = new Map<string, GameQuiz>();
  const gamesToPush: GameQuiz[] = [];

  // 1. Load all local games into map
  for (const localG of localGames) {
    if (localG && localG.id) {
      map.set(localG.id, localG);
    }
  }

  // 2. Compare each cloud game with local
  for (const cloudG of cloudGames) {
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
        // Keep the one with more questions or keep local if modified
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

  // 3. Check for locally created games not present in cloud
  for (const localG of localGames) {
    if (!cloudGames.some((cg) => cg && cg.id === localG.id)) {
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
    gamesToPush
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
