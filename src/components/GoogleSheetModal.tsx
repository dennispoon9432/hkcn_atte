import React, { useState } from 'react';
import { X, Table, RefreshCw, CheckCircle2, ExternalLink, Copy, HelpCircle, FileSpreadsheet, Download } from 'lucide-react';
import { SheetService, GoogleSheetConfig } from '../services/sheetService';
import { ClubData } from '../types';

interface GoogleSheetModalProps {
  data: ClubData;
  onClose: () => void;
  onSyncFromSheet: (sheetId: string) => Promise<void>;
  onSaveConfig: (config: GoogleSheetConfig) => void;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  data,
  onClose,
  onSyncFromSheet,
  onSaveConfig,
}) => {
  const [config, setConfig] = useState<GoogleSheetConfig>(SheetService.getSheetConfig());
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'guide' | 'code'>('settings');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSave = () => {
    SheetService.saveSheetConfig(config);
    onSaveConfig(config);
    setStatusMsg('已儲存 Google Sheet 設定！');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleSyncNow = async () => {
    if (!config.sheetId) {
      alert('請先輸入 Google Sheet 網址或 ID');
      return;
    }
    setSyncing(true);
    try {
      await onSyncFromSheet(config.sheetId);
      const updated = {
        ...config,
        lastSyncedAt: new Date().toLocaleTimeString('zh-HK'),
      };
      setConfig(updated);
      SheetService.saveSheetConfig(updated);
      setStatusMsg('已成功從 Google Sheet 同步最新出席與社員名冊！');
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      alert('同步失敗：' + (err.message || '請確保 Google Sheet 已公開開啟「任何具備連結的人均可檢視」'));
    } finally {
      setSyncing(false);
    }
  };

  const appsScriptTemplate = `// 貼到 Google Sheet 試算表上的「擴充功能」->「Apps Script」
// 部署為「網頁應用程式 (Web App)」，誰可以存取設為「任何人 (Anyone)」
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Attendance");
    if (!sheet) {
      sheet = ss.insertSheet("Attendance");
      sheet.appendRow(["活動ID", "社員姓名", "出席狀態", "備註", "登記時間"]);
    }
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([data.eventId, data.memberName, data.status, data.note, data.timestamp]);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptTemplate);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#00A651] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Google Sheets 資料庫連接
              </h2>
              <p className="text-[11px] text-slate-500">
                純前端運作，直接讀取 Google Sheet，無須任何伺服器 API
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

        {/* Tab Controls */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 bg-white text-xs font-medium">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#00A651] text-[#00A651] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            試算表連結設定
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'guide'
                ? 'border-[#00A651] text-[#00A651] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            欄位格式範本指南
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 px-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'border-[#00A651] text-[#00A651] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            自動寫入 Apps Script (可選)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl text-xs text-emerald-950 leading-relaxed">
                <strong>💡 完全無須伺服器與後端 API：</strong>
                只需在 Google Drive 建立一個 Google Sheet，並設定「任何知道連結的人均可檢視」，貼上網址即可將名單與活動連結至該試算表！可隨時放上 GitHub Pages 運行。
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Google Sheet 試算表連結或 ID：
                </label>
                <input
                  type="text"
                  placeholder="例如: https://docs.google.com/spreadsheets/d/1BxiMVs.../edit"
                  value={config.sheetId}
                  onChange={(e) => setConfig({ ...config, sheetId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  支援直接貼上完整瀏覽器網址，系統會自動提取試算表 ID。
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Google Apps Script Web App 寫入網址 (可選，用於雙向寫入出席)：
                </label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={config.appsScriptUrl || ''}
                  onChange={(e) => setConfig({ ...config, appsScriptUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  如未填寫，登記出席時會保存於各社員手機的瀏覽器本地快取，並可一鍵匯出 Excel。
                </p>
              </div>

              {config.lastSyncedAt && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <span>上次同步時間：{config.lastSyncedAt}</span>
                </div>
              )}

              {statusMsg && (
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
                  <span>{statusMsg}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  儲存設定
                </button>

                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? '正在讀取試算表...' : '立即從 Google Sheet 重新載入'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <p>
                為讓系統能正確讀取你的 Google Sheet，請在試算表內建立以下 3 個工作表分頁 (Tabs)：
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00A651]"></span>
                  <span>分頁 1：名稱必須為 <code>Members</code> (社員名單)</span>
                </div>
                <div className="font-mono text-[11px] bg-white p-2 border rounded-lg overflow-x-auto">
                  A欄: 姓名 (Name) | B欄: 職位 (Role)
                  <br />
                  範例：
                  <br />
                  Cherry | 社員
                  <br />
                  Onki | 社長
                  <br />
                  Alvin | 幹事
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F58220]"></span>
                  <span>分頁 2：名稱必須為 <code>Events</code> (活動清單)</span>
                </div>
                <div className="font-mono text-[11px] bg-white p-2 border rounded-lg overflow-x-auto">
                  A欄: ID | B欄: 標題 | C欄: 日期 | D欄: 時間 | E欄: 地點 | F欄: 類別 | G欄: 備註
                  <br />
                  範例：
                  <br />
                  evt-1 | 海洋公園 St. John 出席 | 24 Oct | 09:00 - 18:00 | 海洋公園 | st_john | 正門集合
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  <span>分頁 3：名稱必須為 <code>Attendance</code> (出席登記記錄)</span>
                </div>
                <div className="font-mono text-[11px] bg-white p-2 border rounded-lg overflow-x-auto">
                  A欄: 活動ID | B欄: 社員姓名 | C欄: 狀態 (attending / declined / pending) | D欄: 備註
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <p>
                如果你想在社員點擊「我會出席」時，<strong>自動即時寫入 Google Sheet</strong>，可以在該 Google Sheet 貼上以下簡單的免費 Apps Script：
              </p>

              <div className="relative">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCode ? '已複製！' : '複製代碼'}</span>
                </button>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed max-h-60">
                  {appsScriptTemplate}
                </pre>
              </div>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>在 Google Sheet 點擊「擴充功能」➔「Apps Script」。</li>
                <li>貼上上述代碼並儲存。</li>
                <li>點擊右上角「部署」➔「新增部署作業」➔ 類型選擇「網頁應用程式 (Web App)」。</li>
                <li>「誰可以存取」選擇「所有人 (Anyone)」，點擊部署後複製產生的網址貼回「試算表連結設定」即可！</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
