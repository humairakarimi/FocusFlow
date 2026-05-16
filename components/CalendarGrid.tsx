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
  /**
   * How many content-pixels from the event's top the pointer landed.
   * Computed once at drag-start; held constant so the event doesn't
   * jump when the pointer moves.
   */
  pointerOffsetPx: number;
  previewDate: string;
  previewStartTime: string;
  previewEndTime: string;
  hasMoved: boolean;
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
const TIME_COL_W = 56;     // px — width of the time-label gutter
const PX_PER_MIN = HOUR_HEIGHT / 60;
const SNAP_MINS = 15;
const DRAG_THRESHOLD_PX = 4;
const AUTOSCROLL_ZONE = 60; // px from edge before auto-scroll kicks in
const AUTOSCROLL_MAX = 12;  // px per frame at the very edge

/**
 * Convert a raw pixel offset (from the start of grid content at START_HOUR)
 * into a snapped start/end time pair, clamped to the visible range.
 */
function snapToGrid(rawPx: number, durationMins: number) {
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

  // Refs updated every render so pointer handlers always see the latest values
  const daysRef = useRef(days);
  daysRef.current = days;
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // DOM refs
  const scrollRef = useRef<HTMLDivElement>(null);   // the scrollable container
  const columnsRef = useRef<HTMLDivElement>(null);  // wraps day columns (excludes time gutter)

  const [nowTop, setNowTop] = useState<number | null>(null);

  // Drag state — both ref (for pointer handlers) and useState (for render)
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Stores the client position where pointerdown fired, for threshold check
  const dragStartClientRef = useRef<{ x: number; y: number } | null>(null);

  // Latest pointer position — used by auto-scroll RAF to recompute preview
  const lastClientXRef = useRef(0);
  const lastClientYRef = useRef(0);

  // RAF handles
  const moveRafRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  // Suppresses the click-to-open-modal that fires right after a drop
  const justDraggedRef = useRef(false);

  // ── now indicator ─────────────────────────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
    const top = (mins / 60) * HOUR_HEIGHT;
    setNowTop(top);
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, top - 120);
  }, [viewMode, currentDate]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
      setNowTop((mins / 60) * HOUR_HEIGHT);
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── drag coordinate computation ───────────────────────────────────────────
  /**
   * Core position calculation.
   *
   * Coordinate system used (one consistent system throughout):
   *   "content Y" = pixels from the very top of the scrollable content
   *                 (= 0 at START_HOUR, grows downward)
   *
   * Formula:
   *   contentY(pointer) = (clientY - scrollContainerRect.top) + scrollTop
   *
   *   scrollContainerRect.top is the FIXED viewport position of the scroll box —
   *   it never changes as the user scrolls.  Adding scrollTop converts the
   *   viewport-relative pointer position into absolute content coordinates.
   *
   *   Subtracting pointerOffsetPx then gives the content Y of the event's
   *   top edge, not the pointer itself.
   *
   * Previous bug: columnsRef.getBoundingClientRect().top was used instead of
   * scrollContainerRect.top.  Because the columns div is inside the scrollable
   * container, its viewport top *decreases* as the user scrolls — so
   * (clientY - colsRect.top) already embeds scrollTop.  Adding scrollTop a
   * second time caused every hour scrolled to shift the predicted time by one
   * hour (3 hours scrolled → 3-hour jump).
   */
  const computePreview = useCallback((clientX: number, clientY: number) => {
    const d = dragRef.current;
    if (!d || !scrollRef.current || !columnsRef.current) return;

    // Fixed viewport rect of the scroll container (never changes with scroll)
    const scrollRect = scrollRef.current.getBoundingClientRect();
    const scrollTop = scrollRef.current.scrollTop;

    // Content Y of the event's top edge
    const contentY = (clientY - scrollRect.top) + scrollTop - d.pointerOffsetPx;

    const { startTime, endTime } = snapToGrid(contentY, d.durationMins);

    // Which day column is the pointer over?
    const colsRect = columnsRef.current.getBoundingClientRect();
    const colWidth = colsRect.width / daysRef.current.length;
    const relX = clientX - colsRect.left;
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
  }, []);

  // ── pointer event handlers (active only while dragging) ───────────────────
  const isDragging = !!drag;
  useEffect(() => {
    if (!isDragging) return;

    const stopAutoScroll = () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };

    const startAutoScroll = (direction: 'up' | 'down', speed: number) => {
      stopAutoScroll();
      const scroll = scrollRef.current;
      if (!scroll) return;

      const tick = () => {
        if (!scrollRef.current) return;
        const max = scroll.scrollHeight - scroll.clientHeight;
        if (direction === 'up') {
          scroll.scrollTop = Math.max(0, scroll.scrollTop - speed);
        } else {
          scroll.scrollTop = Math.min(max, scroll.scrollTop + speed);
        }
        // Keep preview in sync as the scroll position changes
        computePreview(lastClientXRef.current, lastClientYRef.current);
        scrollRafRef.current = requestAnimationFrame(tick);
      };
      scrollRafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;

      // Threshold — ignore tiny movements so that clicks still work
      if (!d.hasMoved) {
        const start = dragStartClientRef.current;
        if (start) {
          const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
          if (dist < DRAG_THRESHOLD_PX) return;
        }
      }

      lastClientXRef.current = e.clientX;
      lastClientYRef.current = e.clientY;

      // Throttle rendering to one update per animation frame
      if (moveRafRef.current !== null) cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = requestAnimationFrame(() => {
        moveRafRef.current = null;
        computePreview(lastClientXRef.current, lastClientYRef.current);
      });

      // Auto-scroll when pointer approaches the top or bottom edge
      if (!scrollRef.current) return;
      const scrollRect = scrollRef.current.getBoundingClientRect();
      const distTop = e.clientY - scrollRect.top;
      const distBottom = scrollRect.bottom - e.clientY;

      if (distTop < AUTOSCROLL_ZONE && scrollRef.current.scrollTop > 0) {
        const speed = AUTOSCROLL_MAX * (1 - distTop / AUTOSCROLL_ZONE);
        startAutoScroll('up', speed);
      } else if (distBottom < AUTOSCROLL_ZONE) {
        const max = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
        if (scrollRef.current.scrollTop < max) {
          const speed = AUTOSCROLL_MAX * (1 - distBottom / AUTOSCROLL_ZONE);
          startAutoScroll('down', speed);
        } else {
          stopAutoScroll();
        }
      } else {
        stopAutoScroll();
      }
    };

    const onUp = () => {
      stopAutoScroll();
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }

      const d = dragRef.current;
      dragRef.current = null;
      dragStartClientRef.current = null;
      setDrag(null);

      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (!d?.hasMoved) return;

      // Suppress the click that fires immediately after pointerup
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 200);

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
      stopAutoScroll();
      if (moveRafRef.current !== null) cancelAnimationFrame(moveRafRef.current);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, dispatch, computePreview]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── drag start ────────────────────────────────────────────────────────────
  const handleEventDragStart = useCallback(
    (e: React.PointerEvent, event: CalendarEvent) => {
      // Mouse: left button only
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      if (!scrollRef.current) return;

      // Compute the pointer's offset from the event's top edge in CONTENT pixels
      // so we can subtract it later and keep the event pinned under the cursor.
      //
      // event viewport top = scrollContainerRect.top + contentY - scrollTop
      // pointerOffsetPx    = e.clientY - eventViewportTop
      //                    = e.clientY - (scrollContainerRect.top + contentY - scrollTop)
      // Equivalently, just read it directly from the element rect:
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const pointerOffsetPx = Math.max(0, Math.min(e.clientY - rect.top, rect.height - 1));

      const durationMins = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);

      dragStartClientRef.current = { x: e.clientX, y: e.clientY };
      lastClientXRef.current = e.clientX;
      lastClientYRef.current = e.clientY;

      const initial: DragState = {
        eventId: event.id,
        originalDate: event.date,
        originalStartTime: event.startTime,
        durationMins,
        pointerOffsetPx,
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

  // ── column click (create event) ───────────────────────────────────────────
  const handleColumnClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, date: string) => {
      if ((e.target as HTMLElement).closest('[data-event]')) return;
      if (justDraggedRef.current) return;

      if (!scrollRef.current) return;

      // Same coordinate system as drag:
      // contentY = (clientY - scrollContainerRect.top) + scrollTop
      const scrollRect = scrollRef.current.getBoundingClientRect();
      const contentY = (e.clientY - scrollRect.top) + scrollRef.current.scrollTop;
      const rawMins = contentY / PX_PER_MIN + START_HOUR * 60;
      const snapped = Math.round(rawMins / SNAP_MINS) * SNAP_MINS;
      const clamped = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, snapped));
      onSlotClick(date, minutesToTime(clamped), minutesToTime(Math.min(clamped + 60, END_HOUR * 60)));
    },
    [onSlotClick],
  );

  // ── render ────────────────────────────────────────────────────────────────
  const showNow = nowTop !== null && nowTop >= 0 && nowTop <= TOTAL_HOURS * HOUR_HEIGHT;
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

      {/* Scrollable body — scrollRef is the scroll CONTAINER (its viewport rect is fixed) */}
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

          {/* Day columns */}
          <div ref={columnsRef} className="flex flex-1 min-w-0">
            {days.map(day => {
              const dayEvents = events.filter(e => e.date === day);
              const layouts = layoutDayEvents(dayEvents);

              const showGhost = drag?.hasMoved && drag.previewDate === day;
              const ghostPos = showGhost && drag
                ? getEventPosition(drag.previewStartTime, drag.previewEndTime)
                : null;

              return (
                <div
                  key={day}
                  className="flex-1 relative border-l border-gray-200 dark:border-gray-700 min-w-0"
                  style={{
                    minHeight: TOTAL_HOURS * HOUR_HEIGHT,
                    cursor: isDragging ? 'grabbing' : 'cell',
                  }}
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
                        opacity: drag?.eventId === layout.event.id ? 0.25 : 1,
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

                  {/* Ghost preview — shows where the event will land */}
                  {showGhost && ghostPos && ghostColors && drag && (
                    <div
                      className="absolute pointer-events-none z-20 rounded-md border-2 border-dashed"
                      style={{
                        top: ghostPos.top + 1,
                        height: Math.max(ghostPos.height - 2, 20),
                        left: 3,
                        right: 3,
                        backgroundColor: ghostColors.light,
                        borderColor: ghostColors.bg,
                      }}
                    >
                      <div className="px-2 pt-1 overflow-hidden">
                        <p
                          className="text-[11px] font-semibold leading-tight truncate"
                          style={{ color: ghostColors.text }}
                        >
                          {draggingEvent?.title}
                        </p>
                        <p
                          className="text-[10px] leading-tight mt-0.5"
                          style={{ color: ghostColors.text + 'bb' }}
                        >
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
