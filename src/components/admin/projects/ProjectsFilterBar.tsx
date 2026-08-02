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
    <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-wrap gap-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
        <input
          type="text"
          placeholder={t('admin.projects.search_placeholder')}
          aria-label={t('admin.projects.search_placeholder')}
          className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>
      <select
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'archived')}
        aria-label={t('admin.status.label', 'Estat')}
        className="px-3 py-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none bg-white min-w-[180px]"
      >
        <option value="all">{t('admin.status.all', 'Tots els estats')}</option>
        <option value="active">{t('admin.status.visible', 'Publicat')}</option>
        <option value="archived">{t('admin.status.archived', 'Arxivat')}</option>
      </select>
    </div>
  );
}
