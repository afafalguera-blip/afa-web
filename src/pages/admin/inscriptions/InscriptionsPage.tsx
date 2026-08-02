import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, FileSpreadsheet, Pencil, Trash2, Users } from 'lucide-react';

import { AdminPageHeader } from '../../../components/admin/common/AdminPageHeader';
import {
  AdminTable,
  AdminPagination,
  type AdminTableColumn
} from '../../../components/admin/common/AdminTable';
import { useToast } from '../../../components/common/Toast';
import { EditInscriptionModal } from '../../../components/admin/inscriptions/EditInscriptionModal';
import { ExportOptionsModal, type ExportFormat, type ExportType } from '../../../components/admin/inscriptions/ExportOptionsModal';
import { InscriptionDetailsModal } from '../../../components/admin/inscriptions/InscriptionDetailsModal';
import { InscriptionsFilters } from './InscriptionsFilters';

import { useInscriptions } from '../../../hooks/useInscriptions';
import { ExportService } from '../../../services/ExportService';
import { COURSE_BY_CODE, isCourseCode } from '../../../constants/courses';
import type { Inscription, InscriptionStatus } from '../../../types/inscription';

const STATUS_BADGE: Record<string, string> = {
  alta: 'bg-green-100 text-green-800',
  active: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  suspended: 'bg-amber-100 text-amber-800',
  baja: 'bg-red-100 text-red-800'
};

const courseLabel = (code?: string): string =>
  code && isCourseCode(code) ? COURSE_BY_CODE[code].label : code || '';

export default function InscriptionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const {
    inscriptions,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    error,
    filters,
    setFilter,
    resetFilters,
    academicYear,
    setAcademicYear,
    academicYears,
    activityOptions,
    customLabels,
    reload,
    removeInscription,
    saveInscription,
    changeStatus,
    fetchAllFiltered
  } = useInscriptions();

  const [detailsTarget, setDetailsTarget] = useState<Inscription | null>(null);
  const [editTarget, setEditTarget] = useState<Inscription | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: ExportFormat, type: ExportType) => {
    setExporting(true);
    try {
      // The export must cover every filtered record, not just the visible page.
      const rows = await fetchAllFiltered();
      const fields = type === 'full' ? 'full' : 'basic';
      if (format === 'excel') {
        ExportService.exportInscriptionsExcel(rows, fields, 'Inscripcions_AFA');
      } else {
        ExportService.exportInscriptionsPDF(rows, fields, 'Inscripcions_AFA');
      }
      setExportOpen(false);
    } catch (err) {
      console.error('Error exporting inscriptions:', err);
      toast.error(t('admin.inscriptions.export_error', "Error en generar l'exportació"));
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo<AdminTableColumn<Inscription>[]>(
    () => [
      {
        key: 'parent',
        header: t('admin.inscriptions.table.parent', 'Família'),
        render: (row) => (
          <div className="min-w-0">
            <div className="font-medium text-neutral-900">{row.parent_name || '—'}</div>
            <div className="text-[12px] text-neutral-500">{row.parent_dni}</div>
            {row.afa_member && (
              <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-admin-accent text-white text-[10px] font-semibold uppercase">
                {t('admin.inscriptions.member_badge', 'Soci AFA')}
              </span>
            )}
          </div>
        )
      },
      {
        key: 'contact',
        header: t('admin.inscriptions.table.contact', 'Contacte'),
        render: (row) => (
          <div className="text-[12px] text-neutral-600">
            <div className="break-all">{row.parent_email_1}</div>
            <div>{row.parent_phone_1}</div>
          </div>
        )
      },
      {
        key: 'students',
        header: t('admin.inscriptions.table.students', 'Alumnes'),
        render: (row) => (
          <div className="space-y-1.5">
            {row.students.length === 0 && (
              <span className="text-[12px] text-neutral-400">
                {t('admin.inscriptions.no_students', 'Sense alumnes')}
              </span>
            )}
            {row.students.map((student, idx) => (
              <div key={idx} className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] text-neutral-800">
                    {student.name} {student.surname}
                  </span>
                  <span className="text-[11px] text-neutral-400">{courseLabel(student.course)}</span>
                  {student.suspended && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                      {t('admin.inscriptions.suspended_badge', 'Suspès')}
                    </span>
                  )}
                </div>
                {(student.activities || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {student.activities.map((activity) => (
                      <span
                        key={activity}
                        className="px-1.5 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-[10px] text-neutral-600"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {row.extra_answers && Object.keys(row.extra_answers).length > 0 && (
              <div className="pt-1 border-t border-dashed border-neutral-200 space-y-0.5">
                {Object.entries(row.extra_answers)
                  .filter(([, value]) => value)
                  .map(([key, value]) => (
                    <p key={key} className="text-[10px] text-neutral-500">
                      <span className="font-semibold">{customLabels[key] || key}:</span> {String(value)}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )
      },
      {
        key: 'status',
        header: t('admin.inscriptions.table.status', 'Estat'),
        render: (row) => (
          <div className="flex flex-col gap-1">
            <span
              className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                STATUS_BADGE[row.status] ?? 'bg-neutral-100 text-neutral-700'
              }`}
            >
              {t(`admin.inscriptions.status.${row.status}`, row.status)}
            </span>
            <select
              value={row.status}
              onChange={(event) => changeStatus(row.id, event.target.value as InscriptionStatus)}
              aria-label={t('admin.inscriptions.change_status', "Canviar l'estat")}
              className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-[11px] text-neutral-600"
            >
              <option value="alta">{t('admin.inscriptions.status.alta', 'Alta')}</option>
              <option value="pending">{t('admin.inscriptions.status.pending', 'Pendent')}</option>
              <option value="baja">{t('admin.inscriptions.status.baja', 'Baixa')}</option>
              {!['alta', 'pending', 'baja'].includes(row.status) && (
                <option value={row.status}>{t(`admin.inscriptions.status.${row.status}`, row.status)}</option>
              )}
            </select>
          </div>
        )
      },
      {
        key: 'created_at',
        header: t('admin.inscriptions.table.date', 'Data'),
        className: 'whitespace-nowrap',
        render: (row) => (
          <span className="text-[12px] text-neutral-500">
            {row.created_at ? new Date(row.created_at).toLocaleDateString('ca-ES') : '—'}
          </span>
        )
      },
      {
        key: 'actions',
        header: t('admin.inscriptions.table.actions', 'Accions'),
        className: 'text-right',
        render: (row) => (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setDetailsTarget(row)}
              title={t('admin.inscriptions.view_details', 'Veure detalls')}
              aria-label={t('admin.inscriptions.view_details', 'Veure detalls')}
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setEditTarget(row)}
              title={t('common.edit', 'Editar')}
              aria-label={t('common.edit', 'Editar')}
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => removeInscription(row)}
              title={t('common.delete', 'Eliminar')}
              aria-label={t('common.delete', 'Eliminar')}
              className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      }
    ],
    [changeStatus, customLabels, removeInscription, t]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.inscriptions.title', 'Inscripcions')}
        subtitle={t('admin.inscriptions.subtitle', 'Gestiona les inscripcions de les activitats')}
        icon={Users}
        loading={isLoading}
        onRefresh={reload}
        actions={
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('admin.inscriptions.export_button', 'Exportar')}
          </button>
        }
      />

      <InscriptionsFilters
        filters={filters}
        setFilter={setFilter}
        onReset={resetFilters}
        academicYear={academicYear}
        setAcademicYear={setAcademicYear}
        academicYears={academicYears}
        activityOptions={activityOptions}
      />

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {t('admin.inscriptions.load_error', 'Error carregant les inscripcions')}: {error}
        </p>
      )}

      <AdminTable
        columns={columns}
        rows={inscriptions}
        keyExtractor={(row) => row.id}
        loading={isLoading}
        emptyMessage={t('admin.inscriptions.table.no_results', "No s'han trobat inscripcions")}
        footer={
          <AdminPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        }
      />

      <InscriptionDetailsModal
        inscription={detailsTarget}
        onClose={() => setDetailsTarget(null)}
        customLabels={customLabels}
      />

      <EditInscriptionModal
        inscription={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={saveInscription}
        activityOptions={activityOptions}
      />

      <ExportOptionsModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        count={total}
        exporting={exporting}
      />
    </div>
  );
}
