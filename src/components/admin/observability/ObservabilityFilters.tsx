import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import type { AuditLogFacets } from '../../../services/admin/AdminObservabilityService';
import { AUDIT_ACTIONS } from '../../../services/admin/AdminObservabilityService';
import { EMPTY_FILTERS, hasActiveFilters, type ObservabilityFilterState } from './observabilityFilterState';

interface ObservabilityFiltersProps {
  filters: ObservabilityFilterState;
  facets: AuditLogFacets;
  onChange: (filters: ObservabilityFilterState) => void;
}

const FIELD_CLASS =
  'w-full px-2.5 py-1.5 rounded-md border border-neutral-200 bg-white text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-400';

export function ObservabilityFilters({ filters, facets, onChange }: ObservabilityFiltersProps) {
  const { t } = useTranslation();

  const set = <K extends keyof ObservabilityFilterState>(
    key: K,
    value: ObservabilityFilterState[K]
  ) => onChange({ ...filters, [key]: value });

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2">
          <label htmlFor="obs-search" className="block text-[11px] font-medium text-neutral-500 mb-1">
            {t('admin.observability.filters.search', 'Cercar (taula o ID)')}
          </label>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400"
              aria-hidden="true"
            />
            <input
              id="obs-search"
              type="search"
              value={filters.search}
              onChange={(event) => set('search', event.target.value)}
              placeholder={t('admin.observability.filters.search_placeholder', 'news, 8f3a…')}
              className={`${FIELD_CLASS} pl-8`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="obs-table" className="block text-[11px] font-medium text-neutral-500 mb-1">
            {t('admin.observability.filters.table', 'Taula')}
          </label>
          <select
            id="obs-table"
            value={filters.tableName}
            onChange={(event) => set('tableName', event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">{t('admin.observability.filters.all', 'Totes')}</option>
            {facets.tables.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="obs-action" className="block text-[11px] font-medium text-neutral-500 mb-1">
            {t('admin.observability.filters.action', 'Acció')}
          </label>
          <select
            id="obs-action"
            value={filters.action}
            onChange={(event) => set('action', event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">{t('admin.observability.filters.all', 'Totes')}</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="obs-user" className="block text-[11px] font-medium text-neutral-500 mb-1">
            {t('admin.observability.filters.user', 'Usuari')}
          </label>
          <select
            id="obs-user"
            value={filters.userId}
            onChange={(event) => set('userId', event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">{t('admin.observability.filters.all_users', 'Tots')}</option>
            {facets.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="obs-from" className="block text-[11px] font-medium text-neutral-500 mb-1">
              {t('admin.observability.filters.date_from', 'Des de')}
            </label>
            <input
              id="obs-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) => set('dateFrom', event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label htmlFor="obs-to" className="block text-[11px] font-medium text-neutral-500 mb-1">
              {t('admin.observability.filters.date_to', 'Fins a')}
            </label>
            <input
              id="obs-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) => set('dateTo', event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </div>

      {hasActiveFilters(filters) && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-200 bg-white text-[13px] text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {t('admin.observability.filters.clear', 'Netejar filtres')}
          </button>
        </div>
      )}
    </div>
  );
}

export default ObservabilityFilters;
