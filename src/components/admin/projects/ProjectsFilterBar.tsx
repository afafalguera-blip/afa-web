import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

interface ProjectsFilterBarProps {
  searchText: string;
  setSearchText: (value: string) => void;
  statusFilter: 'all' | 'active' | 'archived';
  setStatusFilter: (value: 'all' | 'active' | 'archived') => void;
}

export function ProjectsFilterBar({
  searchText, setSearchText, statusFilter, setStatusFilter
}: ProjectsFilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder={t('admin.projects.search_placeholder')}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>
      <select
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'archived')}
        className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
      >
        <option value="all">{t('admin.projects.status_all')}</option>
        <option value="active">{t('admin.projects.status_active')}</option>
        <option value="archived">{t('admin.projects.status_archived')}</option>
      </select>
    </div>
  );
}
