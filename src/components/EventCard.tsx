import React, { useState } from 'react';
import { ClubEvent, Member, AttendanceStatus } from '../types';
import { Calendar, MapPin, Check, X, HelpCircle, Copy, Share2, ChevronRight, Clock } from 'lucide-react';

interface EventCardProps {
  event: ClubEvent;
  members: Member[];
  currentUserId: string | null;
  onOpenDetails: (event: ClubEvent) => void;
  onQuickRSVP: (eventId: string, memberId: string, memberName: string, status: AttendanceStatus) => void;
  onCopyWhatsApp: (event: ClubEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  members,
  currentUserId,
  onOpenDetails,
  onQuickRSVP,
  onCopyWhatsApp,
}) => {
  const [copied, setCopied] = useState(false);

  // Compute attendance stats
  let attendingCount = 0;
  let declinedCount = 0;
  let pendingCount = 0;

  const attendingMembers: string[] = [];

  members.forEach((m) => {
    const status = event.attendance?.[m.id]?.status || 'pending';
    if (status === 'attending') {
      attendingCount++;
      attendingMembers.push(m.name);
    } else if (status === 'declined') {
      declinedCount++;
    } else {
      pendingCount++;
    }
  });

  // Guest attendance
  if (event.customGuests) {
    event.customGuests.forEach((g) => {
      if (g.status === 'attending') {
        attendingCount++;
        attendingMembers.push(`${g.memberName} (嘉賓)`);
      } else if (g.status === 'declined') {
        declinedCount++;
      } else {
        pendingCount++;
      }
    });
  }

  const totalRespondents = members.length + (event.customGuests?.length || 0);
  const attendingRatio = totalRespondents > 0 ? (attendingCount / totalRespondents) * 100 : 0;

  const currentMember = members.find((m) => m.id === currentUserId);
  const currentMemberRSVP = currentUserId ? event.attendance?.[currentUserId]?.status : null;

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyWhatsApp(event);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={() => onOpenDetails(event)}
      className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer overflow-hidden group flex flex-col justify-between"
    >
      <div className="p-5 sm:p-6">
        {/* Top Header: Category Tag & Copy Button */}
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 mb-2.5">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-[#00A651] font-semibold">
              {event.category === 'st_john'
                ? 'St. John 急救義務'
                : event.category === 'meeting'
                ? '社員常規例會'
                : event.category === 'social'
                ? '聯誼聚餐活動'
                : '城北義工服務'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{event.dateStr}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyClick}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            title="複製為 WhatsApp 訊息發送至群組"
          >
            <Copy className="w-3 h-3" />
            <span>{copied ? '已複製！' : 'WhatsApp 格式'}</span>
          </button>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#00A651] transition-colors leading-snug">
          {event.title}
        </h3>

        {/* Location & Time info with clean typographic separators */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-2">
          <span className="flex items-center gap-1 text-slate-700 font-medium">
            <MapPin className="w-3.5 h-3.5 text-[#F58220] shrink-0" />
            <span>{event.location}</span>
          </span>
          {event.timeStr && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{event.timeStr}</span>
              </span>
            </>
          )}
        </div>

        {event.description && (
          <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Attendance Progress & Figures */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-2 font-medium">
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00A651]"></span>
                {attendingCount} 出席
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-500">{declinedCount} 未能出席</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-amber-600">{pendingCount} 待定</span>
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-400 tabular-nums">
              共 {totalRespondents} 人
            </span>
          </div>

          {/* Clean Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-[#00A651] transition-all duration-300"
              style={{ width: `${(attendingCount / totalRespondents) * 100}%` }}
              title={`出席: ${attendingCount}人`}
            />
            <div
              className="bg-amber-400 transition-all duration-300"
              style={{ width: `${(pendingCount / totalRespondents) * 100}%` }}
              title={`待定: ${pendingCount}人`}
            />
            <div
              className="bg-slate-300 transition-all duration-300"
              style={{ width: `${(declinedCount / totalRespondents) * 100}%` }}
              title={`未能出席: ${declinedCount}人`}
            />
          </div>

          {/* Attending Members Preview */}
          {attendingMembers.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <span className="text-slate-400 text-[11px]">出席名單：</span>
              {attendingMembers.slice(0, 7).map((name, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[11px] font-medium"
                >
                  {name}
                </span>
              ))}
              {attendingMembers.length > 7 && (
                <span className="text-[11px] text-slate-400 font-medium">
                  +{attendingMembers.length - 7} 人...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Personal RSVP Bar (if user is selected) */}
      <div
        className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {currentMember ? (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="truncate text-slate-700 font-medium">
              <span>{currentMember.name}：</span>
              <span className="text-slate-500 font-normal">
                {currentMemberRSVP === 'attending'
                  ? '已登記出席 ✅'
                  : currentMemberRSVP === 'declined'
                  ? '已登記未能出席 ❌'
                  : '未覆 / 待定 ⏳'}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onQuickRSVP(event.id, currentMember.id, currentMember.name, 'attending')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentMemberRSVP === 'attending'
                    ? 'bg-[#00A651] text-white shadow-xs'
                    : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200'
                }`}
                title="我會出席"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onQuickRSVP(event.id, currentMember.id, currentMember.name, 'declined')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentMemberRSVP === 'declined'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white hover:bg-rose-50 text-rose-600 border border-slate-200'
                }`}
                title="我未能出席"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onQuickRSVP(event.id, currentMember.id, currentMember.name, 'pending')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentMemberRSVP === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white hover:bg-amber-50 text-amber-600 border border-slate-200'
                }`}
                title="待定 / 未能確定"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onOpenDetails(event)}
            className="flex items-center justify-between w-full text-slate-500 hover:text-slate-900 group/link"
          >
            <span className="text-[11px]">點擊展開出席名單或登記狀態</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover/link:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>
    </div>
  );
};
