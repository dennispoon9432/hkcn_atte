import React, { useState, useEffect } from 'react';
import { SimpleEvent, AttendanceChoice } from './types';
import { StorageService } from './services/storage';
import { CORE_MEMBERS, SECRET_ACCESS_KEY, HARDCODED_GOOGLE_SHEET_ID } from './config';
import { CreateEventModal } from './components/CreateEventModal';
import { AccessGate } from './components/AccessGate';
import { BrandLogo } from './components/BrandLogo';
import {
  Plus,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Calendar,
  Lock,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  const [authorized, setAuthorized] = useState<boolean>(() => StorageService.isAuthValid());
  const [events, setEvents] = useState<SimpleEvent[]>(() => StorageService.getEvents());
  const [activeUser, setActiveUser] = useState<string | null>(() => StorageService.getActiveUser());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Sync from hardcoded Google Sheet on mount
  useEffect(() => {
    StorageService.syncFromGoogleSheet().then((sheetEvents) => {
      if (sheetEvents && sheetEvents.length > 0) {
        setEvents((prev) => {
          // Merge sheet events with local attendance if any
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

  const handleSelectUser = (name: string) => {
    setActiveUser(name);
    StorageService.setActiveUser(name);
    showToast(`已選擇身份：${name}`);
  };

  const handleRSVP = (eventId: string, choice: AttendanceChoice) => {
    if (!activeUser) {
      alert('請先在上方選擇你係邊位社員！');
      return;
    }

    const updated = events.map((e) => {
      if (e.id !== eventId) return e;
      return {
        ...e,
        attendance: {
          ...e.attendance,
          [activeUser]: choice,
        },
      };
    });

    setEvents(updated);
    StorageService.saveEvents(updated);

    const targetEvent = events.find((e) => e.id === eventId);
    if (targetEvent) {
      StorageService.pushRSVP(targetEvent.title, activeUser, choice);
    }

    const label = choice === 'attending' ? '去到 ✅' : choice === 'declined' ? '去唔到 ❌' : 'TBC ⏳';
    showToast(`${activeUser} 已登記：${label}`);
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

  const handleDeleteEvent = (id: string, title: string) => {
    if (!confirm(`確定要刪除「${title}」嗎？`)) return;
    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    StorageService.saveEvents(updated);
    showToast('已刪除活動');
  };

  // Get the secret link for WhatsApp group
  const getSecretLink = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('key', SECRET_ACCESS_KEY);
    return currentUrl.toString();
  };

  const handleCopySecretLink = () => {
    const link = getSecretLink();
    navigator.clipboard.writeText(link);
    showToast('已複製 WhatsApp 專屬存取連結！');
  };

  const handleCopyWhatsAppList = (event: SimpleEvent) => {
    const text = StorageService.generateWhatsAppText(event, getSecretLink());
    navigator.clipboard.writeText(text);
    showToast('已複製 WhatsApp 出席名單！');
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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
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

          {/* Right Action: ONLY Add Event + Copy Secret Link */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySecretLink}
              title="複製包含密鑰的專屬 WhatsApp 連結"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#00A651]" />
              <span className="hidden sm:inline">複製專屬連結</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-1.5 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新增活動</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-5 space-y-6">
        {/* Member Selector Bar */}
        <section className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>👇 請先點擊選擇「你係邊位社員」：</span>
            {activeUser && (
              <span className="text-[#00A651] font-bold">
                目前身份：{activeUser}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CORE_MEMBERS.map((name) => {
              const isSelected = activeUser === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectUser(name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#00A651] text-white shadow-xs scale-105'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Events List */}
        <section className="space-y-4">
          {events.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-3">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">目前暫無活動</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-[#00A651] text-white rounded-xl text-xs font-bold"
              >
                右上角新增活動
              </button>
            </div>
          ) : (
            events.map((evt) => {
              const myChoice = activeUser ? evt.attendance[activeUser] : undefined;

              const attendingList = CORE_MEMBERS.filter((m) => evt.attendance[m] === 'attending');
              const declinedList = CORE_MEMBERS.filter((m) => evt.attendance[m] === 'declined');
              const tbcList = CORE_MEMBERS.filter(
                (m) => evt.attendance[m] === 'tbc' || !evt.attendance[m]
              );

              return (
                <article
                  key={evt.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* Event Title & Date */}
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
                    <button
                      onClick={() => handleDeleteEvent(evt.id, evt.title)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="刪除此活動"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 3 RSVP Buttons: 去到 / 去唔到 / TBC */}
                  <div className="p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-500">
                      {activeUser ? `【${activeUser}】請選擇你的出席狀態：` : '請先在上方選擇你的名字，然後點擊：'}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* 1. 去到 */}
                      <button
                        type="button"
                        onClick={() => handleRSVP(evt.id, 'attending')}
                        className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          myChoice === 'attending'
                            ? 'bg-[#00A651] text-white shadow-md ring-2 ring-emerald-500/50 scale-[1.02]'
                            : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>去到</span>
                      </button>

                      {/* 2. 去唔到 */}
                      <button
                        type="button"
                        onClick={() => handleRSVP(evt.id, 'declined')}
                        className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          myChoice === 'declined'
                            ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500/50 scale-[1.02]'
                            : 'bg-white border border-rose-300 text-rose-800 hover:bg-rose-50'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>去唔到</span>
                      </button>

                      {/* 3. TBC */}
                      <button
                        type="button"
                        onClick={() => handleRSVP(evt.id, 'tbc')}
                        className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          myChoice === 'tbc'
                            ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400/50 scale-[1.02]'
                            : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>TBC</span>
                      </button>
                    </div>
                  </div>

                  {/* Attendance Breakdown (去到 / 去唔到 / TBC 名單) */}
                  <div className="p-4 sm:p-5 space-y-3 text-xs">
                    {/* 去到 */}
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold shrink-0">
                        去到 ({attendingList.length})
                      </span>
                      <div className="text-slate-800 font-medium pt-0.5 leading-relaxed">
                        {attendingList.length > 0
                          ? attendingList.join('、')
                          : <span className="text-slate-400">暫無</span>}
                      </div>
                    </div>

                    {/* 去唔到 */}
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold shrink-0">
                        去唔到 ({declinedList.length})
                      </span>
                      <div className="text-slate-800 font-medium pt-0.5 leading-relaxed">
                        {declinedList.length > 0
                          ? declinedList.join('、')
                          : <span className="text-slate-400">暫無</span>}
                      </div>
                    </div>

                    {/* TBC */}
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold shrink-0">
                        TBC ({tbcList.length})
                      </span>
                      <div className="text-slate-800 font-medium pt-0.5 leading-relaxed">
                        {tbcList.length > 0
                          ? tbcList.join('、')
                          : <span className="text-slate-400">暫無</span>}
                      </div>
                    </div>
                  </div>

                  {/* Footer: Copy WhatsApp message */}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      共 {CORE_MEMBERS.length} 位核心社員
                    </span>
                    <button
                      onClick={() => handleCopyWhatsAppList(evt)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#00A651]" />
                      <span>複製 WhatsApp 名單</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>

      {/* Create Event Modal (Only Title & DateTime) */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEvent}
        />
      )}
    </div>
  );
}
