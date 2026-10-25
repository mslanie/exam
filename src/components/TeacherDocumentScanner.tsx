import React, { useState } from 'react';
import { GameQuiz, Question } from '../types';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { FileUp, Sparkles, Check, FileText, Wand2, Key, AlertCircle, ArrowLeft, Plus, Trash2, Clock, HelpCircle } from 'lucide-react';

interface TeacherDocumentScannerProps {
  geminiApiKey: string;
  onSaveScannedGame: (game: GameQuiz) => void;
  onNavigateToGames: () => void;
  onRequestConfirm?: (title: string, message: string, action: () => void) => void;
  onNavigateToGeminiKeyTab?: () => void;
}

export const TeacherDocumentScanner: React.FC<TeacherDocumentScannerProps> = ({
  geminiApiKey,
  onSaveScannedGame,
  onNavigateToGames,
  onRequestConfirm,
  onNavigateToGeminiKeyTab,
}) => {
  // Top level state
  const [generatedTitle, setGeneratedTitle] = useState('Luyện tập Từ Vựng & Ngữ Pháp Tiếng Anh');
  const [defaultTimePerQuestion, setDefaultTimePerQuestion] = useState<number>(30);
  const [classId, setClassId] = useState('Lanie_A1');
  const [isPublished, setIsPublished] = useState(true);

  // AI Extraction State
  const [rawText, setRawText] = useState(
    `Ms. Lanie is an experienced English teacher who specializes in IELTS Academic writing.
Students should practice writing essays consistently to improve their band scores.
Technology plays an essential role in facilitating online learning environments.
In order to achieve high scores, learners must expand their academic vocabulary.`
  );
  const [useGeminiAi, setUseGeminiAi] = useState<boolean>(!!geminiApiKey);
  const [isScanning, setIsScanning] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Manual Question Addition State
  const [manualSentence, setManualSentence] = useState('');
  const [manualAnswer, setManualAnswer] = useState('');
  const [manualExplanation, setManualExplanation] = useState('');
  const [manualTimeLimit, setManualTimeLimit] = useState<number>(0);

  // Questions List
  const [scannedQuestions, setScannedQuestions] = useState<Question[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // File Parser for Multi-format Files
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setScanError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'xlsx' || ext === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let combinedText = '';
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = XLSX.utils.sheet_to_txt(worksheet);
          combinedText += `\n--- Sheet: ${sheetName} ---\n` + sheetText;
        });
        setRawText(combinedText.trim());
      } else if (ext === 'docx' || ext === 'doc') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setRawText(result.value.trim());
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content) {
            setRawText(content.trim());
          }
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      console.error('Lỗi khi đọc file:', err);
      setScanError(`Không thể mở file ${file.name}: ${err?.message || 'Định dạng không phù hợp'}`);
    }
  };

  // AI Scanning Trigger
  const handleScanText = async () => {
    if (!rawText.trim()) return;

    setIsScanning(true);
    setIsSaved(false);
    setScanError(null);

    if (useGeminiAi && (geminiApiKey || process.env.GEMINI_API_KEY)) {
      try {
        const response = await fetch('/api/scan-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: geminiApiKey,
            text: rawText
          })
        });

        const data = await response.json();
        if (response.ok && data.success && Array.isArray(data.questions)) {
          const parsed: Question[] = data.questions.map((q: any, idx: number) => ({
            id: `ai_q_${idx}_${Date.now()}`,
            sentence: q.sentence || 'Sentence [blank]',
            blanks: [
              {
                id: `ai_b_${idx}`,
                correctAnswer: q.correctAnswer || 'answer'
              }
            ],
            options: [],
            explanation: q.explanation || 'Giải thích từ AI Gemini.',
            timeLimit: 0
          }));

          setScannedQuestions((prev) => [...prev, ...parsed]);
          setIsScanning(false);
          return;
        } else {
          setScanError(data.error || 'Không thể tạo đề qua Gemini. Đang dùng thuật toán nội bộ...');
        }
      } catch (err: any) {
        console.warn('Gemini request failed:', err);
        setScanError('Lỗi kết nối Gemini API. Sử dụng quét nội bộ.');
      }
    }

    // Local Algorithm Fallback
    setTimeout(() => {
      const sentences = rawText
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 12);

      const parsedQuestions: Question[] = [];

      sentences.forEach((sentence, idx) => {
        const words = sentence.split(' ');
        let targetWordIndex = words.findIndex(
          (w) => w.length >= 5 && !['should', 'because', 'sentence', 'teacher'].includes(w.toLowerCase())
        );

        if (targetWordIndex === -1) {
          targetWordIndex = Math.floor(words.length / 2);
        }

        const rawTarget = words[targetWordIndex] || '';
        const cleanTarget = rawTarget.replace(/[^a-zA-Z]/g, '');

        if (cleanTarget) {
          const newWords = [...words];
          newWords[targetWordIndex] = newWords[targetWordIndex].replace(cleanTarget, '[blank]');
          const sentenceWithBlank = newWords.join(' ');

          parsedQuestions.push({
            id: `sq_${idx}_${Date.now()}`,
            sentence: sentenceWithBlank,
            blanks: [
              {
                id: `sb_${idx}`,
                correctAnswer: cleanTarget
              }
            ],
            options: [],
            explanation: `Từ cần điền là "${cleanTarget}" trích từ tài liệu bài giảng.`,
            timeLimit: 0
          });
        }
      });

      setScannedQuestions((prev) => [...prev, ...parsedQuestions]);
      setIsScanning(false);
    }, 500);
  };

  // Add Manual Question
  const handleAddManualQuestion = () => {
    if (!manualSentence.trim() || !manualAnswer.trim()) return;

    let formattedSentence = manualSentence.trim();
    if (!formattedSentence.includes('[blank]')) {
      formattedSentence += ' [blank]';
    }

    const newQ: Question = {
      id: `manual_q_${Date.now()}`,
      sentence: formattedSentence,
      blanks: [
        {
          id: `manual_b_${Date.now()}`,
          correctAnswer: manualAnswer.trim()
        }
      ],
      options: [],
      explanation: manualExplanation.trim() || `Đáp án đúng là "${manualAnswer.trim()}".`,
      timeLimit: manualTimeLimit
    };

    setScannedQuestions((prev) => [...prev, newQ]);
    setManualSentence('');
    setManualAnswer('');
    setManualExplanation('');
    setManualTimeLimit(0);
  };

  // Edit inline question
  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    setScannedQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const handleUpdateBlankAnswer = (index: number, newAnswer: string) => {
    setScannedQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const updatedBlanks = [...q.blanks];
        if (updatedBlanks[0]) {
          updatedBlanks[0] = { ...updatedBlanks[0], correctAnswer: newAnswer };
        } else {
          updatedBlanks.push({ id: `b_${Date.now()}`, correctAnswer: newAnswer });
        }
        return { ...q, blanks: updatedBlanks };
      })
    );
  };

  const handleDeleteQuestion = (index: number) => {
    setScannedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Final Publish
  const handlePublishScannedGame = () => {
    if (scannedQuestions.length === 0) return;

    const doPublish = () => {
      const newGame: GameQuiz = {
        id: `game_scan_${Date.now()}`,
        title: generatedTitle,
        description: `Lớp ${classId} - Game điền từ (${scannedQuestions.length} câu) do Ms. Lanie khởi tạo.`,
        category: classId ? `Lớp ${classId}` : 'Chung',
        isPublished: isPublished,
        passwordType: 'none',
        timePerQuestion: defaultTimePerQuestion,
        questions: scannedQuestions,
        createdAt: new Date().toLocaleDateString('vi-VN'),
        totalPlays: 0
      };

      onSaveScannedGame(newGame);
      setIsSaved(true);
    };

    if (onRequestConfirm) {
      onRequestConfirm(
        'Xác Nhận Xuất Bản Trò Chơi Mới',
        `Bạn có chắc chắn muốn xuất bản bài game "${generatedTitle}" (${scannedQuestions.length} câu hỏi) cho học sinh không?`,
        doPublish
      );
    } else {
      doPublish();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back & Title Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNavigateToGames}
          className="w-10 h-10 rounded-2xl bg-white border border-[#E2E0C8] shadow-xs hover:bg-stone-100 flex items-center justify-center text-stone-700 cursor-pointer transition-colors shrink-0"
          title="Quay lại danh sách game"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              Thiết kế Ms. Lanie's Game mới 🎮
            </h1>
          </div>
          <p className="text-xs text-stone-500 font-medium">
            Tự thiết kế hoặc dùng AI trích xuất câu hỏi trò chơi nhanh chóng.
          </p>
        </div>

        {onNavigateToGeminiKeyTab && (
          <button
            onClick={onNavigateToGeminiKeyTab}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 hidden sm:flex"
          >
            <Key className="w-4 h-4 text-amber-600" />
            <span>Gemini Key</span>
          </button>
        )}
      </div>

      {/* Top Configuration Form Bar */}
      <div className="bg-[#FEFDED] rounded-2xl p-5 border border-[#E2E0C8] shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Title / Topic */}
        <div className="md:col-span-5">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
            TÊN TRÒ CHƠI / CHỦ ĐỀ TỪ VỰNG
          </label>
          <input
            type="text"
            value={generatedTitle}
            onChange={(e) => setGeneratedTitle(e.target.value)}
            placeholder="Ví dụ: Luyện tập Thì Hiện tại đơn, Chủ đề Gia đình,v.v."
            className="w-full text-xs font-bold p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Default Thinking Time (1-100s) */}
        <div className="md:col-span-3">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
            THỜI GIAN SUY NGHĨ MỖI CÂU (1 - 100S)
          </label>
          <div className="relative">
            <input
              type="number"
              min={1}
              max={100}
              value={defaultTimePerQuestion}
              onChange={(e) =>
                setDefaultTimePerQuestion(Math.max(1, Math.min(100, parseInt(e.target.value) || 30)))
              }
              className="w-full text-xs font-extrabold p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="absolute right-3 top-3 text-xs font-bold text-stone-400">giây</span>
          </div>
        </div>

        {/* Class ID */}
        <div className="md:col-span-2">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
            MÃ LỚP HỌC (CLASS ID)
          </label>
          <input
            type="text"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            placeholder="Lanie_A1"
            className="w-full text-xs font-bold p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 focus:outline-none"
          />
        </div>

        {/* Active Toggle Status */}
        <div className="md:col-span-2">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
            TRẠNG THÁI HOẠT ĐỘNG
          </label>
          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className={`w-full p-2.5 rounded-xl border font-bold text-xs flex items-center justify-between cursor-pointer transition-colors ${
              isPublished
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-stone-100 border-stone-300 text-stone-600'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`}></span>
              {isPublished ? 'Hiện' : 'Ẩn'}
            </span>
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isPublished ? 'bg-emerald-600' : 'bg-stone-300'}`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isPublished ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Grid: AI Extraction (Left) vs Manual Input (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: ✨ TRÍCH XUẤT CÂU HỎI BẰNG AI */}
        <div className="bg-[#FEFDED] rounded-2xl p-5 border border-[#E2E0C8] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                TRÍCH XUẤT CÂU HỎI BẰNG AI
              </h3>
            </div>

            {/* Drag & Drop File Upload Container */}
            <div className="border-2 border-dashed border-stone-200 rounded-2xl p-6 text-center bg-stone-50/50 hover:bg-stone-50 transition-colors space-y-2 relative">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <FileUp className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-stone-800">
                Tải lên đề thi hoặc tài liệu (.docx, .xlsx, .pdf, .txt)
              </p>
              <p className="text-[11px] text-stone-400">
                AI sẽ tự động đọc tài liệu và chuyển thành bộ câu hỏi game thú vị!
              </p>
              <label className="inline-block px-4 py-2 bg-white text-stone-800 font-bold text-xs rounded-xl border border-stone-300 shadow-xs hover:bg-stone-100 cursor-pointer transition-colors mt-2">
                <span>Chọn file tài liệu</span>
                <input
                  type="file"
                  accept=".doc,.docx,.xlsx,.xls,.pdf,.txt,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {fileName && (
                <div className="text-xs font-bold text-indigo-700 mt-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                  📄 Đã tải: {fileName}
                </div>
              )}
            </div>

            <div className="text-center text-[10px] font-bold text-stone-400 my-3">
              — HOẶC DÁN ĐỀ BÀI VÀO ĐÂY —
            </div>

            {/* Textarea for Raw Text */}
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={5}
              className="w-full text-xs font-medium p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 leading-relaxed focus:outline-none"
              placeholder="Dán nội dung từ vựng, câu hỏi thô hoặc bài đọc vào đây để AI tự động thiết kế câu hỏi game..."
            />
          </div>

          <div className="space-y-2">
            <button
              onClick={handleScanText}
              disabled={isScanning || !rawText.trim()}
              className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2 border border-amber-500/30"
            >
              <Wand2 className="w-4 h-4" />
              <span>{isScanning ? 'Đang phân tích...' : '✨ Phân tích bằng AI'}</span>
            </button>

            {scanError && (
              <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{scanError}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right Card: ✍️ NHẬP CÂU HỎI THỦ CÔNG */}
        <div className="bg-[#FEFDED] rounded-2xl p-5 border border-[#E2E0C8] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              NHẬP CÂU HỎI THỦ CÔNG
            </h3>

            <div>
              <label className="text-[11px] font-extrabold uppercase text-stone-600 block mb-1">
                NỘI DUNG CÂU HỎI (Dùng [blank] cho vị trí điền từ)
              </label>
              <input
                type="text"
                value={manualSentence}
                onChange={(e) => setManualSentence(e.target.value)}
                placeholder="She [blank] an experienced English teacher in Hanoi."
                className="w-full text-xs font-bold p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-extrabold uppercase text-stone-600 block mb-1">
                  ĐÁP ÁN ĐÚNG (TỪ CẦN ĐIỀN)
                </label>
                <input
                  type="text"
                  value={manualAnswer}
                  onChange={(e) => setManualAnswer(e.target.value)}
                  placeholder="is"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase text-stone-600 block mb-1">
                  THỜI GIAN CÂU NÀY (GIÂY)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={manualTimeLimit || ''}
                  onChange={(e) =>
                    setManualTimeLimit(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))
                  }
                  placeholder="Trống: Mặc định toàn bài"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold uppercase text-stone-600 block mb-1">
                GIẢI THÍCH CHI TIẾT
              </label>
              <input
                type="text"
                value={manualExplanation}
                onChange={(e) => setManualExplanation(e.target.value)}
                placeholder="Tại sao đáp án đó đúng..."
                className="w-full text-xs font-bold p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleAddManualQuestion}
            disabled={!manualSentence.trim() || !manualAnswer.trim()}
            className="w-full py-3.5 bg-stone-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm vào danh sách câu hỏi</span>
          </button>
        </div>
      </div>

      {/* Bottom Section: Danh sách câu hỏi đã thêm & Editable Grid */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E0C8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
          <div>
            <h3 className="font-extrabold text-stone-900 text-base">
              Danh sách câu hỏi đã thêm ({scannedQuestions.length})
            </h3>
            <p className="text-xs text-stone-500">
              Kiểm tra hoặc điều chỉnh lại nội dung, đáp án, thời gian từng câu trước khi lưu toàn bộ Game.
            </p>
          </div>

          {scannedQuestions.length > 0 && (
            <button
              onClick={handlePublishScannedGame}
              disabled={isSaved}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>{isSaved ? 'Đã Xuất Bản Game!' : 'XUẤT BẢN GAME CHO HỌC SINH'}</span>
            </button>
          )}
        </div>

        {scannedQuestions.length === 0 ? (
          <div className="p-12 text-center bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 text-stone-400 text-xs space-y-2">
            <FileText className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-stone-600">Chưa có câu hỏi nào được thêm vào bộ đề.</p>
            <p className="text-stone-400">
              Sử dụng tính năng "Phân tích bằng AI" hoặc "Nhập câu hỏi thủ công" ở trên.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {scannedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 bg-[#FAF8E5] rounded-2xl border border-[#E2E0C8] space-y-3 relative group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg">
                    Câu hỏi #{idx + 1}
                  </span>

                  <button
                    onClick={() => handleDeleteQuestion(idx)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Xóa câu hỏi này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Question Sentence */}
                  <div className="md:col-span-6">
                    <label className="text-[10px] font-extrabold text-stone-500 uppercase block mb-1">
                      Nội dung câu hỏi (Chứa [blank])
                    </label>
                    <input
                      type="text"
                      value={q.sentence}
                      onChange={(e) => handleUpdateQuestion(idx, 'sentence', e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900"
                    />
                  </div>

                  {/* Correct Answer */}
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-extrabold text-emerald-700 uppercase block mb-1">
                      Đáp án đúng
                    </label>
                    <input
                      type="text"
                      value={q.blanks[0]?.correctAnswer || ''}
                      onChange={(e) => handleUpdateBlankAnswer(idx, e.target.value)}
                      className="w-full text-xs font-extrabold p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-mono"
                    />
                  </div>

                  {/* Custom Time limit (1-100s) */}
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-extrabold text-amber-800 uppercase block mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Thời gian (1-100s)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={q.timeLimit || 0}
                      onChange={(e) =>
                        handleUpdateQuestion(
                          idx,
                          'timeLimit',
                          Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                        )
                      }
                      placeholder="0: Mặc định"
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900"
                    />
                  </div>

                  {/* Explanation */}
                  <div className="md:col-span-12">
                    <label className="text-[10px] font-extrabold text-stone-500 uppercase block mb-1">
                      Giải thích đáp án
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleUpdateQuestion(idx, 'explanation', e.target.value)}
                      className="w-full text-xs font-medium p-2.5 rounded-xl border border-stone-300 bg-white text-stone-800"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isSaved && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>🎉 Trò chơi đã được xuất bản thành công!</span>
            <button
              onClick={onNavigateToGames}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer font-bold transition-colors"
            >
              Xem Danh Sách Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

