import type { CalendarEvent, Todo } from '@/types';
import { generateId, formatDate, addDays } from './utils';

function today(): string {
  return formatDate(new Date());
}

function weekDay(offset: number): string {
  const date = new Date();
  const day = date.getDay(); // 0=Sun
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - day);
  const target = new Date(sunday);
  target.setDate(sunday.getDate() + offset);
  return formatDate(target);
}

export function getSampleEvents(): CalendarEvent[] {
  const t = today();
  const mon = weekDay(1);
  const tue = weekDay(2);
  const wed = weekDay(3);
  const thu = weekDay(4);
  const sat = weekDay(6);

  return [
    // Monday
    { id: generateId(), title: 'Team Standup', date: mon, startTime: '09:00', endTime: '09:30', category: 'work', description: 'Daily team sync', focusedSeconds: 1800, completed: true },
    { id: generateId(), title: 'Sprint Planning', date: mon, startTime: '10:00', endTime: '11:30', category: 'work', description: 'Q2 sprint kickoff', focusedSeconds: 5400, completed: true },
    { id: generateId(), title: 'Lunch', date: mon, startTime: '12:00', endTime: '12:45', category: 'personal', description: '', focusedSeconds: 0, completed: true },
    { id: generateId(), title: 'Code Review', date: mon, startTime: '14:00', endTime: '15:30', category: 'work', description: 'Review open PRs', focusedSeconds: 5400, completed: true },
    { id: generateId(), title: 'Product Meeting', date: mon, startTime: '16:00', endTime: '17:00', category: 'work', description: '', focusedSeconds: 3600, completed: true },
    { id: generateId(), title: 'Evening Gym', date: mon, startTime: '18:30', endTime: '19:30', category: 'health', description: 'Upper body workout', focusedSeconds: 0, completed: true },

    // Tuesday
    { id: generateId(), title: 'Team Standup', date: tue, startTime: '09:00', endTime: '09:30', category: 'work', description: '', focusedSeconds: 1800, completed: true },
    { id: generateId(), title: 'Deep Work: Auth System', date: tue, startTime: '10:00', endTime: '12:30', category: 'work', description: 'Implement OAuth2 flow', focusedSeconds: 7200, completed: true },
    { id: generateId(), title: '1:1 with Manager', date: tue, startTime: '13:30', endTime: '14:00', category: 'work', description: 'Career check-in', focusedSeconds: 1800, completed: true },
    { id: generateId(), title: 'Feature Development', date: tue, startTime: '14:30', endTime: '17:00', category: 'work', description: 'Dashboard v2', focusedSeconds: 9000, completed: true },
    { id: generateId(), title: 'Read: Zero to One', date: tue, startTime: '20:00', endTime: '21:00', category: 'learning', description: 'Chapters 5–7', focusedSeconds: 3600, completed: true },

    // Wednesday
    { id: generateId(), title: 'Team Standup', date: wed, startTime: '09:00', endTime: '09:30', category: 'work', description: '', focusedSeconds: 1800, completed: true },
    { id: generateId(), title: 'UI Design Session', date: wed, startTime: '10:30', endTime: '12:30', category: 'work', description: 'New onboarding flow', focusedSeconds: 5400, completed: true },
    { id: generateId(), title: 'Team Lunch', date: wed, startTime: '12:30', endTime: '13:30', category: 'personal', description: '', focusedSeconds: 0, completed: true },
    { id: generateId(), title: 'Architecture Review', date: wed, startTime: '15:00', endTime: '16:30', category: 'work', description: 'Microservices discussion', focusedSeconds: 5400, completed: true },
    { id: generateId(), title: 'Evening Run', date: wed, startTime: '18:00', endTime: '19:00', category: 'health', description: '5K run', focusedSeconds: 0, completed: true },

    // Thursday
    { id: generateId(), title: 'Team Standup', date: thu, startTime: '09:00', endTime: '09:30', category: 'work', description: '', focusedSeconds: 1800, completed: true },
    { id: generateId(), title: 'Product Roadmap', date: thu, startTime: '10:00', endTime: '12:00', category: 'work', description: 'H2 planning', focusedSeconds: 7200, completed: true },
    { id: generateId(), title: 'Stakeholder Presentation', date: thu, startTime: '13:00', endTime: '14:30', category: 'work', description: 'Q1 results + Q2 plan', focusedSeconds: 5400, completed: true },
    { id: generateId(), title: 'Retrospective', date: thu, startTime: '16:00', endTime: '17:00', category: 'work', description: 'Sprint retro', focusedSeconds: 3600, completed: true },
    { id: generateId(), title: 'Guitar Practice', date: thu, startTime: '20:00', endTime: '21:00', category: 'personal', description: '', focusedSeconds: 0, completed: true },

    // Today (Friday)
    { id: generateId(), title: 'Morning Standup', date: t, startTime: '09:00', endTime: '09:30', category: 'work', description: 'Daily team sync', focusedSeconds: 1800, completed: true },
    { id: generateId(), title: 'Deep Work: Q2 Strategy', date: t, startTime: '10:00', endTime: '12:00', category: 'work', description: 'Focus on Q2 planning document and OKRs', focusedSeconds: 4800, completed: true },
    { id: generateId(), title: 'Lunch Break', date: t, startTime: '12:00', endTime: '12:45', category: 'personal', description: '', focusedSeconds: 0, completed: true },
    { id: generateId(), title: 'UX Design Review', date: t, startTime: '13:30', endTime: '15:00', category: 'work', description: 'Review new dashboard mockups with design team', focusedSeconds: 0, completed: false },
    { id: generateId(), title: 'Coding Session', date: t, startTime: '15:30', endTime: '17:30', category: 'work', description: 'Implement analytics module', focusedSeconds: 0, completed: false },
    { id: generateId(), title: 'Evening Run', date: t, startTime: '18:00', endTime: '19:00', category: 'health', description: '5K run', focusedSeconds: 0, completed: false },
    { id: generateId(), title: 'Read: Deep Work', date: t, startTime: '21:00', endTime: '22:00', category: 'learning', description: 'Cal Newport — Chapters 8–10', focusedSeconds: 0, completed: false },

    // Saturday
    { id: generateId(), title: 'Morning Workout', date: sat, startTime: '09:00', endTime: '10:00', category: 'health', description: 'HIIT + stretch', focusedSeconds: 0, completed: false },
    { id: generateId(), title: 'Grocery Run', date: sat, startTime: '11:00', endTime: '11:45', category: 'personal', description: '', focusedSeconds: 0, completed: false },
    { id: generateId(), title: 'Side Project', date: sat, startTime: '14:00', endTime: '16:30', category: 'learning', description: 'Build FocusFlow features', focusedSeconds: 0, completed: false },
  ];
}

export function getSampleTodos(): Todo[] {
  const now = new Date().toISOString();
  const t = today();
  return [
    { id: generateId(), title: 'Review team pull requests', priority: 'high', completed: false, createdAt: now },
    { id: generateId(), title: 'Write Q2 planning document', priority: 'high', completed: false, createdAt: now },
    { id: generateId(), title: 'Update product roadmap', priority: 'high', completed: false, createdAt: now },
    { id: generateId(), title: 'Reply to client emails', priority: 'medium', completed: false, createdAt: now, scheduledDate: t, scheduledStartTime: '13:00' },
    { id: generateId(), title: 'Research competitor features', priority: 'medium', completed: false, createdAt: now },
    { id: generateId(), title: 'Prepare weekly report', priority: 'medium', completed: false, createdAt: now },
    { id: generateId(), title: 'Read industry newsletter', priority: 'low', completed: false, createdAt: now },
    { id: generateId(), title: 'Set up staging environment', priority: 'low', completed: false, createdAt: now },
    { id: generateId(), title: 'Submit expense report', priority: 'high', completed: true, createdAt: now },
    { id: generateId(), title: 'Update Jira board', priority: 'medium', completed: true, createdAt: now },
    { id: generateId(), title: 'Send weekly status update', priority: 'medium', completed: true, createdAt: now },
  ];
}
