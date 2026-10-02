import { SimpleEvent, AttendanceChoice, SystemLogEntry } from '../types';
import {
  HARDCODED_GOOGLE_SHEET_ID,
  HARDCODED_APPS_SCRIPT_URL,
  SECRET_ACCESS_KEY,
} from '../config';

const STORAGE_KEY = 'hkcn_simple_events_clean_v1';
const USER_KEY = 'hkcn_active_member';
const AUTH_KEY = 'hkcn_auth_granted';
const SCRIPT_URL_KEY = 'hkcn_apps_script_url';
const LOGS_KEY = 'hkcn_system_logs_clean_v1';

export const StorageService = {
  getAppsScriptUrl(): string {
    if (HARDCODED_APPS_SCRIPT_URL) return HARDCODED_APPS_SCRIPT_URL;

    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('api');
    if (fromQuery) {
      localStorage.setItem(SCRIPT_URL_KEY, fromQuery);
      return fromQuery;
    }
    return localStorage.getItem(SCRIPT_URL_KEY) || '';
  },

  setAppsScriptUrl(url: string): void {
    localStorage.setItem(SCRIPT_URL_KEY, url.trim());
  },

  // 1. 活動資料存取 (支援完全空白，絕不強行加回範例)
  getEvents(): SimpleEvent[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed; // 允許為空陣列 []
        }
      } catch (e) {
        // fallback
      }
    }
    return [];
  },

  saveEvents(events: SimpleEvent[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  },

  // 2. 系統操作紀錄存取 (跨裝置從 Google Sheet 同步)
  getLogs(): SystemLogEntry[] {
    const raw = localStorage.getItem(LOGS_KEY);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  },

  saveLogs(logs: SystemLogEntry[]): void {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  },

  addLog(entry: Omit<SystemLogEntry, 'id' | 'timestamp'>): SystemLogEntry {
    const logs = this.getLogs();
    const newLog: SystemLogEntry = {
      id: 'log-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const updated = [newLog, ...logs].slice(0, 150);
    this.saveLogs(updated);

    // 同步推送日誌至 Google Sheet 的 SystemLogs 分頁
    this.pushLogToGoogleSheet(newLog);

    return newLog;
  },

  clearLogs(): void {
    this.saveLogs([]);
    this.clearLogsFromGoogleSheet();
  },

  getActiveUser(): string | null {
    return localStorage.getItem(USER_KEY);
  },

  setActiveUser(name: string): void {
    localStorage.setItem(USER_KEY, name);
  },

  isAuthValid(): boolean {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key') || params.get('token');
    if (
      key &&
      (key.toLowerCase() === SECRET_ACCESS_KEY.toLowerCase() ||
        key.toLowerCase() === 'hkcn' ||
        key.toLowerCase() === 'hkcn2026cherry')
    ) {
      localStorage.setItem(AUTH_KEY, 'true');
      return true;
    }
    return localStorage.getItem(AUTH_KEY) === 'true';
  },

  setAuthPassed(): void {
    localStorage.setItem(AUTH_KEY, 'true');
  },

  // 核心：從 Google Sheet 同步最新活動與跨裝置 System Logs
  async syncFromGoogleSheet(): Promise<{ events: SimpleEvent[]; logs: SystemLogEntry[] } | null> {
    const scriptUrl = this.getAppsScriptUrl();

    if (scriptUrl) {
      try {
        const fetchUrl = scriptUrl + (scriptUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        const res = await fetch(fetchUrl);
        const data = await res.json();

        if (data && data.status === 'success') {
          const eventsList = Array.isArray(data.events) ? data.events : [];
          const logsList = Array.isArray(data.logs) ? data.logs : [];

          this.saveEvents(eventsList);
          this.saveLogs(logsList);

          return {
            events: eventsList,
            logs: logsList,
          };
        }
      } catch (e) {
        console.warn('Apps script fetch failed', e);
      }
    }

    return null;
  },

  // 即時將所有活動推送到 Google Sheet (Events 分頁)
  async pushAllEventsToGoogleSheet(events: SimpleEvent[], log?: SystemLogEntry): Promise<boolean> {
    const scriptUrl = this.getAppsScriptUrl();
    if (!scriptUrl) return false;

    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync_all',
          events,
          log,
          timestamp: new Date().toISOString(),
        }),
      });
      return true;
    } catch (e) {
      console.warn('Failed to push events to Apps Script', e);
      return false;
    }
  },

  // 單獨更新某項 RSVP 並記錄到 Google Sheet
  async pushRSVP(
    eventTitle: string,
    memberName: string,
    choice: AttendanceChoice,
    remark: string | undefined,
    events: SimpleEvent[],
    log?: SystemLogEntry
  ) {
    const scriptUrl = this.getAppsScriptUrl();
    if (!scriptUrl) return;

    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'rsvp',
          eventTitle,
          memberName,
          choice,
          remark,
          events,
          log,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn('Apps script post error', e);
    }
  },

  // 單獨推送日誌到 Google Sheet (SystemLogs 分頁)
  async pushLogToGoogleSheet(log: SystemLogEntry) {
    const scriptUrl = this.getAppsScriptUrl();
    if (!scriptUrl) return;

    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'add_log',
          log,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn('Failed to push log to Apps Script', e);
    }
  },

  // 清空 Google Sheet 上的 SystemLogs 分頁
  async clearLogsFromGoogleSheet() {
    const scriptUrl = this.getAppsScriptUrl();
    if (!scriptUrl) return;

    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'clear_logs',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn('Failed to clear logs on Apps Script', e);
    }
  },
};
