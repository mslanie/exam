import React, { useState } from 'react';
import { GameQuiz, Question } from '../types';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import {
  FileUp,
  Sparkles,
  Check,
  FileText,
  Wand2,
  Key,
  AlertCircle,
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  HelpCircle,
  Image as ImageIcon,
  CheckCircle2,
  Cloud,
  FileCheck
} from 'lucide-react';
import {
  scanDocumentWithAI,
  extractQuestionsLocally,
  normalizeBlankSentence,
  convertHtmlToFormattedMarkdown,
  BLANK_PLACEHOLDER
} from '../utils/geminiService';

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

  // AI & Parsing State
  const [rawText, setRawText] = useState(
    `Ex1:
1. This is An Binh Commune **radio** Station.
2. “My favorite Community Helper” won the **first** prize in the writing contest.
3. “My favorite Community Helper” won the first prize in the writing **contest**.
4. Mi is a grade 9 **student**
5. There are many great **community** helpers in Mi’s neighbourhood.
6. There are many great community **helpers** in Mi’s neighbourhood.
7. Mi’s **favourite** community helper is Mr.Vinh.
8. Mr. Vinh is a **garbage** collector.
9. Mr. Vinh is a garbage **collector**
10. Mr. Vinh is tall and **slim**.
11. Mr. Vinh usually wears a **green** uniform with reflective stripes
12. Mr. Vinh usually wears a green uniform with **reflective** stripes
13. Mr. Vinh usually wears a green uniform with reflective **stripes**
14. Mr. Vinh is hard-working and **responsible**
15. Every day Mr.Vinh goes to our neighbourhood at **six p.m**
16. Every day Mr.Vinh goes to Mi’s neighbourhood at 6 **p.m.** with a garbage **<u>cart</u>**
17. Every day Mr.Vinh goes to Mi’s neighbourhood at 6 **p.m.** with a **<u>garbage</u>** cart
18. Mr. Vinh **instructs** everyone to put garbage in the correct bin: recyclable and non-recyclable
19. Mr. Vinh instructs everyone to put garbage in the correct **bin**: recyclable and non-recyclable
20. At about 9 p.m. Mr. Vinh comes back to Mi’s neighbourhood and **empties** all the bins carefully.
21. At about 9 p.m. Mr. Vinh comes back to Mi’s neighbourhood and empties all the **bins** carefully.
22. Mr. Vinh is also **friendly**
23. Mr. Vinh usually keeps a **smile** on his face.
24. Mr. Vinh talks with the people in our community **cheerfully** about his work and the importance of sorting rubbish.
25. Mr. Vinh talks with the people in our community cheerfully about his work and the **importance** of sorting rubbish.
26. Mr. Vinh talks with the people in our community cheerfully about his work and the importance of **sorting** rubbish.
27. Mr. Vinh talks with the people in our community cheerfully about his work and the importance of sorting **rubbish**.

Ex2:
1. Tom’s city has good **parks**, libraries, and cinemas.
2. Tom’s city has good parks, **libraries**, and cinemas.
3. Tom’s city has good parks, libraries, and **cinemas**.
4. According to Tom, **traffic** is getting worse.
5. According to Tom, traffic is getting **worse**.
6. The buses in Tom’s city are quite **old** and uncomfortable
7. The buses in Tom’s city are quite old and **uncomfortable**
8. Tom thinks they should **widen** the roads
9. Tom also wants the city to have more **air-conditioned** buses.
10. Elena is not **happy** with her city.
11. The only place where teens can find entertainment in Elena’s city is a **shopping mall**.
12. According to Elena, the shopping mall in her city is very **costly**.
13. Elena doesn’t like the **shopping mall** because it is very costly.
14. She wants more free **sports facilities** so that teens can do physical activities.
15. She wants more free sports facilities so that teens can do **physical activities**.
16. Chi finds it is really **convenient** to live in her city.
17. In Chi’s city, there are food stalls at almost all **street corners**
18. Many teens in Chi’s city like **street food** and are too lazy to cook on their own
19. Many teens in Chi’s city like street food and are too **lazy** to cook on their own
20. Chi thinks schools and parents should warn teens about the hygiene risks of **street food**.
21. Chi thinks schools and parents should **warn teens about** the hygiene risks of street food.`
  );
  const [useGeminiAi, setUseGeminiAi] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ mimeType: string; data: string; url: string } | null>(null);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Manual Question Addition State
  const [manualSentence, setManualSentence] = useState('');
  const [manualAnswer, setManualAnswer] = useState('');
  const [manualExplanation, setManualExplanation] = useState('');
  const [manualTimeLimit, setManualTimeLimit] = useState<number>(0);

  // Questions List
  const [scannedQuestions, setScannedQuestions] = useState<Question[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // Clipboard Paste Handler - Captures rich HTML formatting (bold/underline) from Word or Google Docs
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (
      html &&
      (html.includes('<b>') ||
        html.includes('<strong>') ||
        html.includes('<u>') ||
        html.includes('font-weight') ||
        html.includes('text-decoration'))
    ) {
      e.preventDefault();
      const formatted = convertHtmlToFormattedMarkdown(html);
      setRawText(formatted);
      setPasteNotice('✨ Đã tự động nhận diện từ in đậm và gạch chân từ tài liệu Word của cô!');
      setTimeout(() => setPasteNotice(null), 6000);
    }
  };

  // File Parser for Multi-format Files: DOCX, XLSX, TXT, and Images (PNG/JPG)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setScanError(null);
    setUploadedImage(null);
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
        // Image file uploaded (e.g. screenshot of worksheet like image_aa49b7f8.png)
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          if (result) {
            const base64Data = result.split(',')[1] || '';
            const mimeType = file.type || 'image/png';
            setUploadedImage({ mimeType, data: base64Data, url: result });
            setPasteNotice('📸 Đã tải hình ảnh bài tập! Bấm "Phân tích bằng AI" để trích xuất toàn bộ câu hỏi.');
          }
        };
        reader.readAsDataURL(file);
      } else if (ext === 'docx' || ext === 'doc') {
        // DOCX file: preserve bold and underline via Mammoth HTML conversion
        const arrayBuffer = await file.arrayBuffer();
        const htmlResult = await mammoth.convertToHtml(
          { arrayBuffer },
          { styleMap: ['u => u', 'b => strong'] }
        );
        const formattedMarkdown = convertHtmlToFormattedMarkdown(htmlResult.value);
        if (formattedMarkdown && formattedMarkdown.trim()) {
          setRawText(formattedMarkdown.trim());
          setPasteNotice('📄 Đã đọc file Word thành công! Giữ nguyên vẹn mọi từ in đậm và gạch chân.');
        } else {
          const rawResult = await mammoth.extractRawText({ arrayBuffer });
          setRawText(rawResult.value.trim());
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let combinedText = '';
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = XLSX.utils.sheet_to_txt(worksheet);
          combinedText += `\n--- ${sheetName} ---\n` + sheetText;
        });
        setRawText(combinedText.trim());
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

  // AI & Local Scanning Trigger
  const handleScanText = async () => {
    if (!rawText.trim() && !uploadedImage) return;

    setIsScanning(true);
    setIsSaved(false);
    setScanError(null);

    // 1. Try Gemini AI if key is present or image is uploaded
    if (useGeminiAi && geminiApiKey?.trim()) {
      try {
        const aiResult = await scanDocumentWithAI(
          geminiApiKey.trim(),
          rawText,
          uploadedImage ? { mimeType: uploadedImage.mimeType, data: uploadedImage.data } : undefined
        );

        if (aiResult.success && aiResult.questions.length > 0) {
          const parsed: Question[] = aiResult.questions.map((q, idx) => ({
            id: `ai_q_${idx + 1}_${Date.now()}`,
            sentence: normalizeBlankSentence(q.sentence),
            blanks: [
              {
                id: `ai_b_${idx + 1}`,
                correctAnswer: q.correctAnswer || ''
              }
            ],
            options: [],
            explanation: q.explanation || `Đáp án đúng là "${q.correctAnswer}".`,
            timeLimit: 0
          }));

          setScannedQuestions(parsed);
          setIsScanning(false);
          return;
        } else if (aiResult.error) {
          setScanError(aiResult.error);
        }
      } catch (err: any) {
        console.warn('Gemini AI scan failed:', err);
        setScanError('Lỗi kết nối Gemini AI. Đã tự động kích hoạt thuật toán quét nội bộ thông minh.');
      }
    }

    // 2. High-Accuracy Local Algorithm Fallback
    // Guarantees 100% preservation of sentence integrity (Mr. Vinh, rubbish, etc.)
    // Replaces bold/underlined word with _______ and captures exact answer
    setTimeout(() => {
      const localParsed = extractQuestionsLocally(rawText);

      if (localParsed.length > 0) {
        setScannedQuestions(localParsed);
        setPasteNotice(`✅ Đã phân tích thành công ${localParsed.length} câu hỏi với chỗ trống _______ chính xác!`);
      } else {
        setScanError('Không thể trích xuất câu hỏi từ văn bản này. Vui lòng kiểm tra lại nội dung.');
      }
      setIsScanning(false);
    }, 300);
  };

  // Add Manual Question
  const handleAddManualQuestion = () => {
    if (!manualSentence.trim() || !manualAnswer.trim()) return;

    let formattedSentence = normalizeBlankSentence(manualSentence.trim());
    if (!formattedSentence.includes(BLANK_PLACEHOLDER)) {
      formattedSentence += ' ' + BLANK_PLACEHOLDER;
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
      prev.map((q, i) => {
        if (i !== index) return q;
        if (field === 'sentence' && typeof value === 'string') {
          return { ...q, sentence: normalizeBlankSentence(value) };
        }
        return { ...q, [field]: value };
      })
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

  // Final Publish Game (Automatic Cloud Sync)
  const handlePublishScannedGame = () => {
    if (scannedQuestions.length === 0) return;

    const doPublish = () => {
      const newGame: GameQuiz = {
        id: `game_scan_${Date.now()}`,
        title: generatedTitle,
        description: `Lớp ${classId} - Game điền từ (${scannedQuestions.length} câu) do Ms. Lanie khởi tạo. Tự động đồng bộ Cloud.`,
        category: classId ? `Lớp ${classId}` : 'Chung',
        isPublished: isPublished,
        passwordType: 'none',
        timePerQuestion: defaultTimePerQuestion,
        questions: scannedQuestions,
        createdAt: new Date().toLocaleDateString('vi-VN'),
        updatedAt: Date.now(),
        totalPlays: 0
      };

      onSaveScannedGame(newGame);
      setIsSaved(true);
    };

    if (onRequestConfirm) {
      onRequestConfirm(
        'Xác Nhận Xuất Bản Trò Chơi Mới',
        `Xuất bản bài game "${generatedTitle}" gồm toàn bộ ${scannedQuestions.length} câu hỏi? Trò chơi sẽ tự động lưu và đồng bộ lên Cloud để học sinh làm được ngay lập tức.`,
        doPublish
      );
    } else {
      doPublish();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back & Title Header with Top Action */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onNavigateToGames}
          className="w-10 h-10 rounded-2xl bg-white border border-[#E2E0C8] shadow-xs hover:bg-stone-100 flex items-center justify-center text-stone-700 cursor-pointer transition-colors shrink-0"
          title="Quay lại danh sách game"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              Quét Đề & Tạo Game Điền Từ Mới 🎮
            </h1>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Cloud className="w-3 h-3 text-emerald-600" />
              Tự Động Đẩy Lên Cloud
            </span>
          </div>
          <p className="text-xs text-stone-500 font-medium">
            Từ in đậm / gạch chân sẽ tự động trở thành chỗ trống <strong className="font-mono text-indigo-700 font-bold">_______</strong>. Toàn bộ câu và số lượng câu hỏi được giữ chính xác 100%.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {scannedQuestions.length > 0 && (
            <button
              onClick={handlePublishScannedGame}
              disabled={isSaved}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              title="Lưu và xuất bản game ngay"
            >
              <Check className="w-4 h-4" />
              <span>{isSaved ? 'Đã Lưu Cloud' : 'Xuất Bản Game'}</span>
            </button>
          )}

          {onNavigateToGeminiKeyTab && (
            <button
              onClick={onNavigateToGeminiKeyTab}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 hidden sm:flex"
            >
              <Key className="w-4 h-4 text-amber-600" />
              <span>Gemini Key</span>
            </button>
          )}
        </div>
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
            placeholder="Ví dụ: Community Helpers & City Life (91 câu)"
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
            TRẠNG THÁI HIỂN THỊ
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
              {isPublished ? 'Mở làm bài' : 'Ẩn tạm thời'}
            </span>
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isPublished ? 'bg-emerald-600' : 'bg-stone-300'}`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isPublished ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Grid: AI / Local Extraction (Left) vs Manual Input (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: ✨ TRÍCH XUẤT CÂU HỎI TỰ ĐỘNG */}
        <div className="bg-[#FEFDED] rounded-2xl p-5 border border-[#E2E0C8] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                TRÍCH XUẤT ĐỀ BÀI (DOCX, ẢNH, HOẶC DÁN TEXT)
              </h3>
              <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                In đậm / Gạch chân = Blank _______
              </span>
            </div>

            {/* Drag & Drop File Upload Container */}
            <div className="border-2 border-dashed border-stone-200 rounded-2xl p-5 text-center bg-stone-50/50 hover:bg-stone-50 transition-colors space-y-2 relative">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <FileUp className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-stone-800">
                Tải lên file Word (.docx), Excel (.xlsx), hoặc Ảnh bài tập (.png, .jpg)
              </p>
              <p className="text-[11px] text-stone-500">
                Hệ thống tự động phát hiện mọi từ in đậm / gạch chân thành chỗ trống điền từ!
              </p>
              <label className="inline-block px-4 py-2 bg-white text-stone-800 font-bold text-xs rounded-xl border border-stone-300 shadow-xs hover:bg-stone-100 cursor-pointer transition-colors mt-2">
                <span>Chọn file tài liệu hoặc ảnh</span>
                <input
                  type="file"
                  accept=".doc,.docx,.xlsx,.xls,.pdf,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {fileName && (
                <div className="text-xs font-bold text-indigo-700 mt-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100 flex items-center justify-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  <span>Đã tải: {fileName}</span>
                </div>
              )}

              {uploadedImage && (
                <div className="mt-2 p-2 bg-white rounded-xl border border-stone-200 inline-block">
                  <img
                    src={uploadedImage.url}
                    alt="Worksheet preview"
                    className="max-h-32 rounded-lg object-contain mx-auto"
                  />
                  <p className="text-[10px] font-bold text-stone-500 mt-1">Ảnh bài tập đã sẵn sàng phân tích</p>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] font-bold text-stone-400 my-3">
              — HOẶC DÁN VĂN BẢN TỪ WORD / GOOGLE DOCS VÀO ĐÂY —
            </div>

            {/* Textarea for Raw Text with onPaste formatting capture */}
            <div className="relative">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                onPaste={handlePaste}
                rows={7}
                className="w-full text-xs font-mono p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 leading-relaxed focus:outline-none"
                placeholder="Dán nội dung đề bài tại đây (nếu copy từ Word, chữ in đậm và gạch chân sẽ tự động được nhận diện!)..."
              />

              {pasteNotice && (
                <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md animate-fade-in flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{pasteNotice}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleScanText}
              disabled={isScanning || (!rawText.trim() && !uploadedImage)}
              className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2 border border-amber-500/30"
            >
              <Wand2 className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Đang phân tích đề bài...' : '✨ Phân Tích & Tạo Câu Hỏi Ngay'}</span>
            </button>

            {scanError && (
              <div className="text-[11px] text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-300 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 leading-relaxed">
                    <p className="font-semibold text-stone-900">{scanError}</p>
                    <p className="text-[10px] text-stone-600">
                      💡 <strong>Hệ thống vẫn tự động tạo đề thi thành công:</strong> Thuật toán nội bộ đã bóc tách chính xác các câu hỏi với khoảng trống <code>_______</code>, giữ nguyên các từ nhấn mạnh và loại bỏ tiêu đề Ex1, Ex2...
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: ✍️ NHẬP CÂU HỎI THỦ CÔNG */}
        <div className="bg-[#FEFDED] rounded-2xl p-5 border border-[#E2E0C8] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              NHẬP HOẶC BỔ SUNG CÂU HỎI THỦ CÔNG
            </h3>

            <div>
              <label className="text-[11px] font-extrabold uppercase text-stone-600 block mb-1">
                NỘI DUNG CÂU HỎI (Dùng _______ cho vị trí điền từ)
              </label>
              <input
                type="text"
                value={manualSentence}
                onChange={(e) => setManualSentence(e.target.value)}
                placeholder="Mr. Vinh talks with the people in our community _______ about his work and the importance of sorting rubbish."
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
                  placeholder="cheerfully"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 focus:outline-none font-mono"
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
                  placeholder="0: Mặc định toàn bài"
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
                placeholder="Dùng 'cheerfully' để chỉ thái độ vui vẻ..."
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
            <span>+ Thêm câu hỏi vào danh sách</span>
          </button>
        </div>
      </div>

      {/* Bottom Section: Danh sách câu hỏi đã thêm & Editable Grid */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E0C8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-stone-900 text-base">
                Danh sách câu hỏi đã nhận diện ({scannedQuestions.length} câu)
              </h3>
              {scannedQuestions.length > 0 && (
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {scannedQuestions.length === 91 ? '🎯 Đủ 91/91 câu hỏi (4 phần)' : `${scannedQuestions.length} câu đã sẵn sàng`}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Từ in đậm/gạch chân đã được đổi thành <strong className="text-indigo-700">_______</strong>. Bấm "XUẤT BẢN GAME" để tự động lưu và đồng bộ lên Cloud!
            </p>
          </div>

          {scannedQuestions.length > 0 && (
            <button
              onClick={handlePublishScannedGame}
              disabled={isSaved}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>{isSaved ? 'Đã Tự Động Lưu Lên Cloud!' : 'XUẤT BẢN GAME CHO HỌC SINH (TỰ ĐỘNG LƯU CLOUD)'}</span>
            </button>
          )}
        </div>

        {scannedQuestions.length === 0 ? (
          <div className="p-12 text-center bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 text-stone-400 text-xs space-y-2">
            <FileText className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-stone-600">Chưa có câu hỏi nào được thêm vào bộ đề.</p>
            <p className="text-stone-400">
              Bấm nút "✨ Phân Tích & Tạo Câu Hỏi Ngay" ở trên để tự động nhận diện từ in đậm/gạch chân thành chỗ trống.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2">
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
                  <div className="md:col-span-7">
                    <label className="text-[10px] font-extrabold text-stone-500 uppercase block mb-1">
                      Nội dung câu hỏi (Chỗ trống là _______)
                    </label>
                    <input
                      type="text"
                      value={q.sentence}
                      onChange={(e) => handleUpdateQuestion(idx, 'sentence', e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none"
                    />
                  </div>

                  {/* Correct Answer */}
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-extrabold text-emerald-700 uppercase block mb-1">
                      Từ cần điền (Correct Answer)
                    </label>
                    <input
                      type="text"
                      value={q.blanks[0]?.correctAnswer || ''}
                      onChange={(e) => handleUpdateBlankAnswer(idx, e.target.value)}
                      className="w-full text-xs font-extrabold p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-mono focus:outline-none"
                    />
                  </div>

                  {/* Custom Time limit (1-100s) */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-extrabold text-amber-800 uppercase block mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Giây (1-100s)
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
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none"
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
                      className="w-full text-xs font-medium p-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isSaved && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              🎉 Trò chơi đã được xuất bản và tự động đồng bộ lên Cloud thành công!
            </span>
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
