import React, { useState } from 'react';
import { X, KeyRound, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { GameQuiz } from '../types';

interface QuickJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: GameQuiz[];
  onStartGame: (game: GameQuiz, passProvided?: string) => void;
}

export const QuickJoinModal: React.FC<QuickJoinModalProps> = ({
  isOpen,
  onClose,
  games,
  onStartGame,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const inputPin = pin.trim();

    if (!inputPin) {
      setError('Vui lòng nhập mã PIN hoặc mật khẩu phòng game!');
      return;
    }

    // Find game matching password or dynamic pin or id
    const matchedGame = games.find(
      (g) =>
        g.isPublished &&
        ((g.passwordType === 'dynamic' && g.passwordValue === inputPin) ||
          (g.passwordType === 'static' && g.passwordValue?.toLowerCase() === inputPin.toLowerCase()) ||
          g.id === inputPin)
    );

    if (matchedGame) {
      onStartGame(matchedGame, inputPin);
      onClose();
      setPin('');
    } else {
      setError('Mã PIN hoặc mật khẩu không đúng hoặc game đang bị ẩn bởi giáo viên!');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#FEFDED] rounded-2xl max-w-md w-full border border-[#E2E0C8] shadow-2xl overflow-hidden p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-400 border border-amber-500/40 flex items-center justify-center text-stone-900 font-bold shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-lg">Tham gia Phòng Game</h3>
            <p className="text-xs text-stone-600">Nhập mã PIN động do Ms. Lanie cấp</p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
              Mã PIN hoặc Mật khẩu Game
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder="VD: 882190 hoặc LANIE123"
              className="w-full text-center text-lg tracking-widest font-mono font-bold p-3 rounded-xl border border-stone-300 bg-[#FFFDF0] focus:outline-none focus:ring-2 focus:ring-indigo-600 text-stone-900 uppercase"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-[#FAF8E5] p-3 rounded-xl border border-[#E2E0C8] text-xs text-stone-600 leading-relaxed flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Thử mã PIN tĩnh: <strong>LANIE123</strong> hoặc mã PIN động: <strong>882190</strong></span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <span>Vào Chơi Game</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
