export type Category = 'work' | 'personal' | 'health' | 'learning' | 'other';
export type Priority = 'high' | 'medium' | 'low';
export type ViewMode = 'day' | 'week';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: Category;
  description?: string;
  focusedSeconds: number;
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
}

export interface ActiveTimer {
  eventId: string;
  startedAt: number; // Date.now() when last started/resumed
  baseElapsed: number; // seconds accumulated before last resume
  isRunning: boolean;
  mode: 'normal' | 'pomodoro';
}

export interface AppState {
  events: CalendarEvent[];
  todos: Todo[];
  activeTimer: ActiveTimer | null;
  viewMode: ViewMode;
  currentDate: string; // YYYY-MM-DD
  darkMode: boolean;
}

export type AppAction =
  | { type: 'ADD_EVENT'; event: CalendarEvent }
  | { type: 'UPDATE_EVENT'; event: CalendarEvent }
  | { type: 'DELETE_EVENT'; id: string }
  | { type: 'ADD_TODO'; todo: Todo }
  | { type: 'UPDATE_TODO'; todo: Todo }
  | { type: 'DELETE_TODO'; id: string }
  | { type: 'START_TIMER'; eventId: string; mode: 'normal' | 'pomodoro'; baseElapsed?: number }
  | { type: 'PAUSE_TIMER' }
  | { type: 'RESUME_TIMER' }
  | { type: 'STOP_TIMER'; focusedSeconds: number }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'SET_CURRENT_DATE'; date: string }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'LOAD_STATE'; state: Partial<Omit<AppState, 'currentDate'>> };
