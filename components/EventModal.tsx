'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { generateId, categoryColors, formatDate, timeToMinutes, minutesToTime } from '@/lib/utils';
import ConfirmModal from './ConfirmModal';
import type { CalendarEvent, Category } from '@/types';

interface Props {
  event?: CalendarEvent | null;
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultTitle?: string;
  onClose: () => void;
  onSaved?: (event: CalendarEvent) => void;
}

const CATEGORIES: Category[] = ['work', 'personal', 'health', 'learning', 'other'];

export default function EventModal({
  event,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  defaultTitle,
  onClose,
  onSaved,
}: Props) {
  const { dispatch } = useApp();
  const isEdit = !!event;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState(event?.title ?? defaultTitle ?? '');
  const [date, setDate] = useState(event?.date ?? defaultDate ?? formatDate(new Date()));
  const [startTime, setStartTime] = useState(event?.startTime ?? defaultStartTime ?? '09:00');
  const [endTime, setEndTime] = useState(event?.endTime ?? defaultEndTime ?? '10:00');
  const [category, setCategory] = useState<Category>(event?.category ?? 'work');
  const [description, setDescription] = useState(event?.description ?? '');

  const timeError = endTime <= startTime;

  // Auto-adjust end time when start changes
  const handleStartChange = (val: string) => {
    setStartTime(val);
    const startMins = timeToMinutes(val);
    const endMins = timeToMinutes(endTime);
    if (endMins <= startMins) {
      setEndTime(minutesToTime(Math.min(startMins + 60, 23 * 60)));
    }
  };

  const handleSave = () => {
    if (!title.trim() || timeError) return;
    const saved: CalendarEvent = isEdit && event
      ? { ...event, title: title.trim(), date, startTime, endTime, category, description }
      : { id: generateId(), title: title.trim(), date, startTime, endTime, category, description, focusedSeconds: 0, completed: false };
    dispatch({ type: isEdit ? 'UPDATE_EVENT' : 'ADD_EVENT', event: saved });
    onSaved?.(saved);
    onClose();
  };

  const handleDelete = () => setShowDeleteConfirm(true);
  const handleConfirmDelete = () => {
    if (event) dispatch({ type: 'DELETE_EVENT', id: event.id });
    onClose();
  };

  const handleToggleComplete = () => {
    if (event) {
      dispatch({ type: 'UPDATE_EVENT', event: { ...event, completed: !event.completed } });
      onClose();
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete this event?"
          message={`"${event?.title}" will be permanently removed from your calendar.`}
          confirmLabel="Delete event"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden animate-in">
        {/* Color accent bar */}
        <div className="h-1" style={{ backgroundColor: categoryColors[category].bg }} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Event' : 'New Event'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Title */}
            <div>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Event title"
                className="w-full text-base font-medium px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Time</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={e => handleStartChange(e.target.value)}
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
                <span className="text-gray-400 text-sm">→</span>
                <input
                  type="time"
                  value={endTime}
                  min={startTime}
                  onChange={e => setEndTime(e.target.value)}
                  className={`flex-1 text-sm px-3 py-2 rounded-xl border bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                    timeError
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500'
                  }`}
                />
              </div>
              {timeError && (
                <p className="text-xs text-red-500 mt-1">End time must be after start time.</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Category</label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => {
                  const c = categoryColors[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border-2 ${
                        category === cat ? 'scale-105 shadow-sm' : 'opacity-60 hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: category === cat ? c.bg : c.light,
                        color: c.text,
                        borderColor: category === cat ? c.bg : 'transparent',
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Notes <span className="font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-2">
              {isEdit && (
                <>
                  <button
                    onClick={handleToggleComplete}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                      event?.completed
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {event?.completed ? '✓ Done' : 'Mark done'}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-transparent hover:border-red-200"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || timeError}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
              >
                {isEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
