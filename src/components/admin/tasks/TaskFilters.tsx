import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { TaskStatus, TaskPriority } from '../../../services/admin/AdminTasksService';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from './taskUtils';

interface TaskFiltersProps {
  searchText: string;
  setSearchText: (value: string) => void;
  statusFilter: 'all' | TaskStatus;
  setStatusFilter: (value: 'all' | TaskStatus) => void;
  priorityFilter: 'all' | TaskPriority;
  setPriorityFilter: (value: 'all' | TaskPriority) => void;
  assigneeFilter: 'all' | string;
  setAssigneeFilter: (value: 'all' | string) => void;
  assigneeOptions: string[];
  getStatusLabel: (status: TaskStatus) => string;
  getPriorityLabel: (priority: TaskPriority) => string;
}

export function TaskFilters({
  searchText, setSearchText, statusFilter, setStatusFilter,
  priorityFilter, setPriorityFilter, assigneeFilter, setAssigneeFilter,
  assigneeOptions, getStatusLabel, getPriorityLabel
}: TaskFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder={t('admin.tasks.search_placeholder')}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | TaskStatus)} className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[180px]">
        <option value="all">{t('admin.tasks.all_statuses')}</option>
        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
      </select>

      <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)} className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[180px]">
        <option value="all">{t('admin.tasks.all_priorities')}</option>
        {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{getPriorityLabel(p)}</option>)}
      </select>

      <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[200px]">
        <option value="all">{t('admin.tasks.all_assignees')}</option>
        {assigneeOptions.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
    </div>
  );
}
