import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { COURSES } from '../../../constants/courses';
import {
  ACOLLIDA_WEEKDAYS,
  WEEKDAY_I18N_KEYS,
  type AcollidaFilters,
  type AcollidaRate,
} from '../../../types/acollida';

interface Props {
  filters: AcollidaFilters;
  setFilter: <K extends keyof AcollidaFilters>(key: K, value: AcollidaFilters[K]) => void;
  onReset: () => void;
  academicYear: string;
  setAcademicYear: (year: string) => void;
  academicYears: string[];
  rates: AcollidaRate[];
}

const controlClass =
  'h-9 rounded-md border border-neutral-300 bg-white px-3 text-[13px] text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400 transition-colors';

export function RequestsFilters({
  filters,
  setFilter,
  onReset,
  academicYear,
  setAcademicYear,
  academicYears,
  rates,
}: Props) {
  const { t } = useTranslation();

  const hasFilters = Boolean(
    filters.search || filters.course || filters.rateId || filters.modality || filters.weekday || filters.status,
  );

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-neutral-200 rounded-lg p-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden="true" />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder={t('admin.acollida_requests.search_placeholder', 'Cerca per infant, família o contacte...')}
          aria-label={t('admin.acollida_requests.search_placeholder', 'Cerca per infant, família o contacte...')}
          className={`${controlClass} w-full pl-9`}
        />
      </div>

      <select
        value={academicYear}
        onChange={(e) => setAcademicYear(e.target.value)}
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
        onChange={(e) => setFilter('course', e.target.value)}
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
        value={filters.rateId}
        onChange={(e) => setFilter('rateId', e.target.value)}
        aria-label={t('admin.acollida_requests.filter_slot', 'Franja')}
        className={controlClass}
      >
        <option value="">{t('admin.acollida_requests.all_slots', 'Totes les franges')}</option>
        {rates.map((rate) => (
          <option key={rate.id} value={rate.id}>
            {rate.horari}
          </option>
        ))}
      </select>

      <select
        value={filters.modality}
        onChange={(e) => setFilter('modality', e.target.value)}
        aria-label={t('admin.acollida_requests.filter_modality', 'Modalitat')}
        className={controlClass}
      >
        <option value="">{t('admin.acollida_requests.all_modalities', 'Mensual i dies solts')}</option>
        <option value="mensual">{t('admin.acollida_requests.modality_monthly', 'Mensual')}</option>
        <option value="ocasional">{t('admin.acollida_requests.modality_occasional', 'Dies solts')}</option>
      </select>

      {/* «Qui ve dimarts» és la pregunta que fan els monitors cada setmana. */}
      <select
        value={filters.weekday}
        onChange={(e) => setFilter('weekday', e.target.value)}
        aria-label={t('admin.acollida_requests.filter_weekday', 'Dia de la setmana')}
        className={controlClass}
      >
        <option value="">{t('admin.acollida_requests.all_weekdays', 'Qualsevol dia')}</option>
        {ACOLLIDA_WEEKDAYS.map((day) => (
          <option key={day} value={String(day)}>
            {t(WEEKDAY_I18N_KEYS[day])}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => setFilter('status', e.target.value)}
        aria-label={t('admin.inscriptions.filter_status', 'Estat')}
        className={controlClass}
      >
        <option value="">{t('admin.inscriptions.status_all', 'Tots els estats')}</option>
        <option value="pendent">{t('admin.acollida_requests.status.pendent', 'Pendent')}</option>
        <option value="confirmada">{t('admin.acollida_requests.status.confirmada', 'Confirmada')}</option>
        <option value="baixa">{t('admin.acollida_requests.status.baixa', 'Baixa')}</option>
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

export default RequestsFilters;
