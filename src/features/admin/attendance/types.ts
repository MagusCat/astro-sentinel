export interface AttendanceRow {
  id: string
  clientId: string
  clientName: string
  classId: string
  className: string
  sessionId: string | null
  checkedInAt: string
}

export interface TodaySession {
  id: string
  classId: string
  className: string
  teacherName: string | null
  startTime: string
  endTime: string
  capacity: number | null // null = sin límite
  accessMode: 'open' | 'roster'
  isPaused: boolean
  attendees: number
}

export interface TodayAttendance {
  rows: AttendanceRow[]
  sessions: TodaySession[]
}
