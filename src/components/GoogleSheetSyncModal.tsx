import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { GOOGLE_SHEET_URL } from '../config';

interface GoogleSheetSyncModalProps {
  onClose: () => void;
  onSyncNow: () => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  onClose,
  onSyncNow,
}) => {
  const [url, setUrl] = useState(() => StorageService.getAppsScriptUrl());
  const [copiedScript, setCopiedScript] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isConnected = !!url;

  const handleSave = () => {
    StorageService.setAppsScriptUrl(url.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    onSyncNow();
  };

  const appsScriptCode = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var eventsSheet = getOrCreateSheet(ss, 'Events', getEventsHeaders(), '#00A651');
  var logsSheet = getOrCreateSheet(ss, 'SystemLogs', getLogsHeaders(), '#6B21A8');

  var logRows = logsSheet.getDataRange().getValues();
  var logs = [];
  for (var j = 1; j < logRows.length; j++) {
    var lRow = logRows[j];
    if (!lRow[0] && !lRow[1]) continue;
    logs.push({
      id: String(lRow[0] || 'log-' + j),
      timestamp: lRow[1] ? String(lRow[1]) : new Date().toISOString(),
      actionType: String(lRow[2] || 'rsvp'),
      title: String(lRow[3] || ''),
      memberName: String(lRow[4] || ''),
      detail: String(lRow[5] || '')
    });
  }

  var eventRows = eventsSheet.getDataRange().getValues();
  var events = [];
  for (var i = 1; i < eventRows.length; i++) {
    var row = eventRows[i];
    if (!row[0] && !row[1]) continue;
    var attendance = {}, remarks = {};
    if (row[3]) {
      try {
        var parsed = JSON.parse(String(row[3]));
        attendance = parsed.attendance || parsed;
        remarks = parsed.remarks || {};
      } catch (err) {}
    }
    events.push({
      id: String(row[0] || 'evt-' + i),
      title: String(row[1] || ''),
      dateTime: String(row[2] || ''),
      attendance: attendance,
      remarks: remarks,
      createdAt: row[4] ? String(row[4]) : new Date().toISOString()
    });
  }

  logs.reverse();
  return jsonResponse({ status: 'success', events: events, logs: logs });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (err) { return jsonResponse({ status: 'error' }); }
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (payload.action === 'sync_all' && Array.isArray(payload.events)) {
      var eventsSheet = getOrCreateSheet(ss, 'Events', getEventsHeaders(), '#00A651');
      writeAllEvents(eventsSheet, payload.events);
      if (payload.log) {
        var logsSheet = getOrCreateSheet(ss, 'SystemLogs', getLogsHeaders(), '#6B21A8');
        appendLog(logsSheet, payload.log);
      }
      return jsonResponse({ status: 'success' });
    }
    if (payload.action === 'rsvp') {
      var eventsSheet = getOrCreateSheet(ss, 'Events', getEventsHeaders(), '#00A651');
      if (Array.isArray(payload.events) && payload.events.length > 0) {
        writeAllEvents(eventsSheet, payload.events);
      }
      if (payload.log) {
        var logsSheet = getOrCreateSheet(ss, 'SystemLogs', getLogsHeaders(), '#6B21A8');
        appendLog(logsSheet, payload.log);
      }
      return jsonResponse({ status: 'success' });
    }
    return jsonResponse({ status: 'success' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function writeAllEvents(sheet, events) {
  setupHeaders(sheet, getEventsHeaders(), '#00A651');
  if (!events || events.length === 0) return;
  var rows = [];
  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    var attendance = evt.attendance || {};
    var remarks = evt.remarks || {};
    rows.push([
      evt.id || 'evt-' + i,
      evt.title,
      evt.dateTime,
      JSON.stringify({ attendance: attendance, remarks: remarks }),
      evt.createdAt || new Date().toISOString(),
      getSummaryText(attendance, remarks, 'attending'),
      getSummaryText(attendance, remarks, 'late_early'),
      getSummaryText(attendance, remarks, 'declined'),
      getSummaryText(attendance, remarks, 'tbc')
    ]);
  }
  sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  var lastRow = sheet.getLastRow();
  if (lastRow > rows.length + 1) sheet.deleteRows(rows.length + 2, lastRow - (rows.length + 1));
}

function appendLog(sheet, log) {
  sheet.appendRow([log.id, log.timestamp, log.actionType, log.title, log.memberName, log.detail]);
}

function getOrCreateSheet(ss, name, headers, color) {
  var s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); setupHeaders(s, headers, color); }
  return s;
}

function setupHeaders(s, headers, color) {
  s.getRange(1, 1, 1, headers.length).setValues([headers]);
  s.getRange(1, 1, 1, headers.length).setBackground(color || '#00A651').setFontColor('#ffffff').setFontWeight('bold');
  s.setFrozenRows(1);
}

function getEventsHeaders() {
  return ['活動ID', '活動名稱', '日期時間', '出席數據(JSON)', '建立時間', '去到名單', '遲到早退名單', '去唔到名單', 'TBC名單'];
}

function getLogsHeaders() {
  return ['紀錄ID', '時間', '操作類型', '標題', '社員', '詳情'];
}

function getSummaryText(attendance, remarks, choice) {
  if (!attendance) return '';
  var list = [];
  for (var k in attendance) {
    if (attendance[k] === choice) {
      if (remarks && remarks[k]) list.push(k + ' (' + remarks[k] + ')');
      else list.push(k);
    }
  }
  return list.join(', ');
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#00A651] flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Google Sheet 雙向即時同步
              </h3>
              <p className="text-[11px] text-slate-500">
                確保所有裝置打開連結都能看到最新記錄
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Target Sheet Link */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-emerald-800">
                已指定目標試算表：
              </div>
              <div className="text-[11px] text-emerald-700 font-mono truncate max-w-[240px] sm:max-w-xs">
                HKCN 出席紀錄表
              </div>
            </div>
            <a
              href={GOOGLE_SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-[#00A651] hover:bg-[#008f45] text-white font-bold rounded-xl text-[11px] flex items-center gap-1 shadow-xs transition-colors shrink-0"
            >
              <span>打開 Google Sheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Explanation */}
          <div className="space-y-2 text-slate-600 leading-relaxed">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              點解需要設置 Google Apps Script？
            </p>
            <p>
              Google 試算表設有安全限制，任何純前端網站（如 GitHub Pages）若要<strong>即時寫入數據</strong>並供<strong>所有裝置跨機讀取</strong>，必須透過 Google Sheet 內建的「Apps Script 網頁應用程式」作為安全通道。
            </p>
          </div>

          {/* 3 Step Setup */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="font-bold text-slate-800">
              ⚡ 30 秒完成啟用（只需做一次）：
            </div>

            <ol className="list-decimal list-inside space-y-2 text-slate-600">
              <li>
                打開上述 Google Sheet，點頂部選單「<strong>擴充功能 (Extensions)</strong>」➔「<strong>Apps Script</strong>」。
              </li>
              <li>
                刪除原有程式碼，貼上專屬腳本：
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Copy className="w-3 h-3 text-emerald-400" />
                    <span>{copiedScript ? '✅ 已複製程式碼！' : '點此一鍵複製 Apps Script 程式碼'}</span>
                  </button>
                </div>
              </li>
              <li>
                點右上角「<strong>部署 (Deploy)</strong>」➔「<strong>新增部署 (New deployment)</strong>」：
                <ul className="list-disc list-inside ml-3 mt-1 text-[11px] text-slate-500 space-y-0.5">
                  <li>類型選「網頁應用程式 (Web app)」</li>
                  <li>執行身分：<strong>我 (Me)</strong></li>
                  <li>誰可以存取：<strong>所有人 (Anyone)</strong>（必須選所有人）</li>
                </ul>
              </li>
              <li>
                點擊部署，複製生成的「<strong>網頁應用程式網址 (Web app URL)</strong>」貼在下方：
              </li>
            </ol>

            {/* Input field */}
            <div className="pt-2 space-y-1.5">
              <input
                type="url"
                placeholder="貼上以 https://script.google.com/.../exec 結尾的網址"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  {savedSuccess ? '✅ 已成功儲存！' : '儲存後會自動加入 WhatsApp 專屬連結中'}
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-[#00A651] hover:bg-[#008f45] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  儲存並立即同步
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onSyncNow}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>立即從 Sheet 重新整理</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
