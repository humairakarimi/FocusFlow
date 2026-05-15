'use client';

import { useApp } from '@/context/AppContext';
import {
  formatDate, addDays, getWeekDays, getWeekRange, formatDisplayDate,
  formatDuration, getTodayFocusedSeconds, getCompletedTodayCount,
} from '@/lib/utils';

export default function TopNav({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { state, dispatch } = useApp();
  const { viewMode, currentDate, darkMode } = state;

  const weekDays = getWeekDays(currentDate);
  const todayFocused = getTodayFocusedSeconds(state);
  const completedCount = getCompletedTodayCount(state);
  const activeEvent = state.activeTimer
    ? state.events.find(e => e.id === state.activeTimer!.eventId)
    : null;

  const goToday = () => dispatch({ type: 'SET_CURRENT_DATE', date: formatDate(new Date()) });

  const goPrev = () => {
    dispatch({
      type: 'SET_CURRENT_DATE',
      date: viewMode === 'day' ? addDays(currentDate, -1) : addDays(weekDays[0], -7),
    });
  };

  const goNext = () => {
    dispatch({
      type: 'SET_CURRENT_DATE',
      date: viewMode === 'day' ? addDays(currentDate, 1) : addDays(weekDays[0], 7),
    });
  };

  const dateLabel = viewMode === 'week'
    ? getWeekRange(weekDays)
    : formatDisplayDate(currentDate);

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3 bg-white dark:bg-gray-900 shrink-0 z-20">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-lg hidden sm:block">FocusFlow</span>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
        >
          Today
        </button>
        <button
          onClick={goPrev}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={goNext}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="text-base font-semibold text-gray-800 dark:text-gray-100 ml-1 hidden sm:block">
          {dateLabel}
        </span>
      </div>

      {/* View toggle */}
      <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ml-1">
        {(['day', 'week'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode })}
            className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              viewMode === mode
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Stats */}
      <div className="hidden md:flex items-center gap-4">
        {/* Active task */}
        {activeEvent && (
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 max-w-[120px] truncate">
              {activeEvent.title}
            </span>
          </div>
        )}

        {/* Completed today */}
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{completedCount}</span>
          <span className="text-gray-400 hidden lg:block">done today</span>
        </div>

        {/* Focused today */}
        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg px-3 py-1.5">
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {todayFocused > 0 ? formatDuration(todayFocused) : '0m'}
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 hidden lg:block">focused</span>
        </div>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
      >
        {darkMode ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M18.364 18.364l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </header>
  );
}
