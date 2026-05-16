'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDate, parseDate, getMonthCalendar, isToday, getWeekDays } from '@/lib/utils';

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function MiniCalendar() {
  const { state, dispatch } = useApp();
  const [viewDate, setViewDate] = useState(() => {
    const d = parseDate(state.currentDate);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Sync mini calendar month when the main calendar navigates to a different month.
  useEffect(() => {
    const d = parseDate(state.currentDate);
    setViewDate({ year: d.getFullYear(), month: d.getMonth() });
  }, [state.currentDate]);

  const weeks = getMonthCalendar(viewDate.year, viewDate.month);
  const monthLabel = new Date(viewDate.year, viewDate.month, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const eventDates = new Set(state.events.map(e => e.date));
  const currentWeek = new Set(getWeekDays(state.currentDate));

  const prevMonth = () => {
    setViewDate(v => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const nextMonth = () => {
    setViewDate(v => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const selectDate = (dateStr: string) => {
    dispatch({ type: 'SET_CURRENT_DATE', date: dateStr });
  };

  return (
    <div className="px-4 py-3 select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((dateStr, di) => {
              if (!dateStr) return <div key={di} />;
              const today = isToday(dateStr);
              const selected = dateStr === state.currentDate;
              const inCurrentWeek = currentWeek.has(dateStr) && state.viewMode === 'week';
              const hasEvents = eventDates.has(dateStr);

              return (
                <button
                  key={di}
                  onClick={() => selectDate(dateStr)}
                  className={`
                    relative flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-full text-xs font-medium transition-colors
                    ${today
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : selected && !today
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : inCurrentWeek
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {parseDate(dateStr).getDate()}
                  {hasEvents && !today && (
                    <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                      selected ? 'bg-indigo-400' : 'bg-indigo-400'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
