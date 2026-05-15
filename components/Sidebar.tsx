'use client';

import MiniCalendar from './MiniCalendar';
import TodoList from './TodoList';
import type { Todo } from '@/types';

interface Props {
  onScheduleTodo: (todo: Todo) => void;
}

export default function Sidebar({ onScheduleTodo }: Props) {
  return (
    <aside className="w-72 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-y-auto">
      <MiniCalendar />
      <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
      <div className="flex-1 overflow-y-auto">
        <TodoList onScheduleTodo={onScheduleTodo} />
      </div>
    </aside>
  );
}
