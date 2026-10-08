import { SimpleEvent, AttendanceChoice, SystemLogEntry } from '../types';
import {
  HARDCODED_GOOGLE_SHEET_ID,
  HARDCODED_APPS_SCRIPT_URL,
  SECRET_ACCESS_KEY,
} from '../config';

const STORAGE_KEY = 'hkcn_simple_events_clean_v2';
const USER_KEY = 'hkcn_active_member';
const AUTH_KEY = 'hkcn_auth_granted';
const SCRIPT_URL_KEY = 'hkcn_apps_script_url';
const LOGS_KEY = 'hkcn_system_logs_clean_v2';

// 預設已還原的真實活動與出席名冊 (防止離線或首次加載為空)
export const INITIAL_EVENTS: SimpleEvent[] = [
  {
    id: 'evt-海洋公園-哈囉餵',
    title: '海洋公園 哈囉餵',
    dateTime: '24 Oct (Sat)',
    attendance: {
      Jill: 'attending',
      Onki: 'attending',
      Alvin: 'attending',
      Mimi: 'attending',
      Rainbow: 'tbc',
      Paris: 'declined',
      Cherry: 'tbc',
      Timmy: 'declined',
      Jack: 'declined',
      Henry: 'declined',
    },
    remarks: {
      Onki: 'yeah',
    },
    createdAt: '2026-10-02T07:03:28.101Z',
  },
  {
    id: 'evt-長洲-萬聖節-正日',
    title: '長洲 萬聖節 正日',
    dateTime: '31 Oct - 1 Nov (Sat-Sun)',
    attendance: {
      Jill: 'late_early',
      Onki: 'late_early',
      Paris: 'attending',
      Jack: 'attending',
      Alvin: 'attending',
      Mimi: 'attending',
      Cherry: 'tbc',
      Rainbow: 'late_early',
      Henry: 'tbc',
    },
    remarks: {
      Jill: '13:30 收工即飛入黎',
      Onki: '13:30 收工即飛入黎',
      Rainbow: '16:30收工即飛入嚟',
    },
    createdAt: '2026-10-02T07:03:06.431Z',
  },
];

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

  // 1. 活動資料存取
  getEvents(): SimpleEvent[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_EVENTS;
  },

  saveEvents(events: SimpleEvent[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  },

  // 2. 系統操作紀錄存取
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

  createLogEntry(entry: Omit<SystemLogEntry, 'id' | 'timestamp'>): SystemLogEntry {
    const logs = this.getLogs();
    const newLog: SystemLogEntry = {
      id: 'log-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const updated = [newLog, ...logs].slice(0, 150);
    this.saveLogs(updated);
    return newLog;
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
        key.toLowerCase() === 'citynorth')
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
          const eventsList = Array.isArray(data.events) && data.events.length > 0 ? data.events : null;
          const logsList = Array.isArray(data.logs) ? data.logs : [];

          if (eventsList) {
            this.saveEvents(eventsList);
          }
          if (logsList.length > 0) {
            this.saveLogs(logsList);
          }

          return {
            events: eventsList || this.getEvents(),
            logs: logsList.length > 0 ? logsList : this.getLogs(),
          };
        }
      } catch (e) {
        console.warn('Apps script fetch failed', e);
      }
    }

    return null;
  },

  // 單一原子請求：同步所有活動（支援帶日誌）
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

  // 單一原子請求：更新 RSVP 出席狀態（同時更新日誌，不發送並發請求）
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
};
