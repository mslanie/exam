import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  remove,
  update,
  Database
} from 'firebase/database';
import { GameQuiz, LeaderboardEntry } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyBRuNvGqwLIYVwgI-LVrNFBh4zJq8T-pqA",
  authDomain: "en-mslanie.firebaseapp.com",
  databaseURL: "https://en-mslanie-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "en-mslanie",
  storageBucket: "en-mslanie.firebasestorage.app",
  messagingSenderId: "350435626108",
  appId: "1:350435626108:web:28a7f7f12c4b00028d4df9",
  measurementId: "G-RH46PZHE7M"
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const database: Database = getDatabase(app);

export type SyncStatus = 'connected' | 'syncing' | 'permission_denied' | 'error' | 'offline';

export interface FirebaseState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  errorMessage: string | null;
}

/**
 * Lắng nghe danh sách game theo thời gian thực từ Firebase Realtime Database
 */
export function listenToCloudGames(
  onData: (games: GameQuiz[]) => void,
  onError?: (err: Error) => void
): () => void {
  const gamesRef = ref(database, 'games');

  const unsubscribe = onValue(
    gamesRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        let gamesList: GameQuiz[] = [];
        if (Array.isArray(val)) {
          gamesList = val.filter(Boolean);
        } else if (typeof val === 'object' && val !== null) {
          gamesList = Object.values(val);
        }
        // Sắp xếp game mới nhất lên đầu
        gamesList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onData(gamesList);
      } else {
        onData([]);
      }
    },
    (error) => {
      console.warn('[Firebase] listenToCloudGames error:', error.message);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Lắng nghe bảng xếp hạng theo thời gian thực từ Firebase Realtime Database
 */
export function listenToCloudLeaderboard(
  onData: (leaderboard: LeaderboardEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  const lbRef = ref(database, 'leaderboard');

  const unsubscribe = onValue(
    lbRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        let list: LeaderboardEntry[] = [];
        if (Array.isArray(val)) {
          list = val.filter(Boolean);
        } else if (typeof val === 'object' && val !== null) {
          list = Object.values(val);
        }
        // Sắp xếp mới nhất lên đầu
        list.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
        onData(list);
      } else {
        onData([]);
      }
    },
    (error) => {
      console.warn('[Firebase] listenToCloudLeaderboard error:', error.message);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Lưu hoặc cập nhật 1 game lên Firebase Realtime Database
 */
export async function saveGameToCloud(game: GameQuiz): Promise<boolean> {
  try {
    const gameRef = ref(database, `games/${game.id}`);
    await set(gameRef, game);
    return true;
  } catch (error: any) {
    console.error('[Firebase] Lỗi lưu game lên cloud:', error);
    throw error;
  }
}

/**
 * Xóa 1 game khỏi Firebase Realtime Database
 */
export async function deleteGameFromCloud(gameId: string): Promise<boolean> {
  try {
    const gameRef = ref(database, `games/${gameId}`);
    await remove(gameRef);
    return true;
  } catch (error: any) {
    console.error('[Firebase] Lỗi xóa game trên cloud:', error);
    throw error;
  }
}

/**
 * Lưu kết quả làm bài của học sinh lên Firebase Realtime Database
 * Đồng thời tăng số lượt chơi (totalPlays) của trò chơi đó
 */
export async function saveScoreToCloud(entry: LeaderboardEntry): Promise<boolean> {
  try {
    const scoreRef = ref(database, `leaderboard/${entry.id}`);
    await set(scoreRef, entry);

    // Cập nhật lượt chơi của game
    try {
      const gameRef = ref(database, `games/${entry.gameId}`);
      const snap = await get(gameRef);
      if (snap.exists()) {
        const currentPlays = snap.val().totalPlays || 0;
        await update(gameRef, { totalPlays: currentPlays + 1 });
      }
    } catch (e) {
      // Bỏ qua nếu lỗi cập nhật totalPlays
    }

    return true;
  } catch (error: any) {
    console.error('[Firebase] Lỗi lưu điểm học sinh lên cloud:', error);
    throw error;
  }
}

/**
 * Đẩy toàn bộ danh sách game từ máy (localStorage) lên Firebase Realtime Database
 * Dùng khi cô giáo muốn đưa các đề đã tạo hôm qua từ máy lên public cho toàn bộ học sinh
 */
export async function pushAllLocalGamesToCloud(localGames: GameQuiz[]): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  if (!localGames || localGames.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const updates: Record<string, GameQuiz> = {};
    localGames.forEach((game) => {
      updates[`games/${game.id}`] = game;
    });

    const rootRef = ref(database);
    await update(rootRef, updates);

    return { success: true, count: localGames.length };
  } catch (error: any) {
    console.error('[Firebase] Lỗi đẩy toàn bộ game lên cloud:', error);
    return {
      success: false,
      count: 0,
      error: error?.message || 'Không thể ghi dữ liệu lên Firebase'
    };
  }
}
