import { Search, FolderOpen, FileText, File } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DOCUMENT_CATEGORIES = [
    { id: 'all', labelKey: 'documents.categories.all', icon: FolderOpen },
    { id: 'actes', labelKey: 'documents.categories.actes', icon: FileText },
    { id: 'normativa', labelKey: 'documents.categories.normativa', icon: File },
    { id: 'general', labelKey: 'documents.categories.general', icon: FileText },
    { id: 'menjador', labelKey: 'documents.categories.menjador', icon: FileText },
    { id: 'extraescolars', labelKey: 'documents.categories.extraescolars', icon: FileText }
];

interface DocumentFiltersProps {
    activeCategory: string;
    setActiveCategory: (category: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export function DocumentFilters({
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery
}: DocumentFiltersProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-center">
            {/* Categories */}
            <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 w-full md:w-auto no-scrollbar mask-gradient">
                {DOCUMENT_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${activeCategory === cat.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        <cat.icon className="w-4 h-4" />
                        <span className="font-bold text-sm">
                            {t(cat.labelKey)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder={t('documents.search_placeholder', 'Cercar documents...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>
    );
}
