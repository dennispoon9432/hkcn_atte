import React, { useState } from 'react';
import {
  X,
  History,
  Trash2,
  Search,
  CheckCircle2,
  Calendar,
  ArrowUpDown,
  Clock,
  Filter,
} from 'lucide-react';
import { SystemLogEntry } from '../types';

interface SystemLogModalProps {
  logs: SystemLogEntry[];
  onClose: () => void;
}

export const SystemLogModal: React.FC<SystemLogModalProps> = ({
  logs,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.memberName && log.memberName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterType === 'all') return true;
    if (filterType === 'rsvp') return log.actionType === 'rsvp';
    if (filterType === 'events')
      return ['create', 'edit', 'delete', 'reorder'].includes(log.actionType);
    return true;
  });

  const getActionBadge = (type: SystemLogEntry['actionType']) => {
    switch (type) {
      case 'rsvp':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>出席登記</span>
          </span>
        );
      case 'create':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>新增活動</span>
          </span>
        );
      case 'edit':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>編輯活動</span>
          </span>
        );
      case 'delete':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <Trash2 className="w-3 h-3" />
            <span>刪除活動</span>
          </span>
        );
      case 'reorder':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" />
            <span>排位調整</span>
          </span>
        );
      default:
        return null;
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      return `${m}-${day} ${h}:${min}:${s}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                系統操作紀錄 (System Log)
              </h3>
              <p className="text-[11px] text-slate-500">
                追蹤活動變更、社員出席登記與修改歷程
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="搜尋社員名稱、活動名稱或關鍵字..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  filterType === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部 ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('rsvp')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  filterType === 'rsvp'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                出席登記
              </button>
              <button
                type="button"
                onClick={() => setFilterType('events')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  filterType === 'events'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                活動管理
              </button>
            </div>
          </div>
        </div>

        {/* Log List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <History className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">暫無相關操作紀錄</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 transition-colors space-y-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.actionType)}
                    <span className="font-bold text-slate-800">{log.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    {formatTime(log.timestamp)}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed pl-1">{log.detail}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>共 {filteredLogs.length} 條改動記錄</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
