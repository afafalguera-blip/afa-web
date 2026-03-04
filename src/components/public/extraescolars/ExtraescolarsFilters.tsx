import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CategoryUtils } from '../../../utils/CategoryUtils';

interface ExtraescolarsFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
    categories: string[];
}

export function ExtraescolarsFilters({
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    categories
}: ExtraescolarsFiltersProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 hidden md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder={t('common.search')}
                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => onCategoryChange(cat)}
                        className={`px-4 py-1.5 lg:px-5 lg:py-2 rounded-full text-xs lg:text-sm font-bold whitespace-nowrap transition-all border ${selectedCategory === cat
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
                            }`}
                    >
                        {CategoryUtils.translate(t, cat)}
                    </button>
                ))}
            </div>
        </div>
    );
}
