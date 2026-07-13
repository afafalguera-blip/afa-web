/**
 * @fileoverview Admin Dashboard for managing inscriptions
 * Refactored to use custom hooks for logic separation (Midudev pattern)
 */

import { useState } from 'react';
import { Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Hooks
import { useInscriptions } from '../../../hooks/useInscriptions';
import { useFinancialStats } from '../../../hooks/useFinancialStats';

// Services
import { ExportService } from '../../../services/ExportService';

// Components
import { StatsCards } from './StatsCards';
import { FinancialStatsCards } from './FinancialStatsCards';
import { Filters } from './Filters';
import { InscriptionsTable } from './InscriptionsTable';
import { InscriptionDetailsModal } from './InscriptionDetailsModal';
import { InscriptionEditModal } from './InscriptionEditModal';

// Types
import type { InscriptionFlat } from '../../../types/inscription';

export function Dashboard() {
  const { t } = useTranslation();
  // Inscription logic extracted to custom hook
  const {
    inscriptions,
    filteredData,
    isLoading,
    filters,
    setFilter,
    academicYear,
    setAcademicYear,
    academicYears,
    activityOptions,
    reload,
    handleDelete,
    handleStatusChange,
  } = useInscriptions();

  // Stats logic extracted to custom hook, scoped to the selected cohort
  const {
    financialStats,
    shopStats,
    reload: reloadStats,
  } = useFinancialStats(academicYear);

  // Modal state (kept in component as it's UI-specific)
  const [selectedInscription, setSelectedInscription] = useState<InscriptionFlat | null>(null);
  const [editingInscription, setEditingInscription] = useState<InscriptionFlat | null>(null);

  const handleExportExcel = () => {
    ExportService.exportInscriptionsExcel(filteredData, 'full', 'Inscripcions_AFA');
  };

  const handleExportPDF = () => {
    ExportService.exportInscriptionsPDF(filteredData, 'full', 'Inscripcions_AFA');
  };

  const handleReload = () => {
    reload();
    reloadStats();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">{t('admin.dashboard.title')}</h2>
          <p className="text-neutral-500">{t('admin.dashboard.subtitle')}</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Curs"
          >
            <option value="">Tots els cursos</option>
            {academicYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={handleExportExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm font-medium"
            title={t('admin.dashboard.export_excel')}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm font-medium"
            title={t('admin.dashboard.export_pdf')}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={handleReload}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium"
          >
            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : t('admin.dashboard.update')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards inscriptions={inscriptions} />
      <FinancialStatsCards financial={financialStats} shop={shopStats} />

      {/* Table with Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        <Filters
          course={filters.course}
          setCourse={(value: string) => setFilter('course', value)}
          activity={filters.activity}
          setActivity={(value: string) => setFilter('activity', value)}
          activityOptions={activityOptions}
          status={filters.status}
          setStatus={(value: string) => setFilter('status', value)}
          search={filters.search}
          setSearch={(value: string) => setFilter('search', value)}
        />

        <InscriptionsTable
          rows={filteredData}
          loading={isLoading}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onViewDetails={setSelectedInscription}
          onEdit={setEditingInscription}
        />
      </div>

      {/* Modals */}
      <InscriptionDetailsModal
        inscription={selectedInscription}
        onClose={() => setSelectedInscription(null)}
      />

      <InscriptionEditModal
        inscription={editingInscription}
        onClose={() => setEditingInscription(null)}
        onSave={reload}
      />
    </div>
  );
}
