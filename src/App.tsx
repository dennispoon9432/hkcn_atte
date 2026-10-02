import React, { useState, useEffect } from 'react';
import { SimpleEvent, AttendanceChoice } from './types';
import { StorageService } from './services/storage';
import {
  CORE_MEMBERS,
  SECRET_ACCESS_KEY,
  GOOGLE_SHEET_URL,
} from './config';
import { CreateEventModal } from './components/CreateEventModal';
import { EditEventModal } from './components/EditEventModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SelectMemberModal } from './components/SelectMemberModal';
import { AccessGate } from './components/AccessGate';
import { BrandLogo } from './components/BrandLogo';
import {
  Plus,
  Share2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit2,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';

export default function App() {
  const [authorized, setAuthorized] = useState<boolean>(() => StorageService.isAuthValid());
  const [events, setEvents] = useState<SimpleEvent[]>(() => StorageService.getEvents());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SimpleEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<SimpleEvent | null>(null);
  const [pendingRSVP, setPendingRSVP] = useState<{
    event: SimpleEvent;
    choice: AttendanceChoice;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Sync from user's hardcoded Google Sheet on mount
  useEffect(() => {
    StorageService.syncFromGoogleSheet().then((sheetEvents) => {
      if (sheetEvents && sheetEvents.length > 0) {
        setEvents((prev) => {
          const merged = sheetEvents.map((se) => {
            const existing = prev.find((e) => e.title === se.title);
            return existing ? { ...se, attendance: existing.attendance } : se;
          });
          StorageService.saveEvents(merged);
          return merged;
        });
      }
    });
  }, []);

  // When clicking an RSVP button: opens the member prompt
  const handleOpenRSVPPrompt = (event: SimpleEvent, choice: AttendanceChoice) => {
    setPendingRSVP({ event, choice });
  };

  // When choosing who they are in the prompt
  const handleConfirmMemberRSVP = (memberName: string) => {
    if (!pendingRSVP) return;
    const { event, choice } = pendingRSVP;

    const updated = events.map((e) => {
      if (e.id !== event.id) return e;
      return {
        ...e,
        attendance: {
          ...e.attendance,
          [memberName]: choice,
        },
      };
    });

    setEvents(updated);
    StorageService.saveEvents(updated);

    // Push to Google Sheet
    StorageService.pushRSVP(event.title, memberName, choice);

    setPendingRSVP(null);

    const label = choice === 'attending' ? '去到 ✅' : choice === 'declined' ? '去唔到 ❌' : 'TBC ⏳';
    showToast(`${memberName} 已成功登記：${label}`);
  };

  const handleCreateEvent = (title: string, dateTime: string) => {
    const newEvent: SimpleEvent = {
      id: 'evt-' + Date.now().toString(36),
      title,
      dateTime,
      attendance: {},
      createdAt: new Date().toISOString(),
    };
    const updated = [newEvent, ...events];
    setEvents(updated);
    StorageService.saveEvents(updated);
    setShowCreateModal(false);
    showToast('已新增活動！');
  };

  const handleSaveEditEvent = (id: string, title: string, dateTime: string) => {
    const updated = events.map((e) => (e.id === id ? { ...e, title, dateTime } : e));
    setEvents(updated);
    StorageService.saveEvents(updated);
    setEditingEvent(null);
    showToast('已更新活動資料！');
  };

  const handleConfirmDelete = (id: string) => {
    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    StorageService.saveEvents(updated);
    setDeletingEvent(null);
    showToast('已成功刪除活動');
  };

  // Get the secret link for WhatsApp group (dennispoon9432.github.io/HKCN_atte/?key=hkcn2026cherry)
  const getSecretLink = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const isGithubPages = origin.includes('github.io');
    const basePath = isGithubPages ? pathname : '/';
    return `${origin}${basePath}?key=${SECRET_ACCESS_KEY}`;
  };

  const handleCopySecretLink = () => {
    const link = getSecretLink();
    navigator.clipboard.writeText(link);
    showToast('已複製 WhatsApp 專屬存取連結！');
  };

  if (!authorized) {
    return (
      <AccessGate
        onUnlock={() => {
          StorageService.setAuthPassed();
          setAuthorized(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" />
            <div>
              <div className="text-xs font-extrabold text-[#00A651] tracking-tight">
                香港城北扶青社
              </div>
              <div className="text-sm font-black text-slate-900 tracking-tight leading-none">
                活動出席登記
              </div>
            </div>
          </div>

          {/* Right Action: Copy Secret Link, Google Sheet Link, Add Event */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href={GOOGLE_SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
              title="查看已連結的 Google Sheet 資料庫"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline">Google Sheet</span>
            </a>

            <button
              onClick={handleCopySecretLink}
              title="複製 WhatsApp 專屬連結 (含密鑰)"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#00A651]" />
              <span className="hidden sm:inline">複製專屬連結</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新增活動</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {events.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">目前未有任何活動</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#00A651] text-white rounded-xl text-xs font-bold"
            >
              右上角新增活動
            </button>
          </div>
        ) : (
          events.map((evt) => {
            const attendingList = CORE_MEMBERS.filter((m) => evt.attendance[m] === 'attending');
            const declinedList = CORE_MEMBERS.filter((m) => evt.attendance[m] === 'declined');
            const tbcList = CORE_MEMBERS.filter(
              (m) => evt.attendance[m] === 'tbc' || !evt.attendance[m]
            );

            return (
              <article
                key={evt.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden"
              >
                {/* Event Header with Title, Date, Edit & Delete */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {evt.title}
                    </h2>
                    <div className="text-xs font-semibold text-[#00A651] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{evt.dateTime}</span>
                    </div>
                  </div>

                  {/* Edit and Delete Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingEvent(evt)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="編輯活動名稱或日期時間"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>編輯</span>
                    </button>

                    <button
                      onClick={() => setDeletingEvent(evt)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="需要輸入 HKCN 刪除此活動"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 3 RSVP Buttons: 去到 / 去唔到 / TBC */}
                <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500">
                    點擊你的出席狀態（點擊後會彈出選擇你的名字）：
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* 1. 去到 */}
                    <button
                      type="button"
                      onClick={() => handleOpenRSVPPrompt(evt, 'attending')}
                      className="py-3 px-2 rounded-2xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 active:scale-95 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
                      <span>去到</span>
                    </button>

                    {/* 2. 去唔到 */}
                    <button
                      type="button"
                      onClick={() => handleOpenRSVPPrompt(evt, 'declined')}
                      className="py-3 px-2 rounded-2xl bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 active:scale-95 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>去唔到</span>
                    </button>

                    {/* 3. TBC */}
                    <button
                      type="button"
                      onClick={() => handleOpenRSVPPrompt(evt, 'tbc')}
                      className="py-3 px-2 rounded-2xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 active:scale-95 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>TBC</span>
                    </button>
                  </div>
                </div>

                {/* Attendance Breakdown (去到 / 去唔到 / TBC) */}
                <div className="p-4 sm:p-5 space-y-3 text-xs">
                  {/* 去到 */}
                  <div className="flex items-start gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold shrink-0 text-[11px]">
                      去到 ({attendingList.length})
                    </span>
                    <div className="text-slate-800 font-medium pt-0.5 leading-relaxed">
                      {attendingList.length > 0
                        ? attendingList.join('、')
                        : <span className="text-slate-400">暫無</span>}
                    </div>
                  </div>

                  {/* 去唔到 */}
                  <div className="flex items-start gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-900 font-bold shrink-0 text-[11px]">
                      去唔到 ({declinedList.length})
                    </span>
                    <div className="text-slate-800 font-medium pt-0.5 leading-relaxed">
                      {declinedList.length > 0
                        ? declinedList.join('、')
                        : <span className="text-slate-400">暫無</span>}
                    </div>
                  </div>

                  {/* TBC */}
                  <div className="flex items-start gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold shrink-0 text-[11px]">
                      TBC ({tbcList.length})
                    </span>
                    <div className="text-slate-800 font-medium pt-0.5 leading-relaxed">
                      {tbcList.length > 0
                        ? tbcList.join('、')
                        : <span className="text-slate-400">暫無</span>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEvent}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleSaveEditEvent}
        />
      )}

      {/* Delete Confirmation Modal (Requires "HKCN") */}
      {deletingEvent && (
        <DeleteConfirmModal
          event={deletingEvent}
          onClose={() => setDeletingEvent(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Select Member Prompt (Opens whenever user presses 去到/去唔到/TBC) */}
      {pendingRSVP && (
        <SelectMemberModal
          eventTitle={pendingRSVP.event.title}
          choice={pendingRSVP.choice}
          onSelect={handleConfirmMemberRSVP}
          onClose={() => setPendingRSVP(null)}
        />
      )}
    </div>
  );
}
