import React, { useState, useEffect } from 'react';
import { NavigationTab, AppRole, GameQuiz, LeaderboardEntry, PasswordType } from './types';
import { INITIAL_GAMES, INITIAL_LEADERBOARD } from './mockData';
import { Navbar } from './components/Navbar';
import { TeacherGameManager } from './components/TeacherGameManager';
import { TeacherGameModal } from './components/TeacherGameModal';
import { TeacherDocumentScanner } from './components/TeacherDocumentScanner';
import { StudentGamePlay } from './components/StudentGamePlay';
import { QuickJoinModal } from './components/QuickJoinModal';
import { LeaderboardView } from './components/LeaderboardView';
import { SettingsTab } from './components/SettingsTab';
import { GeminiKeyTab } from './components/GeminiKeyTab';
import { Footer } from './components/Footer';
import { TeacherLoginModal } from './components/TeacherLoginModal';
import { ConfirmModal } from './components/ConfirmModal';
import { Gamepad2, Play, Lock, Clock, KeyRound, Shield, LogOut, Sparkles, Cloud, RefreshCw } from 'lucide-react';
import {
  listenToCloudGames,
  listenToCloudLeaderboard,
  saveGameToCloud,
  deleteGameFromCloud,
  saveScoreToCloud,
  pushAllLocalGamesToCloud,
  SyncStatus
} from './utils/firebase';
import {
  broadcastSync,
  subscribeToSync,
  mergeGamesWithLocal,
  mergeLeaderboardWithLocal,
  getDeletedGameIds,
  markGameAsDeleted,
  unmarkGameAsDeleted
} from './utils/syncUtils';

export default function App() {
  const [role, setRole] = useState<AppRole>('student');
  const [currentTab, setCurrentTab] = useState<NavigationTab>('games');

  // Teacher Authentication & Storage
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isTeacherAuthenticated') === 'true';
  });

  const [teacherCredentials, setTeacherCredentials] = useState<{ username: string; password: string }>(() => {
    const saved = localStorage.getItem('teacherCredentials');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return { username: 'mslanie', password: '123123' };
  });

  // Gemini API Key State
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('mslanie_gemini_key') || '';
  });

  // Custom Logo URL State
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(() => {
    return localStorage.getItem('mslanie_custom_logo') || '';
  });

  const handleSaveCustomLogoUrl = (url: string) => {
    setCustomLogoUrl(url);
    localStorage.setItem('mslanie_custom_logo', url);
  };

  const [isTeacherLoginOpen, setIsTeacherLoginOpen] = useState(false);

  // Global Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDanger = false,
    confirmLabel = 'Xác nhận'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmLabel,
      isDanger,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Save Gemini Key
  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('mslanie_gemini_key', key);
  };

  // Global Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Games & Leaderboard State (strictly excludes deleted games)
  const [games, setGames] = useState<GameQuiz[]>(() => {
    const savedGames = localStorage.getItem('mslanie_games');
    const deletedIds = getDeletedGameIds();
    if (savedGames) {
      try {
        const parsed = JSON.parse(savedGames);
        if (Array.isArray(parsed)) {
          return parsed.filter((g) => g && g.id && !deletedIds.has(g.id));
        }
      } catch (e) {
        // fallback
      }
    }
    // Đối với trình duyệt mới / chế độ Ẩn danh (Incognito), bắt đầu từ danh sách rỗng []
    // để KHÔNG nạp lại các đề mẫu đã bị cô giáo xóa. Firebase Realtime Database
    // sẽ trả về danh sách các đề đang hoạt động thực tế trên Cloud trong chưa đầy 0.2s.
    return [];
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const savedLb = localStorage.getItem('mslanie_leaderboard');
    if (savedLb) {
      try {
        return JSON.parse(savedLb);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_LEADERBOARD;
  });

  // Firebase Realtime Database Synchronization State
  const [cloudStatus, setCloudStatus] = useState<SyncStatus>('connecting');
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Real-time synchronization from Firebase Realtime Database with conflict-free merge
  useEffect(() => {
    let isInitialMount = true;
    const unsubGames = listenToCloudGames(
      (cloudGames) => {
        setGames((currentLocalGames) => {
          const isFreshClient = !localStorage.getItem('mslanie_games');

          // Fetch current persisted games from localStorage
          const localFromStorage = (() => {
            try {
              const saved = localStorage.getItem('mslanie_games');
              return saved ? JSON.parse(saved) : currentLocalGames;
            } catch (e) {
              return currentLocalGames;
            }
          })();

          const {
            merged,
            shouldPushToCloud,
            gamesToPush,
            deletedToPurgeFromCloud
          } = mergeGamesWithLocal(
            localFromStorage || currentLocalGames,
            cloudGames || [],
            isFreshClient
          );

          // If there are deleted games still residing on cloud, purge them from cloud in background
          if (deletedToPurgeFromCloud && deletedToPurgeFromCloud.length > 0) {
            deletedToPurgeFromCloud.forEach((delId) => {
              deleteGameFromCloud(delId).catch((err) =>
                console.warn('[Firebase] Auto-purge deleted game error:', err)
              );
            });
          }

          // Save merged result to localStorage immediately so F5 never loses newer changes
          try {
            localStorage.setItem('mslanie_games', JSON.stringify(merged));
          } catch (e) {}

          // Chỉ cho phép đẩy lên Cloud nếu có giáo viên đăng nhập và có bài tạo mới cần đồng bộ
          if (!isFreshClient && isTeacherAuthenticated && shouldPushToCloud && gamesToPush.length > 0) {
            pushAllLocalGamesToCloud(merged).catch((e) =>
              console.warn('[Firebase] Auto-sync to cloud note:', e?.message)
            );
          }

          return merged;
        });

        isInitialMount = false;
        setCloudStatus('connected');
        setLastSyncTime(new Date());
      },
      (error: any) => {
        console.warn('[Firebase] Games subscription error:', error?.message);
        if (
          error?.message?.toLowerCase().includes('permission_denied') ||
          error?.code?.toLowerCase().includes('permission_denied')
        ) {
          setCloudStatus('permission_denied');
        } else {
          setCloudStatus('error');
        }
      }
    );

    const unsubLeaderboard = listenToCloudLeaderboard(
      (cloudLb) => {
        if (cloudLb && cloudLb.length > 0) {
          setLeaderboard((currentLocalLb) => {
            const localFromStorage = (() => {
              try {
                const saved = localStorage.getItem('mslanie_leaderboard');
                return saved ? JSON.parse(saved) : currentLocalLb;
              } catch (e) {
                return currentLocalLb;
              }
            })();
            const merged = mergeLeaderboardWithLocal(localFromStorage, cloudLb);
            try {
              localStorage.setItem('mslanie_leaderboard', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
        setCloudStatus((prev) => (prev === 'permission_denied' ? 'permission_denied' : 'connected'));
      },
      (error: any) => {
        console.warn('[Firebase] Leaderboard subscription error:', error?.message);
        if (
          error?.message?.toLowerCase().includes('permission_denied') ||
          error?.code?.toLowerCase().includes('permission_denied')
        ) {
          setCloudStatus('permission_denied');
        }
      }
    );

    return () => {
      unsubGames();
      unsubLeaderboard();
    };
  }, []);

  // Cross-tab synchronization via BroadcastChannel & storage events
  useEffect(() => {
    // 1. Listen to BroadcastChannel for real-time instant cross-tab updates
    const unsubSync = subscribeToSync((msg) => {
      const deletedIds = getDeletedGameIds();
      if (msg.type === 'GAMES_UPDATED' && Array.isArray(msg.payload)) {
        setGames(msg.payload.filter((g) => g && g.id && !deletedIds.has(g.id)));
      } else if (msg.type === 'GAME_DELETED' && typeof msg.payload === 'string') {
        const deletedId = msg.payload;
        setGames((prev) => prev.filter((g) => g.id !== deletedId));
      } else if (msg.type === 'LEADERBOARD_UPDATED' && Array.isArray(msg.payload)) {
        setLeaderboard(msg.payload);
      } else if (msg.type === 'AUTH_UPDATED') {
        setIsTeacherAuthenticated(msg.payload);
      }
    });

    // 2. Listen to storage event for universal cross-tab sync fallback
    const handleStorageChange = (e: StorageEvent) => {
      const deletedIds = getDeletedGameIds();
      if (e.key === 'mslanie_games' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setGames(parsed.filter((g) => g && g.id && !deletedIds.has(g.id)));
          }
        } catch (err) {}
      } else if (e.key === 'mslanie_deleted_game_ids' && e.newValue) {
        setGames((prev) => prev.filter((g) => g && g.id && !deletedIds.has(g.id)));
      } else if (e.key === 'mslanie_leaderboard' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setLeaderboard(parsed);
          }
        } catch (err) {}
      } else if (e.key === 'isTeacherAuthenticated') {
        setIsTeacherAuthenticated(e.newValue === 'true');
      } else if (e.key === 'teacherCredentials' && e.newValue) {
        try {
          setTeacherCredentials(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubSync();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save games & leaderboard to localStorage as reliable backup
  useEffect(() => {
    try {
      localStorage.setItem('mslanie_games', JSON.stringify(games));
    } catch (e) {}
  }, [games]);

  useEffect(() => {
    try {
      localStorage.setItem('mslanie_leaderboard', JSON.stringify(leaderboard));
    } catch (e) {}
  }, [leaderboard]);

  // Active Play State
  const [activePlayGame, setActivePlayGame] = useState<GameQuiz | null>(null);
  const [activePassProvided, setActivePassProvided] = useState<string>('');

  // Modals State
  const [isQuickJoinOpen, setIsQuickJoinOpen] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<GameQuiz | null>(null);
  const [selectedLeaderboardFilter, setSelectedLeaderboardFilter] = useState<string>('all');

  // Role switch handler
  const handleRoleChange = (newRole: AppRole) => {
    if (newRole === 'teacher' && !isTeacherAuthenticated) {
      setIsTeacherLoginOpen(true);
      return;
    }
    setRole(newRole);
    if (
      newRole === 'student' &&
      (currentTab === 'scanner' || currentTab === 'gemini' || currentTab === 'leaderboard')
    ) {
      setCurrentTab('games');
    }
  };

  // Teacher Login Success
  const handleTeacherLoginSuccess = () => {
    setIsTeacherAuthenticated(true);
    localStorage.setItem('isTeacherAuthenticated', 'true');
    setIsTeacherLoginOpen(false);
    setRole('teacher');
  };

  // Teacher Logout
  const handleTeacherLogout = () => {
    requestConfirm(
      'Xác Nhận Đăng Xuất Giáo Viên',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Giáo viên Ms. Lanie không?',
      () => {
        setIsTeacherAuthenticated(false);
        localStorage.removeItem('isTeacherAuthenticated');
        setRole('student');
        if (currentTab === 'scanner' || currentTab === 'gemini') {
          setCurrentTab('games');
        }
      },
      true,
      'Đăng Xuất'
    );
  };

  // Teacher Password Change
  const handleChangePassword = (newPassword: string) => {
    const updated = { ...teacherCredentials, password: newPassword };
    setTeacherCredentials(updated);
    localStorage.setItem('teacherCredentials', JSON.stringify(updated));
  };

  // Update Game Password Mode directly from Teacher Control Center
  const handleUpdateGamePasswordMode = (
    gameId: string,
    passwordType: PasswordType,
    passwordValue?: string,
    dynamicInterval?: number
  ) => {
    const targetGame = games.find((g) => g.id === gameId);
    if (!targetGame) return;

    requestConfirm(
      'Xác Nhận Đổi Chế Độ Mật Khẩu',
      `Bạn có chắc chắn muốn chuyển game "${targetGame.title}" sang chế độ ${
        passwordType === 'none'
          ? 'Không mật khẩu'
          : passwordType === 'static'
          ? `Mã tĩnh (${passwordValue})`
          : `Mã động (Tự đổi sau ${dynamicInterval}s)`
      }?`,
      () => {
        const updatedGame: GameQuiz = {
          ...targetGame,
          passwordType,
          passwordValue: passwordType === 'static' ? passwordValue : targetGame.passwordValue,
          dynamicInterval: passwordType === 'dynamic' ? dynamicInterval : targetGame.dynamicInterval,
          updatedAt: Date.now()
        };
        setGames((prev) => {
          const nextGames = prev.map((g) => (g.id === gameId ? updatedGame : g));
          try {
            localStorage.setItem('mslanie_games', JSON.stringify(nextGames));
          } catch (e) {}
          broadcastSync({ type: 'GAMES_UPDATED', payload: nextGames });
          return nextGames;
        });
        saveGameToCloud(updatedGame).catch((err) => {
          console.warn('[Firebase] Lỗi lưu chế độ mật khẩu lên cloud:', err);
        });
      }
    );
  };

  // Toggle Publish (Bật/tắt ẩn hiện game cho học sinh with popup confirm)
  const handleTogglePublish = (gameId: string) => {
    const targetGame = games.find((g) => g.id === gameId);
    if (!targetGame) return;

    const actionText = targetGame.isPublished
      ? `ẨN trò chơi "${targetGame.title}" đối với học sinh`
      : `BẬT HIỂN THỊ trò chơi "${targetGame.title}" cho học sinh`;

    requestConfirm(
      'Xác Nhận Đổi Trạng Thái Game',
      `Bạn có chắc chắn muốn ${actionText} không?`,
      () => {
        const updatedGame: GameQuiz = {
          ...targetGame,
          isPublished: !targetGame.isPublished,
          updatedAt: Date.now()
        };
        setGames((prev) => {
          const nextGames = prev.map((g) => (g.id === gameId ? updatedGame : g));
          try {
            localStorage.setItem('mslanie_games', JSON.stringify(nextGames));
          } catch (e) {}
          broadcastSync({ type: 'GAMES_UPDATED', payload: nextGames });
          return nextGames;
        });
        saveGameToCloud(updatedGame).catch((err) => {
          console.warn('[Firebase] Lỗi cập nhật trạng thái ẩn/hiện lên cloud:', err);
        });
      }
    );
  };

  // Delete Game with popup confirm (permanently removes from local & cloud, immune to F5 resurrection)
  const handleDeleteGame = (gameId: string) => {
    const targetGame = games.find((g) => g.id === gameId);
    if (!targetGame) return;

    requestConfirm(
      'Xác Nhận Xóa Trò Chơi',
      `Bạn có chắc chắn muốn XÓA VĨNH VIỄN trò chơi "${targetGame.title}" không? Trò chơi sẽ bị gỡ bỏ ngay lập tức và không bao giờ xuất hiện lại sau khi F5.`,
      () => {
        // 1. Ghi nhận vĩnh viễn vào danh sách đã xóa (Tombstone)
        markGameAsDeleted(gameId);

        // 2. Lọc bỏ ngay khỏi giao diện và bộ nhớ máy
        const nextGames = games.filter((g) => g.id !== gameId);
        setGames(nextGames);
        try {
          localStorage.setItem('mslanie_games', JSON.stringify(nextGames));
        } catch (e) {}
        broadcastSync({ type: 'GAMES_UPDATED', payload: nextGames });
        broadcastSync({ type: 'GAME_DELETED', payload: gameId });

        // 3. Xóa triệt để trên Firebase Realtime Database
        // Gọi cả deleteGameFromCloud VÀ pushAllLocalGamesToCloud(nextGames)
        // để ghi đè sạch node 'games' trên Cloud, bảo đảm máy khác hay ẩn danh không bao giờ thấy lại
        deleteGameFromCloud(gameId).catch((err) => {
          console.warn('[Firebase] Lỗi xóa game trên cloud:', err);
        });
        pushAllLocalGamesToCloud(nextGames).catch((err) => {
          console.warn('[Firebase] Lỗi cập nhật danh sách sau xóa:', err);
        });

        // 4. Thông báo nổi trên màn hình
        setToastMessage(`Đã xóa vĩnh viễn trò chơi "${targetGame.title}" thành công.`);
        setTimeout(() => setToastMessage(null), 4000);
      },
      true,
      'Xóa Vĩnh Viễn'
    );
  };

  // Save / Update Game (called from Modal & Scanner)
  const handleSaveGame = (savedGame: GameQuiz) => {
    // Nếu game này trước đó từng có ID bị xóa, gỡ cờ xóa
    unmarkGameAsDeleted(savedGame.id);

    const gameWithTimestamp: GameQuiz = {
      ...savedGame,
      updatedAt: Date.now()
    };

    setGames((prev) => {
      const exists = prev.some((g) => g.id === gameWithTimestamp.id);
      const nextGames = exists
        ? prev.map((g) => (g.id === gameWithTimestamp.id ? gameWithTimestamp : g))
        : [gameWithTimestamp, ...prev];

      // Ghi ngay lập tức vào localStorage để F5 không bao giờ mất dữ liệu
      try {
        localStorage.setItem('mslanie_games', JSON.stringify(nextGames));
      } catch (e) {
        console.error('[Storage] Lỗi ghi localStorage:', e);
      }

      // Phát tín hiệu đồng bộ ngay sang tất cả các tab khác
      broadcastSync({ type: 'GAMES_UPDATED', payload: nextGames });

      return nextGames;
    });

    // Luôn đẩy trực tiếp lên Firebase Realtime Database
    saveGameToCloud(gameWithTimestamp)
      .then(() => {
        setCloudStatus('connected');
        setLastSyncTime(new Date());
      })
      .catch((err) => {
        console.warn('[Firebase] Chưa thể đẩy game lên cloud ngay:', err);
        if (err?.message?.toLowerCase().includes('permission_denied')) {
          setCloudStatus('permission_denied');
        }
      });
  };

  // Save score from student game play
  const handleSaveScore = (entry: LeaderboardEntry) => {
    setLeaderboard((prev) => {
      const nextLb = [entry, ...prev];
      try {
        localStorage.setItem('mslanie_leaderboard', JSON.stringify(nextLb));
      } catch (e) {}
      broadcastSync({ type: 'LEADERBOARD_UPDATED', payload: nextLb });
      return nextLb;
    });

    setGames((prev) => {
      const nextGames = prev.map((g) =>
        g.id === entry.gameId
          ? { ...g, totalPlays: g.totalPlays + 1, updatedAt: Date.now() }
          : g
      );
      try {
        localStorage.setItem('mslanie_games', JSON.stringify(nextGames));
      } catch (e) {}
      broadcastSync({ type: 'GAMES_UPDATED', payload: nextGames });
      return nextGames;
    });

    // Lưu điểm học sinh lên Firebase Cloud
    saveScoreToCloud(entry).catch((err) => {
      console.warn('[Firebase] Lỗi lưu điểm lên cloud:', err);
      if (err?.message?.toLowerCase().includes('permission_denied')) {
        setCloudStatus('permission_denied');
      }
    });
  };

  // Đẩy toàn bộ đề đang có trên máy (localStorage) lên Firebase Realtime Database
  const handleSyncAllToCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await pushAllLocalGamesToCloud(games);
      if (res.success) {
        setCloudStatus('connected');
        setLastSyncTime(new Date());
        requestConfirm(
          'Đồng Bộ Lên Cloud Thành Công! 🎉',
          `Hệ thống đã đẩy thành công toàn bộ ${res.count} trò chơi lên Firebase Realtime Database (en-mslanie). Bây giờ mọi học sinh trên điện thoại và máy tính khác đều có thể thấy đề thi và làm bài!`,
          () => {},
          false,
          'Tuyệt vời'
        );
      } else {
        if (res.error?.toLowerCase().includes('permission_denied')) {
          setCloudStatus('permission_denied');
          requestConfirm(
            'Quyền Firebase Đang Khóa (PERMISSION_DENIED)',
            'Firebase Realtime Database chưa cho phép ghi dữ liệu. Cô chỉ cần bấm vào "Xem Rule Chuẩn Realtime DB", copy đoạn mã JSON và dán vào tab Rules trên Firebase Console là xong ngay!',
            () => {},
            true,
            'Xem Hướng Dẫn'
          );
        } else {
          requestConfirm(
            'Lỗi Đồng Bộ',
            `Không thể đồng bộ: ${res.error}`,
            () => {},
            true,
            'Đóng'
          );
        }
      }
    } catch (err: any) {
      setCloudStatus('error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Student view published games filter
  const visibleGamesForStudents = games.filter((g) => g.isPublished);

  // If a game is active for play, render StudentGamePlay as a dedicated full-page view
  if (activePlayGame) {
    return (
      <div className="min-h-screen w-screen bg-[#FEFDED] text-stone-900 font-sans">
        <StudentGamePlay
          game={activePlayGame}
          initialPassword={activePassProvided}
          onClose={() => setActivePlayGame(null)}
          onSaveScore={handleSaveScore}
          isTeacher={role === 'teacher' && isTeacherAuthenticated}
          allLeaderboard={leaderboard}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-[#FEFDED] text-stone-900 font-sans flex flex-col justify-between overflow-x-hidden selection:bg-amber-200 selection:text-stone-900">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if ((tab === 'scanner' || tab === 'gemini') && !isTeacherAuthenticated) {
            setIsTeacherLoginOpen(true);
            return;
          }
          if (role === 'student' && tab === 'leaderboard') {
            setCurrentTab('games');
            return;
          }
          setCurrentTab(tab);
        }}
        role={role}
        onRoleChange={handleRoleChange}
        onOpenQuickJoin={() => setIsQuickJoinOpen(true)}
        customLogoUrl={customLogoUrl}
      />

      {/* Main Area */}
      <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {/* Role Notice Header Banner */}
        <div className="mb-6 bg-[#FAF8E5] border border-[#E2E0C8] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-stone-700">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>
              Chế độ hiện tại:{' '}
              <strong className="text-stone-900">
                {role === 'teacher'
                  ? `👩‍🏫 Giáo Viên (Ms. Lanie - ${teacherCredentials.username})`
                  : '🎓 Học Sinh (Đang chọn trò chơi làm bài)'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {role === 'student' ? (
              <span className="text-[11px] font-semibold text-stone-500">
                Hiển thị {visibleGamesForStudents.length} game đang mở
              </span>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setGameToEdit(null);
                    setIsGameModalOpen(true);
                  }}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                >
                  + Tạo game điền từ mới
                </button>

                <button
                  onClick={handleTeacherLogout}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
                  title="Đăng xuất quyền Giáo viên"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Games List */}
        {currentTab === 'games' && (
          <>
            {role === 'teacher' ? (
              <TeacherGameManager
                games={games}
                onTogglePublish={handleTogglePublish}
                onDeleteGame={handleDeleteGame}
                onOpenCreateGame={() => {
                  setGameToEdit(null);
                  setIsGameModalOpen(true);
                }}
                onOpenEditGame={(g) => {
                  setGameToEdit(g);
                  setIsGameModalOpen(true);
                }}
                onPlayGame={(g) => {
                  setActivePlayGame(g);
                  setActivePassProvided(g.passwordValue || '');
                }}
                onViewLeaderboard={(gameId) => {
                  setSelectedLeaderboardFilter(gameId);
                  setCurrentTab('leaderboard');
                }}
                onUpdateGamePasswordMode={handleUpdateGamePasswordMode}
                cloudStatus={cloudStatus}
                onSyncAllToCloud={handleSyncAllToCloud}
                isSyncingCloud={isSyncingCloud}
                lastSyncTime={lastSyncTime}
              />
            ) : (
              /* Student Games Arena View */
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-[#E2E0C8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                        Student Arena
                      </span>
                    </div>
                    <h1 className="text-xl font-bold text-stone-900">
                      Chọn Trò Chơi Điền Từ Vựng Tiếng Anh
                    </h1>
                    <p className="text-xs text-stone-500 mt-1">
                      Chọn bài thi bên dưới và nhập tên để bắt đầu tích điểm lên Bảng Xếp Hạng!
                    </p>
                  </div>

                  <button
                    onClick={() => setIsQuickJoinOpen(true)}
                    className="bg-amber-400 hover:bg-amber-500 text-stone-900 font-extrabold text-xs py-3 px-5 rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-2 w-fit border border-amber-500/30"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Nhập Mã PIN Game</span>
                  </button>
                </div>

                {visibleGamesForStudents.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-[#E2E0C8] text-center space-y-2 text-stone-500 text-xs">
                    <p className="font-bold text-stone-800 text-sm">Hiện chưa có trò chơi nào mở.</p>
                    <p>Giáo viên Ms. Lanie đang chuẩn bị bộ đề thi mới, vui lòng quay lại sau!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleGamesForStudents.map((game) => (
                      <div
                        key={game.id}
                        className="bg-white rounded-2xl p-6 border border-[#E2E0C8] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {game.category}
                            </span>
                            <span className="text-xs font-semibold text-stone-500">
                              {game.totalPlays} lượt chơi
                            </span>
                          </div>

                          <h3 className="font-extrabold text-stone-900 text-base mb-1.5 leading-snug">
                            {game.title}
                          </h3>
                          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-4">
                            {game.description}
                          </p>

                          <div className="bg-[#FAF8E5] p-3 rounded-xl border border-[#E2E0C8] space-y-1.5 text-xs mb-4">
                            <div className="flex items-center justify-between text-stone-700">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                                Mật khẩu:
                              </span>
                              <span className="font-bold text-stone-900">
                                {game.passwordType === 'none'
                                  ? 'Tự do'
                                  : game.passwordType === 'static'
                                  ? 'Có mật khẩu tĩnh'
                                  : 'Mã PIN xoay động'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-stone-700">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Thời gian:
                              </span>
                              <span className="font-bold text-stone-900">
                                {game.timePerQuestion > 0 ? `${game.timePerQuestion}s / câu` : 'Tùy chỉnh từng câu'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActivePlayGame(game);
                            setActivePassProvided('');
                          }}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>VÀO CHƠI GAME NGAY</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Tab 2: Leaderboard (Teacher only as requested) */}
        {currentTab === 'leaderboard' && role === 'teacher' && (
          <LeaderboardView
            leaderboard={leaderboard}
            games={games}
            selectedGameFilter={selectedLeaderboardFilter}
          />
        )}

        {/* Tab 3: Document Scanner */}
        {currentTab === 'scanner' && role === 'teacher' && (
          <TeacherDocumentScanner
            geminiApiKey={geminiApiKey}
            onSaveScannedGame={handleSaveGame}
            onNavigateToGames={() => setCurrentTab('games')}
            onRequestConfirm={requestConfirm}
            onNavigateToGeminiKeyTab={() => setCurrentTab('gemini')}
          />
        )}

        {/* Tab 4: Gemini API Key */}
        {currentTab === 'gemini' && role === 'teacher' && (
          <GeminiKeyTab
            apiKey={geminiApiKey}
            onSaveApiKey={handleSaveApiKey}
            onRequestConfirm={requestConfirm}
          />
        )}

        {/* Tab 5: Settings */}
        {currentTab === 'settings' && (
          <SettingsTab
            teacherUsername={teacherCredentials.username}
            teacherPassword={teacherCredentials.password}
            onChangePassword={handleChangePassword}
            onRequestConfirm={requestConfirm}
            isTeacherAuthenticated={isTeacherAuthenticated}
            customLogoUrl={customLogoUrl}
            onSaveCustomLogoUrl={handleSaveCustomLogoUrl}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Quick Join Modal */}
      <QuickJoinModal
        isOpen={isQuickJoinOpen}
        onClose={() => setIsQuickJoinOpen(false)}
        games={games}
        onStartGame={(g, pass) => {
          setActivePlayGame(g);
          setActivePassProvided(pass || '');
        }}
      />

      {/* Teacher Create/Edit Game Modal */}
      <TeacherGameModal
        isOpen={isGameModalOpen}
        onClose={() => {
          setIsGameModalOpen(false);
          setGameToEdit(null);
        }}
        gameToEdit={gameToEdit}
        onSaveGame={handleSaveGame}
        onRequestConfirm={requestConfirm}
      />

      {/* Teacher Login Modal */}
      <TeacherLoginModal
        isOpen={isTeacherLoginOpen}
        onClose={() => setIsTeacherLoginOpen(false)}
        onLoginSuccess={handleTeacherLoginSuccess}
        teacherUsername={teacherCredentials.username}
        teacherPassword={teacherCredentials.password}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[70] max-w-md bg-stone-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-stone-700/60 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
          <p className="text-xs font-semibold leading-relaxed flex-1">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-white p-1 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
