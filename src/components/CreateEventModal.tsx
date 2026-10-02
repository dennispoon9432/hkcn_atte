import React, { useState } from 'react';
import { X, Calendar, MapPin, Clock, Tag, Sparkles } from 'lucide-react';
import { ClubEvent } from '../types';

interface CreateEventModalProps {
  onClose: () => void;
  onCreate: (eventData: Partial<ClubEvent>) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<'st_john' | 'service' | 'meeting' | 'social' | 'other'>('st_john');
  const [description, setDescription] = useState('');

  const PRESETS = [
    { label: 'St. John 當值', cat: 'st_john', title: 'St. John 急救義工出席', loc: '海洋公園' },
    { label: '扶青常規例會', cat: 'meeting', title: '香港城北扶青社 第 次常規例會', loc: '灣仔' },
    { label: '節日義務服務', cat: 'service', title: '社區服務義工行動', loc: '長洲' },
    { label: '社員聯誼聚餐', cat: 'social', title: '城北扶青社員聯誼聚會', loc: '銅鑼灣' },
  ];

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setTitle(p.title);
    setCategory(p.cat as any);
    setLocation(p.loc);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateStr.trim()) return;

    onCreate({
      title: title.trim(),
      dateStr: dateStr.trim(),
      timeStr: timeStr.trim(),
      location: location.trim() || '待定',
      category,
      description: description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              新建城北扶青社活動
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              建立後即時為 13 位社員生成出席名冊及 WhatsApp 報名連結
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Quick Preset Buttons */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#F58220]" />
              <span>快速套用活動模板：</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-50 hover:text-[#00A651] text-slate-600 rounded-lg transition-colors border border-slate-200/60 font-medium"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              活動名稱 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：24 Oct 海洋公園 St. John 出席"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                活動日期 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如：24 Oct 或 31 Oct - 1 Nov"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                活動時間 (可選)
              </label>
              <input
                type="text"
                placeholder="例如：09:00 - 18:00 或 待定"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white"
              />
            </div>
          </div>

          {/* Location & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                地點
              </label>
              <input
                type="text"
                placeholder="例如：海洋公園 / 長洲 / 灣仔"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                活動分類
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white"
              >
                <option value="st_john">St. John 急救義務</option>
                <option value="service">扶青社區服務</option>
                <option value="meeting">常規例會 / 幹事會</option>
                <option value="social">社員聯誼聚會</option>
                <option value="other">其他活動</option>
              </select>
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              活動說明與備註
            </label>
            <textarea
              rows={3}
              placeholder="集合時間地點、制服佩戴、搭船時間、自備用品等備註說明..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              建立活動
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
