import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

interface NewsAdminFiltersProps {
    value: string;
    onChange: (value: string) => void;
}

export function NewsAdminFilters({ value, onChange }: NewsAdminFiltersProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder={t('admin.news.search_placeholder')}
                    className="w-full pl-10 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900 dark:text-white"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                />
            </div>
        </div>
    );
}
