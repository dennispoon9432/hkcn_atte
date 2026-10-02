import { SimpleEvent, AttendanceChoice } from '../types';
import {
  HARDCODED_GOOGLE_SHEET_ID,
  HARDCODED_APPS_SCRIPT_URL,
  CORE_MEMBERS,
  SECRET_ACCESS_KEY,
} from '../config';

const STORAGE_KEY = 'hkcn_simple_events_v2';
const USER_KEY = 'hkcn_active_member';
const AUTH_KEY = 'hkcn_auth_granted';

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
      Mimi: 'attending',
      Rainbow: 'attending',
      Jill: 'attending',
      Rio: 'attending',
      Timmy: 'attending',
      Jack: 'attending',
      Paris: 'tbc',
      Henry: 'declined',
      Winston: 'declined',
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
      Alvin: 'attending',
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
  },
];

export const StorageService = {
  getEvents(): SimpleEvent[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
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

  getActiveUser(): string | null {
    return localStorage.getItem(USER_KEY);
  },

  setActiveUser(name: string): void {
    localStorage.setItem(USER_KEY, name);
  },

  isAuthValid(): boolean {
    // Check URL param first
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key') || params.get('token');
    if (key && (key.toLowerCase() === SECRET_ACCESS_KEY.toLowerCase() || key.toLowerCase() === 'hkcn')) {
      localStorage.setItem(AUTH_KEY, 'true');
      return true;
    }
    return localStorage.getItem(AUTH_KEY) === 'true';
  },

  setAuthPassed(): void {
    localStorage.setItem(AUTH_KEY, 'true');
  },

  // Read from the hardcoded Google Sheet if available
  async syncFromGoogleSheet(): Promise<SimpleEvent[] | null> {
    if (!HARDCODED_GOOGLE_SHEET_ID) return null;
    const url = `https://docs.google.com/spreadsheets/d/${HARDCODED_GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=Events`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const jsonStr = text
        .replace(/^[/*O_o*/\s]*google\.visualization\.Query\.setResponse\(/, '')
        .replace(/\);?\s*$/, '');
      const parsed = JSON.parse(jsonStr);

      if (parsed.table && parsed.table.rows && parsed.table.rows.length > 0) {
        const events: SimpleEvent[] = [];
        parsed.table.rows.forEach((row: any, i: number) => {
          const title = row.c?.[0]?.v || row.c?.[1]?.v;
          const dateTime = row.c?.[1]?.v || row.c?.[2]?.v || '待定';
          if (title) {
            events.push({
              id: 'sheet-evt-' + i,
              title: String(title).trim(),
              dateTime: String(dateTime).trim(),
              attendance: {},
              createdAt: new Date().toISOString(),
            });
          }
        });
        if (events.length > 0) {
          return events;
        }
      }
    } catch (e) {
      console.log('Google sheet read fallback to local cache');
    }
    return null;
  },

  // Push RSVP to hardcoded Apps Script if configured
  async pushRSVP(eventTitle: string, memberName: string, choice: AttendanceChoice) {
    if (!HARDCODED_APPS_SCRIPT_URL) return;
    try {
      await fetch(HARDCODED_APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rsvp',
          eventTitle,
          memberName,
          choice,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn('Apps script post error', e);
    }
  },

  generateWhatsAppText(event: SimpleEvent, secretLink: string): string {
    const attending: string[] = [];
    const declined: string[] = [];
    const tbc: string[] = [];

    CORE_MEMBERS.forEach((m) => {
      const status = event.attendance[m];
      if (status === 'attending') attending.push(m);
      else if (status === 'declined') declined.push(m);
      else tbc.push(m);
    });

    return `【香港城北扶青社 - 活動出席】
📌 活動：${event.title}
⏰ 日期時間：${event.dateTime}

🟢 去到 (${attending.length}人)：
${attending.map((n) => `@${n}`).join(' ') || '（暫無）'}

🔴 去唔到 (${declined.length}人)：
${declined.map((n) => `@${n}`).join(' ') || '（暫無）'}

🟡 TBC (${tbc.length}人)：
${tbc.map((n) => `@${n}`).join(' ') || '（暫無）'}

🔗 專屬登記連結：
${secretLink}`;
  },
};
