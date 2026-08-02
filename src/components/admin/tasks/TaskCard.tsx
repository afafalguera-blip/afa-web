import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, ChevronDown, ChevronUp, Edit, ListChecks, Tag, Trash2, User
} from 'lucide-react';
import type { AdminTask, TaskStatus } from '../../../services/admin/AdminTasksService';
import { STATUS_PILL_CLASS } from '../news/contentStatus';
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
    <div className={`bg-white rounded-lg border p-5 transition-shadow hover:shadow-sm ${overdue ? 'border-amber-300' : 'border-neutral-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 min-w-0">
          {/* Status pill first, same shape/placement as every other entity of the zone. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${STATUS_PILL_CLASS} ${statusClasses[task.status]}`}>{getStatusLabel(task.status)}</span>
            <span className={`${STATUS_PILL_CLASS} ${priorityClasses[task.priority]}`}>{getPriorityLabel(task.priority)}</span>
            {overdue && <span className={`${STATUS_PILL_CLASS} bg-amber-100 text-amber-700`}>{t('admin.tasks.overdue_badge')}</span>}
          </div>

          <h3 className="text-[15px] font-semibold text-neutral-900 truncate">{task.title}</h3>

          {task.description && <p className="text-[13px] text-neutral-600 leading-relaxed line-clamp-3">{task.description}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-neutral-500">
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" />{t('admin.tasks.field_due_date')}: {formatDate(task.due_date)}</span>
            <span className="inline-flex items-center gap-1.5"><User className="w-4 h-4" />{t('admin.tasks.field_assignee')}: {task.assignee_name || t('admin.tasks.unassigned')}</span>
          </div>

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span key={tag} className={`${STATUS_PILL_CLASS} bg-neutral-100 text-neutral-700`}>
                  <Tag className="w-3 h-3" />{tag}
                </span>
              ))}
            </div>
          )}

          {task.subtasks.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-neutral-500 inline-flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} {t('admin.tasks.subtasks_progress')}
              </div>
              <button type="button" aria-expanded={expanded} onClick={() => setExpanded((prev) => !prev)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors">
                {expanded ? <><ChevronUp className="w-4 h-4" />{t('admin.tasks.hide_subtasks', { defaultValue: getFallbackByLocale('Amagar subtasques', 'Ocultar subtareas', 'Hide subtasks') })}</> : <><ChevronDown className="w-4 h-4" />{t('admin.tasks.view_subtasks', { defaultValue: getFallbackByLocale('Veure subtasques', 'Ver subtareas', 'View subtasks') })}</>}
              </button>
            </div>
          )}

          {expanded && (
            <div className="mt-1 p-3 rounded-lg border border-neutral-200 bg-neutral-50/70">
              <p className="text-xs font-semibold text-neutral-500 mb-2">{t('admin.tasks.field_subtasks')}</p>
              {task.subtasks.length > 0 ? (
                <div className="space-y-1.5">
                  {task.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 text-sm">
                      <span className={`w-2.5 h-2.5 rounded-full ${subtask.done ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                      <span className={subtask.done ? 'line-through text-neutral-400' : 'text-neutral-700'}>{subtask.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">{t('admin.tasks.no_subtasks')}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => onEdit(task)} className="p-2 rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors" title={t('common.edit')} aria-label={t('common.edit')}><Edit className="w-[18px] h-[18px]" /></button>
          <button type="button" onClick={() => onDelete(task.id)} className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors" title={t('common.delete')} aria-label={t('common.delete')}><Trash2 className="w-[18px] h-[18px]" /></button>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-neutral-100 flex flex-col md:flex-row md:items-center gap-3">
        <select value={task.status} aria-label={t('admin.tasks.field_status')} onChange={(e) => onQuickStatusChange(task.id, e.target.value as TaskStatus)} disabled={updatingTaskId === task.id} className="px-3 py-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none bg-white min-w-[210px] text-[13px] disabled:opacity-60">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
        </select>

        {task.status !== 'done' ? (
          <button type="button" onClick={() => onQuickStatusChange(task.id, 'done')} disabled={updatingTaskId === task.id} className="px-3.5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium transition-colors disabled:opacity-60">
            {updatingTaskId === task.id ? t('common.saving') : t('admin.tasks.mark_done')}
          </button>
        ) : (
          <button type="button" onClick={() => onQuickStatusChange(task.id, 'pending')} disabled={updatingTaskId === task.id} className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 text-[13px] font-medium hover:bg-neutral-100 transition-colors disabled:opacity-60">
            {updatingTaskId === task.id ? t('common.saving') : t('admin.tasks.reopen')}
          </button>
        )}

        {task.completed_at && (
          <span className="text-xs text-neutral-400 md:ml-auto">
            {t('admin.tasks.field_completed_at')}: {new Date(task.completed_at).toLocaleString(nativeDateLocale)}
          </span>
        )}
      </div>
    </div>
  );
}
