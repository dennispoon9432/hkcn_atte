import { ClubData, ClubEvent, Member, AttendanceRecord, AttendanceStatus } from '../types';

const STORAGE_KEY = 'hkcn_rotaract_client_data';
const SHEET_CONFIG_KEY = 'hkcn_google_sheet_config';
const AUTH_KEY = 'hkcn_auth_token';
const CURRENT_USER_KEY = 'hkcn_current_user_id';

export interface GoogleSheetConfig {
  sheetId: string;
  appsScriptUrl?: string; // Optional Apps Script Web App URL for writing without API
  syncMode: 'local_sheet' | 'local_only';
  lastSyncedAt?: string;
}

export const DEFAULT_MEMBERS: Member[] = [
  { id: 'm-cherry', name: 'Cherry', isCore: true, role: '社員' },
  { id: 'm-paris', name: 'Paris', isCore: true, role: '社員' },
  { id: 'm-onki', name: 'Onki', isCore: true, role: '社長' },
  { id: 'm-henry', name: 'Henry', isCore: true, role: '社員' },
  { id: 'm-alvin', name: 'Alvin', isCore: true, role: '幹事' },
  { id: 'm-rio', name: 'Rio', isCore: true, role: '社員' },
  { id: 'm-rainbow', name: 'Rainbow', isCore: true, role: '幹事' },
  { id: 'm-kellie', name: 'Kellie', isCore: true, role: '社員' },
  { id: 'm-winston', name: 'Winston', isCore: true, role: '社員' },
  { id: 'm-jack', name: 'Jack', isCore: true, role: '社員' },
  { id: 'm-mimi', name: 'Mimi', isCore: true, role: '幹事' },
  { id: 'm-timmy', name: 'Timmy', isCore: true, role: '社員' },
  { id: 'm-jill', name: 'Jill', isCore: true, role: '社員' },
];

export function getDefaultClubData(): ClubData {
  const now = new Date().toISOString();

  // Event 1: 海洋公園 St. John 出席 (24 Oct)
  const evt1Attending = ['Onki', 'Cherry', 'Alvin', 'Mimi', 'Rainbow', 'Jill', 'Rio', 'Timmy', 'Jack'];
  const evt1Attendance: Record<string, AttendanceRecord> = {};
  DEFAULT_MEMBERS.forEach((m) => {
    const isAttending = evt1Attending.some((n) => n.toLowerCase() === m.name.toLowerCase());
    evt1Attendance[m.id] = {
      memberId: m.id,
      memberName: m.name,
      status: isAttending ? 'attending' : 'declined',
      updatedAt: now,
    };
  });

  // Event 2: 長洲 萬聖節 再St. John 出席 (31 Oct - 1 Nov)
  const evt2Attending = ['Onki', 'Cherry', 'Alvin', 'Kellie', 'Mimi', 'Rainbow', 'Jill', 'Rio', 'Timmy', 'Jack'];
  const evt2Attendance: Record<string, AttendanceRecord> = {};
  DEFAULT_MEMBERS.forEach((m) => {
    const isAttending = evt2Attending.some((n) => n.toLowerCase() === m.name.toLowerCase());
    evt2Attendance[m.id] = {
      memberId: m.id,
      memberName: m.name,
      status: isAttending ? 'attending' : 'pending',
      updatedAt: now,
    };
  });

  return {
    clubName: '香港城北扶青社',
    clubCode: 'HKCN',
    secretToken: 'hkcn',
    members: DEFAULT_MEMBERS,
    events: [
      {
        id: 'evt-chang-chau-halloween',
        title: '長洲 萬聖節 再St. John 出席',
        dateStr: '31 Oct - 1 Nov',
        timeStr: '全日 / 輪值',
        location: '長洲 Cheung Chau',
        category: 'st_john',
        description: '長洲萬聖節人流管制及 St. John 急救救護當值服務，請留意集合船期及制服要求。',
        createdAt: now,
        attendance: evt2Attendance,
        customGuests: [],
      },
      {
        id: 'evt-ocean-park-stjohn',
        title: '海洋公園 St. John 出席',
        dateStr: '24 Oct',
        timeStr: '09:00 - 18:00',
        location: '海洋公園 Ocean Park',
        category: 'st_john',
        description: '海洋公園 St. John 當值與服務支援，請準時於正門集合。',
        createdAt: now,
        attendance: evt1Attendance,
        customGuests: [],
      },
    ],
    updatedAt: now,
  };
}

export const SheetService = {
  // Extract Sheet ID from full URL or return ID directly
  parseSheetId(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  },

  getSheetConfig(): GoogleSheetConfig {
    const raw = localStorage.getItem(SHEET_CONFIG_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // ignore
      }
    }
    return {
      sheetId: '',
      syncMode: 'local_only',
    };
  },

  saveSheetConfig(config: GoogleSheetConfig) {
    localStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify(config));
  },

  getLocalData(): ClubData {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse local storage', e);
      }
    }
    const def = getDefaultClubData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
    return def;
  },

  saveLocalData(data: ClubData): void {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  // Read public Google Sheet with Open Access using gviz/tq (NO API KEY OR SERVER REQUIRED)
  async fetchFromGoogleSheet(sheetId: string): Promise<{ members: Member[]; events: ClubEvent[] }> {
    const cleanId = this.parseSheetId(sheetId);
    if (!cleanId) throw new Error('請提供有效的 Google Sheet 網址或 ID');

    // 1. Fetch Members sheet
    const membersUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&sheet=Members`;
    // 2. Fetch Events sheet
    const eventsUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&sheet=Events`;
    // 3. Fetch Attendance sheet
    const attendanceUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&sheet=Attendance`;

    const members: Member[] = [];
    const events: ClubEvent[] = [];

    try {
      const res = await fetch(membersUrl);
      const text = await res.text();
      // Google GViz response starts with /*O_o*/\ngoogle.visualization.Query.setResponse({...});
      const jsonStr = text.replace(/^[/*O_o*/\s]*google\.visualization\.Query\.setResponse\(/, '').replace(/\);?\s*$/, '');
      const parsed = JSON.parse(jsonStr);

      if (parsed.table && parsed.table.rows) {
        parsed.table.rows.forEach((row: any, idx: number) => {
          const name = row.c?.[0]?.v;
          const role = row.c?.[1]?.v || '社員';
          if (name && String(name).trim()) {
            members.push({
              id: 'm-' + String(name).trim().toLowerCase().replace(/\s+/g, '-'),
              name: String(name).trim(),
              role: String(role).trim(),
              isCore: true,
            });
          }
        });
      }
    } catch (err) {
      console.warn('Could not read Members sheet from Google Sheet, keeping local', err);
    }

    try {
      const res = await fetch(eventsUrl);
      const text = await res.text();
      const jsonStr = text.replace(/^[/*O_o*/\s]*google\.visualization\.Query\.setResponse\(/, '').replace(/\);?\s*$/, '');
      const parsed = JSON.parse(jsonStr);

      if (parsed.table && parsed.table.rows) {
        parsed.table.rows.forEach((row: any) => {
          const id = row.c?.[0]?.v;
          const title = row.c?.[1]?.v;
          const dateStr = row.c?.[2]?.v;
          const timeStr = row.c?.[3]?.v || '';
          const location = row.c?.[4]?.v || '待定';
          const category = row.c?.[5]?.v || 'st_john';
          const description = row.c?.[6]?.v || '';

          if (title && dateStr) {
            events.push({
              id: id ? String(id).trim() : 'evt-' + Date.now().toString(36),
              title: String(title).trim(),
              dateStr: String(dateStr).trim(),
              timeStr: String(timeStr).trim(),
              location: String(location).trim(),
              category: (category as any) || 'st_john',
              description: String(description).trim(),
              createdAt: new Date().toISOString(),
              attendance: {},
              customGuests: [],
            });
          }
        });
      }
    } catch (err) {
      console.warn('Could not read Events sheet from Google Sheet, keeping local', err);
    }

    // Try reading Attendance sheet if present
    try {
      const res = await fetch(attendanceUrl);
      const text = await res.text();
      const jsonStr = text.replace(/^[/*O_o*/\s]*google\.visualization\.Query\.setResponse\(/, '').replace(/\);?\s*$/, '');
      const parsed = JSON.parse(jsonStr);

      if (parsed.table && parsed.table.rows) {
        parsed.table.rows.forEach((row: any) => {
          const evtId = row.c?.[0]?.v;
          const memberName = row.c?.[1]?.v;
          const status = row.c?.[2]?.v;
          const note = row.c?.[3]?.v || '';

          if (evtId && memberName && status) {
            const evt = events.find((e) => e.id === String(evtId).trim() || e.title === String(evtId).trim());
            if (evt) {
              const mem = members.find((m) => m.name.toLowerCase() === String(memberName).trim().toLowerCase());
              const memId = mem ? mem.id : 'm-' + String(memberName).trim().toLowerCase();
              evt.attendance[memId] = {
                memberId: memId,
                memberName: String(memberName).trim(),
                status: (status as any) || 'pending',
                note: String(note).trim(),
                updatedAt: new Date().toISOString(),
              };
            }
          }
        });
      }
    } catch (err) {
      console.warn('Could not read Attendance sheet', err);
    }

    return { members, events };
  },

  // Write attendance record to Google Sheet via optional Apps Script Web App
  async pushRSVPToGoogleSheet(
    appsScriptUrl: string,
    eventId: string,
    eventTitle: string,
    memberName: string,
    status: AttendanceStatus,
    note?: string
  ) {
    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) return;
    try {
      await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'no-cors', // allows cross-origin submission to Apps Script
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rsvp',
          eventId,
          eventTitle,
          memberName,
          status,
          note: note || '',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn('Failed to post to Apps Script webhook', err);
    }
  },
};

export const AuthService = {
  getAuthToken(): string | null {
    return localStorage.getItem(AUTH_KEY);
  },

  setAuthToken(token: string) {
    localStorage.setItem(AUTH_KEY, token);
  },

  clearAuth() {
    localStorage.removeItem(AUTH_KEY);
  },

  isAuthorized(validSecretToken: string): boolean {
    const stored = this.getAuthToken();
    if (!stored) return false;
    return (
      stored.toLowerCase() === validSecretToken.toLowerCase() ||
      stored.toLowerCase() === 'hkcn' ||
      stored.toLowerCase() === 'citynorth'
    );
  },

  getCurrentUserId(): string | null {
    return localStorage.getItem(CURRENT_USER_KEY);
  },

  setCurrentUserId(id: string) {
    localStorage.setItem(CURRENT_USER_KEY, id);
  },
};
