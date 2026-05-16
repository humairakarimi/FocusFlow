'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import EventBlock from './EventBlock';
import {
  getWeekDays, formatDayHeader, isToday, layoutDayEvents,
  HOUR_HEIGHT, START_HOUR, END_HOUR, TOTAL_HOURS,
  formatHourLabel, minutesToTime, timeToMinutes, formatTime,
  getEventPosition, categoryColors,
} from '@/lib/utils';
import type { CalendarEvent } from '@/types';

interface Props {
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: string, startTime: string, endTime: string) => void;
  onStartTimer: (event: CalendarEvent) => void;
}

interface DragState {
  eventId: string;
  originalDate: string;
  originalStartTime: string;
  durationMins: number;
  // pointer Y offset from the event's top edge at drag-start
  pointerOffsetY: number;
  // current snapped preview
  previewDate: string;
  previewStartTime: string;
  previewEndTime: string;
  hasMoved: boolean;
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
const TIME_COL_W = 56; // px — must match the time-label column width
const PX_PER_MIN = HOUR_HEIGHT / 60;
const SNAP_MINS = 15;
const DRAG_THRESHOLD_PX = 5;

/** Convert a raw Y pixel (from START_HOUR top) to a snapped start/end pair. */
function snapToGrid(
  rawPx: number,
  durationMins: number,
): { startTime: string; endTime: string } {
  const rawMins = rawPx / PX_PER_MIN + START_HOUR * 60;
  const snapped = Math.round(rawMins / SNAP_MINS) * SNAP_MINS;
  const clamped = Math.max(
    START_HOUR * 60,
    Math.min(END_HOUR * 60 - durationMins, snapped),
  );
  return {
    startTime: minutesToTime(clamped),
    endTime: minutesToTime(clamped + durationMins),
  };
}

export default function CalendarGrid({ onEventClick, onSlotClick, onStartTimer }: Props) {
  const { state, dispatch } = useApp();
  const { viewMode, currentDate, events, activeTimer } = state;

  const days = viewMode === 'week' ? getWeekDays(currentDate) : [currentDate];

  // Refs so pointer handlers always see latest values without re-subscribing
  const daysRef = useRef(days);
  daysRef.current = days;
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const scrollRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null); // wraps day columns, excludes time gutter
  const [nowTop, setNowTop] = useState<number | null>(null);

  // Drag state — kept in both ref (for handlers) and useState (for rendering)
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragStartClientRef = useRef<{ x: number; y: number } | null>(null);
  // Prevents a click from opening the edit modal right after a drag ends
  const justDraggedRef = useRef(false);

  // Auto-scroll to current time on mount / view change
  useEffect(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
    const top = (mins / 60) * HOUR_HEIGHT;
    setNowTop(top);
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, top - 120);
  }, [viewMode, currentDate]);

  // Update the now-indicator every minute
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
      setNowTop((mins / 60) * HOUR_HEIGHT);
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Pointer move / up — only active while a drag is in progress
  const isDragging = !!drag;
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || !columnsRef.current || !scrollRef.current) return;

      // Ignore until threshold exceeded (avoids triggering drag on accidental tiny movements)
      const start = dragStartClientRef.current;
      if (start && !d.hasMoved) {
        const dist = Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y);
        if (dist < DRAG_THRESHOLD_PX) return;
      }

      const colsRect = columnsRef.current.getBoundingClientRect();
      const scrollTop = scrollRef.current.scrollTop;

      // Y of the event's top edge in scroll-content coordinates
      const rawY = (e.clientY - colsRect.top) + scrollTop - d.pointerOffsetY;

      const { startTime, endTime } = snapToGrid(rawY, d.durationMins);

      // Determine which day column the pointer is over
      const colWidth = colsRect.width / daysRef.current.length;
      const relX = e.clientX - colsRect.left;
      const colIdx = Math.max(0, Math.min(daysRef.current.length - 1, Math.floor(relX / colWidth)));
      const previewDate = daysRef.current[colIdx];

      const next: DragState = {
        ...d,
        previewDate,
        previewStartTime: startTime,
        previewEndTime: endTime,
        hasMoved: true,
      };
      dragRef.current = next;
      setDrag(next);
    };

    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      dragStartClientRef.current = null;
      setDrag(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (!d?.hasMoved) return;

      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 150);

      if (
        d.previewDate === d.originalDate &&
        d.previewStartTime === d.originalStartTime
      ) return;

      const event = eventsRef.current.find(ev => ev.id === d.eventId);
      if (!event) return;

      dispatch({
        type: 'UPDATE_EVENT',
        event: {
          ...event,
          date: d.previewDate,
          startTime: d.previewStartTime,
          endTime: d.previewEndTime,
        },
      });
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEventDragStart = useCallback(
    (e: React.PointerEvent, event: CalendarEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      e.stopPropagation();

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const pointerOffsetY = Math.max(0, Math.min(e.clientY - rect.top, rect.height - 1));
      const durationMins = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);

      dragStartClientRef.current = { x: e.clientX, y: e.clientY };

      const initial: DragState = {
        eventId: event.id,
        originalDate: event.date,
        originalStartTime: event.startTime,
        durationMins,
        pointerOffsetY,
        previewDate: event.date,
        previewStartTime: event.startTime,
        previewEndTime: event.endTime,
        hasMoved: false,
      };
      dragRef.current = initial;
      setDrag(initial);
    },
    [],
  );

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, date: string) => {
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    if (justDraggedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickMins = ((e.clientY - rect.top) / HOUR_HEIGHT) * 60;
    const totalMins = START_HOUR * 60 + clickMins;
    const snapped = Math.round(totalMins / 15) * 15;
    const clamped = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, snapped));
    onSlotClick(date, minutesToTime(clamped), minutesToTime(Math.min(clamped + 60, END_HOUR * 60)));
  };

  const showNow = nowTop !== null && nowTop >= 0 && nowTop <= TOTAL_HOURS * HOUR_HEIGHT;

  // Data for the ghost (preview) element shown during drag
  const draggingEvent = drag ? events.find(ev => ev.id === drag.eventId) : null;
  const ghostColors = draggingEvent ? categoryColors[draggingEvent.category] : null;

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
                today ? 'bg-indigo-600 text-white' : 'text-gray-800 dark:text-gray-200'
              }`}>
                {num}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden ${activeTimer ? 'pb-32' : ''}`}
      >
        <div className="flex" style={{ minHeight: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Time-label gutter */}
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

          {/* Day columns — columnsRef wraps this so we can measure column widths */}
          <div ref={columnsRef} className="flex flex-1 min-w-0">
            {days.map(day => {
              const dayEvents = events.filter(e => e.date === day);
              const layouts = layoutDayEvents(dayEvents);

              // Ghost position for this column (only when dragging to this day)
              const showGhost = drag?.hasMoved && drag.previewDate === day;
              const ghostPos = showGhost && drag
                ? getEventPosition(drag.previewStartTime, drag.previewEndTime)
                : null;

              return (
                <div
                  key={day}
                  className="flex-1 relative border-l border-gray-200 dark:border-gray-700 cursor-cell min-w-0"
                  style={{ minHeight: TOTAL_HOURS * HOUR_HEIGHT }}
                  onClick={e => handleColumnClick(e, day)}
                >
                  {/* Hour / half-hour grid lines */}
                  {HOURS.map((hour, i) => (
                    <div key={hour} className="absolute w-full" style={{ top: i * HOUR_HEIGHT }}>
                      <div className="border-t border-gray-100 dark:border-gray-800 w-full" />
                      <div
                        className="border-t border-dashed border-gray-100 dark:border-gray-800 w-full absolute"
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
                    <div
                      key={layout.event.id}
                      data-event="true"
                      style={{
                        opacity: drag?.eventId === layout.event.id ? 0.3 : 1,
                        transition: isDragging ? 'none' : 'opacity 150ms',
                      }}
                    >
                      <EventBlock
                        layout={layout}
                        onClick={() => {
                          if (!justDraggedRef.current) onEventClick(layout.event);
                        }}
                        onStartTimer={() => onStartTimer(layout.event)}
                        onDragStart={e => handleEventDragStart(e, layout.event)}
                      />
                    </div>
                  ))}

                  {/* Drag ghost — snapped preview of where the event will land */}
                  {showGhost && ghostPos && ghostColors && drag && (
                    <div
                      className="absolute pointer-events-none z-20 rounded-md border-2 border-dashed"
                      style={{
                        top: ghostPos.top + 1,
                        height: ghostPos.height - 2,
                        left: 3,
                        right: 3,
                        backgroundColor: ghostColors.light,
                        borderColor: ghostColors.bg,
                      }}
                    >
                      <div className="px-2 pt-1 overflow-hidden">
                        <p className="text-xs font-semibold leading-tight truncate" style={{ color: ghostColors.text }}>
                          {draggingEvent?.title}
                        </p>
                        <p className="text-[10px] leading-tight mt-0.5" style={{ color: ghostColors.text + 'bb' }}>
                          {formatTime(drag.previewStartTime)} – {formatTime(drag.previewEndTime)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Current-time indicator */}
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
    </div>
  );
}
