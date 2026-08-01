import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ListTodo, Loader2 } from 'lucide-react';
import {
  AdminTasksService,
  type AdminTask,
  type TaskFormData,
  type TaskPriority,
  type TaskStatus
} from '../../services/admin/AdminTasksService';
import { getRegionalLanguageTag } from '../../utils/locale';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useDirtyGuard } from '../../hooks/useDirtyGuard';
import { STATUS_ORDER, PRIORITY_ORDER, isTaskOverdue } from '../../components/admin/tasks/taskUtils';
import { TaskStatsBar } from '../../components/admin/tasks/TaskStatsBar';
import { TaskFilters } from '../../components/admin/tasks/TaskFilters';
import { TaskCard } from '../../components/admin/tasks/TaskCard';
import { TaskFormModal } from '../../components/admin/tasks/TaskFormModal';

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

export default function TasksManager() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();
  const nativeDateLocale = getRegionalLanguageTag(i18n.resolvedLanguage || i18n.language);
  const resolvedLanguage = (i18n.resolvedLanguage || i18n.language || '').toLowerCase();

  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(createDefaultFormData());
  const [formSnapshot, setFormSnapshot] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all');

  const isDirty = isModalOpen && JSON.stringify(formData) !== formSnapshot;
  const { confirmDiscard } = useDirtyGuard(isDirty);

  const getFallbackByLocale = useCallback(
    (ca: string, es: string, en: string) => {
      if (resolvedLanguage.startsWith('ca')) return ca;
      if (resolvedLanguage.startsWith('es')) return es;
      return en;
    },
    [resolvedLanguage]
  );

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'pending': return t('admin.tasks.status_pending');
      case 'in_progress': return t('admin.tasks.status_in_progress');
      case 'blocked': return t('admin.tasks.status_blocked');
      case 'done': return t('admin.tasks.status_done');
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return t('admin.tasks.priority_low');
      case 'medium': return t('admin.tasks.priority_medium');
      case 'high': return t('admin.tasks.priority_high');
      case 'urgent': return t('admin.tasks.priority_urgent');
      default: return priority;
    }
  };

  const formatDate = useCallback((value?: string | null) => {
    if (!value) return t('admin.tasks.no_due_date');
    return new Date(`${value}T00:00:00`).toLocaleDateString(nativeDateLocale, { day: '2-digit', month: 'short', year: 'numeric' });
  }, [nativeDateLocale, t]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await AdminTasksService.getTasks());
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error(t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (task: AdminTask | null, data: TaskFormData) => {
    setEditingTask(task);
    setFormData(data);
    setFormSnapshot(JSON.stringify(data));
    setIsModalOpen(true);
  };

  const handleCreate = () => openModal(null, createDefaultFormData());

  const handleEdit = (task: AdminTask) => {
    openModal(task, {
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || '',
      assignee_name: task.assignee_name || '',
      tags: task.tags || [],
      subtasks: task.subtasks || []
    });
  };

  const handleCloseModal = async () => {
    if (!(await confirmDiscard())) return;
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error(t('admin.tasks.title_required'));
      return;
    }
    setSaving(true);
    try {
      await AdminTasksService.saveTask(formData, editingTask?.id);
      setFormSnapshot(JSON.stringify(formData));
      setIsModalOpen(false);
      toast.success(t('admin.tasks.saved', 'Tasca desada'));
      await fetchData();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    const accepted = await confirm({
      title: t('admin.tasks.delete_confirm'),
      itemName: task?.title,
      confirmLabel: t('common.delete'),
      destructive: true
    });
    if (!accepted) return;

    try {
      await AdminTasksService.deleteTask(taskId);
      setTasks((prev) => prev.filter((item) => item.id !== taskId));
      if (editingTask?.id === taskId) setIsModalOpen(false);
      toast.success(t('admin.tasks.deleted', 'Tasca eliminada'));
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error(t('common.error_delete'));
    }
  };

  const handleQuickStatusChange = async (taskId: string, status: TaskStatus) => {
    setUpdatingTaskId(taskId);
    try {
      await AdminTasksService.updateStatus(taskId, status);
      await fetchData();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error(t('common.error_save'));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesSearch = !searchText || task.title.toLowerCase().includes(searchText.toLowerCase()) || (task.description || '').toLowerCase().includes(searchText.toLowerCase());
        return matchesSearch && (statusFilter === 'all' || task.status === statusFilter) && (priorityFilter === 'all' || task.priority === priorityFilter) && (assigneeFilter === 'all' || task.assignee_name === assigneeFilter);
      })
      .sort((a, b) => {
        const overdueDiff = Number(isTaskOverdue(b)) - Number(isTaskOverdue(a));
        if (overdueDiff !== 0) return overdueDiff;
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [assigneeFilter, priorityFilter, searchText, statusFilter, tasks]);

  const stats = useMemo(() => ({
    open: tasks.filter((task) => task.status !== 'done').length,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    overdue: tasks.filter((task) => isTaskOverdue(task)).length,
    completed: tasks.filter((task) => task.status === 'done').length
  }), [tasks]);

  const assigneeOptions = useMemo(() =>
    Array.from(new Set(tasks.map((task) => task.assignee_name?.trim() || '').filter(Boolean))).sort((a, b) => a.localeCompare(b)),
  [tasks]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.tasks.title')}
        subtitle={t('admin.tasks.subtitle')}
        icon={ListTodo}
        loading={loading}
        onRefresh={fetchData}
        onCreate={handleCreate}
        createLabel={t('admin.tasks.new_task')}
      />

      <TaskStatsBar stats={stats} />

      <TaskFilters
        searchText={searchText} setSearchText={setSearchText}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
        assigneeFilter={assigneeFilter} setAssigneeFilter={setAssigneeFilter}
        assigneeOptions={assigneeOptions}
        getStatusLabel={getStatusLabel} getPriorityLabel={getPriorityLabel}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-10 text-center text-neutral-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          {searchText || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' ? t('admin.tasks.no_results') : t('admin.tasks.no_tasks')}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              updatingTaskId={updatingTaskId}
              nativeDateLocale={nativeDateLocale}
              getStatusLabel={getStatusLabel}
              getPriorityLabel={getPriorityLabel}
              formatDate={formatDate}
              getFallbackByLocale={getFallbackByLocale}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onQuickStatusChange={handleQuickStatusChange}
            />
          ))}
        </div>
      )}

      <TaskFormModal
        open={isModalOpen}
        isEditing={Boolean(editingTask)}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        nativeDateLocale={nativeDateLocale}
        getStatusLabel={getStatusLabel}
        getPriorityLabel={getPriorityLabel}
        onSave={handleSave}
        onClose={handleCloseModal}
      />
    </div>
  );
}
