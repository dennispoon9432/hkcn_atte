import { SimpleEvent, AttendanceChoice, SystemLogEntry } from '../types';
import {
  HARDCODED_GOOGLE_SHEET_ID,
  HARDCODED_APPS_SCRIPT_URL,
  CORE_MEMBERS,
  SECRET_ACCESS_KEY,
} from '../config';

const STORAGE_KEY = 'hkcn_simple_events_v5';
const USER_KEY = 'hkcn_active_member';
const AUTH_KEY = 'hkcn_auth_granted';
const SCRIPT_URL_KEY = 'hkcn_apps_script_url';
const LOGS_KEY = 'hkcn_system_logs_v1';

export const INITIAL_EVENTS: SimpleEvent[] = [
  {
    id: 'evt-chang-chau',
    title: '長洲 萬聖節 再St. John 出席',
    dateTime: '31 Oct - 1 Nov (全日 / 輪值)',
    createdAt: new Date().toISOString(),
    attendance: {
      Onki: 'attending',
      Cherry: 'attending',
      Alvin: 'attending',
      Kellie: 'attending',
      Mimi: 'late_early',
      Rainbow: 'attending',
      Jill: 'attending',
      Rio: 'attending',
      Timmy: 'attending',
      Jack: 'attending',
      Paris: 'tbc',
      Henry: 'declined',
      Winston: 'declined',
    },
    remarks: {
      Mimi: '15:00先到',
    },
  },
  {
    id: 'evt-ocean-park',
    title: '海洋公園 St. John 出席',
    dateTime: '24 Oct 09:00 - 18:00',
    createdAt: new Date().toISOString(),
    attendance: {
      Onki: 'attending',
      Cherry: 'attending',
      Alvin: 'late_early',
      Mimi: 'attending',
      Rainbow: 'attending',
      Jill: 'attending',
      Rio: 'attending',
      Timmy: 'attending',
      Jack: 'attending',
      Paris: 'declined',
      Henry: 'declined',
      Kellie: 'tbc',
      Winston: 'tbc',
    },
    remarks: {
      Alvin: '17:00需早走',
    },
  },
];

export const INITIAL_LOGS: SystemLogEntry[] = [
  {
    id: 'log-init-1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    actionType: 'create',
    title: '新增活動',
    detail: '初始化活動「長洲 萬聖節 再St. John 出席」',
  },
  {
    id: 'log-init-2',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    actionType: 'rsvp',
    title: '出席登記',
    memberName: 'Mimi',
    detail: 'Mimi 於「長洲 萬聖節」登記：遲到早退 (15:00先到)',
  },
  {
    id: 'log-init-3',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    actionType: 'rsvp',
    title: '出席登記',
    memberName: 'Alvin',
    detail: 'Alvin 於「海洋公園」登記：遲到早退 (17:00需早走)',
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

  getEvents(): SimpleEvent[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EVENTS));
    return INITIAL_EVENTS;
  },

  saveEvents(events: SimpleEvent[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  },

  // 系統操作日誌 (System Log)
  getLogs(): SystemLogEntry[] {
    const raw = localStorage.getItem(LOGS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    localStorage.setItem(LOGS_KEY, JSON.stringify(INITIAL_LOGS));
    return INITIAL_LOGS;
  },

  addLog(entry: Omit<SystemLogEntry, 'id' | 'timestamp'>): SystemLogEntry {
    const logs = this.getLogs();
    const newLog: SystemLogEntry = {
      id: 'log-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const updated = [newLog, ...logs].slice(0, 150);
    localStorage.setItem(LOGS_KEY, JSON.stringify(updated));
    return newLog;
  },

  clearLogs(): void {
    localStorage.setItem(LOGS_KEY, JSON.stringify([]));
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

  // 核心：從 Google Sheet 同步最新數據
  async syncFromGoogleSheet(): Promise<SimpleEvent[] | null> {
    const scriptUrl = this.getAppsScriptUrl();

    // 優先：透過 Apps Script Web App 讀取 Google Sheet
    if (scriptUrl) {
      try {
        const fetchUrl = scriptUrl + (scriptUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        const res = await fetch(fetchUrl);
        const data = await res.json();
        if (data && data.status === 'success' && Array.isArray(data.events)) {
          if (data.events.length > 0) {
            this.saveEvents(data.events);
            return data.events;
          } else {
            // Google Sheet 目前仍是空的，自動將初始活動寫入 Google Sheet
            const initial = this.getEvents();
            if (initial && initial.length > 0) {
              this.pushAllEventsToGoogleSheet(initial);
              return initial;
            }
          }
        }
      } catch (e) {
        console.warn('Apps script fetch failed', e);
      }
    }

    // 備用：若 Apps Script 暫時不可用，嘗試從公開 Gviz API 讀取
    if (HARDCODED_GOOGLE_SHEET_ID) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${HARDCODED_GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&t=${Date.now()}`;
        const res = await fetch(gvizUrl);
        const text = await res.text();
        const jsonStr = text
          .replace(/^[/*O_o*/\s]*google\.visualization\.Query\.setResponse\(/, '')
          .replace(/\);?\s*$/, '');
        const parsed = JSON.parse(jsonStr);

        if (parsed.table && parsed.table.rows && parsed.table.rows.length > 0) {
          const events: SimpleEvent[] = [];
          parsed.table.rows.forEach((row: any, i: number) => {
            const id = row.c?.[0]?.v || 'sheet-evt-' + i;
            const title = row.c?.[1]?.v || row.c?.[0]?.v;
            const dateTime = row.c?.[2]?.v || row.c?.[1]?.v || '待定';
            let attendance: Record<string, AttendanceChoice> = {};
            let remarks: Record<string, string> = {};

            if (row.c?.[3]?.v) {
              try {
                const rawParsed = JSON.parse(String(row.c[3].v));
                if (rawParsed.attendance) {
                  attendance = rawParsed.attendance;
                  remarks = rawParsed.remarks || {};
                } else {
                  attendance = rawParsed;
                }
              } catch (e) {}
            }

            if (title && String(title) !== '活動名稱 (Title)') {
              events.push({
                id: String(id),
                title: String(title).trim(),
                dateTime: String(dateTime).trim(),
                attendance,
                remarks,
                createdAt: new Date().toISOString(),
              });
            }
          });

          if (events.length > 0) {
            this.saveEvents(events);
            return events;
          }
        }
      } catch (e) {
        console.log('Gviz fallback error', e);
      }
    }

    return null;
  },

  // 核心：即時將變更（新增、編輯、刪除、RSVP）推送到 Google Sheet
  async pushAllEventsToGoogleSheet(events: SimpleEvent[]): Promise<boolean> {
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
          timestamp: new Date().toISOString(),
        }),
      });
      return true;
    } catch (e) {
      console.warn('Failed to push events to Apps Script', e);
      return false;
    }
  },

  // 單獨更新某一項 RSVP
  async pushRSVP(
    eventTitle: string,
    memberName: string,
    choice: AttendanceChoice,
    remark: string | undefined,
    events: SimpleEvent[]
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
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn('Apps script post error', e);
    }
  },
};
