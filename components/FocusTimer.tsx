'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  getTimerElapsed, getPomodoroInfo, getFocusedSecondsFromElapsed,
  formatTimerDisplay, formatDuration, categoryColors,
} from '@/lib/utils';

function playChime() {
  if (typeof window === 'undefined') return;
  try {
    type WinWithAudio = Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const w = window as WinWithAudio;
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [[523.25, 0], [659.25, 0.2], [783.99, 0.38]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.55);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.55);
    });
  } catch { /* ignore */ }
}

function sendPhaseNotification(phase: 'focus' | 'break', round: number) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification('FocusFlow', {
    body: phase === 'break'
      ? `🎉 Round ${round} complete — take a 5-min break!`
      : `⏰ Break over — round ${round} starting. Let's go!`,
    icon: '/favicon.ico',
  });
}

export default function FocusTimer() {
  const { state, dispatch } = useApp();
  const { activeTimer, events } = state;

  const [elapsed, setElapsed] = useState(0);
  const prevPhaseRef = useRef<'focus' | 'break' | null>(null);

  // Reset phase tracking when timer identity changes
  useEffect(() => {
    prevPhaseRef.current = null;
  }, [activeTimer?.eventId, activeTimer?.mode]);

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

  // Detect Pomodoro phase transitions and fire notification + chime
  if (isPomodoro && pomInfo) {
    const curr = pomInfo.phase;
    const prev = prevPhaseRef.current;
    if (prev !== null && prev !== curr && activeTimer.isRunning) {
      playChime();
      sendPhaseNotification(curr, pomInfo.round);
    }
    prevPhaseRef.current = curr;
  }

  const displayTime = isPomodoro ? formatTimerDisplay(pomInfo!.remaining) : formatTimerDisplay(elapsed);
  const focusedSecs = getFocusedSecondsFromElapsed(elapsed, activeTimer.mode);

  const handleStop = () => dispatch({ type: 'STOP_TIMER', focusedSeconds: focusedSecs });
  const handlePauseResume = () => dispatch({ type: activeTimer.isRunning ? 'PAUSE_TIMER' : 'RESUME_TIMER' });

  const switchMode = (mode: 'normal' | 'pomodoro') => {
    if (activeTimer.mode === mode) return;
    // Request notification permission from within a click handler (browser requirement)
    if (mode === 'pomodoro' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    dispatch({ type: 'START_TIMER', eventId: activeTimer.eventId, mode, baseElapsed: elapsed });
  };

  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const progress = pomInfo?.progress ?? 0;
  const strokeDashoffset = circ * (1 - progress);
  const phaseColor = pomInfo?.phase === 'break' ? '#10B981' : colors.bg;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4 pointer-events-none">
      <div
        className="pointer-events-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700 overflow-hidden transition-all"
        style={{ borderTop: `3px solid ${phaseColor}` }}
      >
        <div className="px-4 py-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 transition-all ${activeTimer.isRunning ? 'animate-pulse' : 'opacity-50'}`}
                style={{ backgroundColor: phaseColor }}
              />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">
                {event?.title ?? 'Focus Session'}
              </span>
            </div>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[10px] font-bold shrink-0">
              <button
                onClick={() => switchMode('normal')}
                className={`px-2 py-1 transition-colors ${activeTimer.mode === 'normal' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                Normal
              </button>
              <button
                onClick={() => switchMode('pomodoro')}
                className={`px-2 py-1 transition-colors ${activeTimer.mode === 'pomodoro' ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                🍅 25/5
              </button>
            </div>
          </div>

          {/* Main area */}
          <div className="flex items-center gap-4">
            {isPomodoro ? (
              <div className="relative w-16 h-16 shrink-0">
                <svg className="-rotate-90 w-16 h-16" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r={radius} fill="none" stroke={phaseColor + '25'} strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r={radius} fill="none" stroke={phaseColor} strokeWidth="5"
                    strokeDasharray={circ} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round" className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold text-gray-900 dark:text-white leading-none tabular-nums">{displayTime}</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5" style={{ color: phaseColor }}>
                    {pomInfo!.phase}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 shrink-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700/60 rounded-xl">
                <span className="text-lg font-bold text-gray-900 dark:text-white leading-none tabular-nums">{displayTime}</span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">elapsed</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                {isPomodoro
                  ? `Round ${pomInfo!.round} · Focused ${formatDuration(focusedSecs)}`
                  : focusedSecs > 0 ? `Focused: ${formatDuration(focusedSecs)}` : 'Timer running…'
                }
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseResume}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                >
                  {activeTimer.isRunning ? (
                    <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>Pause</>
                  ) : (
                    <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Resume</>
                  )}
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
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
