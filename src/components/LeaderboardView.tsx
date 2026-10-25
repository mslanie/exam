import React, { useState } from 'react';
import { LeaderboardEntry, GameQuiz, QuestionResultDetail } from '../types';
import {
  Award,
  Search,
  Clock,
  UserCheck,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  Flame,
  ListFilter
} from 'lucide-react';

interface LeaderboardViewProps {
  leaderboard: LeaderboardEntry[];
  games: GameQuiz[];
  selectedGameFilter?: string;
}

interface GroupedStudent {
  studentName: string;
  bestScore: number;
  bestAccuracy: number;
  bestTimeSpent: number;
  totalPlays: number;
  latestCompletedAt: string;
  attempts: LeaderboardEntry[];
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  leaderboard,
  games,
  selectedGameFilter = 'all',
}) => {
  const [filterGameId, setFilterGameId] = useState<string>(selectedGameFilter);
  const [search, setSearch] = useState('');

  // Selected student for attempt modal
  const [selectedStudent, setSelectedStudent] = useState<GroupedStudent | null>(null);
  // Selected attempt inside student modal
  const [selectedAttempt, setSelectedAttempt] = useState<LeaderboardEntry | null>(null);
  // Active review tab for attempt detail: 'all' (Quá trình làm đề) | 'wrong' (Các câu làm sai)
  const [reviewTab, setReviewTab] = useState<'all' | 'wrong'>('all');

  // Group entries by Student Name
  const groupedStudentsMap: Record<string, GroupedStudent> = {};

  leaderboard.forEach((entry) => {
    const matchesGame = filterGameId === 'all' || entry.gameId === filterGameId;
    const matchesSearch =
      entry.studentName.toLowerCase().includes(search.toLowerCase()) ||
      entry.gameTitle.toLowerCase().includes(search.toLowerCase());

    if (!matchesGame || !matchesSearch) return;

    const normalizedName = entry.studentName.trim().toLowerCase();

    if (!groupedStudentsMap[normalizedName]) {
      groupedStudentsMap[normalizedName] = {
        studentName: entry.studentName.trim(),
        bestScore: entry.score,
        bestAccuracy: entry.accuracy,
        bestTimeSpent: entry.timeSpentSeconds,
        totalPlays: 1,
        latestCompletedAt: entry.completedAt,
        attempts: [entry]
      };
    } else {
      const existing = groupedStudentsMap[normalizedName];
      existing.totalPlays += 1;
      existing.attempts.push(entry);

      // Check if this attempt is better
      if (
        entry.score > existing.bestScore ||
        (entry.score === existing.bestScore && entry.timeSpentSeconds < existing.bestTimeSpent)
      ) {
        existing.bestScore = entry.score;
        existing.bestAccuracy = entry.accuracy;
        existing.bestTimeSpent = entry.timeSpentSeconds;
      }

      existing.latestCompletedAt = entry.completedAt;
    }
  });

  const groupedList: GroupedStudent[] = Object.values(groupedStudentsMap).sort((a, b) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    return a.bestTimeSpent - b.bestTimeSpent;
  });

  const top1 = groupedList[0];
  const top2 = groupedList[1];
  const top3 = groupedList[2];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#FEFDED] rounded-2xl p-6 border border-[#E2E0C8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
              Hall of Fame
            </span>
          </div>
          <h1 className="text-xl font-bold text-stone-900">Bảng Xếp Hạng Học Viên Ms. Lanie</h1>
          <p className="text-xs text-stone-500 mt-1">
            Các học viên thi trùng tên được gộp làm 1 bản ghi với điểm số cao nhất. Nhấn vào học viên để xem chi tiết từng lượt làm bài.
          </p>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-stone-900 flex items-center justify-center font-bold text-xl shadow-xs">
          🏆
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên học viên..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 bg-[#FFFDF0] focus:outline-none focus:ring-2 focus:ring-indigo-600 text-stone-900 font-semibold"
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            value={filterGameId}
            onChange={(e) => setFilterGameId(e.target.value)}
            className="w-full md:w-auto text-xs font-bold p-2.5 rounded-xl border border-stone-300 bg-[#FFFDF0] text-stone-900 cursor-pointer"
          >
            <option value="all">Tất cả các Trò Chơi</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Podium Top 3 */}
      {groupedList.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 md:gap-6 pt-4 max-w-2xl mx-auto items-end">
          {/* Top 2 */}
          {top2 && (
            <div
              onClick={() => setSelectedStudent(top2)}
              className="bg-[#FAF8E5] rounded-2xl p-4 border border-[#E2E0C8] text-center shadow-xs flex flex-col items-center cursor-pointer hover:border-indigo-300 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-black flex items-center justify-center text-sm mb-2 border border-slate-300">
                🥈 2
              </div>
              <p className="font-extrabold text-stone-900 text-xs line-clamp-1">{top2.studentName}</p>
              <p className="text-[10px] text-stone-500 mb-1">{top2.totalPlays} lượt chơi</p>
              <span className="text-base font-black text-indigo-600">{top2.bestScore}%</span>
              <span className="text-[10px] text-stone-400 font-mono">{top2.bestTimeSpent}s</span>
            </div>
          )}

          {/* Top 1 */}
          {top1 && (
            <div
              onClick={() => setSelectedStudent(top1)}
              className="bg-[#FAF8E5] rounded-2xl p-5 border-2 border-amber-400 text-center shadow-md flex flex-col items-center -mt-4 cursor-pointer hover:border-amber-500 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-amber-400 text-stone-900 font-black flex items-center justify-center text-base mb-2 border border-amber-500 shadow-xs">
                🥇 1
              </div>
              <p className="font-black text-stone-900 text-sm line-clamp-1">{top1.studentName}</p>
              <p className="text-[10px] text-amber-800 font-bold mb-1">{top1.totalPlays} lượt chơi</p>
              <span className="text-xl font-black text-amber-700">{top1.bestScore}%</span>
              <span className="text-[10px] text-stone-500 font-mono">{top1.bestTimeSpent}s</span>
            </div>
          )}

          {/* Top 3 */}
          {top3 && (
            <div
              onClick={() => setSelectedStudent(top3)}
              className="bg-[#FAF8E5] rounded-2xl p-4 border border-[#E2E0C8] text-center shadow-xs flex flex-col items-center cursor-pointer hover:border-indigo-300 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-sm mb-2 border border-amber-200">
                🥉 3
              </div>
              <p className="font-extrabold text-stone-900 text-xs line-clamp-1">{top3.studentName}</p>
              <p className="text-[10px] text-stone-500 mb-1">{top3.totalPlays} lượt chơi</p>
              <span className="text-base font-black text-indigo-600">{top3.bestScore}%</span>
              <span className="text-[10px] text-stone-400 font-mono">{top3.bestTimeSpent}s</span>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-[#FEFDED] rounded-2xl border border-[#E2E0C8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8E5] border-b border-[#E2E0C8] text-stone-600 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Xếp hạng</th>
                <th className="py-3.5 px-6">Học viên</th>
                <th className="py-3.5 px-6">Điểm Cao Nhất</th>
                <th className="py-3.5 px-6">Tổng lượt chơi</th>
                <th className="py-3.5 px-6">Thời gian nhanh nhất</th>
                <th className="py-3.5 px-6 text-right">Chi tiết lượt chơi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {groupedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 font-semibold">
                    Chưa có học viên nào hoàn thành bài test.
                  </td>
                </tr>
              ) : (
                groupedList.map((st, idx) => (
                  <tr
                    key={st.studentName}
                    onClick={() => setSelectedStudent(st)}
                    className="hover:bg-amber-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 font-bold text-stone-900">
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                    </td>
                    <td className="py-4 px-6 font-extrabold text-stone-900 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{st.studentName}</span>
                    </td>
                    <td className="py-4 px-6 font-black text-indigo-700 text-sm">
                      {st.bestScore}%
                    </td>
                    <td className="py-4 px-6 text-stone-800 font-bold">
                      <span className="px-2.5 py-1 bg-stone-100 rounded-full border border-stone-200">
                        {st.totalPlays} lần chơi
                      </span>
                    </td>
                    <td className="py-4 px-6 text-stone-500 font-mono">{st.bestTimeSpent} giây</td>
                    <td className="py-4 px-6 text-right">
                      <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white rounded-xl font-bold transition-all inline-flex items-center gap-1 text-[11px]">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem Lịch Sử</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Student Attempt History */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FEFDED] rounded-3xl max-w-2xl w-full border border-[#E2E0C8] shadow-2xl p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E0C8] mb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  Lịch Sử Thi Đua Học Viên
                </span>
                <h3 className="text-xl font-black text-stone-900 mt-1">
                  {selectedStudent.studentName}
                </h3>
                <p className="text-xs text-stone-500">
                  Tổng số lần chơi: <strong>{selectedStudent.totalPlays} lần</strong> — Điểm cao nhất:{' '}
                  <strong className="text-emerald-700">{selectedStudent.bestScore}%</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Attempts List */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[450px]">
              {selectedStudent.attempts.map((att, idx) => (
                <div
                  key={att.id || idx}
                  onClick={() => setSelectedAttempt(att)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    att.isCheated
                      ? 'bg-rose-50/50 border-rose-200 hover:border-rose-400'
                      : 'bg-[#FAF8E5] border-[#E2E0C8] hover:border-indigo-400 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 border ${
                      att.isCheated ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      #{selectedStudent.attempts.length - idx}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">
                          {att.gameTitle}
                        </h4>
                        {att.isCheated && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Gian lận ({att.cheatedReason || 'Vi phạm nội quy'})</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 font-medium">
                        {att.completedAt} — Thời gian: {att.timeSpentSeconds}s
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-base sm:text-lg font-black ${att.isCheated ? 'text-rose-700' : 'text-indigo-600'}`}>
                      {att.score}%
                    </span>
                    <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Attempt Detail Review (2 Parts: All Questions + Wrong Questions Only) */}
      {selectedAttempt && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FEFDED] rounded-3xl max-w-3xl w-full border border-[#E2E0C8] shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="pb-3 border-b border-[#E2E0C8] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Xem Chi Tiết Bài Làm Game
                  </span>
                  <h3 className="text-lg font-extrabold text-stone-900 mt-1">
                    {selectedAttempt.gameTitle}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Học viên: <strong className="text-stone-900">{selectedAttempt.studentName}</strong> | Điểm:{' '}
                    <strong className="text-indigo-600">{selectedAttempt.score}%</strong> | Ngày:{' '}
                    {selectedAttempt.completedAt}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedAttempt.isCheated && (
                <div className="p-2.5 bg-rose-100 border border-rose-300 text-rose-950 rounded-xl text-xs font-bold flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>⚠️ Cảnh báo: Lượt bài thi này bị ngắt dừng sớm do gian lận: {selectedAttempt.cheatedReason || 'Vi phạm nội quy làm bài'}</span>
                </div>
              )}
            </div>

            {/* 2 Tabs Selection: All Questions vs Wrong Questions Only */}
            <div className="flex items-center gap-2 my-4 bg-stone-200/60 p-1 rounded-2xl shrink-0">
              <button
                onClick={() => setReviewTab('all')}
                className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  reviewTab === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>1. Quá Trình Làm Đề ({selectedAttempt.details?.length || 0} câu)</span>
              </button>

              <button
                onClick={() => setReviewTab('wrong')}
                className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  reviewTab === 'wrong'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-rose-700'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>
                  2. Các Câu Học Sinh Làm Sai (
                  {(selectedAttempt.details || []).filter((d) => !d.isCorrect).length} câu)
                </span>
              </button>
            </div>

            {/* Questions Review List */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[500px]">
              {(!selectedAttempt.details || selectedAttempt.details.length === 0) ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  Không có chi tiết từng câu cho lượt làm bài này.
                </div>
              ) : (
                (selectedAttempt.details || [])
                  .filter((q) => (reviewTab === 'wrong' ? !q.isCorrect : true))
                  .map((item, idx) => (
                    <div
                      key={item.questionId || idx}
                      className={`p-4 rounded-2xl border transition-all space-y-2 ${
                        item.isCorrect
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                            item.isCorrect
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-rose-200 text-rose-900'
                          }`}
                        >
                          Câu #{idx + 1}
                        </span>

                        <span className="text-xs font-bold flex items-center gap-1">
                          {item.isCorrect ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Chính xác
                            </span>
                          ) : (
                            <span className="text-rose-700 flex items-center gap-1 font-black">
                              <XCircle className="w-4 h-4" /> Làm Sai
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Sentence text */}
                      <p className="text-xs sm:text-sm font-semibold text-stone-900">
                        {item.sentence}
                      </p>

                      {/* Answers comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2 rounded-xl bg-[#FFFDF0] border border-[#E2E0C8]">
                          <span className="text-[10px] text-stone-500 font-bold uppercase block">
                            Học sinh điền:
                          </span>
                          <span
                            className={`font-mono font-extrabold text-sm ${
                              item.isCorrect ? 'text-emerald-700' : 'text-rose-600 line-through'
                            }`}
                          >
                            {item.studentAnswer || '(Bỏ trống)'}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-[#FFFDF0] border border-[#E2E0C8]">
                          <span className="text-[10px] text-emerald-700 font-bold uppercase block">
                            Đáp án đúng chính xác:
                          </span>
                          <span className="font-mono font-extrabold text-sm text-emerald-800">
                            {item.correctAnswer}
                          </span>
                        </div>
                      </div>

                      {item.explanation && (
                        <p className="text-[11px] text-stone-600 italic bg-[#FAF8E5] p-2 rounded-lg border border-[#E2E0C8]">
                          💡 Giải thích: {item.explanation}
                        </p>
                      )}
                    </div>
                  ))
              )}

              {reviewTab === 'wrong' &&
                (selectedAttempt.details || []).filter((d) => !d.isCorrect).length === 0 && (
                  <div className="p-10 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-xs font-bold">
                    🎉 Hoàn hảo! Học viên không làm sai bất kỳ câu hỏi nào trong lượt thi này.
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

