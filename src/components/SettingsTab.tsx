import React, { useState } from 'react';
import { User, Shield, Key, Sparkles, Check, Lock, AlertCircle, Database, Cloud, Copy } from 'lucide-react';

interface SettingsTabProps {
  teacherUsername?: string;
  teacherPassword?: string;
  onChangePassword?: (newPassword: string) => void;
  onRequestConfirm?: (title: string, message: string, action: () => void) => void;
  isTeacherAuthenticated?: boolean;
  customLogoUrl?: string;
  onSaveCustomLogoUrl?: (url: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  teacherUsername = 'mslanie',
  teacherPassword = '123123',
  onChangePassword,
  onRequestConfirm,
  isTeacherAuthenticated = false,
  customLogoUrl = '',
  onSaveCustomLogoUrl,
}) => {
  const [adminName, setAdminName] = useState('Ms. Lanie Đặng');
  const [adminEmail, setAdminEmail] = useState('mslanie.en@gmail.com');
  const [defaultPassword, setDefaultPassword] = useState('LANIE123');
  const [defaultTimer, setDefaultTimer] = useState(30);
  const [logoInput, setLogoInput] = useState(customLogoUrl);
  const [saved, setSaved] = useState(false);
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

  // Password change state
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveCustomLogoUrl) {
      onSaveCustomLogoUrl(logoInput.trim());
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);

    if (currentPassInput !== teacherPassword) {
      setPassError('Mật khẩu hiện tại không chính xác!');
      return;
    }

    if (!newPassInput.trim() || newPassInput.length < 4) {
      setPassError('Mật khẩu mới phải có ít nhất 4 ký tự!');
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setPassError('Mật khẩu nhập lại không khớp!');
      return;
    }

    const doChange = () => {
      if (onChangePassword) {
        onChangePassword(newPassInput.trim());
      }
      setPassSuccess(true);
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
      setTimeout(() => setPassSuccess(false), 3000);
    };

    if (onRequestConfirm) {
      onRequestConfirm(
        'Xác Nhận Đổi Mật Khẩu Giáo Viên',
        `Bạn có chắc chắn muốn đổi mật khẩu tài khoản Giáo viên (${teacherUsername}) sang mật khẩu mới không?`,
        doChange
      );
    } else {
      doChange();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#FEFDED] rounded-2xl p-6 border border-[#E2E0C8] shadow-xs">
        <h1 className="text-xl font-bold text-stone-900">Cài Đặt Hệ Thống & Mật Khẩu Ms. Lanie</h1>
        <p className="text-xs text-stone-500 mt-1">
          Tùy chỉnh thông tin giảng viên, quản lý đăng nhập và linh động thay đổi mật khẩu giáo viên.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Profile Settings */}
        <div className="lg:col-span-6 bg-[#FEFDED] rounded-2xl p-6 border border-[#E2E0C8] shadow-xs space-y-6">
          <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            Hồ sơ Giảng Viên Administrator
          </h3>

          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Tên giảng viên</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Email quản trị</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Đường dẫn Logo Tùy Chỉnh (URL hoặc /image/logo.png):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                  placeholder="VD: /image/logo.png hoặc https://example.com/logo.png"
                  className="flex-1 text-xs font-mono p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLogoInput('');
                    if (onSaveCustomLogoUrl) onSaveCustomLogoUrl('');
                  }}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] rounded-xl border border-stone-300 transition-colors cursor-pointer shrink-0"
                  title="Đặt lại mặc định Lá cờ Việt Nam"
                >
                  Mặc định (Lá Cờ VN)
                </button>
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                * Nếu không có ảnh hoặc đường dẫn bị lỗi, hệ thống sẽ tự động hiển thị hình **Lá cờ Việt Nam** làm mặc định.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Mật khẩu tĩnh gợi ý cho game mới</label>
              <input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-stone-300 bg-amber-50 text-stone-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Thời gian làm bài mặc định (giây)</label>
              <select
                value={defaultTimer}
                onChange={(e) => setDefaultTimer(parseInt(e.target.value))}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900"
              >
                <option value={15}>15 giây / câu</option>
                <option value={20}>20 giây / câu</option>
                <option value={30}>30 giây / câu</option>
                <option value={60}>60 giây / câu</option>
              </select>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Lưu Hồ Sơ
              </button>
              {saved && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Đã cập nhật thành công!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Right Form: Teacher Password Change */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#FEFDED] rounded-2xl p-6 border border-[#E2E0C8] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Thay Đổi Mật Khẩu Đăng Nhập Giáo Viên
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full border border-amber-200">
                User: {teacherUsername}
              </span>
            </div>

            {isTeacherAuthenticated ? (
              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    value={currentPassInput}
                    onChange={(e) => {
                      setCurrentPassInput(e.target.value);
                      setPassError('');
                    }}
                    placeholder="Nhập mật khẩu hiện tại..."
                    required
                    className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={newPassInput}
                      onChange={(e) => {
                        setNewPassInput(e.target.value);
                        setPassError('');
                      }}
                      placeholder="Mật khẩu mới..."
                      required
                      className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Nhập lại mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={confirmPassInput}
                      onChange={(e) => {
                        setConfirmPassInput(e.target.value);
                        setPassError('');
                      }}
                      placeholder="Xác nhận mật khẩu..."
                      required
                      className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900"
                    />
                  </div>
                </div>

                {passError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passError}</span>
                  </div>
                )}

                {passSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Mật khẩu Giáo viên đã được cập nhật thành công!</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-900 font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors border border-amber-600/30 flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>Xác Nhận Đổi Mật Khẩu Giáo Viên</span>
                </button>
              </form>
            ) : (
              <div className="bg-[#FAF8E5] p-4 rounded-xl border border-[#E2E0C8] text-xs text-stone-700 space-y-2">
                <p className="font-bold text-stone-900">Vui lòng đăng nhập tài khoản Giáo viên để thay đổi mật khẩu.</p>
                <p className="text-stone-500">
                  Tài khoản mặc định: Username: <strong className="text-stone-800 font-mono">mslanie</strong> | Password: <strong className="text-stone-800 font-mono">123123</strong>
                </p>
              </div>
            )}
          </div>

          {/* Theme Metadata Box */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E0C8] shadow-xs space-y-4">
            <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Thông Tin Giao Diện & Mã HEX Theme
            </h3>

            <div className="bg-[#FEFDED] p-4 rounded-xl border border-[#E2E0C8] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-600">Mã HEX Nền Web:</span>
                <span className="font-mono font-bold text-stone-900 bg-white px-2 py-1 rounded border border-stone-200">
                  #FEFDED
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-600">Thông Số RGB:</span>
                <span className="font-mono font-bold text-stone-900 bg-white px-2 py-1 rounded border border-stone-200">
                  RGB(254, 253, 237)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-600">Phong cách thiết kế:</span>
                <span className="font-bold text-indigo-700">Clean Minimalism Fill-In-Blank</span>
              </div>
            </div>
          </div>

          {/* Firebase Realtime Database Information & Rules Box */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E0C8] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-indigo-600" />
                Firebase Realtime Database (Đồng Bộ Đề Thi Cloud)
              </h3>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                en-mslanie
              </span>
            </div>

            <div className="bg-[#FAF8E5] p-4 rounded-xl border border-[#E2E0C8] space-y-3 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-stone-600 block">Database URL:</span>
                <div className="font-mono text-[11px] bg-white p-2 rounded-lg border border-stone-200 text-stone-800 break-all">
                  https://en-mslanie-default-rtdb.asia-southeast1.firebasedatabase.app
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-stone-800">Quy tắc (Rules) Realtime Database chuẩn:</span>
                  <button
                    type="button"
                    onClick={handleCopyRules}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-stone-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-stone-300 shadow-2xs"
                  >
                    {copiedRule ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="bg-stone-900 text-emerald-400 p-3 rounded-xl text-xs font-mono overflow-x-auto">
                  {RECOMMENDED_RULES}
                </pre>
                <p className="text-[11px] text-stone-500 mt-2">
                  * <strong>Lưu ý:</strong> Để các bạn học sinh làm bài không bị lỗi quyền truy cập, cô vào <strong>Firebase Console &gt; Realtime Database &gt; tab Rules</strong>, dán đoạn mã trên và bấm <strong>Publish</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
