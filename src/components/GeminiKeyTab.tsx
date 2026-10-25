import React, { useState, useEffect } from 'react';
import { Sparkles, Key, CheckCircle2, ShieldCheck, AlertCircle, Save, ExternalLink } from 'lucide-react';

import { testGeminiApiKey } from '../utils/geminiService';

interface GeminiKeyTabProps {
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  onRequestConfirm?: (title: string, message: string, action: () => void) => void;
}

export const GeminiKeyTab: React.FC<GeminiKeyTabProps> = ({
  apiKey,
  onSaveApiKey,
  onRequestConfirm,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  const handleSave = () => {
    const doSave = () => {
      onSaveApiKey(inputKey.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    };

    if (onRequestConfirm) {
      onRequestConfirm(
        'Lưu Cấu Hình Gemini API Key',
        'Xác nhận lưu Gemini API Key mới vào hệ thống quản lý Ms. Lanie?',
        doSave
      );
    } else {
      doSave();
    }
  };

  const handleTestKey = async () => {
    if (!inputKey.trim()) {
      setTestResult({ success: false, message: 'Vui lòng nhập API Key trước khi kiểm tra!' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testGeminiApiKey(inputKey.trim());
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: 'Lỗi kết nối AI: ' + (e?.message || 'Vui lòng thử lại!')
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-[#FEFDED] rounded-2xl p-6 border border-[#E2E0C8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>AI Integration</span>
            </span>
            <span className="text-xs text-stone-500 font-semibold">Gemini 3.8 Flash</span>
          </div>
          <h1 className="text-xl font-bold text-stone-900">
            Cấu Hình Gemini API Key Để Quét Đề Tự Động
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Nhập Google Gemini API Key để giúp trí tuệ nhân tạo AI tự động đọc tài liệu Word, Excel, PDF, TXT và chiết xuất câu hỏi điền từ vựng cực kỳ chuẩn xác.
          </p>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-[#FEFDED] rounded-2xl p-6 border border-[#E2E0C8] shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            Nhập Google Gemini API Key
          </h3>

          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
              apiKey
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {apiKey ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{apiKey ? 'Đã kích hoạt AI Gemini' : 'Chưa nhập Key'}</span>
          </span>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-700 block mb-1.5">
            Gemini API Key (Google AI Studio Key)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 text-xs font-mono font-bold p-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-stone-900 font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Key</span>
            </button>

            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !inputKey.trim()}
              className="px-4 py-3 bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{isTesting ? 'Đang test...' : 'Kiểm Tra Kết Nối'}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Đã lưu Gemini API Key thành công vào bộ nhớ trình duyệt!</span>
          </div>
        )}

        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="bg-[#FAF8E5] p-4 rounded-xl border border-[#E2E0C8] space-y-2 text-xs text-stone-700">
          <p className="font-bold text-stone-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Hướng dẫn lấy Gemini API Key miễn phí từ Google:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-stone-600 leading-relaxed pl-1">
            <li>
              Truy cập trang Google AI Studio Key Manager:{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5 hover:text-indigo-800"
              >
                aistudio.google.com/app/apikey <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Đăng nhập tài khoản Google của giáo viên.</li>
            <li>Nhấn vào nút <strong>"Create API key"</strong> và sao chép chuỗi mã bắt đầu bằng <code className="bg-white px-1 py-0.5 rounded font-mono font-bold">AIzaSy...</code></li>
            <li>Dán chuỗi mã vừa lấy vào ô bên trên và nhấn <strong>Lưu Key</strong>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
