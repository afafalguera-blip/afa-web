import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw } from 'lucide-react';

interface ProjectsHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}

export function ProjectsHeader({ loading, onRefresh, onCreate }: ProjectsHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('admin.projects.title')}</h1>
        <p className="text-slate-500">{t('admin.projects.subtitle')}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title={t('common.refresh')}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('admin.projects.new_project')}
        </button>
      </div>
    </div>
  );
}
