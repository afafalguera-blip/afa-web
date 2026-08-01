import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { getRegionalLanguageTag } from '../../../utils/locale';
import type { NewsPublishedFilter } from '../../../services/admin/AdminNewsService';

interface NewsAdminFiltersProps {
    value: string;
    onChange: (value: string) => void;
    dateFrom: string;
    dateTo: string;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    publishedFilter: NewsPublishedFilter;
    onPublishedFilterChange: (value: NewsPublishedFilter) => void;
}

export function NewsAdminFilters({
    value,
    onChange,
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    publishedFilter,
    onPublishedFilterChange
}: NewsAdminFiltersProps) {
    const { t, i18n } = useTranslation();
    const nativeDateLocale = getRegionalLanguageTag(i18n.resolvedLanguage || i18n.language);

    return (
        <div className="bg-white p-4 rounded-lg border border-neutral-200">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t('admin.news.search_placeholder')}
                        aria-label={t('admin.news.search_placeholder')}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none text-neutral-900"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="news-status" className="text-xs font-medium text-neutral-500">
                        {t('admin.status.label', 'Estat')}
                    </label>
                    <select
                        id="news-status"
                        value={publishedFilter}
                        onChange={e => onPublishedFilterChange(e.target.value as NewsPublishedFilter)}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none text-neutral-900"
                    >
                        <option value="all">{t('admin.status.all', 'Tots els estats')}</option>
                        <option value="published">{t('admin.status.visible', 'Publicat')}</option>
                        <option value="draft">{t('admin.status.draft', 'Esborrany')}</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="news-date-from" className="text-xs font-medium text-neutral-500">
                        {t('admin.news.date_from', 'Desde')}
                    </label>
                    <input
                        id="news-date-from"
                        type="date"
                        lang={nativeDateLocale}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none text-neutral-900"
                        value={dateFrom}
                        max={dateTo || undefined}
                        onChange={e => onDateFromChange(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="news-date-to" className="text-xs font-medium text-neutral-500">
                        {t('admin.news.date_to', 'Hasta')}
                    </label>
                    <input
                        id="news-date-to"
                        type="date"
                        lang={nativeDateLocale}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none text-neutral-900"
                        value={dateTo}
                        min={dateFrom || undefined}
                        onChange={e => onDateToChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
