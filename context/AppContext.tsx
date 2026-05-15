'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppState, AppAction, ActiveTimer } from '@/types';
import { getSampleEvents, getSampleTodos } from '@/lib/sampleData';
import { formatDate, getTimerElapsed, getFocusedSecondsFromElapsed } from '@/lib/utils';

function getInitialState(): AppState {
  return {
    events: getSampleEvents(),
    todos: getSampleTodos(),
    activeTimer: null,
    viewMode: 'week',
    currentDate: formatDate(new Date()),
    darkMode: false,
  };
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.event] };

    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map(e => e.id === action.event.id ? action.event : e) };

    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter(e => e.id !== action.id),
        activeTimer: state.activeTimer?.eventId === action.id ? null : state.activeTimer,
      };

    case 'ADD_TODO':
      return { ...state, todos: [...state.todos, action.todo] };

    case 'UPDATE_TODO':
      return { ...state, todos: state.todos.map(t => t.id === action.todo.id ? action.todo : t) };

    case 'DELETE_TODO':
      return { ...state, todos: state.todos.filter(t => t.id !== action.id) };

    case 'START_TIMER':
      return {
        ...state,
        activeTimer: {
          eventId: action.eventId,
          startedAt: Date.now(),
          baseElapsed: 0,
          isRunning: true,
          mode: action.mode,
        },
      };

    case 'PAUSE_TIMER': {
      if (!state.activeTimer || !state.activeTimer.isRunning) return state;
      const elapsed = getTimerElapsed(state.activeTimer);
      return {
        ...state,
        activeTimer: { ...state.activeTimer, baseElapsed: elapsed, isRunning: false },
      };
    }

    case 'RESUME_TIMER':
      if (!state.activeTimer || state.activeTimer.isRunning) return state;
      return {
        ...state,
        activeTimer: { ...state.activeTimer, startedAt: Date.now(), isRunning: true },
      };

    case 'STOP_TIMER': {
      if (!state.activeTimer) return state;
      const { eventId } = state.activeTimer;
      return {
        ...state,
        activeTimer: null,
        events: state.events.map(e =>
          e.id === eventId ? { ...e, focusedSeconds: e.focusedSeconds + action.focusedSeconds } : e
        ),
      };
    }

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };

    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.date };

    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };

    case 'LOAD_STATE':
      return { ...state, ...action.state, currentDate: formatDate(new Date()) };

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    if (typeof window === 'undefined') return getInitialState();
    try {
      const raw = localStorage.getItem('focusflow-v1');
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AppState>;
        // If timer was running when saved, mark it paused with adjusted elapsed
        let timer = saved.activeTimer ?? null;
        if (timer?.isRunning) {
          timer = { ...timer, baseElapsed: getTimerElapsed(timer), isRunning: false };
        }
        return { ...getInitialState(), ...saved, activeTimer: timer, currentDate: formatDate(new Date()) };
      }
    } catch { /* ignore */ }
    return getInitialState();
  });

  // Persist to localStorage (throttled via useEffect)
  useEffect(() => {
    try {
      const toSave: Partial<AppState> = {
        events: state.events,
        todos: state.todos,
        darkMode: state.darkMode,
        viewMode: state.viewMode,
        // Save timer with adjusted elapsed if running
        activeTimer: state.activeTimer?.isRunning
          ? { ...state.activeTimer, baseElapsed: getTimerElapsed(state.activeTimer), isRunning: false }
          : state.activeTimer,
      };
      localStorage.setItem('focusflow-v1', JSON.stringify(toSave));
    } catch { /* ignore */ }
  }, [state]);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
