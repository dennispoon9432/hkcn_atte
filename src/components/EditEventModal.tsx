import React, { useState } from 'react';
import { X, Edit2 } from 'lucide-react';
import { SimpleEvent } from '../types';

interface EditEventModalProps {
  event: SimpleEvent;
  onClose: () => void;
  onSave: (eventId: string, title: string, dateTime: string) => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({ event, onClose, onSave }) => {
  const [title, setTitle] = useState(event.title);
  const [dateTime, setDateTime] = useState(event.dateTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateTime.trim()) return;
    onSave(event.id, title.trim(), dateTime.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#00A651] flex items-center justify-center font-bold">
              <Edit2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">編輯活動</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              活動名稱
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              日期與時間
            </label>
            <input
              type="text"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white"
            />
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
              className="px-5 py-2 text-xs font-bold text-white bg-[#00A651] hover:bg-[#008f45] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              確認儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
