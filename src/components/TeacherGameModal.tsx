import React, { useState, useEffect } from 'react';
import { GameQuiz, Question, PasswordType } from '../types';
import { getDynamicPin } from '../utils/passwordUtils';
import { normalizeBlankSentence } from '../utils/geminiService';
import { X, Plus, Trash2, RefreshCw, Clock, Zap, KeyRound, Shield, Check } from 'lucide-react';

interface TeacherGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameToEdit?: GameQuiz | null;
  onSaveGame: (game: GameQuiz) => void;
  onRequestConfirm?: (title: string, message: string, action: () => void) => void;
}

export const TeacherGameModal: React.FC<TeacherGameModalProps> = ({
  isOpen,
  onClose,
  gameToEdit,
  onSaveGame,
  onRequestConfirm,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('IELTS Academic');
  const [isPublished, setIsPublished] = useState(true);
  const [passwordType, setPasswordType] = useState<PasswordType>('none');
  const [passwordValue, setPasswordValue] = useState('LANIE123');
  const [dynamicInterval, setDynamicInterval] = useState(30);
  const [timePerQuestion, setTimePerQuestion] = useState(30);

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q_1',
      sentence: 'Learning English requires consistent _______ every day.',
      blanks: [
        { id: 'b_1', correctAnswer: 'practice' }
      ],
      options: ['practice', 'sleep', 'money', 'food'],
      explanation: 'Dùng "practice" để chỉ việc rèn luyện thường xuyên.',
      timeLimit: 0
    }
  ]);

  useEffect(() => {
    if (gameToEdit) {
      setTitle(gameToEdit.title);
      setDescription(gameToEdit.description);
      setCategory(gameToEdit.category);
      setIsPublished(gameToEdit.isPublished);
      setPasswordType(gameToEdit.passwordType);
      setPasswordValue(gameToEdit.passwordValue || 'LANIE123');
      setDynamicInterval(gameToEdit.dynamicInterval || 30);
      setTimePerQuestion(gameToEdit.timePerQuestion);
      setQuestions(
        gameToEdit.questions.map((q) => ({
          ...q,
          sentence: normalizeBlankSentence(q.sentence)
        }))
      );
    } else {
      setTitle('');
      setDescription('');
      setCategory('IELTS Academic');
      setIsPublished(true);
      setPasswordType('none');
      setPasswordValue('LANIE123');
      setDynamicInterval(30);
      setTimePerQuestion(30);
      setQuestions([
        {
          id: `q_${Date.now()}`,
          sentence: 'Learning English requires consistent _______ every day.',
          blanks: [
            { id: `b_${Date.now()}`, correctAnswer: 'practice' }
          ],
          options: ['practice', 'sleep', 'money', 'food'],
          explanation: 'Dùng "practice" để chỉ việc rèn luyện.',
          timeLimit: 0
        }
      ]);
    }
  }, [gameToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q_${Date.now()}`,
      sentence: 'Ms. Lanie helps students master _______ skills effectively.',
      blanks: [{ id: `b_${Date.now()}`, correctAnswer: 'English' }],
      options: ['English', 'Math', 'Science'],
      explanation: '',
      timeLimit: 0
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    if (field === 'sentence' && typeof value === 'string') {
      updated[idx] = { ...updated[idx], sentence: normalizeBlankSentence(value) };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setQuestions(updated);
  };

  const handleBlankAnswerChange = (qIdx: number, ans: string) => {
    const updated = [...questions];
    const q = updated[qIdx];
    if (q.blanks.length > 0) {
      q.blanks[0].correctAnswer = ans;
    } else {
      q.blanks = [{ id: `b_${Date.now()}`, correctAnswer: ans }];
    }
    setQuestions(updated);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tên trò chơi');
      return;
    }

    const saved: GameQuiz = {
      id: gameToEdit ? gameToEdit.id : `game_${Date.now()}`,
      title,
      description,
      category,
      isPublished,
      passwordType,
      passwordValue: passwordType === 'static' ? passwordValue : undefined,
      dynamicInterval: passwordType === 'dynamic' ? Math.max(1, Math.min(100, dynamicInterval || 30)) : undefined,
      timePerQuestion,
      questions,
      createdAt: gameToEdit ? gameToEdit.createdAt : new Date().toLocaleDateString('vi-VN'),
      updatedAt: Date.now(),
      totalPlays: gameToEdit ? gameToEdit.totalPlays : 0
    };

    const doSave = () => {
      onSaveGame(saved);
      onClose();
    };

    if (onRequestConfirm) {
      const isEdit = !!gameToEdit;
      onRequestConfirm(
        isEdit ? 'Xác Nhận Cập Nhật Trò Chơi' : 'Xác Nhận Tạo Trò Chơi Mới',
        isEdit
          ? `Bạn có chắc chắn muốn lưu các thay đổi cho trò chơi "${title}" không?`
          : `Xác nhận khởi tạo trò chơi điền từ mới "${title}" với ${questions.length} câu hỏi?`,
        doSave
      );
    } else {
      doSave();
    }
  };

  const previewDynamicPin = getDynamicPin(gameToEdit?.id || 'new_game', dynamicInterval);

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FEFDED] rounded-3xl max-w-3xl w-full border border-[#E2E0C8] shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Header with Top Save Button */}
        <div className="bg-[#FEFDED] px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E2E0C8] flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h3 className="font-extrabold text-stone-900 text-base sm:text-lg truncate">
              {gameToEdit ? 'Chỉnh Sửa Game Điền Từ' : 'Tạo Game Điền Chỗ Trống Mới'}
            </h3>
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200 hidden sm:inline-block shrink-0">
              {questions.length} câu hỏi
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Top Save Button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
              title="Lưu game ngay mà không cần cuộn chuột xuống đáy"
            >
              <Check className="w-4 h-4" />
              <span>{gameToEdit ? 'Lưu Thay Đổi' : 'Lưu Game'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer transition-colors"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* General Information */}
          <div className="bg-[#FAF8E5] rounded-2xl p-5 border border-[#E2E0C8] space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-700">
              1. Thông Tin Cơ Bản Game
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Tên Bài Game / Quiz
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: IELTS Academic Collocations Challenge"
                  required
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Danh Mục
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900"
                >
                  <option value="IELTS Academic">IELTS Academic</option>
                  <option value="Grammar">Grammar & Syntax</option>
                  <option value="Vocabulary">Vocabulary & Idioms</option>
                  <option value="Pronunciation">Pronunciation</option>
                  <option value="Business English">Business English</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Mô tả chi tiết bài học
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Mô tả mục tiêu của trò chơi này..."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900"
              />
            </div>
          </div>

          {/* Password & Timer Options */}
          <div className="bg-[#FAF8E5] rounded-2xl p-5 border border-[#E2E0C8] space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-700">
              2. Cài Đặt Mã Bảo Vệ & Thời Gian Mặc Định
            </h4>

            {/* Password Mode selection */}
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                Chế độ mật khẩu phòng game
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordType('none')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    passwordType === 'none'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="font-extrabold text-xs">1. Không Có Mã</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Học sinh vào thẳng bài thi</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPasswordType('static')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    passwordType === 'static'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" /> 2. Mã Tĩnh
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">Giáo viên tự đặt mật khẩu</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPasswordType('dynamic')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    passwordType === 'dynamic'
                      ? 'bg-amber-500 text-stone-900 border-amber-600 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="font-extrabold text-xs flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> 3. Mã Động
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">Tự xoay PIN sau khoảng thời gian</div>
                </button>
              </div>
            </div>

            {/* Static Password Input */}
            {passwordType === 'static' && (
              <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 space-y-1">
                <label className="text-xs font-bold text-indigo-900 block">
                  Nhập Mật Khẩu Tĩnh Cố Định:
                </label>
                <input
                  type="text"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="VD: LANIE123"
                  required
                  className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900"
                />
              </div>
            )}

            {/* Dynamic Password Setup */}
            {passwordType === 'dynamic' && (
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 space-y-3">
                <div>
                  <label className="text-xs font-bold text-amber-900 block mb-1">
                    Thời gian tự động xoay mã PIN mới (1s đến 100s):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={dynamicInterval}
                      onChange={(e) =>
                        setDynamicInterval(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))
                      }
                      required
                      className="w-28 text-xs font-bold p-2.5 rounded-xl border border-amber-300 bg-white text-stone-900"
                    />
                    <span className="text-xs font-bold text-amber-900">giây / lượt</span>
                  </div>
                </div>

                <div className="text-xs text-amber-800 flex items-center justify-between bg-white/80 p-2.5 rounded-lg border border-amber-200">
                  <span>Mã PIN xem trước vòng hiện tại:</span>
                  <span className="font-mono font-extrabold text-stone-900 bg-amber-200 px-2.5 py-1 rounded tracking-wider">
                    {previewDynamicPin}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Thời gian mặc định toàn bài (mỗi câu): 1s - 100s (0 = Không giới hạn)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={timePerQuestion}
                    onChange={(e) =>
                      setTimePerQuestion(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))
                    }
                    className="w-28 text-xs font-bold p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900"
                  />
                  <span className="text-xs font-bold text-stone-700">
                    {timePerQuestion === 0 ? 'Không giới hạn thời gian' : 'giây / câu'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Trạng thái hiển thị cho Học Sinh
                </label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                    <input
                      type="radio"
                      name="visibility"
                      checked={isPublished}
                      onChange={() => setIsPublished(true)}
                      className="accent-indigo-600"
                    />
                    <span>Bật (Hiện)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                    <input
                      type="radio"
                      name="visibility"
                      checked={!isPublished}
                      onChange={() => setIsPublished(false)}
                      className="accent-stone-600"
                    />
                    <span>Tắt (Ẩn)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Question List & Custom Per-Question Timer */}
          <div className="bg-[#FAF8E5] rounded-2xl p-5 border border-[#E2E0C8] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-700">
                3. Danh Sách Câu Hỏi Điền Từ & Cài Đặt Thời Gian Riêng ({questions.length})
              </h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Câu Hỏi</span>
              </button>
            </div>

            <p className="text-[11px] text-stone-500">
              💡 Dùng ký tự <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-indigo-800">_______</code> (dấu gạch dưới) vào vị trí ẩn từ vựng trong đề bài.
            </p>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-extrabold">
                        {idx + 1}
                      </span>
                      Câu Hỏi #{idx + 1}
                    </span>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-stone-400 hover:text-rose-600 cursor-pointer"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Câu văn (Chứa _______)
                    </label>
                    <input
                      type="text"
                      value={q.sentence}
                      onChange={(e) => handleQuestionChange(idx, 'sentence', e.target.value)}
                      placeholder="VD: Three teens are going to share about how they feel about living in their city and how to make it a more _______ place."
                      required
                      className="w-full text-xs font-medium p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Đáp án đúng chính xác
                      </label>
                      <input
                        type="text"
                        value={q.blanks[0]?.correctAnswer || ''}
                        onChange={(e) => handleBlankAnswerChange(idx, e.target.value)}
                        placeholder="VD: goes"
                        required
                        className="w-full text-xs font-bold font-mono p-2.5 rounded-lg border border-stone-300 bg-emerald-50 text-emerald-900"
                      />
                    </div>

                    {/* Custom Per-Question Timer Setting */}
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Thời gian làm bài riêng cho câu này (1s - 100s):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={q.timeLimit || 0}
                          onChange={(e) =>
                            handleQuestionChange(
                              idx,
                              'timeLimit',
                              Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                            )
                          }
                          className="w-24 text-xs font-bold p-2 rounded-lg border border-stone-300 bg-white text-stone-900"
                        />
                        <span className="text-xs font-bold text-stone-600">
                          {q.timeLimit && q.timeLimit > 0 ? 'giây' : 'Dùng mặc định toàn bài'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Options (Word bank) and Explanation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-stone-200/60">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Từ gợi ý (Word Bank / Các lựa chọn, cách nhau bằng dấu phẩy)
                      </label>
                      <input
                        type="text"
                        value={(q.options || []).join(', ')}
                        onChange={(e) => {
                          const opts = e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          handleQuestionChange(idx, 'options', opts);
                        }}
                        placeholder="VD: practice, sleep, money, food"
                        className="w-full text-xs font-medium p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Giải thích đáp án (Hiển thị sau khi học sinh nộp bài)
                      </label>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)}
                        placeholder="VD: Dùng practice để chỉ sự rèn luyện..."
                        className="w-full text-xs font-medium p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{gameToEdit ? 'Lưu Thay Đổi' : 'Lưu Game & Xuất Bản'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
