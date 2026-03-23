import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, ChevronDown, ChevronUp, Edit, ListChecks, Tag, Trash2, User
} from 'lucide-react';
import type { AdminTask, TaskStatus } from '../../../services/admin/AdminTasksService';
import { statusClasses, priorityClasses, isTaskOverdue, STATUS_OPTIONS } from './taskUtils';

interface TaskCardProps {
  task: AdminTask;
  updatingTaskId: string | null;
  nativeDateLocale: string;
  getStatusLabel: (status: TaskStatus) => string;
  getPriorityLabel: (priority: string) => string;
  formatDate: (value?: string | null) => string;
  getFallbackByLocale: (ca: string, es: string, en: string) => string;
  onEdit: (task: AdminTask) => void;
  onDelete: (taskId: string) => void;
  onQuickStatusChange: (taskId: string, status: TaskStatus) => void;
}

export function TaskCard({
  task, updatingTaskId, nativeDateLocale,
  getStatusLabel, getPriorityLabel, formatDate, getFallbackByLocale,
  onEdit, onDelete, onQuickStatusChange
}: TaskCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const overdue = isTaskOverdue(task);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${overdue ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 truncate">{task.title}</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusClasses[task.status]}`}>{getStatusLabel(task.status)}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${priorityClasses[task.priority]}`}>{getPriorityLabel(task.priority)}</span>
            {overdue && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{t('admin.tasks.overdue_badge')}</span>}
          </div>

          {task.description && <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{task.description}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" />{t('admin.tasks.field_due_date')}: {formatDate(task.due_date)}</span>
            <span className="inline-flex items-center gap-1.5"><User className="w-4 h-4" />{t('admin.tasks.field_assignee')}: {task.assignee_name || t('admin.tasks.unassigned')}</span>
          </div>

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold">
                  <Tag className="w-3 h-3" />{tag}
                </span>
              ))}
            </div>
          )}

          {task.subtasks.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-slate-500 inline-flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} {t('admin.tasks.subtasks_progress')}
              </div>
              <button type="button" onClick={() => setExpanded((prev) => !prev)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                {expanded ? <><ChevronUp className="w-4 h-4" />{t('admin.tasks.hide_subtasks', { defaultValue: getFallbackByLocale('Amagar subtasques', 'Ocultar subtareas', 'Hide subtasks') })}</> : <><ChevronDown className="w-4 h-4" />{t('admin.tasks.view_subtasks', { defaultValue: getFallbackByLocale('Veure subtasques', 'Ver subtareas', 'View subtasks') })}</>}
              </button>
            </div>
          )}

          {expanded && (
            <div className="mt-1 p-3 rounded-xl border border-slate-200 bg-slate-50/70">
              <p className="text-xs font-semibold text-slate-500 mb-2">{t('admin.tasks.field_subtasks')}</p>
              {task.subtasks.length > 0 ? (
                <div className="space-y-1.5">
                  {task.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 text-sm">
                      <span className={`w-2.5 h-2.5 rounded-full ${subtask.done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className={subtask.done ? 'line-through text-slate-400' : 'text-slate-700'}>{subtask.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">{t('admin.tasks.no_subtasks')}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(task)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={t('common.edit')}><Edit className="w-5 h-5" /></button>
          <button onClick={() => onDelete(task.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('common.delete')}><Trash2 className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center gap-3">
        <select value={task.status} onChange={(e) => onQuickStatusChange(task.id, e.target.value as TaskStatus)} disabled={updatingTaskId === task.id} className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[210px] disabled:opacity-60">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
        </select>

        {task.status !== 'done' ? (
          <button onClick={() => onQuickStatusChange(task.id, 'done')} disabled={updatingTaskId === task.id} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60">
            {updatingTaskId === task.id ? t('common.saving') : t('admin.tasks.mark_done')}
          </button>
        ) : (
          <button onClick={() => onQuickStatusChange(task.id, 'pending')} disabled={updatingTaskId === task.id} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-60">
            {updatingTaskId === task.id ? t('common.saving') : t('admin.tasks.reopen')}
          </button>
        )}

        {task.completed_at && (
          <span className="text-xs text-slate-400 md:ml-auto">
            {t('admin.tasks.field_completed_at')}: {new Date(task.completed_at).toLocaleString(nativeDateLocale)}
          </span>
        )}
      </div>
    </div>
  );
}
