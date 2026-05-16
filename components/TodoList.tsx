'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { generateId, priorityConfig } from '@/lib/utils';
import ConfirmModal from './ConfirmModal';
import type { Priority, Todo } from '@/types';

interface Props {
  onScheduleTodo: (todo: Todo) => void;
}

export default function TodoList({ onScheduleTodo }: Props) {
  const { state, dispatch } = useApp();
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [showCompleted, setShowCompleted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const incomplete = state.todos.filter(t => !t.completed);
  const completed = state.todos.filter(t => t.completed);

  const addTodo = () => {
    const title = newTitle.trim();
    if (!title) return;
    dispatch({
      type: 'ADD_TODO',
      todo: { id: generateId(), title, priority: newPriority, completed: false, createdAt: new Date().toISOString() },
    });
    setNewTitle('');
  };

  const toggle = (todo: Todo) =>
    dispatch({ type: 'UPDATE_TODO', todo: { ...todo, completed: !todo.completed } });

  const editTodo = (todo: Todo, title: string, priority: Priority) =>
    dispatch({ type: 'UPDATE_TODO', todo: { ...todo, title, priority } });

  const confirmDelete = (id: string) => setDeleteTarget(id);

  const executeDelete = () => {
    if (deleteTarget) dispatch({ type: 'DELETE_TODO', id: deleteTarget });
    setDeleteTarget(null);
  };

  return (
    <div className="px-3 py-3 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">To‑Do</h3>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{incomplete.length} remaining</span>
      </div>

      {/* Add new todo */}
      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="Add a task…"
          className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        <div className="flex items-center gap-1">
          {(['high', 'medium', 'low'] as Priority[]).map(p => (
            <button
              key={p}
              onClick={() => setNewPriority(p)}
              className={`flex-1 text-[11px] py-1 rounded-md font-semibold transition-all border ${
                newPriority === p ? 'border-transparent' : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300'
              }`}
              style={newPriority === p ? { backgroundColor: priorityConfig[p].bg, color: priorityConfig[p].color, borderColor: priorityConfig[p].color + '40' } : undefined}
            >
              {priorityConfig[p].label}
            </button>
          ))}
          <button
            onClick={addTodo}
            disabled={!newTitle.trim()}
            className="flex-1 text-[11px] py-1 rounded-md font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Incomplete todos */}
      <div className="flex flex-col gap-0.5">
        {incomplete.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={() => toggle(todo)}
            onEdit={(title, priority) => editTodo(todo, title, priority)}
            onDelete={() => confirmDelete(todo.id)}
            onSchedule={() => onScheduleTodo(todo)}
          />
        ))}
        {incomplete.length === 0 && (
          <div className="flex flex-col items-center py-4 gap-1">
            <span className="text-2xl">🎉</span>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">All caught up!</p>
          </div>
        )}
      </div>

      {/* Completed section */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-1 py-0.5"
          >
            <svg className={`w-3 h-3 transition-transform duration-200 ${showCompleted ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            {completed.length} completed
          </button>
          {showCompleted && (
            <div className="flex flex-col gap-0.5 mt-1">
              {completed.map(todo => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={() => toggle(todo)}
                  onEdit={(title, priority) => editTodo(todo, title, priority)}
                  onDelete={() => confirmDelete(todo.id)}
                  onSchedule={() => onScheduleTodo(todo)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete task?"
          message="This task will be permanently removed."
          confirmLabel="Delete"
          onConfirm={executeDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onEdit: (title: string, priority: Priority) => void;
  onDelete: () => void;
  onSchedule: () => void;
}

function TodoItem({ todo, onToggle, onEdit, onDelete, onSchedule }: TodoItemProps) {
  const p = priorityConfig[todo.priority];
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editPriority, setEditPriority] = useState<Priority>(todo.priority);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on edit mode entry
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEdit = () => {
    if (todo.completed) return;
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    setIsEditing(true);
  };

  const saveEdit = () => {
    const t = editTitle.trim();
    if (t) onEdit(t, editPriority);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 p-2 flex flex-col gap-2">
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') cancelEdit();
          }}
          className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center gap-1">
          {(['high', 'medium', 'low'] as Priority[]).map(pr => (
            <button
              key={pr}
              onClick={() => setEditPriority(pr)}
              className="flex-1 text-[10px] py-0.5 rounded font-semibold transition-all"
              style={{
                backgroundColor: editPriority === pr ? priorityConfig[pr].bg : 'transparent',
                color: editPriority === pr ? priorityConfig[pr].color : '#9ca3af',
                border: `1px solid ${editPriority === pr ? priorityConfig[pr].color + '40' : '#e5e7eb'}`,
              }}
            >
              {priorityConfig[pr].label}
            </button>
          ))}
          <button onClick={saveEdit} className="flex-1 text-[10px] py-0.5 rounded font-semibold bg-indigo-600 text-white">Save</button>
          <button onClick={cancelEdit} className="flex-1 text-[10px] py-0.5 rounded font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex items-start gap-2 py-1.5 px-2 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${todo.completed ? 'opacity-50' : ''}`}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
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

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-5 ${todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
          {todo.title}
        </p>
        {todo.scheduledDate && !todo.completed && (
          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-0.5">
            📅 {todo.scheduledDate}{todo.scheduledStartTime ? ` · ${todo.scheduledStartTime}` : ''}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!todo.completed && (
          <>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mr-1"
              style={{ backgroundColor: p.bg, color: p.color }}
            >
              {p.label}
            </span>
            <button onClick={startEdit} title="Edit" className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={onSchedule} title="Add to calendar" className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </>
        )}
        <button onClick={onDelete} title="Delete" className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
