import React, { useState, useEffect } from 'react';
import { GameQuiz, PasswordType } from '../types';
import {
  getDynamicPin,
  getDynamicSecondsRemaining,
  getCurrentGamePassword
} from '../utils/passwordUtils';
import {
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Clock,
  Award,
  Lock,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  Cloud,
  CloudUpload,
  CloudCheck,
  CloudOff,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Zap
} from 'lucide-react';
import { SyncStatus } from '../utils/firebase';

interface TeacherGameManagerProps {
  games: GameQuiz[];
  onTogglePublish: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  onOpenCreateGame: () => void;
  onOpenEditGame: (game: GameQuiz) => void;
  onPlayGame: (game: GameQuiz) => void;
  onViewLeaderboard: (gameId: string) => void;
  onUpdateGamePasswordMode?: (
    gameId: string,
    passwordType: PasswordType,
    passwordValue?: string,
    dynamicInterval?: number
  ) => void;
  cloudStatus?: SyncStatus;
  onSyncAllToCloud?: () => void;
  isSyncingCloud?: boolean;
  lastSyncTime?: Date | null;
}

export const TeacherGameManager: React.FC<TeacherGameManagerProps> = ({
  games,
  onTogglePublish,
  onDeleteGame,
  onOpenCreateGame,
  onOpenEditGame,
  onPlayGame,
  onViewLeaderboard,
  onUpdateGamePasswordMode,
  cloudStatus = 'connected',
  onSyncAllToCloud,
  isSyncingCloud = false,
  lastSyncTime,
}) => {
  const [filter, setFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [editingPasswordGameId, setEditingPasswordGameId] = useState<string | null>(null);
  const [tempStaticPass, setTempStaticPass] = useState<string>('');
  const [tempDynamicInterval, setTempDynamicInterval] = useState<number>(30);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [copiedRule, setCopiedRule] = useState(false);

  const RECOMMENDED_RULES = `{
  "rules": {
    "games": {
      ".read": true,
      ".write": true
    },
    "leaderboard": {
      ".read": true,
      ".write": true
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(RECOMMENDED_RULES);
    setCopiedRule(true);
    setTimeout(() => setCopiedRule(false), 2500);
  };

  // Live timer tick for dynamic password countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredGames = games.filter((g) => {
    if (filter === 'published') return g.isPublished;
    if (filter === 'hidden') return !g.isPublished;
    return true;
  });

  const handlePasswordModeChange = (
    game: GameQuiz,
    newType: PasswordType,
    staticVal?: string,
    interval?: number
  ) => {
    if (onUpdateGamePasswordMode) {
      const finalStatic = staticVal !== undefined ? staticVal : game.passwordValue || 'LANIE123';
      const finalInterval = interval !== undefined ? interval : game.dynamicInterval || 30;
      onUpdateGamePasswordMode(game.id, newType, finalStatic, finalInterval);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Control Banner */}
      <div className="bg-[#FEFDED] rounded-2xl p-6 border border-[#E2E0C8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Teacher Control Center
            </span>
            <span className="text-xs text-stone-500 font-semibold">Ms. Lanie Đặng</span>
          </div>
          <h1 className="text-xl font-bold text-stone-900">Quản Lý Trò Chơi & Mật Khẩu Phòng Game</h1>
          <p className="text-xs text-stone-500 mt-1">
            Chuyển đổi linh hoạt giữa Không mã, Mã tĩnh và Mã động tự đổi sau 1s - 100s cho từng trò chơi.
          </p>
        </div>

        <button
          onClick={onOpenCreateGame}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-2 w-fit shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Trò Chơi Mới</span>
        </button>
      </div>

      {/* Cloud Sync Status & Quick Actions Bar */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          cloudStatus === 'permission_denied'
            ? 'bg-rose-50/90 border-rose-200 text-rose-900'
            : cloudStatus === 'connected'
            ? 'bg-[#FAF8E5] border-emerald-300 text-stone-800'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {cloudStatus === 'connected' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Firebase Realtime Database: ĐÃ KẾT NỐI (en-mslanie)
              </span>
            )}
            {cloudStatus === 'permission_denied' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-900 border border-rose-300">
                <AlertCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                CẢNH BÁO: RULE REALTIME DATABASE ĐANG KHÓA (PERMISSION DENIED)
              </span>
            )}
            {cloudStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-spin"></span>
                Đang đồng bộ Firebase Cloud...
              </span>
            )}
            {(cloudStatus === 'offline' || cloudStatus === 'error') && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Chế độ Ngoại tuyến (Đang lưu tạm trên máy cô giáo)
              </span>
            )}

            {lastSyncTime && (
              <span className="text-[11px] text-stone-500 font-medium">
                • Cập nhật: {lastSyncTime.toLocaleTimeString('vi-VN')}
              </span>
            )}
          </div>

          <p className="text-xs leading-relaxed">
            {cloudStatus === 'permission_denied' ? (
              <span className="font-semibold text-rose-700">
                Rule Firebase của cô hiện đang khóa <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">.read: false</code>. Học sinh trên điện thoại khác sẽ KHÔNG THẤY ĐỀ. Bấm nút "Sửa Rule Chuẩn" bên phải để mở khóa ngay!
              </span>
            ) : cloudStatus === 'connected' ? (
              <span className="text-emerald-800 font-medium">
                ✅ <strong>Tự động đồng bộ bật:</strong> Mọi đề thi cô tạo mới hoặc sửa sẽ tự động lưu và xuất hiện cho học sinh ngay lập tức mà cô không cần bấm nút đẩy lên cloud.
              </span>
            ) : (
              <span className="text-stone-600">
                Dữ liệu hiện đang được lưu trên trình duyệt của máy. Khi có mạng và cấu hình rule xong, hệ thống sẽ tự động đồng bộ.
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tự Động Lưu Cloud</span>
          </div>

          {onSyncAllToCloud && (
            <button
              onClick={onSyncAllToCloud}
              disabled={isSyncingCloud}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-bold text-xs rounded-xl border border-stone-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Đồng bộ lại tất cả đề thi có trên máy lên Firebase Cloud nếu có đề bị sót"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Đang kiểm tra...' : 'Đồng bộ lại tất cả'}</span>
            </button>
          )}

          <button
            onClick={() => setIsRuleModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Xem mã Rule chuẩn và cách cấu hình trên Firebase Console"
          >
            <span>📋 Xem Rule Chuẩn Realtime DB</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-[#FAF8E5] text-stone-600 border border-[#E2E0C8] hover:bg-stone-200'
            }`}
          >
            Tất cả ({games.length})
          </button>
          <button
            onClick={() => setFilter('published')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              filter === 'published'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#FAF8E5] text-stone-600 border border-[#E2E0C8] hover:bg-stone-200'
            }`}
          >
            Đang Hiện ({games.filter((g) => g.isPublished).length})
          </button>
          <button
            onClick={() => setFilter('hidden')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              filter === 'hidden'
                ? 'bg-stone-800 text-white'
                : 'bg-[#FAF8E5] text-stone-600 border border-[#E2E0C8] hover:bg-stone-200'
            }`}
          >
            Đã Ẩn ({games.filter((g) => !g.isPublished).length})
          </button>
        </div>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGames.map((game) => {
          const dynamicSecs = getDynamicSecondsRemaining(game.dynamicInterval || 30);
          const currentDynamicPin = getDynamicPin(game.id, game.dynamicInterval || 30);
          const isConfiguringPass = editingPasswordGameId === game.id;

          return (
            <div
              key={game.id}
              className={`bg-[#FEFDED] rounded-2xl p-6 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md relative overflow-hidden ${
                game.isPublished ? 'border-[#E2E0C8]' : 'border-stone-300 bg-stone-50/70'
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    {game.category}
                  </span>

                  <button
                    onClick={() => onTogglePublish(game.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-colors border ${
                      game.isPublished
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-stone-200 text-stone-600 border-stone-300 hover:bg-stone-300'
                    }`}
                    title={game.isPublished ? 'Ẩn game đối với học sinh' : 'Hiển thị game cho học sinh'}
                  >
                    {game.isPublished ? (
                      <>
                        <Eye className="w-3 h-3 text-emerald-600" />
                        <span>ĐANG HIỆN</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-stone-500" />
                        <span>ĐÃ ẨN</span>
                      </>
                    )}
                  </button>
                </div>

                <h3 className="font-extrabold text-stone-900 text-base mb-1.5 line-clamp-2">
                  {game.title}
                </h3>
                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-4">
                  {game.description}
                </p>

                {/* Password Mode Option Selector Box (Teacher Control) */}
                <div className="bg-[#FAF8E5] p-3.5 rounded-xl border border-[#E2E0C8] space-y-3 mb-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-stone-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      Cài Đặt Mã Bảo Vệ Game:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isConfiguringPass) {
                          setEditingPasswordGameId(null);
                        } else {
                          setEditingPasswordGameId(game.id);
                          setTempStaticPass(game.passwordValue || 'LANIE123');
                          setTempDynamicInterval(game.dynamicInterval || 30);
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>{isConfiguringPass ? 'Đóng cài đặt' : 'Cấu hình chi tiết'}</span>
                    </button>
                  </div>

                  {/* 3 Direct Password Mode Options */}
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => handlePasswordModeChange(game, 'none')}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
                        game.passwordType === 'none'
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Không mã
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePasswordModeChange(game, 'static')}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
                        game.passwordType === 'static'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Mã tĩnh
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePasswordModeChange(game, 'dynamic')}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer flex items-center justify-center gap-0.5 ${
                        game.passwordType === 'dynamic'
                          ? 'bg-amber-500 text-stone-900 border-amber-600 shadow-xs'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <Zap className="w-2.5 h-2.5" />
                      <span>Mã động</span>
                    </button>
                  </div>

                  {/* Active Password Mode Details Display */}
                  <div className="pt-1.5 border-t border-stone-200/60">
                    {game.passwordType === 'none' && (
                      <div className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Học sinh vào thẳng bài game mà không cần nhập mật khẩu.</span>
                      </div>
                    )}

                    {game.passwordType === 'static' && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-stone-600 flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                          Mật khẩu cố định:
                        </span>
                        <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                          {game.passwordValue || 'LANIE123'}
                        </span>
                      </div>
                    )}

                    {game.passwordType === 'dynamic' && (
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-stone-600 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-600" />
                            Mã PIN động live:
                          </span>
                          <span className="font-mono font-extrabold text-stone-900 bg-amber-200 px-2.5 py-0.5 rounded border border-amber-300 tracking-wider">
                            {currentDynamicPin}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-stone-500 text-[10px]">
                          <span>Tự động đổi sau mỗi {game.dynamicInterval || 30}s:</span>
                          <span className="font-bold text-amber-700 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Còn {dynamicSecs}s
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Config Popdown Panel when teacher edits details */}
                  {isConfiguringPass && (
                    <div className="pt-2 border-t border-stone-300 space-y-2 bg-white p-3 rounded-lg border border-stone-200">
                      {game.passwordType === 'static' && (
                        <div>
                          <label className="text-[10px] font-bold text-stone-700 block mb-1">
                            Thay đổi Mật Khẩu Tĩnh:
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={tempStaticPass}
                              onChange={(e) => setTempStaticPass(e.target.value)}
                              className="flex-1 text-xs font-mono font-bold p-1.5 rounded border border-stone-300 bg-stone-50"
                              placeholder="VD: LANIE123"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handlePasswordModeChange(game, 'static', tempStaticPass);
                                setEditingPasswordGameId(null);
                              }}
                              className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded cursor-pointer"
                            >
                              Lưu
                            </button>
                          </div>
                        </div>
                      )}

                      {game.passwordType === 'dynamic' && (
                        <div>
                          <label className="text-[10px] font-bold text-stone-700 block mb-1">
                            Khoảng thời gian tự đổi mã PIN (1s đến 100s):
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={tempDynamicInterval}
                              onChange={(e) =>
                                setTempDynamicInterval(
                                  Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                                )
                              }
                              className="w-20 text-xs font-bold p-1.5 rounded border border-stone-300 bg-stone-50"
                            />
                            <span className="text-[10px] text-stone-500 font-bold">giây</span>
                            <button
                              type="button"
                              onClick={() => {
                                handlePasswordModeChange(
                                  game,
                                  'dynamic',
                                  game.passwordValue,
                                  tempDynamicInterval
                                );
                                setEditingPasswordGameId(null);
                              }}
                              className="ml-auto px-2.5 py-1 bg-amber-500 text-stone-900 font-bold text-[10px] rounded cursor-pointer"
                            >
                              Lưu
                            </button>
                          </div>
                        </div>
                      )}

                      {game.passwordType === 'none' && (
                        <p className="text-[10px] text-stone-500">
                          Game này đang chọn chế độ Không có mã. Vui lòng chọn "Mã tĩnh" hoặc "Mã động" nếu muốn bật bảo vệ.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Standard Metadata Summary */}
                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-stone-700 text-[11px]">
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Thời gian / câu:
                    </span>
                    <span className="font-bold text-stone-900">
                      {game.timePerQuestion > 0 ? `${game.timePerQuestion}s` : 'Không giới hạn'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPlayGame(game)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-2xs"
                    title="Chơi thử game này"
                  >
                    Chơi thử
                  </button>

                  <button
                    onClick={() => onViewLeaderboard(game.id)}
                    className="px-2.5 py-1.5 text-stone-700 hover:text-amber-800 hover:bg-amber-100/80 bg-amber-50 rounded-lg cursor-pointer transition-colors border border-amber-200/80 text-xs font-bold flex items-center gap-1.5"
                    title="Xem Bảng Xếp Hạng"
                  >
                    <Award className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Xem Bảng Xếp Hạng</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenEditGame(game)}
                    className="p-1.5 text-stone-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                    title="Chỉnh sửa Game & Câu hỏi"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteGame(game.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    title="Xóa game này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Realtime Database Rule Helper Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FEFDED] rounded-2xl max-w-xl w-full border border-[#E2E0C8] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E0C8]">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Cloud className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">
                    Rule Chuẩn Cho Firebase Realtime Database
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Dự án: <span className="font-mono font-bold text-stone-800">en-mslanie</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1">
                <p className="font-bold text-amber-900">💡 Vì sao học sinh chưa thấy đề thi?</p>
                <p className="text-amber-800 leading-relaxed">
                  Khi chuyển sang Production mode, Firebase tự động khóa mọi đường dẫn (<code className="font-mono bg-white px-1 py-0.5 rounded">.read: false</code>). Do đó máy học sinh không đọc được đề thi. Cô chỉ cần dán đoạn mã bên dưới vào tab Rules của Realtime Database:
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-stone-800">Mã JSON Rule cần dán vào Realtime Database:</span>
                  <button
                    onClick={handleCopyRules}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
                  >
                    {copiedRule ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép mã</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="bg-stone-900 text-emerald-400 p-3.5 rounded-xl text-xs font-mono overflow-x-auto shadow-inner leading-relaxed">
                  {RECOMMENDED_RULES}
                </pre>
              </div>

              <div className="bg-stone-100 p-3 rounded-xl space-y-2 border border-stone-200">
                <p className="font-bold text-stone-900">Các bước thực hiện trên Firebase Console:</p>
                <ol className="list-decimal list-inside space-y-1 text-stone-600 pl-1 leading-relaxed">
                  <li>Vào trang <strong>Firebase Console</strong> &gt; chọn dự án <strong>en-mslanie</strong>.</li>
                  <li>Ở menu trái chọn <strong>Build</strong> &gt; <strong>Realtime Database</strong>.</li>
                  <li>Bấm sang tab <strong>Rules</strong> (Quy tắc).</li>
                  <li>Xóa nội dung cũ, dán đoạn mã JSON ở trên vào và bấm <strong>Publish</strong> (Xuất bản).</li>
                  <li>Quay lại trang này và bấm nút <strong>"☁️ Đẩy toàn bộ đề lên Cloud"</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Đã Hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
