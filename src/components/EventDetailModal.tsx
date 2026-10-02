import React, { useState } from 'react';
import { ClubEvent, Member, AttendanceStatus } from '../types';
import {
  X,
  Calendar,
  MapPin,
  Clock,
  Check,
  HelpCircle,
  Copy,
  Download,
  Share2,
  UserPlus,
  Trash2,
  Edit2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface EventDetailModalProps {
  event: ClubEvent;
  members: Member[];
  currentUserId: string | null;
  secretToken: string;
  onClose: () => void;
  onUpdateRSVP: (eventId: string, memberId: string, memberName: string, status: AttendanceStatus, note?: string) => void;
  onAddGuest: (eventId: string, guestName: string, status: AttendanceStatus, note?: string) => void;
  onRemoveGuest: (eventId: string, guestId: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onSelectCurrentUser: (id: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  members,
  currentUserId,
  secretToken,
  onClose,
  onUpdateRSVP,
  onAddGuest,
  onRemoveGuest,
  onDeleteEvent,
  onSelectCurrentUser,
}) => {
  const [filter, setFilter] = useState<'all' | 'attending' | 'declined' | 'pending'>('all');
  const [personalNote, setPersonalNote] = useState('');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestNote, setGuestNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentMember = members.find((m) => m.id === currentUserId);
  const currentMemberRecord = currentUserId ? event.attendance?.[currentUserId] : null;

  // Group members by status
  const attendingList: { id: string; name: string; note?: string; isGuest?: boolean; guestId?: string }[] = [];
  const declinedList: { id: string; name: string; note?: string; isGuest?: boolean; guestId?: string }[] = [];
  const pendingList: { id: string; name: string; note?: string; isGuest?: boolean; guestId?: string }[] = [];

  members.forEach((m) => {
    const rec = event.attendance?.[m.id];
    const status = rec?.status || 'pending';
    const item = { id: m.id, name: m.name, note: rec?.note };
    if (status === 'attending') attendingList.push(item);
    else if (status === 'declined') declinedList.push(item);
    else pendingList.push(item);
  });

  if (event.customGuests) {
    event.customGuests.forEach((g) => {
      const item = {
        id: g.memberId,
        name: `${g.memberName} (嘉賓)`,
        note: g.note,
        isGuest: true,
        guestId: g.memberId,
      };
      if (g.status === 'attending') attendingList.push(item);
      else if (g.status === 'declined') declinedList.push(item);
      else pendingList.push(item);
    });
  }

  // Filtered display list
  let displayList =
    filter === 'attending'
      ? attendingList
      : filter === 'declined'
      ? declinedList
      : filter === 'pending'
      ? pendingList
      : [...attendingList, ...pendingList, ...declinedList];

  // Generate WhatsApp formatted text
  const generateWhatsAppMessage = () => {
    const origin = window.location.origin;
    const directLink = `${origin}/?token=${secretToken || 'hkcn'}&event=${event.id}`;

    const attendingMentions = attendingList.map((m) => `@${m.name}`).join(' ');
    const declinedMentions = declinedList.map((m) => `@${m.name}`).join(' ');
    const pendingMentions = pendingList.map((m) => `@${m.name}`).join(' ');

    return `【香港城北扶青社 - 活動出席登記】
📌 活動：${event.title}
📅 日期：${event.dateStr}
📍 地點：${event.location}${event.timeStr ? `\n⏰ 時間：${event.timeStr}` : ''}${
      event.description ? `\n📝 備註：${event.description}` : ''
    }

✅ 出席 (${attendingList.length}人)：
${attendingMentions || '（暫無）'}

❌ 不能出席 (${declinedList.length}人)：
${declinedMentions || '（暫無）'}

⏳ 待定 / 未覆 (${pendingList.length}人)：
${pendingMentions || '（暫無）'}

🔗 一鍵簽到／修改出席 (免密碼)：
${directLink}`;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleExportCSV = () => {
    const rows = [
      ['活動名稱', event.title],
      ['活動日期', event.dateStr],
      ['活動時間', event.timeStr || '未註明'],
      ['地點', event.location],
      [],
      ['成員姓名', '出席狀態', '備註說明', '最後更新時間'],
    ];

    members.forEach((m) => {
      const rec = event.attendance?.[m.id];
      const statusText =
        rec?.status === 'attending'
          ? '出席'
          : rec?.status === 'declined'
          ? '未能出席'
          : '待定/未回覆';
      rows.push([
        m.name,
        statusText,
        rec?.note || '',
        rec?.updatedAt ? new Date(rec.updatedAt).toLocaleString('zh-HK') : '',
      ]);
    });

    if (event.customGuests && event.customGuests.length > 0) {
      rows.push([]);
      rows.push(['同行嘉賓 / 朋友', '出席狀態', '備註說明', '最後更新時間']);
      event.customGuests.forEach((g) => {
        const statusText =
          g.status === 'attending'
            ? '出席'
            : g.status === 'declined'
            ? '未能出席'
            : '待定';
        rows.push([
          g.memberName + ' (嘉賓)',
          statusText,
          g.note || '',
          g.updatedAt ? new Date(g.updatedAt).toLocaleString('zh-HK') : '',
        ]);
      });
    }

    const csvContent =
      '\uFEFF' +
      rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_')}_出席名單.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSavePersonalStatus = (status: AttendanceStatus) => {
    if (!currentMember) return;
    onUpdateRSVP(event.id, currentMember.id, currentMember.name, status, personalNote || currentMemberRecord?.note);
  };

  const handleAddGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    onAddGuest(event.id, guestName.trim(), 'attending', guestNote.trim());
    setGuestName('');
    setGuestNote('');
    setShowAddGuest(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#00A651] mb-1">
              <span>香港城北扶青社活動</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-500 font-normal">實時出席管理</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              {event.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
              <span className="flex items-center gap-1 font-medium text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-[#00A651]" />
                <span>{event.dateStr}</span>
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-[#F58220]" />
                <span>{event.location}</span>
              </span>
              {event.timeStr && (
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{event.timeStr}</span>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Section A: Personal Quick Check-in */}
          <div className="p-4 sm:p-5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#00A651] text-white flex items-center justify-center font-bold text-sm">
                  {currentMember ? currentMember.name.slice(0, 1) : '?'}
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-900">
                    我的出席登記 (社員個人通道)
                  </div>
                  <div className="text-xs text-slate-600">
                    {currentMember ? (
                      <span>
                        目前登入：<strong className="text-slate-900">{currentMember.name}</strong>
                      </span>
                    ) : (
                      <span className="text-amber-800">未選擇社員身份，請在右側挑選你的姓名</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Selector if not selected or want to switch */}
              <select
                value={currentUserId || ''}
                onChange={(e) => onSelectCurrentUser(e.target.value)}
                className="bg-white border border-slate-200 text-xs rounded-xl px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00A651]"
              >
                <option value="">切換／選擇社員姓名...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {currentMember && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSavePersonalStatus('attending')}
                    className={`py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      currentMemberRecord?.status === 'attending'
                        ? 'bg-[#00A651] text-white shadow-sm ring-2 ring-[#00A651]/30 font-bold'
                        : 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>我會出席</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSavePersonalStatus('declined')}
                    className={`py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      currentMemberRecord?.status === 'declined'
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30 font-bold'
                        : 'bg-white hover:bg-rose-100 text-rose-700 border border-rose-300'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>未能出席</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSavePersonalStatus('pending')}
                    className={`py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      currentMemberRecord?.status === 'pending'
                        ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30 font-bold'
                        : 'bg-white hover:bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>待定 / 未覆</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="補充備註 (例如：預計遲到30分鐘、自備急救包...)"
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A651]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (currentMemberRecord?.status) {
                        handleSavePersonalStatus(currentMemberRecord.status);
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition-colors shrink-0"
                  >
                    更新備註
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section B: Attendance Roster with Segmented Controls */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>社員出席名冊</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  (已回覆: {attendingList.length + declinedList.length}/{members.length + (event.customGuests?.length || 0)})
                </span>
              </h3>

              {/* Segmented Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                    filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  全部 ({attendingList.length + declinedList.length + pendingList.length})
                </button>
                <button
                  onClick={() => setFilter('attending')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                    filter === 'attending'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  出席 ({attendingList.length})
                </button>
                <button
                  onClick={() => setFilter('declined')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                    filter === 'declined'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  缺席 ({declinedList.length})
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                    filter === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-amber-700'
                  }`}
                >
                  待定 ({pendingList.length})
                </button>
              </div>
            </div>

            {/* Roster Grid / List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayList.map((item) => {
                const isAttending = attendingList.some((a) => a.id === item.id);
                const isDeclined = declinedList.some((d) => d.id === item.id);
                const isPending = !isAttending && !isDeclined;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isAttending
                            ? 'bg-[#00A651] text-white'
                            : isDeclined
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.name.slice(0, 1)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                          <span>{item.name}</span>
                          {item.isGuest && (
                            <span className="text-[10px] text-amber-700 font-normal">嘉賓</span>
                          )}
                        </div>
                        {item.note && (
                          <div className="text-[11px] text-slate-500 truncate">
                            備註: {item.note}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Officer Switcher Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          if (item.isGuest) return;
                          onUpdateRSVP(event.id, item.id, item.name, 'attending');
                        }}
                        className={`p-1 rounded-md text-xs transition-colors ${
                          isAttending
                            ? 'bg-[#00A651] text-white'
                            : 'bg-white text-slate-400 hover:text-emerald-700 border border-slate-200'
                        }`}
                        title="設為出席"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (item.isGuest) return;
                          onUpdateRSVP(event.id, item.id, item.name, 'declined');
                        }}
                        className={`p-1 rounded-md text-xs transition-colors ${
                          isDeclined
                            ? 'bg-rose-600 text-white'
                            : 'bg-white text-slate-400 hover:text-rose-600 border border-slate-200'
                        }`}
                        title="設為不能出席"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (item.isGuest) return;
                          onUpdateRSVP(event.id, item.id, item.name, 'pending');
                        }}
                        className={`p-1 rounded-md text-xs transition-colors ${
                          isPending
                            ? 'bg-amber-500 text-white'
                            : 'bg-white text-slate-400 hover:text-amber-600 border border-slate-200'
                        }`}
                        title="設為待定"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>

                      {item.isGuest && item.guestId && (
                        <button
                          onClick={() => onRemoveGuest(event.id, item.guestId!)}
                          className="p-1 rounded-md text-xs text-rose-500 hover:bg-rose-50 border border-rose-200"
                          title="移除嘉賓"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Guest Button & Drawer */}
            <div className="mt-3">
              {!showAddGuest ? (
                <button
                  type="button"
                  onClick={() => setShowAddGuest(true)}
                  className="text-xs font-medium text-[#00A651] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>＋ 新增同行嘉賓 / 跨社扶青朋友</span>
                </button>
              ) : (
                <form
                  onSubmit={handleAddGuestSubmit}
                  className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2 text-xs"
                >
                  <div className="font-semibold text-amber-900">新增非社員／嘉賓</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="嘉賓姓名 (必填)"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      required
                    />
                    <input
                      type="text"
                      placeholder="備註 (如：朋友、司儀、友社幹事)"
                      value={guestNote}
                      onChange={(e) => setGuestNote(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#00A651] hover:bg-[#008f45] text-white font-medium rounded-lg text-xs"
                    >
                      加入名單
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddGuest(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
                    >
                      取消
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Section C: WhatsApp Message Generator Box */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00A651]" />
                <span className="text-xs font-bold text-slate-900">
                  一鍵生成 WhatsApp 召集與出席名單訊息
                </span>
              </div>
              <span className="text-[11px] text-slate-400">貼去 WhatsApp 群組超方便</span>
            </div>

            <pre className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {generateWhatsAppMessage()}
            </pre>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="px-3.5 py-2 bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? '已複製到剪貼簿！' : '複製 WhatsApp 訊息'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>直接傳送至 WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>下載 Excel (CSV)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>刪除此活動</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-rose-600 font-medium">確定刪除？</span>
              <button
                type="button"
                onClick={() => onDeleteEvent(event.id)}
                className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-medium"
              >
                確定刪除
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg"
              >
                取消
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
