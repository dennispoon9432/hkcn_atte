import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SimpleEvent, AttendanceChoice, SystemLogEntry } from './types';
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
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { SystemLogModal } from './components/SystemLogModal';
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
  RefreshCw,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Timer,
  History,
} from 'lucide-react';

export default function App() {
  const [authorized, setAuthorized] = useState<boolean>(() => StorageService.isAuthValid());
  const [events, setEvents] = useState<SimpleEvent[]>(() => StorageService.getEvents());
  const [logs, setLogs] = useState<SystemLogEntry[]>(() => StorageService.getLogs());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SimpleEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<SimpleEvent | null>(null);
  const [pendingRSVP, setPendingRSVP] = useState<{
    event: SimpleEvent;
    choice: AttendanceChoice;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Drag and drop reordering states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const touchDragRef = useRef<{ startIndex: number } | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Sync data from Google Sheet (both events and cross-device system logs)
  const syncData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    try {
      const result = await StorageService.syncFromGoogleSheet();
      if (result) {
        setEvents(result.events);
        setLogs(result.logs);
        if (showIndicator) showToast('已從 Google Sheet 同步最新紀錄與操作日誌！');
      }
    } catch (e) {
      console.warn('Sync error', e);
    } finally {
      if (showIndicator) setIsSyncing(false);
    }
  }, []);

  // Sync on mount and on window focus (so returning to tab gets fresh data from other devices)
  useEffect(() => {
    syncData();

    const handleFocus = () => {
      syncData();
    };
    window.addEventListener('focus', handleFocus);

    // Poll every 12 seconds
    const interval = setInterval(() => {
      syncData();
    }, 12000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [syncData]);

  // Reordering function: swaps or shifts event order and syncs to Google Sheet
  const handleMoveEvent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= events.length || fromIndex === toIndex) return;
    const updated = [...events];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setEvents(updated);
    StorageService.saveEvents(updated);
    StorageService.pushAllEventsToGoogleSheet(updated);

    // Add log
    StorageService.addLog({
      actionType: 'reorder',
      title: '調整活動排位',
      detail: `將「${moved.title}」排位調整至第 ${toIndex + 1} 位`,
    });
    setLogs(StorageService.getLogs());

    showToast('已更新活動排列次序！');
  };

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      handleMoveEvent(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch device drag and drop handlers
  const handleTouchStart = (index: number) => {
    touchDragRef.current = { startIndex: index };
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragRef.current) return;
    const touch = e.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardElement = targetElement?.closest('[data-event-index]');
    if (cardElement) {
      const targetIdx = Number(cardElement.getAttribute('data-event-index'));
      if (!isNaN(targetIdx) && targetIdx !== dragOverIndex) {
        setDragOverIndex(targetIdx);
      }
    }
  };

  const handleTouchEnd = () => {
    if (
      touchDragRef.current &&
      dragOverIndex !== null &&
      dragOverIndex !== touchDragRef.current.startIndex
    ) {
      handleMoveEvent(touchDragRef.current.startIndex, dragOverIndex);
    }
    touchDragRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // When clicking an RSVP button: opens the member prompt
  const handleOpenRSVPPrompt = (event: SimpleEvent, choice: AttendanceChoice) => {
    setPendingRSVP({ event, choice });
  };

  // When choosing who they are and entering an optional remark
  const handleConfirmMemberRSVP = async (memberName: string, remark?: string) => {
    if (!pendingRSVP) return;
    const { event, choice } = pendingRSVP;

    const updated = events.map((e) => {
      if (e.id !== event.id) return e;
      const newAttendance = {
        ...e.attendance,
        [memberName]: choice,
      };
      const newRemarks = { ...(e.remarks || {}) };
      if (remark) {
        newRemarks[memberName] = remark;
      } else {
        delete newRemarks[memberName];
      }
      return {
        ...e,
        attendance: newAttendance,
        remarks: newRemarks,
      };
    });

    setEvents(updated);
    StorageService.saveEvents(updated);

    // Push to Google Sheet immediately
    StorageService.pushAllEventsToGoogleSheet(updated);
    StorageService.pushRSVP(event.title, memberName, choice, remark, updated);

    setPendingRSVP(null);

    const label =
      choice === 'attending'
        ? `去到 ✅${remark ? ` (${remark})` : ''}`
        : choice === 'late_early'
        ? `遲到早退 ⏱️${remark ? ` (${remark})` : ''}`
        : choice === 'declined'
        ? `去唔到 ❌${remark ? ` (${remark})` : ''}`
        : `TBC ⏳${remark ? ` (${remark})` : ''}`;

    // Add system log entry
    StorageService.addLog({
      actionType: 'rsvp',
      title: '出席登記改動',
      memberName,
      detail: `${memberName} 於「${event.title}」登記出席狀態為：${label}`,
    });
    setLogs(StorageService.getLogs());

    showToast(`${memberName} 已成功登記：${label}`);
  };

  const handleCreateEvent = async (title: string, dateTime: string) => {
    const newEvent: SimpleEvent = {
      id: 'evt-' + Date.now().toString(36),
      title,
      dateTime,
      attendance: {},
      remarks: {},
      createdAt: new Date().toISOString(),
    };
    const updated = [newEvent, ...events];
    setEvents(updated);
    StorageService.saveEvents(updated);

    // Push to Google Sheet
    StorageService.pushAllEventsToGoogleSheet(updated);

    // Add log
    StorageService.addLog({
      actionType: 'create',
      title: '新增活動',
      detail: `成功建立活動「${title}」（時間：${dateTime}）`,
    });
    setLogs(StorageService.getLogs());

    setShowCreateModal(false);
    showToast('已新增活動並同步至 Google Sheet！');
  };

  const handleSaveEditEvent = (id: string, title: string, dateTime: string) => {
    const existing = events.find((e) => e.id === id);
    const updated = events.map((e) => (e.id === id ? { ...e, title, dateTime } : e));
    setEvents(updated);
    StorageService.saveEvents(updated);

    // Push to Google Sheet
    StorageService.pushAllEventsToGoogleSheet(updated);

    // Add log
    StorageService.addLog({
      actionType: 'edit',
      title: '修改活動資料',
      detail: `修改活動「${existing?.title || title}」之資料為：「${title}」（時間：${dateTime}）`,
    });
    setLogs(StorageService.getLogs());

    setEditingEvent(null);
    showToast('已更新活動並同步至 Google Sheet！');
  };

  const handleConfirmDelete = (id: string) => {
    const toDelete = events.find((e) => e.id === id);
    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    StorageService.saveEvents(updated);

    // Push to Google Sheet
    StorageService.pushAllEventsToGoogleSheet(updated);

    // Add log
    StorageService.addLog({
      actionType: 'delete',
      title: '刪除活動',
      detail: `輸入 HKCN 確認刪除活動「${toDelete?.title || id}」`,
    });
    setLogs(StorageService.getLogs());

    setDeletingEvent(null);
    showToast('已成功刪除活動');
  };

  // Get the secret link for WhatsApp group: https://dennispoon9432.github.io/hkcn_atte/?key=hkcn2026cherry
  const getSecretLink = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const isGithubPages = origin.includes('github.io');
    const basePath = isGithubPages ? pathname : '/';

    const url = new URL(`${origin}${basePath}`);
    url.searchParams.set('key', SECRET_ACCESS_KEY);
    return url.toString();
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

  const isScriptConnected = !!StorageService.getAppsScriptUrl();

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
              <div className="text-sm font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>活動出席登記</span>
                <button
                  onClick={() => syncData(true)}
                  disabled={isSyncing}
                  title="從 Google Sheet 重新整理最新數據"
                  className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Right Action: Logs, Google Sheet, Copy Secret Link, Add Event */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* System Log Button */}
            <button
              onClick={() => setShowLogModal(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="查看系統操作紀錄 (改動歷程)"
            >
              <History className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">操作紀錄</span>
            </button>

            {/* Google Sheet Button */}
            <button
              onClick={() => setShowSheetModal(true)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="點此查看 Google Sheet 及雙向同步狀態"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Google Sheet</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isScriptConnected ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                }`}
              />
            </button>

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
              className="px-4 py-2 bg-[#00A651] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              右上角新增活動
            </button>
          </div>
        ) : (
          events.map((evt, index) => {
            const attendingList = CORE_MEMBERS.filter((m) => evt.attendance[m] === 'attending');
            const declinedList = CORE_MEMBERS.filter((m) => evt.attendance[m] === 'declined');
            const tbcList = CORE_MEMBERS.filter(
              (m) => evt.attendance[m] === 'tbc' || !evt.attendance[m]
            );
            // 遲到早退放在最尾
            const lateEarlyList = CORE_MEMBERS.filter((m) => evt.attendance[m] === 'late_early');

            const isBeingDragged = draggedIndex === index;
            const isDragOver = dragOverIndex === index && draggedIndex !== index;

            return (
              <article
                key={evt.id}
                data-event-index={index}
                onDragOver={(e) => handleDragOver(index, e)}
                onDrop={(e) => handleDrop(index, e)}
                className={`bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200 ${
                  isBeingDragged ? 'opacity-40 border-dashed border-[#00A651] scale-[0.98]' : ''
                } ${isDragOver ? 'ring-2 ring-[#00A651] border-[#00A651] scale-[1.01]' : ''}`}
              >
                {/* 1. 頂部長按拖拉按鈕 (Drag Handle) */}
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(index, e)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={() => handleTouchStart(index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-slate-500 cursor-grab active:cursor-grabbing hover:bg-slate-100/90 select-none transition-colors group"
                  title="長按並拖拉以調整活動次序"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-white border border-slate-200 text-slate-400 group-hover:text-emerald-600 transition-colors flex items-center justify-center shadow-2xs">
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-mono font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span>長按拖拉排位</span>
                    </span>
                  </div>

                  {/* 向上／向下快速微調按鈕 */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveEvent(index, index - 1);
                      }}
                      disabled={index === 0}
                      title="向上移"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveEvent(index, index + 1);
                      }}
                      disabled={index === events.length - 1}
                      title="向下移"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Event Header with Title, Date, Edit & Delete */}
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

                {/* 3. 4 RSVP Buttons (順序: 1.去到 -> 2.遲到早退 -> 3.去唔到 -> 4.TBC) */}
                <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500">
                    點擊你的出席狀態（點擊後選擇你的名字，可加填 Remark 備註）：
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* 1. 去到 */}
                    <button
                      type="button"
                      onClick={() => handleOpenRSVPPrompt(evt, 'attending')}
                      className="py-2.5 px-2 rounded-2xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 active:scale-95 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
                      <span>去到</span>
                    </button>

                    {/* 2. 遲到早退 (第2位) */}
                    <button
                      type="button"
                      onClick={() => handleOpenRSVPPrompt(evt, 'late_early')}
                      className="py-2.5 px-2 rounded-2xl bg-white border border-indigo-300 text-indigo-900 hover:bg-indigo-50 active:scale-95 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <Timer className="w-4 h-4 text-indigo-600" />
                      <span>遲到早退</span>
                    </button>

                    {/* 3. 去唔到 */}
                    <button
                      type="button"
                      onClick={() => handleOpenRSVPPrompt(evt, 'declined')}
                      className="py-2.5 px-2 rounded-2xl bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 active:scale-95 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>去唔到</span>
                    </button>

                    {/* 4. TBC */}
                    <button
                      type="button"
                      onClick={() => handleOpenRSVPPrompt(evt, 'tbc')}
                      className="py-2.5 px-2 rounded-2xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 active:scale-95 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>TBC</span>
                    </button>
                  </div>
                </div>

                {/* 4. Attendance Breakdown (順序: 1.去到 -> 2.遲到早退 -> 3.去唔到 -> 4.TBC) */}
                <div className="p-4 sm:p-5 space-y-3 text-xs">
                  {/* 1. 去到 */}
                  <div className="flex items-start gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold shrink-0 text-[11px]">
                      去到 ({attendingList.length})
                    </span>
                    <div className="text-slate-800 font-medium pt-0.5 leading-relaxed flex flex-wrap items-center gap-1.5">
                      {attendingList.length > 0 ? (
                        attendingList.map((m, i) => (
                          <span
                            key={m}
                            className="inline-flex items-center gap-1 bg-emerald-50/80 text-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-200"
                          >
                            <span className="font-bold">{m}</span>
                            {evt.remarks?.[m] && (
                              <span className="text-[10px] text-emerald-700 font-bold bg-white px-1.5 py-0.2 rounded border border-emerald-100 shadow-2xs">
                                {evt.remarks[m]}
                              </span>
                            )}
                            {i < attendingList.length - 1 && (
                              <span className="text-emerald-300 ml-1">·</span>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">暫無</span>
                      )}
                    </div>
                  </div>

                  {/* 2. 遲到早退 (第2位) */}
                  <div className="flex items-start gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 font-bold shrink-0 text-[11px]">
                      遲到早退 ({lateEarlyList.length})
                    </span>
                    <div className="text-slate-800 font-medium pt-0.5 leading-relaxed flex flex-wrap items-center gap-1.5">
                      {lateEarlyList.length > 0 ? (
                        lateEarlyList.map((m, i) => (
                          <span
                            key={m}
                            className="inline-flex items-center gap-1 bg-indigo-50/80 text-indigo-950 px-2 py-0.5 rounded-lg border border-indigo-200"
                          >
                            <span className="font-bold">{m}</span>
                            {evt.remarks?.[m] && (
                              <span className="text-[10px] text-indigo-700 font-bold bg-white px-1.5 py-0.2 rounded border border-indigo-100 shadow-2xs">
                                {evt.remarks[m]}
                              </span>
                            )}
                            {i < lateEarlyList.length - 1 && (
                              <span className="text-indigo-300 ml-1">·</span>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">暫無</span>
                      )}
                    </div>
                  </div>

                  {/* 3. 去唔到 (可顯示自訂 Remark 原因) */}
                  <div className="flex items-start gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-900 font-bold shrink-0 text-[11px]">
                      去唔到 ({declinedList.length})
                    </span>
                    <div className="text-slate-800 font-medium pt-0.5 leading-relaxed flex flex-wrap items-center gap-1.5">
                      {declinedList.length > 0 ? (
                        declinedList.map((m, i) => (
                          <span
                            key={m}
                            className="inline-flex items-center gap-1 bg-rose-50/80 text-rose-950 px-2 py-0.5 rounded-lg border border-rose-200"
                          >
                            <span className="font-bold">{m}</span>
                            {evt.remarks?.[m] && (
                              <span className="text-[10px] text-rose-700 font-bold bg-white px-1.5 py-0.2 rounded border border-rose-100 shadow-2xs">
                                {evt.remarks[m]}
                              </span>
                            )}
                            {i < declinedList.length - 1 && (
                              <span className="text-rose-300 ml-1">·</span>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">暫無</span>
                      )}
                    </div>
                  </div>

                  {/* 4. TBC (可顯示自訂 Remark) */}
                  <div className="flex items-start gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold shrink-0 text-[11px]">
                      TBC ({tbcList.length})
                    </span>
                    <div className="text-slate-800 font-medium pt-0.5 leading-relaxed flex flex-wrap items-center gap-1.5">
                      {tbcList.length > 0 ? (
                        tbcList.map((m, i) => (
                          <span
                            key={m}
                            className="inline-flex items-center gap-1 bg-amber-50/80 text-amber-950 px-2 py-0.5 rounded-lg border border-amber-200"
                          >
                            <span className="font-bold">{m}</span>
                            {evt.remarks?.[m] && (
                              <span className="text-[10px] text-amber-800 font-bold bg-white px-1.5 py-0.2 rounded border border-amber-100 shadow-2xs">
                                {evt.remarks[m]}
                              </span>
                            )}
                            {i < tbcList.length - 1 && (
                              <span className="text-amber-300 ml-1">·</span>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">暫無</span>
                      )}
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

      {/* Select Member Prompt (Opens whenever user presses 去到/去唔到/TBC/遲到早退) */}
      {pendingRSVP && (
        <SelectMemberModal
          eventTitle={pendingRSVP.event.title}
          choice={pendingRSVP.choice}
          onSelect={handleConfirmMemberRSVP}
          onClose={() => setPendingRSVP(null)}
        />
      )}

      {/* Google Sheet Sync Modal */}
      {showSheetModal && (
        <GoogleSheetSyncModal
          onClose={() => setShowSheetModal(false)}
          onSyncNow={() => syncData(true)}
        />
      )}

      {/* System Log Modal (View activity / changes history) */}
      {showLogModal && (
        <SystemLogModal
          logs={logs}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </div>
  );
}
