export type AttendanceStatus = 'attending' | 'declined' | 'pending';

export interface Member {
  id: string;
  name: string;
  role?: string; // e.g. "社員", "幹事", "社長"
  isCore: boolean;
}

export interface AttendanceRecord {
  memberId: string;
  memberName: string;
  status: AttendanceStatus;
  note?: string; // e.g. "遲到30分鐘", "自備急救包"
  updatedAt: string;
}

export interface ClubEvent {
  id: string;
  title: string;
  dateStr: string; // e.g. "2026-10-24" or "24 Oct" or "31 Oct - 1 Nov"
  timeStr?: string; // e.g. "09:00 - 17:00"
  location: string;
  description?: string;
  category?: 'st_john' | 'service' | 'meeting' | 'social' | 'other';
  createdBy?: string;
  createdAt: string;
  attendance: Record<string, AttendanceRecord>; // memberId -> AttendanceRecord
  customGuests?: AttendanceRecord[]; // non-roster guests
}

export interface ClubData {
  clubName: string;
  clubCode: string;
  secretToken: string;
  members: Member[];
  events: ClubEvent[];
  updatedAt: string;
}
