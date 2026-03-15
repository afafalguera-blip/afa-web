import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Edit,
  ListChecks,
  Loader2,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  User,
  X
} from 'lucide-react';
import {
  AdminTasksService,
  type AdminTask,
  type TaskFormData,
  type TaskPriority,
  type TaskSubtask,
  type TaskStatus
} from '../../services/admin/AdminTasksService';
import { getRegionalLanguageTag } from '../../utils/locale';

const STATUS_ORDER: Record<TaskStatus, number> = {
  pending: 0,
  in_progress: 1,
  blocked: 2,
  done: 3
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3
};

const createDefaultFormData = (): TaskFormData => ({
  title: '',
  description: '',
  status: 'pending',
  priority: 'medium',
  due_date: '',
  assignee_name: '',
  tags: [],
  subtasks: []
});

const getTodayIso = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export default function TasksManager() {
  const { t, i18n } = useTranslation();
  const nativeDateLocale = getRegionalLanguageTag(i18n.resolvedLanguage || i18n.language);

  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(createDefaultFormData());
  const [newTagInput, setNewTagInput] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all');

  const statusOptions: TaskStatus[] = ['pending', 'in_progress', 'blocked', 'done'];
  const priorityOptions: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  const resolvedLanguage = (i18n.resolvedLanguage || i18n.language || '').toLowerCase();
  const getFallbackByLocale = useCallback(
    (caText: string, esText: string, enText: string) => {
      if (resolvedLanguage.startsWith('ca')) return caText;
      if (resolvedLanguage.startsWith('es')) return esText;

      return enText;
    },
    [resolvedLanguage]
  );

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return t('admin.tasks.status_pending');
      case 'in_progress':
        return t('admin.tasks.status_in_progress');
      case 'blocked':
        return t('admin.tasks.status_blocked');
      case 'done':
        return t('admin.tasks.status_done');
    }
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case 'low':
        return t('admin.tasks.priority_low');
      case 'medium':
        return t('admin.tasks.priority_medium');
      case 'high':
        return t('admin.tasks.priority_high');
      case 'urgent':
        return t('admin.tasks.priority_urgent');
    }
  };

  const isTaskOverdue = useCallback((task: AdminTask) => {
    return Boolean(task.due_date && task.status !== 'done' && task.due_date < getTodayIso());
  }, []);

  const formatDate = useCallback((value?: string | null) => {
    if (!value) return t('admin.tasks.no_due_date');

    return new Date(`${value}T00:00:00`).toLocaleDateString(nativeDateLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, [nativeDateLocale, t]);

  const createSubtask = useCallback((title: string): TaskSubtask => {
    const trimmedTitle = title.trim();
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    return { id, title: trimmedTitle, done: false };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const tasksData = await AdminTasksService.getTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      alert(t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = () => {
    setEditingTask(null);
    setFormData(createDefaultFormData());
    setNewTagInput('');
    setNewSubtaskTitle('');
    setIsModalOpen(true);
  };

  const handleEdit = (task: AdminTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || '',
      assignee_name: task.assignee_name || '',
      tags: task.tags || [],
      subtasks: task.subtasks || []
    });
    setNewTagInput('');
    setNewSubtaskTitle('');
    setIsModalOpen(true);
  };

  const handleAddTag = () => {
    const tag = newTagInput.trim().replace(/^#/, '');
    if (!tag) return;

    const alreadyExists = formData.tags.some(
      (existingTag) => existingTag.toLowerCase() === tag.toLowerCase()
    );
    if (alreadyExists) {
      setNewTagInput('');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, tag]
    }));
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove)
    }));
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, createSubtask(newSubtaskTitle)]
    }));
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((subtask) =>
        subtask.id === subtaskId
          ? { ...subtask, done: !subtask.done }
          : subtask
      )
    }));
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((subtask) => subtask.id !== subtaskId)
    }));
  };

  const toggleTaskSubtasks = (taskId: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert(t('admin.tasks.title_required'));
      return;
    }

    setSaving(true);

    try {
      await AdminTasksService.saveTask(formData, editingTask?.id);
      setIsModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving task:', error);
      alert(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm(t('admin.tasks.delete_confirm'))) return;

    try {
      await AdminTasksService.deleteTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      if (editingTask?.id === taskId) {
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(t('common.error_delete'));
    }
  };

  const handleQuickStatusChange = async (taskId: string, status: TaskStatus) => {
    setUpdatingTaskId(taskId);

    try {
      await AdminTasksService.updateStatus(taskId, status);
      await fetchData();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert(t('common.error_save'));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesSearch =
          !searchText ||
          task.title.toLowerCase().includes(searchText.toLowerCase()) ||
          (task.description || '').toLowerCase().includes(searchText.toLowerCase());

        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        const matchesAssignee = assigneeFilter === 'all' || task.assignee_name === assigneeFilter;

        return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
      })
      .sort((a, b) => {
        const overdueDiff = Number(isTaskOverdue(b)) - Number(isTaskOverdue(a));
        if (overdueDiff !== 0) return overdueDiff;

        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;

        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        if (a.due_date && b.due_date) {
          return a.due_date.localeCompare(b.due_date);
        }

        if (a.due_date) return -1;
        if (b.due_date) return 1;

        return b.created_at.localeCompare(a.created_at);
      });
  }, [assigneeFilter, isTaskOverdue, priorityFilter, searchText, statusFilter, tasks]);

  const stats = useMemo(() => {
    return {
      open: tasks.filter((task) => task.status !== 'done').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      overdue: tasks.filter((task) => isTaskOverdue(task)).length,
      completed: tasks.filter((task) => task.status === 'done').length
    };
  }, [isTaskOverdue, tasks]);

  const assigneeOptions = useMemo(() => {
    return Array.from(
      new Set(tasks.map((task) => task.assignee_name?.trim() || '').filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const statusClasses: Record<TaskStatus, string> = {
    pending: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    blocked: 'bg-amber-100 text-amber-700',
    done: 'bg-emerald-100 text-emerald-700'
  };

  const priorityClasses: Record<TaskPriority, string> = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-sky-100 text-sky-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-rose-100 text-rose-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.tasks.title')}</h1>
          <p className="text-slate-500">{t('admin.tasks.subtitle')}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('admin.tasks.new_task')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t('admin.tasks.open_tasks')}</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{stats.open}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t('admin.tasks.in_progress_count')}</p>
          <p className="text-3xl font-black text-blue-600 mt-2">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t('admin.tasks.overdue_count')}</p>
          <p className="text-3xl font-black text-amber-600 mt-2">{stats.overdue}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t('admin.tasks.completed_count')}</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">{stats.completed}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t('admin.tasks.search_placeholder')}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | TaskStatus)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[180px]"
        >
          <option value="all">{t('admin.tasks.all_statuses')}</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value as 'all' | TaskPriority)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[180px]"
        >
          <option value="all">{t('admin.tasks.all_priorities')}</option>
          {priorityOptions.map((priority) => (
            <option key={priority} value={priority}>
              {getPriorityLabel(priority)}
            </option>
          ))}
        </select>

        <select
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[200px]"
        >
          <option value="all">{t('admin.tasks.all_assignees')}</option>
          {assigneeOptions.map((assigneeName) => (
            <option key={assigneeName} value={assigneeName}>
              {assigneeName}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 shadow-sm">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          {searchText || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'
            ? t('admin.tasks.no_results')
            : t('admin.tasks.no_tasks')}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredTasks.map((task) => {
            const overdue = isTaskOverdue(task);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${
                  overdue ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 truncate">{task.title}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusClasses[task.status]}`}>
                        {getStatusLabel(task.status)}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${priorityClasses[task.priority]}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                      {overdue && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          {t('admin.tasks.overdue_badge')}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{task.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {t('admin.tasks.field_due_date')}: {formatDate(task.due_date)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        {t('admin.tasks.field_assignee')}: {task.assignee_name || t('admin.tasks.unassigned')}
                      </span>
                    </div>

                    {task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {task.subtasks.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm text-slate-500 inline-flex items-center gap-2">
                          <ListChecks className="w-4 h-4" />
                          {task.subtasks.filter((subtask) => subtask.done).length}/{task.subtasks.length} {t('admin.tasks.subtasks_progress')}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTaskSubtasks(task.id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          {expandedTaskIds[task.id] ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              {t('admin.tasks.hide_subtasks', {
                                defaultValue: getFallbackByLocale('Amagar subtasques', 'Ocultar subtareas', 'Hide subtasks')
                              })}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              {t('admin.tasks.view_subtasks', {
                                defaultValue: getFallbackByLocale('Veure subtasques', 'Ver subtareas', 'View subtasks')
                              })}
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {expandedTaskIds[task.id] && (
                      <div className="mt-1 p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                        <p className="text-xs font-semibold text-slate-500 mb-2">{t('admin.tasks.field_subtasks')}</p>
                        {task.subtasks.length > 0 ? (
                          <div className="space-y-1.5">
                            {task.subtasks.map((subtask) => (
                              <div key={subtask.id} className="flex items-center gap-2 text-sm">
                                <span className={`w-2.5 h-2.5 rounded-full ${subtask.done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className={subtask.done ? 'line-through text-slate-400' : 'text-slate-700'}>
                                  {subtask.title}
                                </span>
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
                    <button
                      onClick={() => handleEdit(task)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center gap-3">
                  <select
                    value={task.status}
                    onChange={(event) => handleQuickStatusChange(task.id, event.target.value as TaskStatus)}
                    disabled={updatingTaskId === task.id}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[210px] disabled:opacity-60"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </select>

                  {task.status !== 'done' ? (
                    <button
                      onClick={() => handleQuickStatusChange(task.id, 'done')}
                      disabled={updatingTaskId === task.id}
                      className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
                    >
                      {updatingTaskId === task.id ? t('common.saving') : t('admin.tasks.mark_done')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleQuickStatusChange(task.id, 'pending')}
                      disabled={updatingTaskId === task.id}
                      className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-60"
                    >
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
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingTask ? t('admin.tasks.edit_task') : t('admin.tasks.new_task')}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-170px)]">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.tasks.field_title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={t('admin.tasks.empty_title')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.tasks.field_description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder={t('admin.tasks.empty_description')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('admin.tasks.field_status')}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as TaskStatus }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('admin.tasks.field_priority')}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(event) => setFormData((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {getPriorityLabel(priority)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('admin.tasks.field_due_date')}
                  </label>
                  <input
                    type="date"
                    lang={nativeDateLocale}
                    value={formData.due_date}
                    onChange={(event) => setFormData((prev) => ({ ...prev, due_date: event.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('admin.tasks.field_assignee')}
                  </label>
                  <input
                    type="text"
                    value={formData.assignee_name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, assignee_name: event.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={t('admin.tasks.empty_assignee')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('admin.tasks.field_tags')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(event) => setNewTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={t('admin.tasks.empty_tag')}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold hover:bg-fuchsia-200 transition-colors"
                        title={t('admin.tasks.remove_tag')}
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('admin.tasks.field_subtasks')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(event) => setNewSubtaskTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={t('admin.tasks.empty_subtask')}
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                </div>

                {formData.subtasks.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {formData.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl"
                      >
                        <input
                          type="checkbox"
                          checked={subtask.done}
                          onChange={() => handleToggleSubtask(subtask.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`flex-1 text-sm ${subtask.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {subtask.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-3">{t('admin.tasks.no_subtasks')}</p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
