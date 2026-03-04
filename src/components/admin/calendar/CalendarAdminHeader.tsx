import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarAdminHeaderProps {
    currentMonth: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onRefresh: () => void;
    onCreate: () => void;
    loading: boolean;
}

export function CalendarAdminHeader({
    currentMonth,
    onPrevMonth,
    onNextMonth,
    onRefresh,
    onCreate,
    loading
}: CalendarAdminHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {t('admin.calendar.title')}
                    </h1>
                    <p className="text-slate-500">
                        {t('admin.calendar.subtitle')}
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
                        {t('admin.calendar.new_event')}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onPrevMonth}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">
                        {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h2>
                    <button
                        onClick={onNextMonth}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
