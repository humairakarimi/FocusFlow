'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { generateId, priorityConfig, formatDate } from '@/lib/utils';
import type { Priority, Todo } from '@/types';

interface Props {
  onScheduleTodo: (todo: Todo) => void;
}

export default function TodoList({ onScheduleTodo }: Props) {
  const { state, dispatch } = useApp();
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [showCompleted, setShowCompleted] = useState(false);

  const incomplete = state.todos.filter(t => !t.completed);
  const completed = state.todos.filter(t => t.completed);

  const addTodo = () => {
    const title = newTitle.trim();
    if (!title) return;
    dispatch({
      type: 'ADD_TODO',
      todo: {
        id: generateId(),
        title,
        priority: newPriority,
        completed: false,
        createdAt: new Date().toISOString(),
      },
    });
    setNewTitle('');
  };

  const toggle = (todo: Todo) => {
    dispatch({ type: 'UPDATE_TODO', todo: { ...todo, completed: !todo.completed } });
  };

  const deleteTodo = (id: string) => {
    dispatch({ type: 'DELETE_TODO', id });
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">To-Do</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">{incomplete.length} left</span>
      </div>

      {/* Add new todo */}
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="Add a task..."
          className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
        />
        <div className="flex items-center gap-1">
          {(['high', 'medium', 'low'] as Priority[]).map(p => (
            <button
              key={p}
              onClick={() => setNewPriority(p)}
              className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors border ${
                newPriority === p
                  ? 'border-transparent'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              style={newPriority === p ? {
                backgroundColor: priorityConfig[p].bg,
                color: priorityConfig[p].color,
                borderColor: priorityConfig[p].color + '40',
              } : undefined}
            >
              {priorityConfig[p].label}
            </button>
          ))}
          <button
            onClick={addTodo}
            className="flex-1 text-xs py-1 rounded-md font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Incomplete todos */}
      <div className="flex flex-col gap-1">
        {incomplete.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={() => toggle(todo)}
            onDelete={() => deleteTodo(todo.id)}
            onSchedule={() => onScheduleTodo(todo)}
          />
        ))}
        {incomplete.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">All caught up! 🎉</p>
        )}
      </div>

      {/* Completed section */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            {completed.length} completed
          </button>
          {showCompleted && (
            <div className="flex flex-col gap-1 mt-1 opacity-60">
              {completed.map(todo => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={() => toggle(todo)}
                  onDelete={() => deleteTodo(todo.id)}
                  onSchedule={() => onScheduleTodo(todo)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TodoItem({
  todo,
  onToggle,
  onDelete,
  onSchedule,
}: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  onSchedule: () => void;
}) {
  const p = priorityConfig[todo.priority];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onToggle}
        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          todo.completed
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
        }`}
      >
        {todo.completed && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-5 ${todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
          {todo.title}
        </p>
        {todo.scheduledDate && (
          <p className="text-[10px] text-indigo-500 dark:text-indigo-400">
            📅 {todo.scheduledDate}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {!todo.completed && (
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: p.bg, color: p.color }}
          >
            {p.label}
          </span>
        )}
        {hovered && (
          <>
            {!todo.completed && (
              <button
                onClick={onSchedule}
                title="Add to calendar"
                className="p-0.5 text-gray-400 hover:text-indigo-500 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            <button
              onClick={onDelete}
              title="Delete"
              className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
