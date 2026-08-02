import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Tag, Trash2, X } from 'lucide-react';
import { Modal } from '../../common/Modal';
import type { TaskFormData, TaskStatus, TaskPriority, TaskSubtask } from '../../../services/admin/AdminTasksService';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from './taskUtils';

interface TaskFormModalProps {
  open: boolean;
  isEditing: boolean;
  formData: TaskFormData;
  setFormData: React.Dispatch<React.SetStateAction<TaskFormData>>;
  saving: boolean;
  nativeDateLocale: string;
  getStatusLabel: (status: TaskStatus) => string;
  getPriorityLabel: (priority: TaskPriority) => string;
  onSave: () => void;
  onClose: () => void;
}

const FIELD_CLASS =
  'w-full px-3 py-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none bg-white';
const LABEL_CLASS = 'block text-[13px] font-medium text-neutral-700 mb-1';

const createSubtask = (title: string): TaskSubtask => {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
  return { id, title: title.trim(), done: false };
};

export function TaskFormModal({
  open, isEditing, formData, setFormData, saving, nativeDateLocale,
  getStatusLabel, getPriorityLabel, onSave, onClose
}: TaskFormModalProps) {
  const { t } = useTranslation();
  const [newTagInput, setNewTagInput] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleAddTag = () => {
    const tag = newTagInput.trim().replace(/^#/, '');
    if (!tag || formData.tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setNewTagInput('');
      return;
    }
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    setNewTagInput('');
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setFormData((prev) => ({ ...prev, subtasks: [...prev.subtasks, createSubtask(newSubtaskTitle)] }));
    setNewSubtaskTitle('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      closeOnBackdrop={false}
      title={isEditing ? t('admin.tasks.edit_task') : t('admin.tasks.new_task')}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-3.5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="task-title" className={LABEL_CLASS}>{t('admin.tasks.field_title')} *</label>
          <input id="task-title" type="text" value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} className={FIELD_CLASS} placeholder={t('admin.tasks.empty_title')} />
        </div>

        <div>
          <label htmlFor="task-description" className={LABEL_CLASS}>{t('admin.tasks.field_description')}</label>
          <textarea id="task-description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={4} className={`${FIELD_CLASS} resize-none`} placeholder={t('admin.tasks.empty_description')} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="task-status" className={LABEL_CLASS}>{t('admin.tasks.field_status')}</label>
            <select id="task-status" value={formData.status} onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as TaskStatus }))} className={FIELD_CLASS}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="task-priority" className={LABEL_CLASS}>{t('admin.tasks.field_priority')}</label>
            <select id="task-priority" value={formData.priority} onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as TaskPriority }))} className={FIELD_CLASS}>
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{getPriorityLabel(p)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="task-due-date" className={LABEL_CLASS}>{t('admin.tasks.field_due_date')}</label>
            <input id="task-due-date" type="date" lang={nativeDateLocale} value={formData.due_date} onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))} className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="task-assignee" className={LABEL_CLASS}>{t('admin.tasks.field_assignee')}</label>
            <input id="task-assignee" type="text" value={formData.assignee_name} onChange={(e) => setFormData((prev) => ({ ...prev, assignee_name: e.target.value }))} className={FIELD_CLASS} placeholder={t('admin.tasks.empty_assignee')} />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="task-new-tag" className={LABEL_CLASS}>{t('admin.tasks.field_tags')}</label>
          <div className="flex gap-2">
            <input id="task-new-tag" type="text" value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} className={FIELD_CLASS} placeholder={t('admin.tasks.empty_tag')} />
            <button type="button" onClick={handleAddTag} aria-label={t('admin.tasks.field_tags')} className="px-3 py-2 bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors"><PlusCircle className="w-5 h-5" /></button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.tags.map((tag) => (
                <button key={tag} type="button" onClick={() => setFormData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-semibold hover:bg-neutral-200 transition-colors" title={t('admin.tasks.remove_tag')}>
                  <Tag className="w-3 h-3" />{tag}<X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div>
          <label htmlFor="task-new-subtask" className={LABEL_CLASS}>{t('admin.tasks.field_subtasks')}</label>
          <div className="flex gap-2">
            <input id="task-new-subtask" type="text" value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }} className={FIELD_CLASS} placeholder={t('admin.tasks.empty_subtask')} />
            <button type="button" onClick={handleAddSubtask} aria-label={t('admin.tasks.field_subtasks')} className="px-3 py-2 bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors"><PlusCircle className="w-5 h-5" /></button>
          </div>
          {formData.subtasks.length > 0 ? (
            <div className="space-y-2 mt-3">
              {formData.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-3 p-2.5 border border-neutral-200 rounded-md">
                  <input type="checkbox" checked={subtask.done} aria-label={subtask.title} onChange={() => setFormData((prev) => ({ ...prev, subtasks: prev.subtasks.map((s) => s.id === subtask.id ? { ...s, done: !s.done } : s) }))} className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400" />
                  <span className={`flex-1 text-[13px] ${subtask.done ? 'line-through text-neutral-400' : 'text-neutral-700'}`}>{subtask.title}</span>
                  <button type="button" aria-label={t('common.delete')} onClick={() => setFormData((prev) => ({ ...prev, subtasks: prev.subtasks.filter((s) => s.id !== subtask.id) }))} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 mt-3">{t('admin.tasks.no_subtasks')}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
