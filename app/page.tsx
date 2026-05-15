'use client';

import { useState, useCallback } from 'react';
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
}

export default function Home() {
  const { dispatch } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modal, setModal] = useState<ModalState>({ open: false });

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
    });
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-gray-900">
      <TopNav onMenuToggle={() => setSidebarOpen(v => !v)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar onScheduleTodo={handleScheduleTodo} />
        )}

        {/* Calendar */}
        <main className="flex-1 overflow-hidden flex flex-col">
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
        />
      )}

      {/* Focus timer panel */}
      <FocusTimer />
    </div>
  );
}
