import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { COURSES } from '../../../constants/courses';
import { STATUS_FILTER } from '../../../constants/status';
import type { InscriptionFilters } from '../../../types/inscription';

interface InscriptionsFiltersProps {
  filters: InscriptionFilters;
  setFilter: <K extends keyof InscriptionFilters>(key: K, value: InscriptionFilters[K]) => void;
  onReset: () => void;
  academicYear: string;
  setAcademicYear: (year: string) => void;
  academicYears: string[];
  activityOptions: string[];
}

const controlClass =
  'h-9 rounded-md border border-neutral-300 bg-white px-3 text-[13px] text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400 transition-colors';

export function InscriptionsFilters({
  filters,
  setFilter,
  onReset,
  academicYear,
  setAcademicYear,
  academicYears,
  activityOptions
}: InscriptionsFiltersProps) {
  const { t } = useTranslation();

  const hasFilters =
    Boolean(filters.search || filters.activity || filters.course) ||
    filters.status !== STATUS_FILTER.ALL;

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-neutral-200 rounded-lg p-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden="true" />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => setFilter('search', event.target.value)}
          placeholder={t('admin.inscriptions.search_placeholder', 'Cerca per família o alumne...')}
          aria-label={t('admin.inscriptions.search_placeholder', 'Cerca per família o alumne...')}
          className={`${controlClass} w-full pl-9`}
        />
      </div>

      <select
        value={academicYear}
        onChange={(event) => setAcademicYear(event.target.value)}
        aria-label={t('admin.inscriptions.filter_academic_year', 'Curs escolar')}
        className={controlClass}
      >
        <option value="">{t('admin.inscriptions.all_academic_years', 'Tots els cursos escolars')}</option>
        {academicYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      <select
        value={filters.course}
        onChange={(event) => setFilter('course', event.target.value)}
        aria-label={t('admin.inscriptions.filter_course', 'Curs')}
        className={controlClass}
      >
        <option value="">{t('admin.dashboard.filters.all_courses', 'Tots els cursos')}</option>
        {COURSES.map((course) => (
          <option key={course.code} value={course.code}>
            {course.label}
          </option>
        ))}
      </select>

      <select
        value={filters.activity}
        onChange={(event) => setFilter('activity', event.target.value)}
        aria-label={t('admin.inscriptions.filter_activity', 'Activitat')}
        className={controlClass}
      >
        <option value="">{t('admin.dashboard.filters.all_activities', 'Totes les activitats')}</option>
        {activityOptions.map((activity) => (
          <option key={activity} value={activity}>
            {activity}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(event) => setFilter('status', event.target.value)}
        aria-label={t('admin.inscriptions.filter_status', 'Estat')}
        className={controlClass}
      >
        <option value={STATUS_FILTER.ALL}>{t('admin.inscriptions.status_all', 'Tots els estats')}</option>
        <option value="alta">{t('admin.inscriptions.status.alta', 'Alta')}</option>
        <option value="pending">{t('admin.inscriptions.status.pending', 'Pendent')}</option>
        <option value="baja">{t('admin.inscriptions.status.baja', 'Baixa')}</option>
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-neutral-300 bg-white text-[13px] text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {t('admin.inscriptions.clear_filters', 'Netejar')}
        </button>
      )}
    </div>
  );
}

export default InscriptionsFilters;
