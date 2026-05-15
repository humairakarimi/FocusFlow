import type { Category, Priority, ActiveTimer, AppState } from '@/types';

export function generateId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function getWeekDays(dateStr: string): string[] {
  const date = parseDate(dateStr);
  const day = date.getDay(); // 0=Sunday
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return formatDate(d);
  });
}

export function getWeekRange(weekDays: string[]): string {
  const first = parseDate(weekDays[0]);
  const last = parseDate(weekDays[6]);
  const opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  if (first.getMonth() === last.getMonth()) {
    return first.toLocaleDateString('en-US', opts);
  }
  return `${first.toLocaleDateString('en-US', { month: 'short' })} – ${last.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

export function formatDayHeader(dateStr: string): { short: string; num: number } {
  const date = parseDate(dateStr);
  return {
    short: date.toLocaleDateString('en-US', { weekday: 'short' }),
    num: date.getDate(),
  };
}

export function formatDisplayDate(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTimerDisplay(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60).toString().padStart(2, '0');
  const s = (Math.abs(seconds) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date());
}

export function getMonthCalendar(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(formatDate(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Calendar layout constants
export const HOUR_HEIGHT = 64; // px
export const START_HOUR = 6;
export const END_HOUR = 23;
export const TOTAL_HOURS = END_HOUR - START_HOUR;

export function getEventPosition(startTime: string, endTime: string) {
  const startMins = timeToMinutes(startTime) - START_HOUR * 60;
  const endMins = timeToMinutes(endTime) - START_HOUR * 60;
  const top = Math.max(0, (startMins / 60) * HOUR_HEIGHT);
  const height = Math.max(20, ((endMins - startMins) / 60) * HOUR_HEIGHT);
  return { top, height };
}

export interface EventLayout {
  event: import('@/types').CalendarEvent;
  left: number; // 0–1
  width: number; // 0–1
}

export function layoutDayEvents(events: import('@/types').CalendarEvent[]): EventLayout[] {
  if (!events.length) return [];
  const sorted = [...events].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  return sorted.map(event => {
    const startA = timeToMinutes(event.startTime);
    const endA = timeToMinutes(event.endTime);
    const overlapping = sorted.filter(other => {
      const s = timeToMinutes(other.startTime);
      const e = timeToMinutes(other.endTime);
      return s < endA && e > startA;
    });
    const col = overlapping.findIndex(e => e.id === event.id);
    return { event, left: col / overlapping.length, width: 1 / overlapping.length };
  });
}

// Category colors
export const categoryColors: Record<Category, { bg: string; text: string; light: string; border: string }> = {
  work:     { bg: '#3B82F6', text: '#1D4ED8', light: '#EFF6FF', border: '#2563EB' },
  personal: { bg: '#10B981', text: '#047857', light: '#ECFDF5', border: '#059669' },
  health:   { bg: '#F59E0B', text: '#B45309', light: '#FFFBEB', border: '#D97706' },
  learning: { bg: '#8B5CF6', text: '#6D28D9', light: '#F5F3FF', border: '#7C3AED' },
  other:    { bg: '#6B7280', text: '#374151', light: '#F9FAFB', border: '#4B5563' },
};

export const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: '#EF4444', bg: '#FEF2F2' },
  medium: { label: 'Med',    color: '#F59E0B', bg: '#FFFBEB' },
  low:    { label: 'Low',    color: '#10B981', bg: '#ECFDF5' },
};

// Timer helpers
export function getTimerElapsed(timer: ActiveTimer): number {
  if (timer.isRunning) {
    return timer.baseElapsed + Math.floor((Date.now() - timer.startedAt) / 1000);
  }
  return timer.baseElapsed;
}

export function getPomodoroInfo(elapsed: number) {
  const focusDuration = 25 * 60;
  const breakDuration = 5 * 60;
  const roundDuration = focusDuration + breakDuration;
  const posInRound = elapsed % roundDuration;
  const round = Math.floor(elapsed / roundDuration) + 1;
  if (posInRound < focusDuration) {
    return {
      phase: 'focus' as const,
      remaining: focusDuration - posInRound,
      progress: posInRound / focusDuration,
      round,
    };
  }
  const breakElapsed = posInRound - focusDuration;
  return {
    phase: 'break' as const,
    remaining: breakDuration - breakElapsed,
    progress: breakElapsed / breakDuration,
    round,
  };
}

export function getFocusedSecondsFromElapsed(elapsed: number, mode: 'normal' | 'pomodoro'): number {
  if (mode === 'normal') return elapsed;
  const focusDuration = 25 * 60;
  const breakDuration = 5 * 60;
  const roundDuration = focusDuration + breakDuration;
  const completedRounds = Math.floor(elapsed / roundDuration);
  const posInRound = elapsed % roundDuration;
  return completedRounds * focusDuration + Math.min(posInRound, focusDuration);
}

export function getTodayFocusedSeconds(state: AppState): number {
  const today = formatDate(new Date());
  const fromEvents = state.events
    .filter(e => e.date === today)
    .reduce((sum, e) => sum + e.focusedSeconds, 0);
  if (!state.activeTimer) return fromEvents;
  const activeEvent = state.events.find(e => e.id === state.activeTimer!.eventId);
  if (!activeEvent || activeEvent.date !== today) return fromEvents;
  const elapsed = getTimerElapsed(state.activeTimer);
  return fromEvents + getFocusedSecondsFromElapsed(elapsed, state.activeTimer.mode);
}

export function getCompletedTodayCount(state: AppState): number {
  const today = formatDate(new Date());
  return (
    state.events.filter(e => e.date === today && e.completed).length +
    state.todos.filter(t => t.completed).length
  );
}
