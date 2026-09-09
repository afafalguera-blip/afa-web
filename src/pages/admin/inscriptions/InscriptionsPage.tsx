import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Copy, Eye, FileSpreadsheet, Pencil, Trash2, Users } from 'lucide-react';

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
import { toActivityRows } from '../../../logic/inscriptionFilters';
import type { Inscription, InscriptionActivityRow, InscriptionStatus } from '../../../types/inscription';

const STATUS_BADGE: Record<string, string> = {
  alta: 'bg-green-100 text-green-800',
  active: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  suspended: 'bg-amber-100 text-amber-800',
  baja: 'bg-red-100 text-red-800'
};

/**
 * Los únicos estados que acepta la base: `inscripcions_status_check` es
 * CHECK (status IN ('alta','baja')). Ofrecer «Pendent» aquí no lo creaba, solo
 * hacía que el UPDATE reventara contra la restricción con un toast de error.
 */
const EDITABLE_STATUSES: InscriptionStatus[] = ['alta', 'baja'];

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
    duplicates,
    customLabels,
    reload,
    removeInscription,
    saveInscription,
    changeStatus,
    fetchAllFiltered
  } = useInscriptions();

  /**
   * Dos preguntas distintas, dos vistas.
   *
   * «Per familia» es la de gestionar: una fila es una inscripcion, que es lo que
   * se edita, se da de baja y se borra. «Per activitat» es la de contar: una fila
   * por criatura y actividad, que es lo que ocupa una plaza. Con una sola vista
   * una de las dos preguntas se responde mal: agrupada, tres actividades cuentan
   * como uno; partida, el boton de borrar aparece tres veces y se lleva las tres.
   */
  const [view, setView] = useState<'family' | 'activity'>('family');
  const [allFiltered, setAllFiltered] = useState<Inscription[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const [detailsTarget, setDetailsTarget] = useState<Inscription | null>(null);
  const [editTarget, setEditTarget] = useState<Inscription | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  /**
   * La vista por actividad se pagina sobre las filas aplanadas, no sobre las
   * inscripciones, asi que necesita el cohorte entero: si aplanara solo la
   * pagina, la numeracion mentiria en cuanto hubiera mas de una. Es la misma
   * carga que hace la exportacion.
   */
  useEffect(() => {
    if (view !== 'activity') return;
    let cancelado = false;

    const cargar = async () => {
      setLoadingAll(true);
      try {
        const rows = await fetchAllFiltered();
        if (!cancelado) setAllFiltered(rows);
      } catch (err) {
        console.error('Error loading inscriptions for the activity view:', err);
        if (!cancelado) setAllFiltered([]);
      } finally {
        if (!cancelado) setLoadingAll(false);
      }
    };

    cargar();
    return () => { cancelado = true; };
    // Solo `fetchAllFiltered`: ya lleva dentro los filtros y el curso escolar, y
    // su identidad cambia cuando cambian. Listar aqui `filters.search` ademas
    // dispararia una carga del cohorte entero en cada tecla, antes incluso de que
    // el buscador aplicara su retardo.
  }, [view, fetchAllFiltered]);

  const activityRows = useMemo(
    () => toActivityRows(allFiltered, {
      activity: filters.activity || undefined,
      course: filters.course || undefined,
    }),
    [allFiltered, filters.activity, filters.course]
  );

  const activityPageRows = useMemo(
    () => activityRows.slice((page - 1) * pageSize, page * pageSize),
    [activityRows, page, pageSize]
  );

  /** Para abrir la ficha desde una fila de actividad, que solo lleva el id. */
  const inscriptionsById = useMemo(
    () => new Map(allFiltered.map((item) => [item.id, item])),
    [allFiltered]
  );

  const cambiarVista = (siguiente: 'family' | 'activity') => {
    setView(siguiente);
    setPage(1);
  };

  const handleExport = async (format: ExportFormat, type: ExportType) => {
    setExporting(true);
    try {
      // The export must cover every filtered record, not just the visible page.
      const rows = await fetchAllFiltered();
      const fields = type === 'full' ? 'full' : 'basic';
      // Los filtros van también al aplanado: `fetchAllFiltered` filtra por
      // FAMILIA (entra la inscripción si alguna criatura encaja), así que sin
      // esto la exportación de una actividad arrastraba hermanos y actividades
      // que no se habían pedido.
      const scope = { activity: filters.activity || undefined, course: filters.course || undefined };
      if (format === 'excel') {
        ExportService.exportInscriptionsExcel(rows, fields, 'Inscripcions_AFA', scope);
      } else {
        ExportService.exportInscriptionsPDF(rows, fields, 'Inscripcions_AFA', scope);
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
        render: (row) => {
          const duplicate = duplicates[row.id];
          return (
            <div className="min-w-0">
              <div className="font-medium text-neutral-900">{row.parent_name || '—'}</div>
              <div className="text-[12px] text-neutral-500">{row.parent_dni}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {row.afa_member && (
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-admin-accent text-white text-[10px] font-semibold uppercase">
                    {t('admin.inscriptions.member_badge', 'Soci AFA')}
                  </span>
                )}
                {/* Sin esto, dos files d'una mateixa família es veuen idèntiques
                    (mateix nom, DNI, correu i telèfon) i l'única diferència real
                    —quines criatures— queda a la columna del costat en lletra
                    petita. Distingir «el mateix formulari dues vegades» de «la
                    mateixa família amb una altra criatura» és tota la decisió. */}
                {duplicate?.kind === 'exact' && (
                  <span
                    title={t('admin.inscriptions.duplicate_exact_hint')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase"
                  >
                    <Copy className="w-3 h-3" />
                    {t('admin.inscriptions.duplicate_exact')}
                  </span>
                )}
                {duplicate?.kind === 'family' && (
                  <span
                    title={t('admin.inscriptions.duplicate_family_hint')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-semibold uppercase"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {t('admin.inscriptions.duplicate_family', { n: duplicate.others.length })}
                  </span>
                )}
              </div>
            </div>
          );
        }
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
              {EDITABLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`admin.inscriptions.status.${status}`, status)}
                </option>
              ))}
              {!EDITABLE_STATUSES.includes(row.status) && (
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
    [changeStatus, customLabels, duplicates, removeInscription, t]
  );

  const activityColumns = useMemo<AdminTableColumn<InscriptionActivityRow>[]>(
    () => [
      {
        key: 'student',
        header: t('admin.inscriptions.table.student', 'Alumne'),
        render: (row) => (
          <div className="min-w-0">
            <div className="font-medium text-neutral-900">
              {row.name} {row.surname}
            </div>
            <div className="text-[12px] text-neutral-500">{courseLabel(row.course)}</div>
          </div>
        )
      },
      {
        key: 'activity',
        header: t('admin.inscriptions.table.activity', 'Activitat'),
        render: (row) =>
          row.activity ? (
            <span className="inline-flex px-2 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-[12px] text-neutral-700">
              {row.activity}
            </span>
          ) : (
            <span className="text-[12px] text-neutral-400">
              {t('admin.inscriptions.no_activities', 'Sense activitats')}
            </span>
          )
      },
      {
        key: 'family',
        header: t('admin.inscriptions.table.parent', 'Família'),
        render: (row) => (
          <div className="min-w-0 text-[12px] text-neutral-500">
            <div className="text-[13px] text-neutral-800">{row.parent_name || '—'}</div>
            <div className="break-all">{row.parent_email}</div>
            <div>{row.parent_phone}</div>
          </div>
        )
      },
      {
        key: 'status',
        header: t('admin.inscriptions.table.status', 'Estat'),
        render: (row) => (
          <div className="flex flex-col items-start gap-1">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                STATUS_BADGE[row.status] ?? 'bg-neutral-100 text-neutral-700'
              }`}
            >
              {t(`admin.inscriptions.status.${row.status}`, row.status)}
            </span>
            {row.suspended && (
              <span className="inline-flex px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                {t('admin.inscriptions.suspended_badge', 'Suspès')}
              </span>
            )}
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
        // Solo la fitxa. Editar y borrar actuan sobre la inscripcion entera, y
        // aqui una inscripcion son varias filas: el boton pareceria que se lleva
        // solo esta actividad y se llevaria las tres.
        render: (row) => (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setDetailsTarget(inscriptionsById.get(row.inscription_id) ?? null)}
              title={t('admin.inscriptions.view_details', 'Veure detalls')}
              aria-label={t('admin.inscriptions.view_details', 'Veure detalls')}
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        )
      }
    ],
    [inscriptionsById, t]
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5">
          {(['family', 'activity'] as const).map((modo) => (
            <button
              key={modo}
              type="button"
              onClick={() => cambiarVista(modo)}
              aria-pressed={view === modo}
              className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
                view === modo
                  ? 'bg-admin-active-bg text-admin-active-fg'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {modo === 'family'
                ? t('admin.inscriptions.view_by_family', 'Per família')
                : t('admin.inscriptions.view_by_activity', 'Per activitat')}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-neutral-500">
          {view === 'family'
            ? t('admin.inscriptions.view_family_note', "Una fila per inscripció: és el que s'edita i es dóna de baixa.")
            : t('admin.inscriptions.view_activity_note', 'Una fila per criatura i activitat: és el que ocupa una plaça. Només lectura.')}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {t('admin.inscriptions.load_error', 'Error carregant les inscripcions')}: {error}
        </p>
      )}

      {view === 'family' ? (
        <AdminTable
          columns={columns}
          rows={inscriptions}
          keyExtractor={(row) => row.id}
          rowNumberStart={(page - 1) * pageSize + 1}
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
      ) : (
        <AdminTable
          columns={activityColumns}
          rows={activityPageRows}
          keyExtractor={(row) => `${row.inscription_id}-${row.student_index}-${row.activity}`}
          rowNumberStart={(page - 1) * pageSize + 1}
          loading={loadingAll}
          emptyMessage={t('admin.inscriptions.table.no_results', "No s'han trobat inscripcions")}
          footer={
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={activityRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        />
      )}

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
