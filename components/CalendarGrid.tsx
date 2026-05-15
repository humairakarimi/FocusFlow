'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import EventBlock from './EventBlock';
import {
  getWeekDays, formatDayHeader, isToday, layoutDayEvents,
  HOUR_HEIGHT, START_HOUR, END_HOUR, TOTAL_HOURS,
  formatHourLabel, minutesToTime, timeToMinutes,
} from '@/lib/utils';
import type { CalendarEvent } from '@/types';

interface Props {
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: string, startTime: string, endTime: string) => void;
  onStartTimer: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
const TIME_COL_W = 56; // px

export default function CalendarGrid({ onEventClick, onSlotClick, onStartTimer }: Props) {
  const { state } = useApp();
  const { viewMode, currentDate, events } = state;

  const days = viewMode === 'week' ? getWeekDays(currentDate) : [currentDate];

  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowTop, setNowTop] = useState<number | null>(null);

  // Auto-scroll to current time on mount
  useEffect(() => {
    const getTop = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
      return (mins / 60) * HOUR_HEIGHT;
    };
    const top = getTop();
    setNowTop(top);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, top - 120);
    }
  }, []);

  // Update now-indicator every minute
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
      setNowTop((mins / 60) * HOUR_HEIGHT);
    };
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, date: string) => {
    // Ignore clicks on event blocks
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    const clickY = e.clientY - rect.top + scrollTop;
    const clickMins = (clickY / HOUR_HEIGHT) * 60;
    const totalMins = START_HOUR * 60 + clickMins;
    const snapped = Math.round(totalMins / 15) * 15;
    const clamped = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, snapped));
    const startTime = minutesToTime(clamped);
    const endTime = minutesToTime(Math.min(clamped + 60, END_HOUR * 60));
    onSlotClick(date, startTime, endTime);
  };

  const showNow = nowTop !== null && nowTop >= 0 && nowTop <= TOTAL_HOURS * HOUR_HEIGHT;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-gray-900">
      {/* Day headers */}
      <div
        className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10 shrink-0"
        style={{ paddingLeft: TIME_COL_W }}
      >
        {days.map(day => {
          const { short, num } = formatDayHeader(day);
          const today = isToday(day);
          return (
            <div
              key={day}
              className="flex-1 flex flex-col items-center py-2 border-l border-gray-200 dark:border-gray-700 first:border-l-0"
            >
              <span className={`text-xs font-medium uppercase tracking-wide ${today ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {short}
              </span>
              <div className={`w-8 h-8 flex items-center justify-center rounded-full mt-0.5 text-sm font-bold ${
                today
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-800 dark:text-gray-200'
              }`}>
                {num}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex" style={{ minHeight: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Time labels column */}
          <div className="relative shrink-0" style={{ width: TIME_COL_W }}>
            {HOURS.map((hour, i) => (
              <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
                {i > 0 && (
                  <span className="absolute -top-2.5 right-2 text-[10px] text-gray-400 dark:text-gray-500 font-medium select-none">
                    {formatHourLabel(hour)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const dayEvents = events.filter(e => e.date === day);
            const layouts = layoutDayEvents(dayEvents);
            return (
              <div
                key={day}
                className="flex-1 relative border-l border-gray-200 dark:border-gray-700 cursor-cell"
                style={{ minHeight: TOTAL_HOURS * HOUR_HEIGHT }}
                onClick={e => handleColumnClick(e, day)}
              >
                {/* Hour lines */}
                {HOURS.map((hour, i) => (
                  <div key={hour} className="absolute w-full" style={{ top: i * HOUR_HEIGHT }}>
                    <div className="border-t border-gray-100 dark:border-gray-800 w-full" />
                    {/* Half-hour line */}
                    <div
                      className="border-t border-dashed border-gray-50 dark:border-gray-800/50 w-full absolute"
                      style={{ top: HOUR_HEIGHT / 2 }}
                    />
                  </div>
                ))}

                {/* Today highlight */}
                {isToday(day) && (
                  <div className="absolute inset-0 bg-indigo-50/30 dark:bg-indigo-900/5 pointer-events-none" />
                )}

                {/* Events */}
                {layouts.map(layout => (
                  <div key={layout.event.id} data-event="true">
                    <EventBlock
                      layout={layout}
                      onClick={() => onEventClick(layout.event)}
                      onStartTimer={() => onStartTimer(layout.event)}
                    />
                  </div>
                ))}

                {/* Now indicator (only in today column) */}
                {isToday(day) && showNow && nowTop !== null && (
                  <div
                    className="absolute w-full pointer-events-none z-10"
                    style={{ top: nowTop }}
                  >
                    <div className="relative flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow-sm" />
                      <div className="flex-1 h-px bg-red-400" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
