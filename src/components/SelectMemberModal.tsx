import React from 'react';
import { X, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { CORE_MEMBERS } from '../config';
import { AttendanceChoice } from '../types';

interface SelectMemberModalProps {
  eventTitle: string;
  choice: AttendanceChoice;
  onSelect: (memberName: string) => void;
  onClose: () => void;
}

export const SelectMemberModal: React.FC<SelectMemberModalProps> = ({
  eventTitle,
  choice,
  onSelect,
  onClose,
}) => {
  const choiceConfig = {
    attending: {
      label: '去到',
      icon: CheckCircle2,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      btnHover: 'hover:bg-emerald-50 hover:border-[#00A651] hover:text-[#00A651]',
    },
    declined: {
      label: '去唔到',
      icon: XCircle,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      btnHover: 'hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600',
    },
    tbc: {
      label: 'TBC',
      icon: Clock,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      btnHover: 'hover:bg-amber-50 hover:border-amber-500 hover:text-amber-700',
    },
  }[choice];

  const Icon = choiceConfig.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${choiceConfig.badgeClass}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{choiceConfig.label}</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">登記出席</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 truncate max-w-[280px]">
              {eventTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Body */}
        <div className="p-5 overflow-y-auto space-y-3">
          <p className="text-xs font-bold text-slate-700">
            請問你係邊位社員？（點擊名字即可完成登記）
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CORE_MEMBERS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onSelect(name)}
                className={`py-3 px-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs active:scale-95 flex items-center justify-center cursor-pointer ${choiceConfig.btnHover}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
