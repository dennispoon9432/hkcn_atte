import React, { useState, useEffect, useCallback } from 'react';
import { ClubData, ClubEvent, Member, AttendanceStatus } from './types';
import { SheetService, AuthService, GoogleSheetConfig } from './services/sheetService';
import { Navbar } from './components/Navbar';
import { EventCard } from './components/EventCard';
import { EventDetailModal } from './components/EventDetailModal';
import { CreateEventModal } from './components/CreateEventModal';
import { ShareLinkModal } from './components/ShareLinkModal';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { MemberRosterModal } from './components/MemberRosterModal';
import { AccessGate } from './components/AccessGate';
import {
  Calendar,
  Users,
  Plus,
  Share2,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [data, setData] = useState<ClubData>(() => SheetService.getLocalData());
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>(() => SheetService.getSheetConfig());
  const [authorized, setAuthorized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Tabs & Modals
  const [activeTab, setActiveTab] = useState<'upcoming' | 'all' | 'members'>('upcoming');
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 1. Initial auth check & URL token extraction
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token') || params.get('key') || params.get('club');

    if (urlToken) {
      AuthService.setAuthToken(urlToken);
      setAuthorized(true);
    } else {
      const stored = AuthService.getAuthToken();
      if (stored) {
        setAuthorized(true);
      }
    }

    const savedUserId = AuthService.getCurrentUserId();
    if (savedUserId) {
      setCurrentUserId(savedUserId);
    }

    // Direct event link auto-open
    const directEventId = params.get('event');
    if (directEventId) {
      const current = SheetService.getLocalData();
      const found = current.events.find((e) => e.id === directEventId);
      if (found) {
        setSelectedEvent(found);
      }
    }
  }, []);

  // Sync from Google Sheet if configured
  const syncWithGoogleSheet = useCallback(async (sheetId: string) => {
    setSyncing(true);
    try {
      const result = await SheetService.fetchFromGoogleSheet(sheetId);
      setData((prev) => {
        const mergedMembers = result.members.length > 0 ? result.members : prev.members;
        const mergedEvents = result.events.length > 0 ? result.events : prev.events;
        const updated: ClubData = {
          ...prev,
          members: mergedMembers,
          events: mergedEvents,
          updatedAt: new Date().toISOString(),
        };
        SheetService.saveLocalData(updated);
        return updated;
      });
      showToast('已從 Google Sheet 同步最新名單與活動！');
    } catch (err: any) {
      console.warn('Google sheet sync error', err);
      showToast('未能連線至 Google Sheet，目前使用本機名冊');
    } finally {
      setSyncing(false);
    }
  }, []);

  // Auto-sync on startup if sheet ID is present
  useEffect(() => {
    if (sheetConfig.sheetId) {
      syncWithGoogleSheet(sheetConfig.sheetId);
    }
  }, [sheetConfig.sheetId, syncWithGoogleSheet]);

  // Handle identity change
  const handleSelectCurrentUser = (id: string) => {
    setCurrentUserId(id);
    AuthService.setCurrentUserId(id);
    const member = data.members.find((m) => m.id === id);
    if (member) {
      showToast(`已切換身份為：${member.name}`);
    }
  };

  // Handle Event RSVP
  const handleUpdateRSVP = (
    eventId: string,
    memberId: string,
    memberName: string,
    status: AttendanceStatus,
    note?: string
  ) => {
    setData((prev) => {
      const updatedEvents = prev.events.map((evt) => {
        if (evt.id !== eventId) return evt;
        const existing = evt.attendance?.[memberId] || {
          memberId,
          memberName,
        };
        const updatedAttendance = {
          ...evt.attendance,
          [memberId]: {
            ...existing,
            memberName,
            status,
            note: note !== undefined ? note : existing.note,
            updatedAt: new Date().toISOString(),
          },
        };
        return { ...evt, attendance: updatedAttendance };
      });

      const updatedData: ClubData = {
        ...prev,
        events: updatedEvents,
        updatedAt: new Date().toISOString(),
      };
      SheetService.saveLocalData(updatedData);

      // If user provided an Apps Script Web App URL, push asynchronously to Google Sheet
      if (sheetConfig.appsScriptUrl) {
        const targetEvent = updatedEvents.find((e) => e.id === eventId);
        SheetService.pushRSVPToGoogleSheet(
          sheetConfig.appsScriptUrl,
          eventId,
          targetEvent?.title || eventId,
          memberName,
          status,
          note
        );
      }

      // Update currently opened event modal if applicable
      if (selectedEvent && selectedEvent.id === eventId) {
        const refreshed = updatedEvents.find((e) => e.id === eventId);
        if (refreshed) setSelectedEvent(refreshed);
      }

      return updatedData;
    });

    const statusZh = status === 'attending' ? '出席 ✅' : status === 'declined' ? '未能出席 ❌' : '待定 ⏳';
    showToast(`${memberName} 已登記：${statusZh}`);
  };

  // Handle Guest Add
  const handleAddGuest = (
    eventId: string,
    guestName: string,
    status: AttendanceStatus = 'attending',
    note?: string
  ) => {
    setData((prev) => {
      const updatedEvents = prev.events.map((evt) => {
        if (evt.id !== eventId) return evt;
        const newGuest = {
          memberId: 'guest-' + Date.now().toString(36),
          memberName: guestName.trim(),
          status,
          note: note ? note.trim() : '嘉賓/同行好友',
          updatedAt: new Date().toISOString(),
        };
        return {
          ...evt,
          customGuests: [...(evt.customGuests || []), newGuest],
        };
      });

      const updatedData = { ...prev, events: updatedEvents };
      SheetService.saveLocalData(updatedData);

      if (selectedEvent && selectedEvent.id === eventId) {
        const refreshed = updatedEvents.find((e) => e.id === eventId);
        if (refreshed) setSelectedEvent(refreshed);
      }
      return updatedData;
    });
    showToast(`已加入嘉賓：${guestName}`);
  };

  // Handle Guest Remove
  const handleRemoveGuest = (eventId: string, guestId: string) => {
    setData((prev) => {
      const updatedEvents = prev.events.map((evt) => {
        if (evt.id !== eventId) return evt;
        return {
          ...evt,
          customGuests: (evt.customGuests || []).filter((g) => g.memberId !== guestId),
        };
      });

      const updatedData = { ...prev, events: updatedEvents };
      SheetService.saveLocalData(updatedData);

      if (selectedEvent && selectedEvent.id === eventId) {
        const refreshed = updatedEvents.find((e) => e.id === eventId);
        if (refreshed) setSelectedEvent(refreshed);
      }
      return updatedData;
    });
    showToast('已移除嘉賓紀錄');
  };

  // Handle Create Event
  const handleCreateEvent = (eventData: Partial<ClubEvent>) => {
    const currentMember = data.members.find((m) => m.id === currentUserId);
    const newId = 'evt-' + Date.now().toString(36);
    const now = new Date().toISOString();

    const attendance: Record<string, any> = {};
    data.members.forEach((m) => {
      attendance[m.id] = {
        memberId: m.id,
        memberName: m.name,
        status: 'pending',
        updatedAt: now,
      };
    });

    const newEvent: ClubEvent = {
      id: newId,
      title: eventData.title || '新活動',
      dateStr: eventData.dateStr || '待定',
      timeStr: eventData.timeStr || '',
      location: eventData.location || '待定',
      category: eventData.category || 'st_john',
      description: eventData.description || '',
      createdBy: currentMember?.name || '城北幹事',
      createdAt: now,
      attendance,
      customGuests: [],
    };

    setData((prev) => {
      const updatedData = {
        ...prev,
        events: [newEvent, ...prev.events],
      };
      SheetService.saveLocalData(updatedData);
      return updatedData;
    });

    setShowCreateModal(false);
    setSelectedEvent(newEvent);
    showToast('活動建立成功！');
  };

  // Handle Delete Event
  const handleDeleteEvent = (eventId: string) => {
    setData((prev) => {
      const updatedEvents = prev.events.filter((e) => e.id !== eventId);
      const updatedData = { ...prev, events: updatedEvents };
      SheetService.saveLocalData(updatedData);
      return updatedData;
    });
    setSelectedEvent(null);
    showToast('已刪除活動');
  };

  // Handle Add Member
  const handleAddMember = (name: string, role?: string) => {
    const newMember: Member = {
      id: 'm-' + Date.now().toString(36),
      name: name.trim(),
      role: role || '社員',
      isCore: true,
    };

    setData((prev) => {
      const updatedMembers = [...prev.members, newMember];
      const updatedEvents = prev.events.map((evt) => {
        if (!evt.attendance[newMember.id]) {
          return {
            ...evt,
            attendance: {
              ...evt.attendance,
              [newMember.id]: {
                memberId: newMember.id,
                memberName: newMember.name,
                status: 'pending' as AttendanceStatus,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }
        return evt;
      });

      const updatedData: ClubData = {
        ...prev,
        members: updatedMembers,
        events: updatedEvents,
      };
      SheetService.saveLocalData(updatedData);
      return updatedData;
    });
    showToast(`已成功加入新社員：${name}`);
  };

  // Handle Copy WhatsApp message for a card
  const handleCopyWhatsAppForCard = (event: ClubEvent) => {
    const origin = window.location.origin;
    const directLink = `${origin}/?token=${data.secretToken || 'hkcn'}&event=${event.id}`;

    const attendingList = data.members.filter((m) => event.attendance?.[m.id]?.status === 'attending');
    const declinedList = data.members.filter((m) => event.attendance?.[m.id]?.status === 'declined');
    const pendingList = data.members.filter(
      (m) => !event.attendance?.[m.id] || event.attendance?.[m.id]?.status === 'pending'
    );

    const text = `【香港城北扶青社 - 活動出席名單】
📌 活動：${event.title}
📅 日期：${event.dateStr}
📍 地點：${event.location}${event.timeStr ? `\n⏰ 時間：${event.timeStr}` : ''}

✅ 出席 (${attendingList.length}人)：
${attendingList.map((m) => `@${m.name}`).join(' ') || '（暫無）'}

❌ 未能出席 (${declinedList.length}人)：
${declinedList.map((m) => `@${m.name}`).join(' ') || '（暫無）'}

⏳ 待定 / 未覆 (${pendingList.length}人)：
${pendingList.map((m) => `@${m.name}`).join(' ') || '（暫無）'}

🔗 一鍵登記／修改連結 (免密碼)：
${directLink}`;

    navigator.clipboard.writeText(text);
    showToast('已複製 WhatsApp 報名格式！');
  };

  // Gate check
  if (!authorized) {
    return (
      <AccessGate
        defaultToken={data.secretToken || 'hkcn'}
        onUnlock={(token) => {
          AuthService.setAuthToken(token);
          setAuthorized(true);
        }}
      />
    );
  }

  const members = data.members;
  const events = data.events;
  const currentMember = members.find((m) => m.id === currentUserId);

  // Filter events based on active tab & search
  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.dateStr.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-medium flex items-center gap-2 animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar (Follows Top Bar Contract) */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'members') {
            setShowMemberModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenCreate={() => setShowCreateModal(true)}
        onOpenShare={() => setShowShareModal(true)}
        onOpenDataInfo={() => setShowSheetModal(true)}
        members={members}
        currentUserId={currentUserId}
        onSelectCurrentUser={handleSelectCurrentUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero Banner Section */}
        <section className="bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="text-[#00A651] font-bold">香港城北扶青社</span>
                <span aria-hidden="true">·</span>
                <span>Rotaract Club of Hong Kong City North</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  <ShieldCheck className="w-3 h-3 text-[#00A651]" />
                  <span>免密碼專屬連結運行中</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                活動出席與報名系統 (純前端 · 支援 Google Sheets)
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                零伺服器 API，可直接放上 GitHub Pages。在 WhatsApp 發送專屬連結即可一鍵勾選出席，支援隨時連接公開 Google Sheet 資料庫！
              </p>
            </div>

            {/* Quick Metrics Bar & Google Sheet status */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 shrink-0 bg-white/80 p-3.5 rounded-2xl border border-slate-200">
                <div className="text-center px-2">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
                    {members.length}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">核心社員</div>
                </div>
                <div className="text-center px-2 border-x border-slate-200">
                  <div className="text-xl sm:text-2xl font-bold text-[#00A651] font-mono tabular-nums">
                    {events.length}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">記錄活動</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-xl sm:text-2xl font-bold text-[#F58220] font-mono tabular-nums">
                    0 API
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">純前端運行</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSheetModal(true)}
                className="w-full sm:w-auto px-3.5 py-3 bg-white hover:bg-emerald-50/80 border border-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-[#00A651] transition-all shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#00A651]" />
                <span>{sheetConfig.sheetId ? '已連 Google Sheet' : '連接 Google Sheet'}</span>
              </button>
            </div>
          </div>

          {/* Quick Notice if user hasn't selected identity */}
          {!currentMember && (
            <div className="mt-5 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <Sparkles className="w-4 h-4 text-[#F58220] shrink-0" />
                <span>
                  <strong>快速簽到提示：</strong>右上方或下方選擇你係邊位社員，之後所有活動即可 1-Click 一秒報名！
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMemberModal(true)}
                className="px-3 py-1.5 bg-[#F58220] hover:bg-[#dd7216] text-white rounded-xl font-medium shrink-0 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>選擇我係邊位社員</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>

        {/* Filter and Search Bar */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              全部活動 ({events.length})
            </button>
            <button
              onClick={() => setCategoryFilter('st_john')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === 'st_john'
                  ? 'bg-[#00A651] text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              St. John 急救
            </button>
            <button
              onClick={() => setCategoryFilter('service')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === 'service'
                  ? 'bg-[#00A651] text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              社區義工
            </button>
            <button
              onClick={() => setCategoryFilter('meeting')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === 'meeting'
                  ? 'bg-[#00A651] text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              常規例會
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="搜尋活動、地點或日期..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A651]"
            />
          </div>
        </section>

        {/* Events Grid */}
        <section>
          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                暫無符合條件的活動
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                目前未找到相關活動記錄。你可以點擊下方按鈕新增第一個城北扶青社活動。
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>立即新建活動</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {filteredEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  members={members}
                  currentUserId={currentUserId}
                  onOpenDetails={(e) => setSelectedEvent(e)}
                  onQuickRSVP={(eventId, memberId, memberName, status) =>
                    handleUpdateRSVP(eventId, memberId, memberName, status)
                  }
                  onCopyWhatsApp={handleCopyWhatsAppForCard}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">香港城北扶青社</span>
            <span>·</span>
            <span>Rotaract Club of Hong Kong City North</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setShowSheetModal(true)}
              className="hover:text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00A651]" />
              <span>Google Sheet 資料庫設定</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setShowShareModal(true)}
              className="hover:text-slate-700 transition-colors cursor-pointer"
            >
              專屬 WhatsApp 連結
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          members={members}
          currentUserId={currentUserId}
          secretToken={data.secretToken || 'hkcn'}
          onClose={() => setSelectedEvent(null)}
          onUpdateRSVP={handleUpdateRSVP}
          onAddGuest={handleAddGuest}
          onRemoveGuest={handleRemoveGuest}
          onDeleteEvent={handleDeleteEvent}
          onSelectCurrentUser={handleSelectCurrentUser}
        />
      )}

      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEvent}
        />
      )}

      {showShareModal && (
        <ShareLinkModal
          secretToken={data.secretToken}
          events={data.events}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showSheetModal && (
        <GoogleSheetModal
          data={data}
          onClose={() => setShowSheetModal(false)}
          onSyncFromSheet={syncWithGoogleSheet}
          onSaveConfig={(cfg) => setSheetConfig(cfg)}
        />
      )}

      {showMemberModal && (
        <MemberRosterModal
          members={members}
          currentUserId={currentUserId}
          onSelectCurrentUser={handleSelectCurrentUser}
          onAddMember={handleAddMember}
          onClose={() => setShowMemberModal(false)}
        />
      )}
    </div>
  );
}
