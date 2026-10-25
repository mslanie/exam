import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, X, CheckCircle } from 'lucide-react';

interface TeacherLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  teacherUsername: string;
  teacherPassword: string;
}

export const TeacherLoginModal: React.FC<TeacherLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  teacherUsername,
  teacherPassword,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (
      usernameInput.trim().toLowerCase() === teacherUsername.trim().toLowerCase() &&
      passwordInput === teacherPassword
    ) {
      onLoginSuccess();
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setErrorMsg('Tên đăng nhập hoặc mật khẩu giáo viên không chính xác!');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#FEFDED] rounded-3xl max-w-md w-full border border-[#E2E0C8] shadow-2xl p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Shield className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
              Teacher Portal
            </span>
            <h2 className="text-xl font-extrabold text-stone-900 mt-0.5">
              Đăng Nhập Quyền Giáo Viên
            </h2>
          </div>
        </div>

        <p className="text-xs text-stone-600 mb-6 leading-relaxed">
          Đăng nhập tài khoản Ms. Lanie để tạo trò chơi điền từ, cài đặt mã PIN phòng game và ẩn/hiện trò chơi cho học sinh.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1">
              Tên tài khoản (Username)
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Tên đăng nhập..."
                required
                className="w-full pl-9 pr-4 py-2.5 text-xs font-bold rounded-xl border border-stone-300 bg-[#FFFDF0] focus:outline-none focus:ring-2 focus:ring-indigo-600 text-stone-900"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1">
              Mật khẩu (Password)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Nhập mật khẩu..."
                required
                className="w-full pl-9 pr-4 py-2.5 text-xs font-mono font-bold rounded-xl border border-stone-300 bg-[#FFFDF0] focus:outline-none focus:ring-2 focus:ring-indigo-600 text-stone-900"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer transition-colors"
            >
              Trở về
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Đăng Nhập Ngay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
