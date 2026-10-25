export type AppRole = 'teacher' | 'student';

export type NavigationTab = 'games' | 'leaderboard' | 'scanner' | 'gemini' | 'settings';

export type PasswordType = 'none' | 'static' | 'dynamic';

export interface BlankItem {
  id: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  hint?: string;
}

export interface Question {
  id: string;
  // Sentence with [blank] placeholders, e.g. "She [blank] to the library every Sunday."
  sentence: string;
  blanks: BlankItem[];
  options?: string[]; // Word bank options for hints
  explanation?: string;
  timeLimit?: number; // Custom time limit for individual question in seconds (0 or undefined means use game default)
}

export interface GameQuiz {
  id: string;
  title: string;
  description: string;
  category: string;
  isPublished: boolean; // Bật / tắt ẩn hiện
  passwordType: PasswordType;
  passwordValue?: string; // Static password
  dynamicInterval?: number; // Automatic password rotation interval in seconds (1 to 100)
  timePerQuestion: number; // Default time per question in seconds
  questions: Question[];
  createdAt: string;
  updatedAt?: number; // Epoch timestamp in ms for precise synchronization & conflict resolution
  totalPlays: number;
}

export interface QuestionResultDetail {
  questionId: string;
  sentence: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface LeaderboardEntry {
  id: string;
  gameId: string;
  gameTitle: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  accuracy: number; // percentage
  completedAt: string;
  details?: QuestionResultDetail[];
  isCheated?: boolean;
  cheatedReason?: string;
}

export interface StudentSession {
  studentName: string;
  gameId: string;
  answers: Record<string, string[]>; // questionId -> array of filled blank answers
  currentQuestionIndex: number;
  timeRemaining: number;
  score: number;
  isFinished: boolean;
  startTime: number;
}
