import { useTranslation } from 'react-i18next';
import { LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';

interface ExtraescolarsHeaderProps {
    viewMode: 'list' | 'calendar';
    onViewModeChange: (mode: 'list' | 'calendar') => void;
}

export function ExtraescolarsHeader({ viewMode, onViewModeChange }: ExtraescolarsHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
                <h1 className="text-2xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {t('home.extraescolars')}
                </h1>
                <p className="text-slate-400 dark:text-slate-500 text-sm lg:text-lg font-medium">
                    {t('home.course_current')}
                </p>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner inline-flex self-start">
                <button
                    onClick={() => onViewModeChange('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${viewMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <LayoutGrid className="w-4 h-4" /> {t('common.list')}
                </button>
                <button
                    onClick={() => onViewModeChange('calendar')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${viewMode === 'calendar'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <CalendarIcon className="w-4 h-4" /> {t('home.calendar')}
                </button>
            </div>
        </div>
    );
}
