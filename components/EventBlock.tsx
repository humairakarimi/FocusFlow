'use client';

import { categoryColors, formatTime, getEventPosition, HOUR_HEIGHT } from '@/lib/utils';
import type { CalendarEvent } from '@/types';
import type { EventLayout } from '@/lib/utils';

interface Props {
  layout: EventLayout;
  onClick: () => void;
  onStartTimer: () => void;
  onDragStart: (e: React.PointerEvent) => void;
}

export default function EventBlock({ layout, onClick, onStartTimer, onDragStart }: Props) {
  const { event, left, width } = layout;
  const colors = categoryColors[event.category];
  const { top, height } = getEventPosition(event.startTime, event.endTime);
  const isSmall = height < 48;
  const isTiny = height < 32;

  const GAP = 2;
  const style: React.CSSProperties = {
    position: 'absolute',
    top: top + 1,
    height: height - 2,
    left: `calc(${left * 100}% + ${GAP}px)`,
    width: `calc(${width * 100}% - ${GAP * 2}px)`,
    backgroundColor: colors.light,
    borderLeft: `3px solid ${event.completed ? colors.bg + '80' : colors.bg}`,
    borderRadius: 6,
    overflow: 'hidden',
    cursor: 'grab',
    zIndex: 1,
    opacity: event.completed ? 0.6 : 1,
    // Prevents the browser from hijacking touch events for scroll when dragging
    touchAction: 'none',
  };

  return (
    <div
      style={style}
      onClick={onClick}
      onPointerDown={onDragStart}
      className="group p-1.5 hover:shadow-md transition-shadow hover:z-10 hover:brightness-95 active:cursor-grabbing"
    >
      {isTiny ? (
        <p className="text-[10px] font-semibold leading-none truncate" style={{ color: colors.text }}>
          {event.title}
        </p>
      ) : isSmall ? (
        <div className="flex items-center gap-1 overflow-hidden">
          <p className="text-xs font-semibold truncate flex-1" style={{ color: colors.text }}>
            {event.title}
          </p>
          <span className="text-[10px] shrink-0" style={{ color: colors.text + 'aa' }}>
            {formatTime(event.startTime)}
          </span>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold leading-tight truncate" style={{ color: colors.text }}>
            {event.title}
          </p>
          <p className="text-[10px] leading-tight mt-0.5" style={{ color: colors.text + 'cc' }}>
            {formatTime(event.startTime)} – {formatTime(event.endTime)}
          </p>
          {event.completed && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium mt-1" style={{ color: colors.text + 'aa' }}>
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              Done
            </span>
          )}
          {!event.completed && height >= HOUR_HEIGHT && (
            <button
              onClick={e => { e.stopPropagation(); onStartTimer(); }}
              onPointerDown={e => e.stopPropagation()} // don't start drag from Focus button
              className="mt-1.5 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70 hover:bg-white shadow-sm"
              style={{ color: colors.text }}
            >
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Focus
            </button>
          )}
        </>
      )}
    </div>
  );
}
