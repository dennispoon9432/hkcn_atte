export type AttendanceChoice = 'attending' | 'declined' | 'tbc';

export interface SimpleEvent {
  id: string;
  title: string;
  dateTime: string;
  attendance: Record<string, AttendanceChoice>; // e.g. { 'Cherry': 'attending', 'Paris': 'tbc' }
  createdAt: string;
}
