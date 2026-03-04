import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw } from 'lucide-react';

interface NewsAdminHeaderProps {
    onRefresh: () => void;
    onCreate: () => void;
    loading: boolean;
}

export function NewsAdminHeader({ onRefresh, onCreate, loading }: NewsAdminHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t('admin.news.title')}
                </h1>
                <p className="text-slate-500">
                    {t('admin.news.subtitle')}
                </p>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onRefresh}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title={t('common.refresh')}
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                    onClick={onCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {t('admin.news.new_article')}
                </button>
            </div>
        </div>
    );
}
