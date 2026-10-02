import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, Timer, MessageSquare } from 'lucide-react';
import { CORE_MEMBERS } from '../config';
import { AttendanceChoice } from '../types';

interface SelectMemberModalProps {
  eventTitle: string;
  choice: AttendanceChoice;
  onSelect: (memberName: string, remark?: string) => void;
  onClose: () => void;
}

export const SelectMemberModal: React.FC<SelectMemberModalProps> = ({
  eventTitle,
  choice,
  onSelect,
  onClose,
}) => {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [remark, setRemark] = useState('');

  const choiceConfig = {
    attending: {
      label: '去到',
      icon: CheckCircle2,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      btnHover: 'hover:bg-emerald-50 hover:border-[#00A651] hover:text-[#00A651]',
      btnSelected: 'bg-[#00A651] text-white border-[#00A651]',
    },
    late_early: {
      label: '遲到早退',
      icon: Timer,
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      btnHover: 'hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700',
      btnSelected: 'bg-indigo-600 text-white border-indigo-600',
    },
    declined: {
      label: '去唔到',
      icon: XCircle,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      btnHover: 'hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600',
      btnSelected: 'bg-rose-600 text-white border-rose-600',
    },
    tbc: {
      label: 'TBC',
      icon: Clock,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      btnHover: 'hover:bg-amber-50 hover:border-amber-500 hover:text-amber-700',
      btnSelected: 'bg-amber-500 text-white border-amber-500',
    },
  }[choice];

  const Icon = choiceConfig.icon;
  const isLateEarly = choice === 'late_early';

  const quickRemarks = [
    '遲30分鐘',
    '遲15分鐘',
    '14:00到',
    '早退1小時',
    '17:00早走',
    '需早走',
  ];

  const handleMemberClick = (name: string) => {
    if (isLateEarly) {
      // For late_early, select the member to let them confirm or add remark
      setSelectedMember(name);
    } else {
      // For others, if no remark was typed, submit immediately
      if (!remark.trim()) {
        onSelect(name, undefined);
      } else {
        setSelectedMember(name);
      }
    }
  };

  const handleConfirmSubmit = () => {
    if (!selectedMember) return;
    onSelect(selectedMember, remark.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
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
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Remark Input Section (Prominent especially for 遲到早退) */}
          <div className={`p-3.5 rounded-2xl border ${isLateEarly ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50 border-slate-200'} space-y-2`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>自訂備註 Remark {isLateEarly && <span className="text-indigo-600 font-extrabold">（加字顯示於名後）</span>}</span>
              </label>
            </div>

            <input
              type="text"
              placeholder={isLateEarly ? '請輸入備註（例如：遲30分鐘 / 14:00到 / 17:00走）' : '可選填備註（會顯示於名字後）'}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Quick chips for remark */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {quickRemarks.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setRemark(q)}
                  className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                    remark === q
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {q}
                </button>
              ))}
              {remark && (
                <button
                  type="button"
                  onClick={() => setRemark('')}
                  className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 cursor-pointer underline"
                >
                  清除
                </button>
              )}
            </div>
          </div>

          {/* Member Selection */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">
              {isLateEarly || remark
                ? '請選擇你的社員名字，然後點擊確認登記：'
                : '請問你係邊位社員？（點擊名字即可完成登記）：'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CORE_MEMBERS.map((name) => {
                const isSelected = selectedMember === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleMemberClick(name)}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-all shadow-2xs active:scale-95 flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? choiceConfig.btnSelected
                        : `border-slate-200 bg-slate-50 text-slate-800 ${choiceConfig.btnHover}`
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            取消
          </button>

          {(isLateEarly || selectedMember) && (
            <button
              type="button"
              disabled={!selectedMember}
              onClick={handleConfirmSubmit}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
            >
              {selectedMember
                ? `確認以「${selectedMember}」登記${remark ? ` (${remark})` : ''}`
                : '請先點選名字'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
