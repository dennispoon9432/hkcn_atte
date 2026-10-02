export type AttendanceChoice = 'attending' | 'declined' | 'tbc' | 'late_early';

export interface SimpleEvent {
  id: string;
  title: string;
  dateTime: string;
  attendance: Record<string, AttendanceChoice>;
  remarks?: Record<string, string>; // memberName -> remark
  createdAt: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  actionType: 'rsvp' | 'create' | 'edit' | 'delete' | 'reorder';
  title: string;
  detail: string;
  memberName?: string;
}
