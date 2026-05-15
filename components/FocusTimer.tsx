'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  getTimerElapsed, getPomodoroInfo, getFocusedSecondsFromElapsed,
  formatTimerDisplay, formatDuration, categoryColors,
} from '@/lib/utils';
import type { ActiveTimer } from '@/types';

export default function FocusTimer() {
  const { state, dispatch } = useApp();
  const { activeTimer, events } = state;

  const [elapsed, setElapsed] = useState(0);

  // Tick every second
  useEffect(() => {
    if (!activeTimer) return;
    const update = () => setElapsed(getTimerElapsed(activeTimer));
    update();
    if (!activeTimer.isRunning) return;
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeTimer]);

  if (!activeTimer) return null;

  const event = events.find(e => e.id === activeTimer.eventId);
  const colors = event ? categoryColors[event.category] : categoryColors.work;

  const isPomodoro = activeTimer.mode === 'pomodoro';
  const pomInfo = isPomodoro ? getPomodoroInfo(elapsed) : null;
  const displayTime = isPomodoro
    ? formatTimerDisplay(pomInfo!.remaining)
    : formatTimerDisplay(elapsed);
  const focusedSecs = getFocusedSecondsFromElapsed(elapsed, activeTimer.mode);

  const handleStop = () => {
    dispatch({ type: 'STOP_TIMER', focusedSeconds: focusedSecs });
  };

  const handlePauseResume = () => {
    dispatch({ type: activeTimer.isRunning ? 'PAUSE_TIMER' : 'RESUME_TIMER' });
  };

  const switchMode = (mode: 'normal' | 'pomodoro') => {
    if (activeTimer.mode === mode) return;
    dispatch({
      type: 'START_TIMER',
      eventId: activeTimer.eventId,
      mode,
    });
  };

  // SVG progress ring
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const progress = pomInfo?.progress ?? 0;
  const strokeDashoffset = circ * (1 - progress);
  const phaseColor = pomInfo?.phase === 'break' ? '#10B981' : colors.bg;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4 pointer-events-none">
      <div
        className="pointer-events-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{ borderTop: `3px solid ${phaseColor}` }}
      >
        <div className="px-4 py-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${activeTimer.isRunning ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: phaseColor }}
              />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
                {event?.title ?? 'Focus Session'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[10px] font-semibold">
                <button
                  onClick={() => switchMode('normal')}
                  className={`px-2 py-1 transition-colors ${activeTimer.mode === 'normal' ? 'bg-indigo-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Normal
                </button>
                <button
                  onClick={() => switchMode('pomodoro')}
                  className={`px-2 py-1 transition-colors ${activeTimer.mode === 'pomodoro' ? 'bg-red-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  🍅 25/5
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex items-center gap-4">
            {/* Timer display / ring */}
            {isPomodoro ? (
              <div className="relative w-16 h-16 shrink-0">
                <svg className="-rotate-90 w-16 h-16" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r={radius}
                    fill="none"
                    stroke={phaseColor + '30'}
                    strokeWidth="5"
                  />
                  <circle
                    cx="32" cy="32" r={radius}
                    fill="none"
                    stroke={phaseColor}
                    strokeWidth="5"
                    strokeDasharray={circ}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold text-gray-900 dark:text-white leading-none">{displayTime}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: phaseColor }}>
                    {pomInfo!.phase}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 shrink-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-lg font-bold text-gray-900 dark:text-white leading-none">{displayTime}</span>
                <span className="text-[9px] text-gray-400 mt-0.5">elapsed</span>
              </div>
            )}

            {/* Info + controls */}
            <div className="flex-1 min-w-0">
              {isPomodoro && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  Round {pomInfo!.round} · Focused {formatDuration(focusedSecs)}
                </div>
              )}
              {!isPomodoro && focusedSecs > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  Focused: {formatDuration(focusedSecs)}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseResume}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                >
                  {activeTimer.isRunning ? (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Resume
                    </>
                  )}
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z" />
                  </svg>
                  Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
