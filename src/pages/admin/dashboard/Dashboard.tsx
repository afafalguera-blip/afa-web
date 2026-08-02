/**
 * @fileoverview Admin dashboard: statistics only.
 * Inscription management (listing, filters, edit, delete, export) lives in
 * `/admin/inscriptions` — this page no longer duplicates it.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, LayoutDashboard } from 'lucide-react';

import { AdminPageHeader } from '../../../components/admin/common/AdminPageHeader';
import { useFinancialStats } from '../../../hooks/useFinancialStats';
import { AdminInscriptionsService } from '../../../services/admin/AdminInscriptionsService';
import { ConfigService } from '../../../services/ConfigService';

import { StatsCards } from './StatsCards';
import { FinancialStatsCards } from './FinancialStatsCards';

export function Dashboard() {
  const { t } = useTranslation();
  const [academicYear, setAcademicYear] = useState('');
  const [academicYears, setAcademicYears] = useState<string[]>([]);

  // Cohort selector: defaults to the active season.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, season] = await Promise.all([
          AdminInscriptionsService.getAcademicYears(),
          ConfigService.getSeasonConfig()
        ]);
        if (cancelled) return;
        setAcademicYears(list);
        setAcademicYear(
          season?.active_year && list.includes(season.active_year) ? season.active_year : list[0] || ''
        );
      } catch (err) {
        console.error('Error loading academic years:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { inscriptionStats, financialStats, shopStats, isLoading, reload } =
    useFinancialStats(academicYear);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.dashboard.title')}
        subtitle={t('admin.dashboard.subtitle')}
        icon={LayoutDashboard}
        loading={isLoading}
        onRefresh={reload}
        actions={
          <select
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            aria-label={t('admin.inscriptions.filter_academic_year', 'Curs escolar')}
            className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-[13px] text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-900/20"
          >
            <option value="">{t('admin.inscriptions.all_academic_years', 'Tots els cursos escolars')}</option>
            {academicYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        }
      />

      <StatsCards stats={inscriptionStats} />
      <FinancialStatsCards financial={financialStats} shop={shopStats} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-neutral-200 rounded-lg p-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-neutral-900">
            {t('admin.dashboard.manage_inscriptions_title', 'Gestió d’inscripcions')}
          </h2>
          <p className="text-[13px] text-neutral-500">
            {t(
              'admin.dashboard.manage_inscriptions_subtitle',
              'Consulta, edita i exporta totes les inscripcions des de la pantalla dedicada.'
            )}
          </p>
        </div>
        <Link
          to="/admin/inscriptions"
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium transition-colors flex-shrink-0"
        >
          {t('admin.dashboard.manage_inscriptions_cta', 'Anar a inscripcions')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
