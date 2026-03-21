import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { getRegionalLanguageTag } from '../../../utils/locale';

interface NewsAdminFiltersProps {
    value: string;
    onChange: (value: string) => void;
    dateFrom: string;
    dateTo: string;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
}

export function NewsAdminFilters({
    value,
    onChange,
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange
}: NewsAdminFiltersProps) {
    const { t, i18n } = useTranslation();
    const nativeDateLocale = getRegionalLanguageTag(i18n.resolvedLanguage || i18n.language);

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t('admin.news.search_placeholder')}
                        className="w-full pl-10 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900 dark:text-white"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="news-date-from" className="text-xs font-medium text-slate-500">
                        {t('admin.news.date_from', 'Desde')}
                    </label>
                    <input
                        id="news-date-from"
                        type="date"
                        lang={nativeDateLocale}
                        className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900 dark:text-white"
                        value={dateFrom}
                        max={dateTo || undefined}
                        onChange={e => onDateFromChange(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="news-date-to" className="text-xs font-medium text-slate-500">
                        {t('admin.news.date_to', 'Hasta')}
                    </label>
                    <input
                        id="news-date-to"
                        type="date"
                        lang={nativeDateLocale}
                        className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-900 dark:text-white"
                        value={dateTo}
                        min={dateFrom || undefined}
                        onChange={e => onDateToChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
