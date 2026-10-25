import React, { useState, useEffect } from 'react';
import { NavigationTab, AppRole } from '../types';
import {
  Gamepad2,
  Award,
  Settings,
  UserCheck,
  Shield,
  KeyRound,
  Sparkles,
  Key,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

interface NavbarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  role: AppRole;
  onRoleChange: (role: AppRole) => void;
  onOpenQuickJoin: () => void;
  customLogoUrl?: string;
}

// Vietnamese Flag SVG / Logo Renderer with image fallback
export const AppLogo: React.FC<{ customLogoUrl?: string; className?: string }> = ({
  customLogoUrl,
  className = 'w-9 h-9'
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [customLogoUrl]);

  if (customLogoUrl && customLogoUrl.trim() !== '' && !imgError) {
    return (
      <img
        src={customLogoUrl.trim()}
        alt="App Logo"
        onError={() => setImgError(true)}
        className={`${className} object-cover rounded-xl border border-stone-200/80 shadow-xs shrink-0`}
      />
    );
  }

  // Default: Flag of Vietnam (Lá cờ Việt Nam)
  return (
    <div
      className={`${className} bg-[#DA251D] rounded-xl flex items-center justify-center shadow-xs border border-red-700/20 shrink-0 overflow-hidden`}
      title="Ms. Lanie English Quiz - Vietnam"
    >
      <svg viewBox="0 0 300 200" className="w-full h-full object-cover">
        <rect width="300" height="200" fill="#DA251D" />
        <polygon
          points="150,40 163.5,81.5 207.1,81.5 171.8,107.1 185.3,148.5 150,122.9 114.7,148.5 128.2,107.1 92.9,81.5 136.5,81.5"
          fill="#FFCD00"
        />
      </svg>
    </div>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  role,
  onRoleChange,
  onOpenQuickJoin,
  customLogoUrl
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabClick = (tab: NavigationTab) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-[#FEFDED] border-b border-[#E2E0C8] px-3 sm:px-6 md:px-8 py-2.5 md:py-0 md:h-16 sticky top-0 z-40 shadow-xs">
      <div className="flex items-center justify-between h-full max-w-7xl mx-auto gap-2 sm:gap-4">
        {/* Brand Section: Logo + Text (Text hidden on mobile < sm) */}
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0"
          onClick={() => handleTabClick('games')}
        >
          <AppLogo customLogoUrl={customLogoUrl} className="w-8 h-8 sm:w-9 sm:h-9" />

          {/* Text block: ONLY visible on sm and larger screens as requested */}
          <div className="hidden sm:flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight text-stone-800 whitespace-nowrap">
                Ms. Lanie English
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                Quiz Arena
              </span>
            </div>
            <span className="text-[10px] text-stone-500 -mt-0.5 hidden lg:inline-block">
              Hệ thống Game điền từ vựng & Kiểm tra tiếng Anh
            </span>
          </div>
        </div>

        {/* DESKTOP NAVIGATION LINKS (lg:flex) */}
        <div className="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-stone-600">
          <button
            onClick={() => handleTabClick('games')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              currentTab === 'games'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'hover:bg-stone-200/60 text-stone-700'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Danh sách Game</span>
          </button>

          {/* Teacher ONLY: Bảng xếp hạng */}
          {role === 'teacher' && (
            <button
              onClick={() => handleTabClick('leaderboard')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentTab === 'leaderboard'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'hover:bg-stone-200/60 text-stone-700'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Bảng xếp hạng</span>
            </button>
          )}

          {role === 'teacher' && (
            <>
              <button
                onClick={() => handleTabClick('scanner')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  currentTab === 'scanner'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'hover:bg-stone-200/60 text-stone-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Quét Đề AI</span>
              </button>

              <button
                onClick={() => handleTabClick('gemini')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  currentTab === 'gemini'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'hover:bg-stone-200/60 text-stone-700'
                }`}
              >
                <Key className="w-4 h-4 text-amber-400" />
                <span>Gemini Key</span>
              </button>

              <button
                onClick={() => handleTabClick('settings')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  currentTab === 'settings'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'hover:bg-stone-200/60 text-stone-700'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Cài đặt</span>
              </button>
            </>
          )}
        </div>

        {/* DESKTOP RIGHT CONTROLS: Quick Join & Role Switcher */}
        <div className="hidden lg:flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenQuickJoin}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-900 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer border border-amber-500/30"
            title="Nhập mã PIN Game"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Nhập Mã Game</span>
          </button>

          <div className="bg-[#FAF8E5] p-1 rounded-xl border border-[#E2E0C8] flex items-center gap-1">
            <button
              onClick={() => onRoleChange('student')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                role === 'student'
                  ? 'bg-white text-indigo-700 shadow-xs border border-stone-200'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Học sinh</span>
            </button>

            <button
              onClick={() => onRoleChange('teacher')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                role === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Giáo viên</span>
            </button>
          </div>
        </div>

        {/* MOBILE & TABLET TOP BAR CONTROLS (lg:hidden) */}
        {/* Requirement 1: Role Switcher OUTSIDE the dropdown on mobile header */}
        <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
          {/* Role Switcher Pill on Top Row */}
          <div className="bg-[#FAF8E5] p-0.5 sm:p-1 rounded-xl border border-[#E2E0C8] flex items-center gap-0.5">
            <button
              onClick={() => onRoleChange('student')}
              className={`px-2 py-1 text-[11px] sm:text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                role === 'student'
                  ? 'bg-white text-indigo-700 shadow-xs border border-stone-200'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Học sinh</span>
            </button>

            <button
              onClick={() => onRoleChange('teacher')}
              className={`px-2 py-1 text-[11px] sm:text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                role === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Giáo viên</span>
            </button>
          </div>

          {/* Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 sm:p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-extrabold"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 text-rose-600" />
            ) : (
              <Menu className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {/* MOBILE & TABLET DROPDOWN OVERLAY (lg:hidden) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[52px] sm:top-[57px] bg-[#FEFDED]/98 backdrop-blur-md border-b border-[#E2E0C8] shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 p-4 max-h-[85vh] overflow-y-auto">
          <div className="max-w-md mx-auto space-y-3">
            {/* Requirement 1: "Nhập Mã Game" button INSIDE the dropdown menu */}
            <div>
              <button
                onClick={() => {
                  onOpenQuickJoin();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-extrabold text-xs rounded-2xl border border-amber-500/30 shadow-xs flex items-center justify-between px-4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-stone-900" />
                  <span>Nhập Mã PIN Game Để Chơi Ngay</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-700" />
              </button>
            </div>

            {/* Navigation Menu List */}
            <div className="space-y-1 pt-2 border-t border-[#E2E0C8]">
              <span className="text-[10px] font-extrabold uppercase text-stone-500 tracking-wider block mb-1.5">
                Danh mục chức năng
              </span>

              {/* 1. Danh sách Game */}
              <button
                onClick={() => handleTabClick('games')}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                  currentTab === 'games'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-stone-800 border border-stone-200/80 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Gamepad2 className="w-4 h-4" />
                  <span>🎮 Danh sách Game Quiz</span>
                </div>
                {currentTab === 'games' && <span className="text-[10px] font-mono font-black">● Đang xem</span>}
              </button>

              {/* 2. Bảng xếp hạng - ONLY for Teacher as requested in Requirement 4 */}
              {role === 'teacher' && (
                <button
                  onClick={() => handleTabClick('leaderboard')}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    currentTab === 'leaderboard'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-stone-800 border border-stone-200/80 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>🏆 Bảng Xếp Hạng Học Viên</span>
                  </div>
                  {currentTab === 'leaderboard' && (
                    <span className="text-[10px] font-mono font-black">● Đang xem</span>
                  )}
                </button>
              )}

              {/* Teacher Options */}
              {role === 'teacher' && (
                <>
                  {/* 3. Quét Đề AI */}
                  <button
                    onClick={() => handleTabClick('scanner')}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                      currentTab === 'scanner'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-stone-800 border border-stone-200/80 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>✨ Quét Đề AI & Tạo Game Tự Động</span>
                    </div>
                    {currentTab === 'scanner' && <span className="text-[10px] font-mono font-black">● Đang xem</span>}
                  </button>

                  {/* 4. Gemini Key */}
                  <button
                    onClick={() => handleTabClick('gemini')}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                      currentTab === 'gemini'
                        ? 'bg-indigo-[#4F46E5] text-white shadow-xs'
                        : 'bg-white text-stone-800 border border-stone-200/80 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Key className="w-4 h-4 text-indigo-600" />
                      <span>🔑 Cấu Hình API Key Gemini</span>
                    </div>
                    {currentTab === 'gemini' && <span className="text-[10px] font-mono font-black">● Đang xem</span>}
                  </button>

                  {/* 5. Cài đặt */}
                  <button
                    onClick={() => handleTabClick('settings')}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                      currentTab === 'settings'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-stone-800 border border-stone-200/80 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-stone-600" />
                      <span>⚙️ Cài Đặt Mật Khẩu Giáo Viên</span>
                    </div>
                    {currentTab === 'settings' && <span className="text-[10px] font-mono font-black">● Đang xem</span>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
