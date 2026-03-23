import type { TaskStatus, TaskPriority, AdminTask } from '../../../services/admin/AdminTasksService';

export const STATUS_ORDER: Record<TaskStatus, number> = {
  pending: 0,
  in_progress: 1,
  blocked: 2,
  done: 3
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3
};

export const STATUS_OPTIONS: TaskStatus[] = ['pending', 'in_progress', 'blocked', 'done'];
export const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export const statusClasses: Record<TaskStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700'
};

export const priorityClasses: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-rose-100 text-rose-700'
};

export const getTodayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export const isTaskOverdue = (task: AdminTask) =>
  Boolean(task.due_date && task.status !== 'done' && task.due_date < getTodayIso());
