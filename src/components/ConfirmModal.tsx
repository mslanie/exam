import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#FEFDED] rounded-2xl max-w-md w-full border border-[#E2E0C8] shadow-2xl overflow-hidden p-6 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
              isDanger
                ? 'bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            {isDanger ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-base leading-snug">{title}</h3>
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Xác nhận hành động Giáo viên
            </span>
          </div>
        </div>

        <p className="text-xs text-stone-700 leading-relaxed mb-6 bg-[#FAF8E5] p-3.5 rounded-xl border border-[#E2E0C8]">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200/70">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 font-extrabold text-xs text-white rounded-xl shadow-xs cursor-pointer transition-colors ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
