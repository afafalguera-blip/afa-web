import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Tag, Trash2, X } from 'lucide-react';
import type { TaskFormData, TaskStatus, TaskPriority, TaskSubtask } from '../../../services/admin/AdminTasksService';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from './taskUtils';

interface TaskFormModalProps {
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

const createSubtask = (title: string): TaskSubtask => {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
  return { id, title: title.trim(), done: false };
};

export function TaskFormModal({
  isEditing, formData, setFormData, saving, nativeDateLocale,
  getStatusLabel, getPriorityLabel, onSave, onClose
}: TaskFormModalProps) {
  const { t } = useTranslation();
  const [newTagInput, setNewTagInput] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleAddTag = () => {
    const tag = newTagInput.trim().replace(/^#/, '');
    if (!tag || formData.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? t('admin.tasks.edit_task') : t('admin.tasks.new_task')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-170px)]">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.tasks.field_title')} *</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder={t('admin.tasks.empty_title')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.tasks.field_description')}</label>
            <textarea value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={4} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder={t('admin.tasks.empty_description')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.tasks.field_status')}</label>
              <select value={formData.status} onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as TaskStatus }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.tasks.field_priority')}</label>
              <select value={formData.priority} onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as TaskPriority }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{getPriorityLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.tasks.field_due_date')}</label>
              <input type="date" lang={nativeDateLocale} value={formData.due_date} onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.tasks.field_assignee')}</label>
              <input type="text" value={formData.assignee_name} onChange={(e) => setFormData((prev) => ({ ...prev, assignee_name: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder={t('admin.tasks.empty_assignee')} />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('admin.tasks.field_tags')}</label>
            <div className="flex gap-2">
              <input type="text" value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder={t('admin.tasks.empty_tag')} />
              <button type="button" onClick={handleAddTag} className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"><PlusCircle className="w-5 h-5" /></button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.tags.map((tag) => (
                  <button key={tag} type="button" onClick={() => setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold hover:bg-fuchsia-200 transition-colors" title={t('admin.tasks.remove_tag')}>
                    <Tag className="w-3 h-3" />{tag}<X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('admin.tasks.field_subtasks')}</label>
            <div className="flex gap-2">
              <input type="text" value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder={t('admin.tasks.empty_subtask')} />
              <button type="button" onClick={handleAddSubtask} className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"><PlusCircle className="w-5 h-5" /></button>
            </div>
            {formData.subtasks.length > 0 ? (
              <div className="space-y-2 mt-3">
                {formData.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
                    <input type="checkbox" checked={subtask.done} onChange={() => setFormData((prev) => ({ ...prev, subtasks: prev.subtasks.map((s) => s.id === subtask.id ? { ...s, done: !s.done } : s) }))} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className={`flex-1 text-sm ${subtask.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{subtask.title}</span>
                    <button type="button" onClick={() => setFormData((prev) => ({ ...prev, subtasks: prev.subtasks.filter((s) => s.id !== subtask.id) }))} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-3">{t('admin.tasks.no_subtasks')}</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">{t('common.cancel')}</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
