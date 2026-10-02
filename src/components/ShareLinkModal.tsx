import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, Link2, Sparkles, MessageCircle } from 'lucide-react';
import { ClubEvent } from '../types';

interface ShareLinkModalProps {
  secretToken: string;
  events: ClubEvent[];
  onClose: () => void;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  secretToken,
  events,
  onClose,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [copiedGeneral, setCopiedGeneral] = useState(false);
  const [copiedEvent, setCopiedEvent] = useState(false);
  const [copiedWhatsAppMsg, setCopiedWhatsAppMsg] = useState(false);

  const origin = window.location.origin;
  const generalLink = `${origin}/?token=${secretToken || 'hkcn'}`;
  const eventLink = selectedEventId
    ? `${origin}/?token=${secretToken || 'hkcn'}&event=${selectedEventId}`
    : generalLink;

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const handleCopyGeneral = () => {
    navigator.clipboard.writeText(generalLink);
    setCopiedGeneral(true);
    setTimeout(() => setCopiedGeneral(false), 2000);
  };

  const handleCopyEvent = () => {
    navigator.clipboard.writeText(eventLink);
    setCopiedEvent(true);
    setTimeout(() => setCopiedEvent(false), 2000);
  };

  const whatsAppInviteText = `【香港城北扶青社 - 活動出席登記專用連結】
各位城北社員，以後活動出席唔使再喺 WhatsApp 數名單！
👉 點擊專屬連結直接入去勾選出席 (免密碼，一秒登入)：
${eventLink}

📅 最近活動：${selectedEvent ? `${selectedEvent.title} (${selectedEvent.dateStr})` : '海洋公園 St. John 出席'}`;

  const handleCopyWhatsAppInvite = () => {
    navigator.clipboard.writeText(whatsAppInviteText);
    setCopiedWhatsAppMsg(true);
    setTimeout(() => setCopiedWhatsAppMsg(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#00A651] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                城北社員免密碼專屬連結
              </h2>
              <p className="text-[11px] text-slate-500">
                點擊即自動通過驗證，無需輸入任何密碼
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Explanation Banner */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-emerald-900">免密碼直達原理：</span>
            連結內已嵌入城北扶青社通行 Token (<code className="font-mono text-emerald-800 bg-emerald-100/80 px-1 py-0.5 rounded">token={secretToken}</code>)。社員在 WhatsApp 群組點開連結後，系統自動授權並記住裝置，直接進入系統！
          </div>

          {/* Option 1: Specific Event Direct Link */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
              <span>指定活動「直接簽到」連結：</span>
              {events.length > 0 && (
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-normal text-slate-700"
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.dateStr})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={eventLink}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 select-all"
              />
              <button
                type="button"
                onClick={handleCopyEvent}
                className="px-3.5 py-2 bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                {copiedEvent ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEvent ? '已複製！' : '複製'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              社員點開會直接彈出此活動的出席名冊與登記按鈕。
            </p>
          </div>

          {/* Option 2: General System Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              全社首頁專屬連結 (顯示所有活動)：
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generalLink}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 select-all"
              />
              <button
                type="button"
                onClick={handleCopyGeneral}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                {copiedGeneral ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedGeneral ? '已複製！' : '複製'}</span>
              </button>
            </div>
          </div>

          {/* Option 3: WhatsApp Ready-to-Send Template */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                <span>WhatsApp 邀請廣播範本</span>
              </span>
              <button
                type="button"
                onClick={handleCopyWhatsAppInvite}
                className="text-xs text-[#00A651] font-semibold hover:underline flex items-center gap-1"
              >
                {copiedWhatsAppMsg ? '已複製全部文字！' : '一鍵複製此文字'}
              </button>
            </div>
            <pre className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
              {whatsAppInviteText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
