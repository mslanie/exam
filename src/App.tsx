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

  // Games & Leaderboard State
  const [games, setGames] = useState<GameQuiz[]>(() => {
    const savedGames = localStorage.getItem('mslanie_games');
    if (savedGames) {
      try {
        return JSON.parse(savedGames);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_GAMES;
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

  // Real-time synchronization from Firebase Realtime Database
  useEffect(() => {
    let isInitialMount = true;
    const unsubGames = listenToCloudGames(
      (cloudGames) => {
        if (cloudGames && cloudGames.length > 0) {
          setGames(cloudGames);
        } else if (isInitialMount) {
          // If cloud has no games yet, auto-push local games so students have access immediately
          const savedGames = localStorage.getItem('mslanie_games');
          if (savedGames) {
            try {
              const parsed = JSON.parse(savedGames);
              if (Array.isArray(parsed) && parsed.length > 0) {
                pushAllLocalGamesToCloud(parsed).catch((e) =>
                  console.warn('[Firebase] Initial auto-push note:', e?.message)
                );
              }
            } catch (e) {
              // ignore
            }
          }
        }
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
          setLeaderboard(cloudLb);
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

  // Save games & leaderboard to localStorage as reliable backup
  useEffect(() => {
    localStorage.setItem('mslanie_games', JSON.stringify(games));
  }, [games]);

  useEffect(() => {
    localStorage.setItem('mslanie_leaderboard', JSON.stringify(leaderboard));
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
          dynamicInterval: passwordType === 'dynamic' ? dynamicInterval : targetGame.dynamicInterval
        };
        setGames((prev) => prev.map((g) => (g.id === gameId ? updatedGame : g)));
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
        const updatedGame: GameQuiz = { ...targetGame, isPublished: !targetGame.isPublished };
        setGames((prev) => prev.map((g) => (g.id === gameId ? updatedGame : g)));
        saveGameToCloud(updatedGame).catch((err) => {
          console.warn('[Firebase] Lỗi cập nhật trạng thái ẩn/hiện lên cloud:', err);
        });
      }
    );
  };

  // Delete Game with popup confirm
  const handleDeleteGame = (gameId: string) => {
    const targetGame = games.find((g) => g.id === gameId);
    if (!targetGame) return;

    requestConfirm(
      'Xác Nhận Xóa Trò Chơi',
      `Bạn có chắc chắn muốn XÓA VĨNH VIỄN trò chơi "${targetGame.title}" không? Dữ liệu này không thể hoàn tác.`,
      () => {
        setGames((prev) => prev.filter((g) => g.id !== gameId));
        deleteGameFromCloud(gameId).catch((err) => {
          console.warn('[Firebase] Lỗi xóa game trên cloud:', err);
        });
      },
      true,
      'Xóa Vĩnh Viễn'
    );
  };

  // Save / Update Game (called from Modal & Scanner)
  const handleSaveGame = (savedGame: GameQuiz) => {
    setGames((prev) => {
      const exists = prev.some((g) => g.id === savedGame.id);
      if (exists) {
        return prev.map((g) => (g.id === savedGame.id ? savedGame : g));
      }
      return [savedGame, ...prev];
    });

    // Luôn đẩy trực tiếp lên Firebase Realtime Database
    saveGameToCloud(savedGame)
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
    setLeaderboard((prev) => [entry, ...prev]);
    setGames((prev) =>
      prev.map((g) => (g.id === entry.gameId ? { ...g, totalPlays: g.totalPlays + 1 } : g))
    );

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
    </div>
  );
}
