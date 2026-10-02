import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { SimpleEvent } from '../types';

interface DeleteConfirmModalProps {
  event: SimpleEvent;
  onClose: () => void;
  onConfirm: (eventId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  event,
  onClose,
  onConfirm,
}) => {
  const [inputText, setInputText] = useState('');
  const [hasError, setHasError] = useState(false);

  const isValid = inputText.trim().toUpperCase() === 'HKCN';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onConfirm(event.id);
    } else {
      setHasError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-rose-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-rose-900 text-sm">確認刪除活動</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">即將刪除：</p>
            <p className="text-sm font-bold text-slate-900">{event.title}</p>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-semibold text-amber-900">
            ⚠️ 需要輸入「HKCN」去刪除活動
          </div>

          <div>
            <input
              type="text"
              autoFocus
              placeholder="請輸入 HKCN"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setHasError(false);
              }}
              className={`w-full px-3 py-2 bg-slate-50 border ${
                hasError ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-300'
              } rounded-xl text-xs text-slate-900 font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500`}
            />
            {hasError && (
              <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                輸入不正確，需要輸入「HKCN」
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>確認刪除</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
