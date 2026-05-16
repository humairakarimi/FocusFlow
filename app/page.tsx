'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import CalendarGrid from '@/components/CalendarGrid';
import EventModal from '@/components/EventModal';
import FocusTimer from '@/components/FocusTimer';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/utils';
import type { CalendarEvent, Todo } from '@/types';

interface ModalState {
  open: boolean;
  event?: CalendarEvent | null;
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultTitle?: string;
  schedulingTodoId?: string;
}

export default function Home() {
  const { state, dispatch } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const modalRef = useRef(modal);
  modalRef.current = modal;

  const openCreateModal = useCallback((date: string, startTime: string, endTime: string) => {
    setModal({ open: true, event: null, defaultDate: date, defaultStartTime: startTime, defaultEndTime: endTime });
  }, []);

  const openEditModal = useCallback((event: CalendarEvent) => {
    setModal({ open: true, event });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false });
  }, []);

  const handleStartTimer = useCallback((event: CalendarEvent) => {
    dispatch({ type: 'START_TIMER', eventId: event.id, mode: 'normal' });
  }, [dispatch]);

  const handleScheduleTodo = useCallback((todo: Todo) => {
    setModal({
      open: true,
      event: null,
      defaultDate: todo.scheduledDate ?? formatDate(new Date()),
      defaultStartTime: todo.scheduledStartTime ?? '09:00',
      defaultEndTime: todo.scheduledStartTime
        ? `${String(parseInt(todo.scheduledStartTime.split(':')[0]) + 1).padStart(2, '0')}:${todo.scheduledStartTime.split(':')[1]}`
        : '10:00',
      defaultTitle: todo.title,
      schedulingTodoId: todo.id,
    });
  }, []);

  const handleEventSaved = useCallback((event: CalendarEvent) => {
    const todoId = modalRef.current.schedulingTodoId;
    if (todoId) {
      const todo = state.todos.find(t => t.id === todoId);
      if (todo) {
        dispatch({
          type: 'UPDATE_TODO',
          todo: { ...todo, scheduledDate: event.date, scheduledStartTime: event.startTime },
        });
      }
    }
  }, [state.todos, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (modalRef.current.open) return;
      switch (e.key.toLowerCase()) {
        case 'n':
          setModal({ open: true, event: null, defaultDate: formatDate(new Date()) });
          break;
        case 't':
          dispatch({ type: 'SET_CURRENT_DATE', date: formatDate(new Date()) });
          break;
        case 'd':
          dispatch({ type: 'SET_VIEW_MODE', mode: 'day' });
          break;
        case 'w':
          dispatch({ type: 'SET_VIEW_MODE', mode: 'week' });
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-gray-900">
      <TopNav onMenuToggle={() => setSidebarOpen(v => !v)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed md:static inset-y-0 left-0 z-20 transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${sidebarOpen ? 'md:flex' : 'md:hidden'}
          flex-col
        `}>
          <Sidebar onScheduleTodo={handleScheduleTodo} />
        </div>

        {/* Calendar */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          <CalendarGrid
            onEventClick={openEditModal}
            onSlotClick={openCreateModal}
            onStartTimer={handleStartTimer}
          />
        </main>
      </div>

      {/* Event modal */}
      {modal.open && (
        <EventModal
          event={modal.event}
          defaultDate={modal.defaultDate}
          defaultStartTime={modal.defaultStartTime}
          defaultEndTime={modal.defaultEndTime}
          defaultTitle={modal.defaultTitle}
          onClose={closeModal}
          onSaved={handleEventSaved}
        />
      )}

      {/* Focus timer panel */}
      <FocusTimer />
    </div>
  );
}
