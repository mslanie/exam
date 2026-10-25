import React, { useState, useEffect, useRef } from 'react';
import { GameQuiz, LeaderboardEntry, QuestionResultDetail } from '../types';
import { validateGamePassword } from '../utils/passwordUtils';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  RotateCcw,
  Lock,
  User,
  Zap,
  Flame,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  BarChart3,
  CheckSquare,
  Eye,
  Check,
  Trophy,
  LogOut,
  ArrowLeft
} from 'lucide-react';

interface StudentGamePlayProps {
  game: GameQuiz;
  initialPassword?: string;
  onClose: () => void;
  onSaveScore: (entry: LeaderboardEntry) => void;
  isTeacher?: boolean;
  allLeaderboard?: LeaderboardEntry[];
}

export const StudentGamePlay: React.FC<StudentGamePlayProps> = ({
  game,
  initialPassword = '',
  onClose,
  onSaveScore,
  isTeacher = false,
  allLeaderboard = [],
}) => {
  // Authentication & Entry State
  const defaultName = isTeacher ? 'MS. LANIE (CHƠI THỬ)' : '';
  const [studentName, setStudentName] = useState(defaultName);
  const [enteredPassword, setEnteredPassword] = useState(initialPassword);
  const [passError, setPassError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(
    isTeacher ? true : validateGamePassword(game, initialPassword)
  );

  // Countdown & Game Flow States
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [hasStarted, setHasStarted] = useState(false);

  // Gameplay & Question Shuffling
  const [shuffledQuestions, setShuffledQuestions] = useState<typeof game.questions>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string[]>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [questionScores, setQuestionScores] = useState<Record<number, boolean>>({});
  const [earnedPointsMap, setEarnedPointsMap] = useState<Record<number, number>>({});

  // Anti-cheating & Question Timeout States
  const [isCheated, setIsCheated] = useState(false);
  const [cheatedReason, setCheatedReason] = useState('');
  const [isTimeOutTriggered, setIsTimeOutTriggered] = useState(false);

  // Top-Right Toast Alert for Blocked Actions (Ctrl+C, Ctrl+V, F12, etc.)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTab, setReportTab] = useState<'all' | 'wrong'>('all');
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const showBlockedToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Timer & Progress States
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Calculate student attempt count
  const getAttemptCountForStudent = (name: string) => {
    if (!name.trim()) return 1;
    const previous = allLeaderboard.filter(
      (e) =>
        e.gameId === game.id &&
        e.studentName.trim().toLowerCase() === name.trim().toLowerCase()
    );
    return previous.length + 1;
  };

  const currentAttemptNumber = getAttemptCountForStudent(studentName);

  // Helper: Fisher-Yates Shuffle questions
  const shuffleQuestions = (questions: typeof game.questions) => {
    const arr = [...questions];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Derive questions list safely
  const questionsList = shuffledQuestions.length > 0 ? shuffledQuestions : game.questions;
  const currentQuestion = questionsList[currentIndex] || game.questions[0];

  // Calculate effective time limit for current question
  const questionTimeLimit =
    currentQuestion?.timeLimit && currentQuestion.timeLimit > 0
      ? currentQuestion.timeLimit
      : game.timePerQuestion;

  const [timeLeft, setTimeLeft] = useState(questionTimeLimit || 30);

  // Max score per question & Live decreasing score counter
  const maxQuestionPoints = 1000;
  const liveQuestionPoints =
    questionTimeLimit > 0
      ? Math.max(100, Math.round(maxQuestionPoints * (timeLeft / questionTimeLimit)))
      : maxQuestionPoints;

  // Answer state for current question
  const currentInputs = userAnswers[currentIndex] || currentQuestion?.blanks.map(() => '') || [];

  // Refs for safe callback access in event listeners
  const stateRef = useRef({
    hasStarted,
    isFinished,
    isCheated,
    questionsList,
    userAnswers,
    questionScores,
    totalTimeSpent,
    studentName,
    game,
    isTeacher,
    onSaveScore
  });

  useEffect(() => {
    stateRef.current = {
      hasStarted,
      isFinished,
      isCheated,
      questionsList,
      userAnswers,
      questionScores,
      totalTimeSpent,
      studentName,
      game,
      isTeacher,
      onSaveScore
    };
  }, [
    hasStarted,
    isFinished,
    isCheated,
    questionsList,
    userAnswers,
    questionScores,
    totalTimeSpent,
    studentName,
    game,
    isTeacher,
    onSaveScore
  ]);

  // Trigger Cheating Termination safely (ONLY for switching tab / leaving exam)
  const handleTriggerCheating = (reason: string) => {
    const curr = stateRef.current;
    if (curr.isFinished || curr.isCheated || !curr.hasStarted) return;

    setIsCheated(true);
    setCheatedReason(reason);
    setIsFinished(true);

    const questionsToUse = curr.questionsList.length > 0 ? curr.questionsList : curr.game.questions;

    const detailedBreakdown = questionsToUse.map((q, idx) => {
      const studentAns = (curr.userAnswers[idx]?.[0] || '').trim();
      const correctAns = (q.blanks[0]?.correctAnswer || '').trim();

      const hasBeenGraded = idx in curr.questionScores;
      const isCorrect = hasBeenGraded ? curr.questionScores[idx] : false;

      let displayStudentAns = studentAns || '(Bỏ trống)';
      if (!hasBeenGraded) {
        displayStudentAns = studentAns
          ? `${studentAns} (Chưa nộp - Ngắt do gian lận)`
          : '(Bị ngắt do gian lận)';
      }

      return {
        questionId: q.id,
        sentence: q.sentence,
        studentAnswer: displayStudentAns,
        correctAnswer: correctAns,
        isCorrect,
        explanation: q.explanation
      };
    });

    const totalCorrect = Object.values(curr.questionScores).filter(Boolean).length;
    const scorePercentage = Math.round((totalCorrect / questionsToUse.length) * 100);

    // Save score ONLY if NOT in teacher test play mode
    if (!curr.isTeacher) {
      curr.onSaveScore({
        id: `lb_${Date.now()}`,
        gameId: curr.game.id,
        gameTitle: curr.game.title,
        studentName: curr.studentName.trim() || studentName.trim() || 'Học viên',
        score: scorePercentage,
        totalQuestions: questionsToUse.length,
        timeSpentSeconds: curr.totalTimeSpent,
        accuracy: scorePercentage,
        completedAt: new Date().toLocaleString('vi-VN', { hour12: false }),
        details: detailedBreakdown,
        isCheated: true,
        cheatedReason: reason
      });
    }
  };

  // Safely handle student attempt to exit game during exam
  const handleExitAttempt = () => {
    if (hasStarted && !isFinished && !isCheated) {
      setShowExitConfirmModal(true);
    } else {
      onClose();
    }
  };

  // Anti-cheating & Shortcut blocking event listeners
  useEffect(() => {
    if (!hasStarted || isFinished || isCheated) return;

    // Detect Tab Switch / Window Minimize (ONLY THIS TRIGGERS CHEAT END)
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handleTriggerCheating('Chuyển tab / Rời khỏi trang bài thi');
      }
    };

    // Warn on attempt to close browser or reload tab during exam
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      handleTriggerCheating('Thoát game có chủ đích khi đang làm bài');
    };

    // Block keyboard shortcuts & show top-right toast alert
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        showBlockedToast('⚠️ Đã vô hiệu hóa phím F12 trong khi làm bài thi!');
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        ['I', 'i', 'J', 'j', 'C', 'c', 'S', 's', 'K', 'k'].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
        showBlockedToast('⚠️ Đã vô hiệu hóa tổ hợp phím Developer Tools!');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        showBlockedToast('⚠️ Đã vô hiệu hóa phím xem mã nguồn (Ctrl+U)!');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        showBlockedToast('⚠️ Đã vô hiệu hóa sao chép (Ctrl+C) khi làm bài!');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        e.stopPropagation();
        showBlockedToast('⚠️ Đã vô hiệu hóa dán (Ctrl+V) khi làm bài!');
        return;
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showBlockedToast('⚠️ Đã vô hiệu hóa thao tác Sao Chép (Copy)!');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showBlockedToast('⚠️ Đã vô hiệu hóa thao tác Dán (Paste)!');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showBlockedToast('⚠️ Đã vô hiệu hóa Menu chuột phải trong bài thi!');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [hasStarted, isFinished, isCheated]);

  // Shuffle questions array when game starts or when replaying
  useEffect(() => {
    if (game && game.questions.length > 0) {
      setShuffledQuestions(shuffleQuestions(game.questions));
    }
  }, [game]);

  // Countdown timer effect for 3...2...1... screen
  useEffect(() => {
    if (!isCountdownActive) return;

    if (countdownValue > 0) {
      const timer = setTimeout(() => {
        setCountdownValue((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsCountdownActive(false);
      setHasStarted(true);
    }
  }, [isCountdownActive, countdownValue]);

  // Reset time left whenever current question index or question changes
  useEffect(() => {
    if (hasStarted) {
      setTimeLeft(questionTimeLimit);
    }
  }, [currentIndex, hasStarted, questionTimeLimit]);

  // Countdown timer effect for question answering
  useEffect(() => {
    if (!hasStarted || isFinished || questionTimeLimit === 0 || showExplanation || isCountdownActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleCheckAnswer(true);
          return 0;
        }
        return prev - 1;
      });
      setTotalTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, isFinished, currentIndex, showExplanation, questionTimeLimit, isCountdownActive]);

  const handleUnlockAndStart = (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = studentName.trim() || (isTeacher ? 'MS. LANIE (CHƠI THỬ)' : '');

    if (!targetName) {
      setPassError('Vui lòng nhập tên của bạn để bắt đầu làm bài!');
      return;
    }

    if (!isTeacher && game.passwordType !== 'none' && !isUnlocked) {
      if (validateGamePassword(game, enteredPassword)) {
        setIsUnlocked(true);
        setPassError('');
      } else {
        setPassError('Mật khẩu / Mã PIN không chính xác hoặc đã hết hạn!');
        return;
      }
    }

    setStudentName(targetName);
    setShuffledQuestions(shuffleQuestions(game.questions));
    setCountdownValue(3);
    setIsCountdownActive(true);
  };

  const handleInputChange = (blankIdx: number, val: string) => {
    const updated = [...currentInputs];
    updated[blankIdx] = val;
    setUserAnswers({ ...userAnswers, [currentIndex]: updated });
  };

  const handleCheckAnswer = (isTimeOut = false) => {
    if (showExplanation) return;

    let allCorrect = true;
    if (isTimeOut) {
      allCorrect = false;
      setIsTimeOutTriggered(true);
    } else {
      currentQuestion.blanks.forEach((blank, idx) => {
        const studentAns = (currentInputs[idx] || '').trim().toLowerCase();
        const targetAns = blank.correctAnswer.toLowerCase();
        const acceptable = (blank.acceptableAnswers || []).map((a) => a.toLowerCase());

        if (studentAns !== targetAns && !acceptable.includes(studentAns)) {
          allCorrect = false;
        }
      });
    }

    setQuestionScores((prev) => ({ ...prev, [currentIndex]: allCorrect }));
    setEarnedPointsMap((prev) => ({
      ...prev,
      [currentIndex]: allCorrect ? liveQuestionPoints : 0
    }));
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    setShowExplanation(false);
    setIsTimeOutTriggered(false);

    const questionsToUse = questionsList.length > 0 ? questionsList : game.questions;

    if (currentIndex < questionsToUse.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
    } else {
      // Game completed
      setIsFinished(true);
      const totalCorrect = Object.values(questionScores).filter(Boolean).length;
      const scorePercentage = Math.round((totalCorrect / questionsToUse.length) * 100);

      const detailedBreakdown = questionsToUse.map((q, idx) => {
        const studentAns = (userAnswers[idx]?.[0] || '').trim();
        const correctAns = (q.blanks[0]?.correctAnswer || '').trim();
        const acceptable = (q.blanks[0]?.acceptableAnswers || []).map((a) => a.toLowerCase());
        const isCorrect =
          questionScores[idx] ??
          (studentAns.toLowerCase() === correctAns.toLowerCase() ||
            acceptable.includes(studentAns.toLowerCase()));

        return {
          questionId: q.id,
          sentence: q.sentence,
          studentAnswer: studentAns || '(Bỏ trống)',
          correctAnswer: correctAns,
          isCorrect,
          explanation: q.explanation
        };
      });

      // Save score ONLY if NOT in teacher test play mode
      if (!isTeacher) {
        onSaveScore({
          id: `lb_${Date.now()}`,
          gameId: game.id,
          gameTitle: game.title,
          studentName: studentName.trim(),
          score: scorePercentage,
          totalQuestions: questionsToUse.length,
          timeSpentSeconds: totalTimeSpent,
          accuracy: scorePercentage,
          completedAt: new Date().toLocaleString('vi-VN', { hour12: false }),
          details: detailedBreakdown,
          isCheated,
          cheatedReason
        });
      }
    }
  };

  const handleReplayGame = () => {
    // Re-shuffle questions for anti-copying on replay
    setShuffledQuestions(shuffleQuestions(game.questions));
    setCurrentIndex(0);
    setIsFinished(false);
    setIsCheated(false);
    setCheatedReason('');
    setIsTimeOutTriggered(false);
    setUserAnswers({});
    setQuestionScores({});
    setEarnedPointsMap({});
    setTotalTimeSpent(0);
    setTimeLeft(game.questions[0]?.timeLimit || game.timePerQuestion);

    // Trigger 3... 2... 1... countdown on restart
    setCountdownValue(3);
    setIsCountdownActive(true);
  };

  // 1. COUNTDOWN SCREEN (Requirement #2)
  if (isCountdownActive) {
    return (
      <div className="fixed inset-0 bg-[#0c0a1f] z-50 flex flex-col items-center justify-center text-center p-6 space-y-6 animate-in fade-in">
        <span className="px-5 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.25)]">
          ARENA READY
        </span>

        <h3 className="text-xl sm:text-2xl font-black text-stone-200 uppercase tracking-widest">
          TRẬN ĐẤU BẮT ĐẦU SAU
        </h3>

        <div className="text-8xl sm:text-9xl font-black text-amber-500 drop-shadow-[0_0_40px_rgba(245,158,11,0.7)] animate-bounce my-4 font-mono select-none">
          {countdownValue}
        </div>

        <p className="text-amber-400/90 text-sm font-extrabold uppercase tracking-widest italic">
          HÃY TẬP TRUNG TỐI ĐA!
        </p>

        {studentName && (
          <div className="text-xs font-extrabold text-stone-400 bg-stone-900/90 px-4 py-2 rounded-2xl border border-stone-800 shadow-inner">
            Học viên: <span className="text-amber-300">{studentName}</span> • Lượt làm bài #{currentAttemptNumber}
          </div>
        )}
      </div>
    );
  }

  // 2. PRE-START STANDALONE PAGE SCREEN
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-[#FEFDED] text-stone-900 flex flex-col justify-between p-4 sm:p-8 w-full">
        <div className="max-w-2xl mx-auto w-full space-y-6 my-auto py-6">
          <button
            onClick={onClose}
            className="text-xs font-extrabold text-stone-700 hover:text-stone-900 flex items-center gap-2 cursor-pointer bg-[#FAF8E5] px-4 py-2.5 rounded-2xl border border-[#E2E0C8] shadow-2xs transition-colors w-fit hover:bg-stone-200/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Danh Sách Game</span>
          </button>

          <div className="bg-[#FEFDED] rounded-3xl w-full border border-[#E2E0C8] shadow-md p-6 sm:p-10 relative">

          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full border border-amber-300 shadow-2xs">
              {game.category}
            </span>
            <span className="text-xs text-stone-500 font-bold flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
              {game.questions.length} câu hỏi ngẫu nhiên
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mb-2 leading-tight tracking-tight">
            {game.title}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mb-6 leading-relaxed">
            {game.description}
          </p>

          {/* Teacher Test Play Banner (Requirement #1) */}
          {isTeacher && (
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl p-3.5 mb-5 text-xs font-bold space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-700 font-extrabold">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Chế độ Giáo Viên Chơi Thử:</span>
              </div>
              <p className="text-stone-600 font-medium">
                Mật khẩu được tự động bỏ qua. Kết quả lượt chơi thử này sẽ không lưu vào Bảng Xếp Hạng.
              </p>
            </div>
          )}

          <form onSubmit={handleUnlockAndStart} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-stone-800 block">
                  Tên Học Viên {isTeacher ? '(Chơi Thử)' : '(Bắt buộc)'}
                </label>
                {studentName.trim() && !isTeacher && (
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    Đây là lượt chơi thứ #{currentAttemptNumber} của bạn
                  </span>
                )}
              </div>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    setPassError('');
                  }}
                  placeholder="Nhập họ và tên của bạn..."
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-stone-300 bg-[#FFFDF0] focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-stone-900 font-bold shadow-2xs"
                  autoFocus={!isTeacher}
                />
              </div>
            </div>

            {!isTeacher && game.passwordType !== 'none' && !isUnlocked && (
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-stone-800 block mb-1.5">
                  Mật khẩu / Mã PIN Phòng Game ({game.passwordType === 'static' ? 'Mã Cố Định' : 'Mã Động Tự Đổi'})
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="password"
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      setPassError('');
                    }}
                    placeholder="Nhập mật khẩu do Ms. Lanie cấp..."
                    className="w-full pl-10 pr-4 py-3 text-sm font-mono rounded-2xl border border-stone-300 bg-[#FFFDF0] focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-stone-900 shadow-2xs"
                  />
                </div>
              </div>
            )}

            {passError && (
              <p className="text-xs font-bold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                {passError}
              </p>
            )}

            <div className="bg-[#FAF8E5] p-4 rounded-2xl border border-[#E2E0C8] shadow-2xs space-y-2 text-xs text-stone-600">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  Thời gian làm bài:
                </span>
                <strong className="text-stone-900">
                  {game.timePerQuestion > 0 ? `${game.timePerQuestion}s / câu` : 'Tùy chỉnh'}
                </strong>
              </div>
              <div className="flex items-center justify-between font-semibold text-emerald-700">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                  Cơ chế chống chép:
                </span>
                <strong className="text-amber-800">Xáo trộn câu ngẫu nhiên</strong>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
            >
              <Flame className="w-5 h-5 text-amber-300 fill-amber-300" />
              <span>{isTeacher ? 'BẮT ĐẦU CHƠI THỬ (CHẾ ĐỘ GIÁO VIÊN)' : 'BẮT ĐẦU CHƠI QUIZ NGAY'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

  // 3. END-GAME RESULT VIEW (Requirement #4 - Matching Image #2)
  if (isFinished) {
    const totalQuestions = game.questions.length;
    const answeredCount = Object.keys(questionScores).length;
    const totalCorrect = Object.values(questionScores).filter(Boolean).length;
    const finalAccuracy = Math.round((totalCorrect / totalQuestions) * 100);
    const totalBonusPoints = (Object.values(earnedPointsMap) as number[]).reduce((a, b) => a + b, 0);

    // Build combined leaderboard for top 10 display
    const currentEntry: LeaderboardEntry = {
      id: `current_${Date.now()}`,
      gameId: game.id,
      gameTitle: game.title,
      studentName: studentName || 'Học viên',
      score: totalBonusPoints || finalAccuracy * 10,
      totalQuestions,
      timeSpentSeconds: totalTimeSpent,
      accuracy: finalAccuracy,
      completedAt: new Date().toLocaleString('vi-VN', { hour12: false }),
      isCheated,
      cheatedReason
    };

    const combinedLeaderboard = [...allLeaderboard.filter((e) => e.gameId === game.id)];
    // Insert current entry if not already in list
    if (!combinedLeaderboard.some((e) => e.id === currentEntry.id)) {
      combinedLeaderboard.push(currentEntry);
    }
    
    // Group entries by student name (taking the highest score per student)
    interface StudentGroup {
      entry: LeaderboardEntry;
      totalPlays: number;
    }
    const groupedMap: Record<string, StudentGroup> = {};
    combinedLeaderboard.forEach((e) => {
      const normName = e.studentName.trim().toLowerCase();
      if (!groupedMap[normName]) {
        groupedMap[normName] = { entry: e, totalPlays: 1 };
      } else {
        groupedMap[normName].totalPlays += 1;
        // Keep highest score or best time
        if (
          e.score > groupedMap[normName].entry.score ||
          (e.score === groupedMap[normName].entry.score && e.timeSpentSeconds < groupedMap[normName].entry.timeSpentSeconds)
        ) {
          groupedMap[normName].entry = e;
        }
      }
    });

    const top10List = Object.values(groupedMap)
      .sort((a, b) => b.entry.score - a.entry.score || a.entry.timeSpentSeconds - b.entry.timeSpentSeconds)
      .slice(0, 10);

    // Detailed question result objects for report modal
    const detailedBreakdown: QuestionResultDetail[] = questionsList.map((q, idx) => {
      const studentAns = (userAnswers[idx]?.[0] || '').trim();
      const correctAns = (q.blanks[0]?.correctAnswer || '').trim();
      const acceptable = (q.blanks[0]?.acceptableAnswers || []).map((a) => a.toLowerCase());
      const isCorrect =
        questionScores[idx] ??
        (studentAns.toLowerCase() === correctAns.toLowerCase() ||
          acceptable.includes(studentAns.toLowerCase()));

      return {
        questionId: q.id,
        sentence: q.sentence,
        studentAnswer: studentAns || '(Bỏ trống)',
        correctAnswer: correctAns,
        isCorrect,
        explanation: q.explanation
      };
    });

    const wrongQuestionsList = detailedBreakdown.filter((item) => !item.isCorrect);

    // 3A. DEDICATED CHEATING DETECTION SCREEN (Matches attached screenshot)
    if (isCheated) {
      return (
        <div className="min-h-screen bg-[#FEFDED] flex items-center justify-center p-4 sm:p-8 font-sans w-full">
          <div className="bg-[#FEFDED] border border-[#E2E0C8] rounded-3xl max-w-2xl w-full shadow-lg relative overflow-hidden p-6 sm:p-10 border-t-8 border-t-rose-600 space-y-6">
            {/* Exclamation Icon in Circle */}
            <div className="w-14 h-14 rounded-full border-2 border-rose-200 bg-rose-50 flex items-center justify-center text-rose-600 font-black text-2xl mx-auto shadow-xs">
              !
            </div>

            {/* Main Title */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight flex items-center justify-center gap-2">
                <span>BỊ PHÁT HIỆN GIAN LẬN!</span>
                <span>⚠️</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 font-medium leading-relaxed max-w-xl mx-auto">
                {cheatedReason === 'Thoát game có chủ đích khi đang làm bài'
                  ? 'Bạn đã chọn thoát khỏi trò chơi khi đang làm bài thi. Trò chơi đã bị khóa để đảm bảo công bằng, nhưng hệ thống vẫn lưu lại điểm số và kết quả thực tế bạn đã làm được trước khi rời trang.'
                  : 'Bạn đã chuyển tab, thay đổi kích thước cửa sổ hoặc mở ứng dụng khác. Trò chơi đã bị khóa để đảm bảo công bằng, nhưng hệ thống vẫn lưu lại điểm số và kết quả thực tế bạn đã làm được trước khi rời trang.'}
              </p>
            </div>

            {/* Game / Class Pill Tag */}
            <div className="text-center">
              <span className="inline-block bg-[#FFFDF0] border border-amber-800/40 px-4 py-1.5 rounded-full text-xs font-black text-amber-900 uppercase tracking-widest shadow-2xs font-mono">
                {game.title ? game.title.toUpperCase() : 'HIỆN TẠI ĐƠN - LỚP 6'}
              </span>
            </div>

            {/* Stat Cards Grid (3 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#FAF8E5] border border-[#E2E0C8] rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                  TỔNG ĐIỂM
                </span>
                <div className="text-2xl font-black text-rose-600 font-mono">
                  {totalBonusPoints || finalAccuracy * 10} pts
                </div>
                <span className="text-[10px] font-extrabold text-rose-500 uppercase block">
                  (GHI NHẬN ĐIỂM THẬT)
                </span>
              </div>

              <div className="bg-[#FAF8E5] border border-[#E2E0C8] rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                  SỐ CÂU ĐÃ LÀM
                </span>
                <div className="text-2xl font-black text-amber-800 font-mono">
                  {answeredCount}/{totalQuestions}
                </div>
                <span className="text-[10px] font-extrabold text-amber-600 uppercase block">
                  {answeredCount === totalQuestions ? '(HOÀN THÀNH)' : '(CHƯA HOÀN THÀNH)'}
                </span>
              </div>

              <div className="bg-[#FAF8E5] border border-[#E2E0C8] rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                  SỐ CÂU ĐÚNG
                </span>
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  {totalCorrect}/{totalQuestions}
                </div>
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase block">
                  ({finalAccuracy}% CHÍNH XÁC)
                </span>
              </div>
            </div>

            {/* Cloud Sync Status Box */}
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                  TRẠNG THÁI ĐỒNG BỘ:
                </span>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full px-3 py-0.5 text-[11px] font-extrabold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ĐÃ ĐỒNG BỘ MÁY CHỦ CLOUD</span>
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                Kết quả đã được tải lên Cloud thành công! Giáo viên có thể xem trực tiếp điểm số và câu trả lời chi tiết của bạn trên hệ thống.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleReplayGame}
                className="py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-500 text-stone-900 font-black text-xs sm:text-sm uppercase tracking-wider shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-amber-500/30"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>CHƠI LẠI LƯỢT MỚI</span>
              </button>

              <button
                onClick={onClose}
                className="py-3.5 px-6 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-black text-xs sm:text-sm uppercase tracking-wider shadow-2xs transition-colors flex items-center justify-center cursor-pointer border border-stone-300/80"
              >
                <span>TRỞ VỀ SẢNH GAME</span>
              </button>
            </div>

            {/* Link to Detailed Report */}
            <div className="text-center pt-1">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="text-xs font-bold text-stone-500 hover:text-stone-800 underline cursor-pointer"
              >
                Xem chi tiết các câu đã trả lời
              </button>
            </div>
          </div>

          {/* Detailed Question Breakdown Report Modal */}
          {isReportModalOpen && (
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div className="bg-[#FEFDED] rounded-3xl max-w-3xl w-full border border-[#E2E0C8] shadow-2xl p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E0C8]">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Báo cáo chi tiết quá trình làm bài
                    </span>
                    <h3 className="text-lg font-extrabold text-stone-900 mt-1">
                      {game.title} — {studentName}
                    </h3>
                    <p className="text-xs text-stone-500">
                      Số câu làm: <strong>{answeredCount}/{totalQuestions}</strong> | Đúng: <strong className="text-emerald-700">{totalCorrect}</strong> | Thời gian: <strong>{totalTimeSpent}s</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => setIsReportModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 flex items-center justify-center text-stone-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 2 Tabs: Quá trình làm bài vs các câu đã sai */}
                <div className="flex items-center gap-2 py-3 border-b border-[#E2E0C8]">
                  <button
                    onClick={() => setReportTab('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      reportTab === 'all'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    Quá trình làm bài ({detailedBreakdown.length} câu)
                  </button>

                  <button
                    onClick={() => setReportTab('wrong')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      reportTab === 'wrong'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    Các câu đã sai ({wrongQuestionsList.length} câu)
                  </button>
                </div>

                {/* Modal Content Items */}
                <div className="overflow-y-auto space-y-3 pt-3 pr-1 flex-1">
                  {(reportTab === 'all' ? detailedBreakdown : wrongQuestionsList).map((item, idx) => (
                    <div
                      key={item.questionId || idx}
                      className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                        item.isCorrect
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-stone-800">Câu {idx + 1}: {item.sentence}</span>
                        {item.isCorrect ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                            <Check className="w-3 h-3" /> Đúng
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black flex items-center gap-1">
                            <X className="w-3 h-3" /> Sai
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <p className="text-stone-700">
                          Đã điền: <strong className="font-mono text-stone-900">{item.studentAnswer}</strong>
                        </p>
                        <p className="text-emerald-800">
                          Đáp án đúng: <strong className="font-mono">{item.correctAnswer}</strong>
                        </p>
                      </div>

                      {item.explanation && (
                        <p className="text-stone-600 italic text-[11px] pt-1 border-t border-stone-200/60">
                          💡 Giải thích: {item.explanation}
                        </p>
                      )}
                    </div>
                  ))}

                  {reportTab === 'wrong' && wrongQuestionsList.length === 0 && (
                    <div className="text-center py-8 text-stone-500 text-xs font-bold">
                      🎉 Không có câu trả lời sai nào.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FEFDED] flex flex-col p-4 sm:p-8 font-sans w-full">
        {/* Top Navigation Header Bar (Image #2) */}
        <div className="bg-[#FEFDED] border border-[#E2E0C8] rounded-3xl p-4 sm:p-5 shadow-sm max-w-6xl w-full mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-amber-900 tracking-tight">
                Ms.Lanie QUIZ
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono font-extrabold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
                  PIN {game.passwordValue || 'Lanie_A1'}
                </span>
                <span className="text-xs text-stone-500 font-semibold">• {game.title}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Report Button */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-4 py-2.5 bg-amber-100/80 hover:bg-amber-200/90 text-amber-950 font-extrabold text-xs rounded-2xl border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Eye className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Xem báo cáo (View report)</span>
            </button>

            {/* Replay Button */}
            <button
              onClick={handleReplayGame}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Làm lại (Chơi lượt #{currentAttemptNumber + 1})</span>
            </button>

            {/* Done Button */}
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-extrabold text-xs rounded-2xl shadow-2xs transition-colors cursor-pointer border border-amber-500/40"
            >
              Xong (Done)
            </button>
          </div>
        </div>

        {/* Main Content Two-Column Grid (Image #2) */}
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-10">
          {/* Left Column: Player Status Card */}
          <div className="lg:col-span-5 bg-[#FEFDED] rounded-3xl border border-[#E2E0C8] p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 block mb-4">
                PLAYER STATUS
              </span>

              {/* Mascot / Avatar Circle */}
              <div className="relative w-36 h-36 mx-auto mb-4">
                <div className="w-full h-full rounded-full bg-amber-200/60 border-4 border-amber-400/80 flex items-center justify-center shadow-inner relative overflow-hidden">
                  <div className="text-center">
                    <div className="text-3xl font-black text-amber-900 mb-0.5">x x</div>
                    <div className="w-8 h-3 bg-amber-900 rounded-b-full mx-auto"></div>
                  </div>
                </div>

                <div className="absolute top-0 right-0 w-8 h-8 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center font-black text-xs text-stone-900 shadow-xs">
                  1
                </div>

                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-400 text-stone-900 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500 shadow-xs">
                  {isCheated ? 'VI PHẠM' : 'COMPLETED'}
                </div>
              </div>

              {/* Player Name & Big Points */}
              <div className="text-center space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 uppercase tracking-tight">
                  {studentName}
                </h3>
                <div className="text-4xl font-black text-amber-800 font-mono tracking-tight">
                  {totalBonusPoints || finalAccuracy * 10}
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 block">
                  POINTS
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-[#E2E0C8] my-5" />

              {/* Stats Summary */}
              <div className="text-center space-y-1">
                <div className="text-sm font-extrabold text-emerald-700">
                  Accuracy: <strong className="text-emerald-800">{finalAccuracy}%</strong>
                </div>
                <p className="text-xs text-stone-500 font-mono">
                  {totalCorrect} / {totalQuestions} correct answers
                </p>
              </div>
            </div>

            {/* Bottom Play Button */}
            <button
              onClick={handleReplayGame}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>THI ĐẤU TIẾP (LƯỢT #{currentAttemptNumber + 1})</span>
            </button>
          </div>

          {/* Right Column: Top 10 Leaderboard Card */}
          <div className="lg:col-span-7 bg-[#FEFDED] rounded-3xl border border-[#E2E0C8] p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                <span>Bảng Xếp Hạng Top 10 Của Lớp</span>
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Gộp trùng tên học viên & lấy điểm số cao nhất
              </p>
            </div>

            {/* List Entries */}
            <div className="space-y-2.5">
              {top10List.map((item, idx) => {
                const entry = item.entry;
                const isCurrent = entry.studentName.trim().toLowerCase() === studentName.trim().toLowerCase();
                return (
                  <div
                    key={entry.id || idx}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-[#FAF8E5] border-[#E2E0C8]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border ${
                          idx === 0
                            ? 'bg-amber-400 text-stone-900 border-amber-500'
                            : idx === 1
                            ? 'bg-stone-200 text-stone-800 border-stone-300'
                            : idx === 2
                            ? 'bg-amber-700/20 text-amber-900 border-amber-400'
                            : 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}
                      >
                        #{idx + 1}
                      </div>

                      <div>
                        <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm uppercase tracking-tight flex items-center gap-1.5">
                          <span>{entry.studentName}</span>
                          {entry.isCheated && (
                            <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                              Gian lận
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-stone-500 font-medium flex items-center gap-2 mt-0.5">
                          <span>🎯 {entry.accuracy}% đúng</span>
                          <span>•</span>
                          <span>⏱️ {entry.timeSpentSeconds}s</span>
                          <span>•</span>
                          <span className="font-bold text-amber-900">🎮 {item.totalPlays} lượt chơi</span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-200/80 text-amber-950 px-3 py-1.5 rounded-xl font-mono font-black text-xs sm:text-sm border border-amber-300/80 shrink-0">
                      {entry.score} pts
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detailed Report View Modal (Opens via 'Xem báo cáo') */}
        {isReportModalOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#FEFDED] rounded-3xl max-w-3xl w-full border border-[#E2E0C8] shadow-2xl p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E0C8]">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Báo cáo chi tiết quá trình làm bài
                  </span>
                  <h3 className="text-lg font-extrabold text-stone-900 mt-1">
                    {game.title} — {studentName}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Số câu làm: <strong>{answeredCount}/{totalQuestions}</strong> | Đúng: <strong className="text-emerald-700">{totalCorrect}</strong> | Thời gian: <strong>{totalTimeSpent}s</strong>
                  </p>
                </div>

                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 flex items-center justify-center text-stone-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 2 Tabs: Quá trình làm bài vs các câu đã sai */}
              <div className="flex items-center gap-2 py-3 border-b border-[#E2E0C8]">
                <button
                  onClick={() => setReportTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    reportTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  Quá trình làm bài ({detailedBreakdown.length} câu)
                </button>

                <button
                  onClick={() => setReportTab('wrong')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    reportTab === 'wrong'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  Các câu đã sai ({wrongQuestionsList.length} câu)
                </button>
              </div>

              {/* Modal Content Items */}
              <div className="overflow-y-auto space-y-3 pt-3 pr-1 flex-1">
                {(reportTab === 'all' ? detailedBreakdown : wrongQuestionsList).map((item, idx) => (
                  <div
                    key={item.questionId || idx}
                    className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                      item.isCorrect
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-stone-800">Câu {idx + 1}: {item.sentence}</span>
                      {item.isCorrect ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                          <Check className="w-3 h-3" /> Đúng
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black flex items-center gap-1">
                          <X className="w-3 h-3" /> Sai
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <p className="text-stone-700">
                        Đã điền: <strong className="font-mono text-stone-900">{item.studentAnswer}</strong>
                      </p>
                      <p className="text-emerald-800">
                        Đáp án đúng: <strong className="font-mono">{item.correctAnswer}</strong>
                      </p>
                    </div>

                    {item.explanation && (
                      <p className="text-stone-600 italic text-[11px] pt-1 border-t border-stone-200/60">
                        💡 Giải thích: {item.explanation}
                      </p>
                    )}
                  </div>
                ))}

                {reportTab === 'wrong' && wrongQuestionsList.length === 0 && (
                  <div className="text-center py-8 text-stone-500 text-xs font-bold">
                    🎉 Xuất sắc! Bạn không trả lời sai câu nào trong bài thi này.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. ACTIVE GAMEPLAY QUESTION VIEW
  const parts = currentQuestion.sentence.split('[blank]');
  const progressPercent = Math.round(((currentIndex + 1) / questionsList.length) * 100);

  return (
    <div className="min-h-screen bg-[#FEFDED] text-stone-900 flex flex-col justify-between p-4 sm:p-8 max-w-4xl mx-auto w-full relative">
      {/* Top-Right Floating Toast Alert Banner for Blocked Actions */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900/95 text-white shadow-2xl rounded-2xl border border-amber-500/50 p-3.5 px-4 max-w-md flex items-center gap-3 animate-in slide-in-from-top-4 duration-200 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
              Cảnh báo thao tác
            </span>
            <p className="text-xs font-bold leading-snug">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Custom Exit Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FEFDED] rounded-3xl max-w-md w-full border border-[#E2E0C8] shadow-2xl p-6 relative space-y-4 text-stone-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xl shrink-0 border border-rose-200">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-black text-rose-600">CẢNH BÁO GIAN LẬN</h3>
                <p className="text-[11px] text-stone-500 font-extrabold uppercase tracking-wider">Xác nhận thoát bài thi</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
              Bạn đang trong quá trình làm bài thi! Nếu bạn thoát game lúc này, hệ thống sẽ tự động ghi nhận <strong className="text-rose-600 font-extrabold">VI PHẠM GIAN LẬN ("Thoát game có chủ đích khi đang làm bài")</strong> và gửi báo cáo cho Ms. Lanie.
            </p>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs font-bold text-amber-950 text-center">
              Bạn có chắc chắn muốn thoát game không?
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="py-3 px-4 rounded-2xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Tiếp tục làm bài
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  handleTriggerCheating('Thoát game có chủ đích khi đang làm bài');
                }}
                className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-xs cursor-pointer text-center border border-rose-700/30"
              >
                Xác nhận thoát
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#FEFDED] rounded-3xl w-full border border-[#E2E0C8] shadow-md p-6 sm:p-8 relative flex flex-col justify-between min-h-[480px]">
        {/* Top Progress Bar */}
        <div className="w-full bg-stone-200/80 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header Bar */}
        <div>
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#E2E0C8] mb-4 sm:mb-6 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs font-black text-indigo-700 bg-indigo-100/90 px-3 py-1 rounded-full border border-indigo-200">
                Câu {currentIndex + 1} / {questionsList.length}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-stone-600">
                Học viên: <strong className="text-stone-900">{studentName}</strong>
              </span>
            </div>

            {/* Decreasing Live Score Counter & Timer Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 font-mono text-xs font-black shadow-2xs shrink-0 animate-pulse"
                title="Điểm thưởng tốc độ (Giảm dần theo giây)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
                <span>+{liveQuestionPoints} đ</span>
              </div>

              {questionTimeLimit > 0 && (
                <div
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full font-mono text-xs font-extrabold border shrink-0 ${
                    timeLeft <= 5
                      ? 'bg-rose-100 text-rose-700 border-rose-300 animate-bounce'
                      : 'bg-[#FAF8E5] text-stone-800 border-stone-300 shadow-2xs'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
                  <span>{timeLeft}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Question Box & Styled Fill-in Blanks */}
          <div className="bg-[#FAF7EE] rounded-2xl p-5 sm:p-7 border border-[#E8E4D0] shadow-2xs mb-4 sm:mb-6 relative">
            <p className="text-[11px] font-black text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Điền từ tiếng Anh còn thiếu vào ô trống:</span>
            </p>

            <div className="text-base sm:text-lg md:text-xl font-bold text-stone-800 leading-relaxed sm:leading-loose flex flex-wrap items-center gap-2">
              {parts.map((part, idx) => (
                <React.Fragment key={idx}>
                  <span>{part}</span>
                  {idx < currentQuestion.blanks.length && (
                    <span className="inline-block relative my-1">
                      <input
                        type="text"
                        value={currentInputs[idx] || ''}
                        onChange={(e) => handleInputChange(idx, e.target.value)}
                        disabled={showExplanation}
                        placeholder="..."
                        className={`px-3.5 py-1.5 font-bold font-mono text-base sm:text-lg rounded-xl border-2 transition-all text-center focus:outline-none min-w-[120px] sm:min-w-[150px] shadow-2xs ${
                          showExplanation
                            ? (currentInputs[idx] || '').trim().toLowerCase() ===
                                currentQuestion.blanks[idx].correctAnswer.toLowerCase() ||
                              (currentQuestion.blanks[idx].acceptableAnswers || [])
                                .map((a) => a.toLowerCase())
                                .includes((currentInputs[idx] || '').trim().toLowerCase())
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                              : 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200'
                            : 'bg-[#FEFDED] border-indigo-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 text-indigo-900'
                        }`}
                      />
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Explanation Box with Soft Pleasing Colors (Requirement #3) */}
          {showExplanation && (
            <div className="bg-[#FAF7EE] text-stone-800 rounded-2xl p-4 sm:p-5 mb-6 border border-[#E8E4D0] shadow-2xs space-y-2.5 animate-in fade-in">
              {isTimeOutTriggered && (
                <div className="bg-rose-100 text-rose-800 border border-rose-300/80 p-2.5 rounded-xl font-bold text-xs flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-rose-600 animate-bounce shrink-0" />
                  <span>⏱️ HẾT THỜI GIAN LÀM BÀI! Câu hỏi này được tự động tính là Trả lời SAI.</span>
                </div>
              )}

              <div className="flex items-center gap-2 font-extrabold text-xs sm:text-sm">
                {questionScores[currentIndex] ? (
                  <span className="text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Chính xác! Tuyệt vời.
                  </span>
                ) : (
                  <span className="text-rose-800 bg-rose-100/90 border border-rose-300 px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" /> Rất tiếc, chưa chính xác!
                  </span>
                )}
              </div>

              <p className="text-stone-700 text-xs sm:text-sm">
                Đáp án đúng:{' '}
                <strong className="text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg font-mono">
                  {currentQuestion.blanks.map((b) => b.correctAnswer).join(', ')}
                </strong>
              </p>
              {currentQuestion.explanation && (
                <p className="text-stone-600 text-xs italic leading-relaxed pt-1.5 border-t border-[#E8E4D0]">
                  💡 Giải thích: {currentQuestion.explanation}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E2E0C8]">
          <button
            onClick={handleExitAttempt}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer flex items-center gap-1 py-1.5 px-3 rounded-xl hover:bg-rose-50 transition-colors border border-rose-200/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Thoát Game</span>
          </button>

          {!showExplanation ? (
            <button
              onClick={() => handleCheckAnswer(false)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <span>Nộp Câu Trả Lời</span>
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-2"
            >
              <span>
                {currentIndex < questionsList.length - 1 ? 'Câu Tiếp Theo' : 'Xem Kết Quả & BXH'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
