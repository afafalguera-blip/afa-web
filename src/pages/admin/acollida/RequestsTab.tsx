import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarRange, Download, FileDown, Receipt, Trash2, Users } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { AdminTable, AdminPagination, type AdminTableColumn } from '../../../components/admin/common/AdminTable';
import { Modal } from '../../../components/common/Modal';
import { useToast } from '../../../components/common/Toast';
import { useConfirm } from '../../../components/common/ConfirmDialog';
import { RequestsFilters } from './RequestsFilters';

import { AdminAcollidaInscriptionsService, type AcollidaStats } from '../../../services/admin/AdminAcollidaInscriptionsService';
import { AdminAcollidaService } from '../../../services/admin/AdminAcollidaService';
import { COURSE_BY_CODE, isCourseCode } from '../../../constants/courses';
import { childMonthlyTotal, formatEuro } from '../../../logic/acollidaPricing';
import { rosterByWeekday } from '../../../logic/acollidaRoster';
import {
  ACOLLIDA_WEEKDAYS,
  EMPTY_ACOLLIDA_FILTERS,
  WEEKDAY_I18N_KEYS,
  type AcollidaFilters,
  type AcollidaInscription,
  type AcollidaRate,
  type AcollidaStatus,
} from '../../../types/acollida';

const STATUS_BADGE: Record<AcollidaStatus, string> = {
  pendent: 'bg-amber-100 text-amber-800',
  confirmada: 'bg-green-100 text-green-800',
  baixa: 'bg-red-100 text-red-800',
};

const secondaryButton =
  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200 rounded-md transition-colors disabled:opacity-50';

const courseLabel = (code: string): string => (isCourseCode(code) ? COURSE_BY_CODE[code].label : code);

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

const today = new Date();

export function RequestsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [rates, setRates] = useState<AcollidaRate[]>([]);
  const [rows, setRows] = useState<AcollidaInscription[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AcollidaStats | null>(null);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [filters, setFilters] = useState<AcollidaFilters>(EMPTY_ACOLLIDA_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(today.getMonth() + 1);
  const [genYear, setGenYear] = useState(today.getFullYear());
  const [generating, setGenerating] = useState(false);

  const rateById = useMemo(() => new Map(rates.map((r) => [r.id, r])), [rates]);

  useEffect(() => {
    AdminAcollidaService.getAll()
      .then(setRates)
      .catch((err) => console.error('Error loading acollida rates:', err));

    AdminAcollidaInscriptionsService.getAcademicYears()
      .then((years) => {
        setAcademicYears(years);
        // El curs en marxa és el que es mira el 99% dels dies.
        if (years.length > 0) setAcademicYear((current) => current || years[0]);
      })
      .catch((err) => console.error('Error loading acollida academic years:', err));
  }, []);

  const queryParams = useMemo(
    () => ({ ...filters, academicYear: academicYear || undefined }),
    [filters, academicYear],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, freshStats] = await Promise.all([
        AdminAcollidaInscriptionsService.getPage({ ...queryParams, page, pageSize }),
        AdminAcollidaInscriptionsService.getStats(academicYear || undefined),
      ]);
      setRows(result.rows);
      setTotal(result.total);
      setStats(freshStats);
    } catch (err) {
      console.error(err);
      setError(t('admin.acollida_requests.load_error', 'No s\'han pogut carregar les sol·licituds.'));
    } finally {
      setLoading(false);
    }
  }, [queryParams, page, pageSize, academicYear, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters, academicYear, pageSize]);

  const setFilter = <K extends keyof AcollidaFilters>(key: K, value: AcollidaFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const monthlyAmount = (row: AcollidaInscription): number | null => {
    const rate = rateById.get(row.rate_id);
    if (!rate) return null;
    return childMonthlyTotal(
      rate,
      row.afa_member,
      row.modality,
      row.occasional_dates,
      row.modality === 'ocasional' ? genMonth : undefined,
      row.modality === 'ocasional' ? genYear : undefined,
    );
  };

  const describeDays = (row: AcollidaInscription): string => {
    if (row.modality === 'mensual') {
      return row.weekdays.map((d) => t(WEEKDAY_I18N_KEYS[d])).join(', ') || '—';
    }
    return row.occasional_dates.join(', ') || '—';
  };

  const handleStatus = async (row: AcollidaInscription, status: AcollidaStatus) => {
    try {
      await AdminAcollidaInscriptionsService.setStatus(row.id, status);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
      toast.success(t('admin.acollida_requests.status_saved', 'Estat actualitzat'));
      const freshStats = await AdminAcollidaInscriptionsService.getStats(academicYear || undefined);
      setStats(freshStats);
    } catch (err) {
      console.error(err);
      toast.error(t('admin.acollida_requests.status_error', 'No s\'ha pogut canviar l\'estat.'));
    }
  };

  const handleDelete = async (row: AcollidaInscription) => {
    const ok = await confirm({
      title: t('admin.acollida_requests.delete_title', 'Eliminar sol·licitud'),
      message: t('admin.acollida_requests.delete_message', 'La sol·licitud s\'esborra definitivament.'),
      itemName: `${row.child_name} ${row.child_surname}`,
      confirmLabel: t('common.delete', 'Eliminar'),
      destructive: true,
    });
    if (!ok) return;

    try {
      await AdminAcollidaInscriptionsService.remove(row.id);
      toast.success(t('admin.acollida_requests.deleted', 'Sol·licitud eliminada'));
      await load();
    } catch (err) {
      console.error(err);
      toast.error(t('admin.acollida_requests.delete_error', 'No s\'ha pogut eliminar.'));
    }
  };

  /** Las exportaciones cubren TODAS las filas filtradas, no solo la página. */
  const exportRows = async () => AdminAcollidaInscriptionsService.getAllFiltered(queryParams);

  const buildTable = (list: AcollidaInscription[]) => {
    const headers = [
      t('admin.acollida_requests.col_child', 'Infant'),
      t('admin.acollida_requests.col_course', 'Curs'),
      t('admin.acollida_requests.col_slot', 'Franja'),
      t('admin.acollida_requests.col_modality', 'Modalitat'),
      t('admin.acollida_requests.col_days', 'Dies'),
      t('admin.acollida_requests.col_family', 'Família'),
      t('admin.acollida_requests.col_email', 'Correu'),
      t('admin.acollida_requests.col_phone', 'Telèfon'),
      t('admin.acollida_requests.col_member', 'Soci'),
      t('admin.acollida_requests.col_amount', 'Import'),
      t('admin.acollida_requests.col_status', 'Estat'),
    ];
    const body = list.map((row) => [
      `${row.child_name} ${row.child_surname}`,
      courseLabel(row.course),
      rateById.get(row.rate_id)?.horari ?? '—',
      row.modality === 'mensual'
        ? t('admin.acollida_requests.modality_monthly', 'Mensual')
        : t('admin.acollida_requests.modality_occasional', 'Dies solts'),
      describeDays(row),
      row.parent_name,
      row.parent_email,
      row.parent_phone,
      row.afa_member ? t('common.yes', 'Sí') : t('common.no', 'No'),
      formatEuro(monthlyAmount(row)),
      t(`admin.acollida_requests.status.${row.status}`, row.status),
    ]);
    return { headers, body };
  };

  const download = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const stamp = () => new Date().toISOString().split('T')[0];

  const exportCSV = async () => {
    try {
      const list = await exportRows();
      if (list.length === 0) return;
      const { headers, body } = buildTable(list);
      const csv =
        '﻿' +
        [headers, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
      download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `acollida_${stamp()}.csv`);
    } catch (err) {
      console.error(err);
      toast.error(t('admin.acollida_requests.export_error', 'No s\'ha pogut exportar.'));
    }
  };

  const exportPDF = async () => {
    try {
      const list = await exportRows();
      if (list.length === 0) return;
      const { headers, body } = buildTable(list);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('admin.acollida_requests.pdf_title', "Servei d'acollida — sol·licituds"), 10, 16);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(`${academicYear || t('admin.inscriptions.all_academic_years', 'Tots els cursos escolars')} · ${list.length}`, 10, 22);
      doc.setTextColor(0);

      autoTable(doc, {
        startY: 28,
        head: [headers],
        body,
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [23, 23, 23], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
      });

      doc.save(`acollida_${stamp()}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error(t('admin.acollida_requests.export_error', 'No s\'ha pogut exportar.'));
    }
  };

  /**
   * El llistat que fan servir els monitors: una taula per dia amb els infants
   * que toquen. Els dies solts hi entren pel dia de la setmana de cada data.
   */
  const exportRoster = async () => {
    try {
      const list = (await exportRows()).filter((row) => row.status !== 'baixa');
      if (list.length === 0) return;

      const roster = rosterByWeekday(list);
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('admin.acollida_requests.roster_title', "Acollida — llistat per dia"), 10, 16);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(academicYear || '', 10, 22);
      doc.setTextColor(0);

      let cursor = 28;
      for (const day of ACOLLIDA_WEEKDAYS) {
        const entries = roster[day];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`${t(WEEKDAY_I18N_KEYS[day])} (${entries.length})`, 10, cursor);
        cursor += 3;

        autoTable(doc, {
          startY: cursor,
          head: [[
            t('admin.acollida_requests.col_child', 'Infant'),
            t('admin.acollida_requests.col_course', 'Curs'),
            t('admin.acollida_requests.col_slot', 'Franja'),
            t('admin.acollida_requests.col_date', 'Data'),
          ]],
          body: entries.map((entry) => [
            `${entry.inscription.child_name} ${entry.inscription.child_surname}`,
            courseLabel(entry.inscription.course),
            rateById.get(entry.inscription.rate_id)?.horari ?? '—',
            entry.date ?? '',
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [23, 23, 23], textColor: 255, fontSize: 8 },
          margin: { left: 10, right: 10 },
        });

        // @ts-expect-error jspdf-autotable stores the last table position on the doc
        cursor = (doc.lastAutoTable?.finalY ?? cursor) + 8;
        if (cursor > 250 && day !== ACOLLIDA_WEEKDAYS[ACOLLIDA_WEEKDAYS.length - 1]) {
          doc.addPage();
          cursor = 20;
        }
      }

      doc.save(`acollida_dies_${stamp()}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error(t('admin.acollida_requests.export_error', 'No s\'ha pogut exportar.'));
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await AdminAcollidaInscriptionsService.generatePayments(genMonth, genYear);
      if (result.success) {
        toast.success(
          t('admin.acollida_requests.generated', '{{count}} rebuts generats', { count: result.payments_generated }),
        );
        setGenOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error(err);
      toast.error(t('admin.acollida_requests.generate_error', 'No s\'han pogut generar els rebuts.'));
    } finally {
      setGenerating(false);
    }
  };

  const columns: AdminTableColumn<AcollidaInscription>[] = [
    {
      key: 'child',
      header: t('admin.acollida_requests.col_child', 'Infant'),
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-neutral-900">
            {row.child_name} {row.child_surname}
          </div>
          <div className="text-[12px] text-neutral-500">{courseLabel(row.course)}</div>
        </div>
      ),
    },
    {
      key: 'slot',
      header: t('admin.acollida_requests.col_slot', 'Franja'),
      render: (row) => <span className="text-neutral-800">{rateById.get(row.rate_id)?.horari ?? '—'}</span>,
    },
    {
      key: 'days',
      header: t('admin.acollida_requests.col_days', 'Dies'),
      render: (row) => (
        <div className="min-w-0">
          <span className="inline-flex px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-semibold uppercase">
            {row.modality === 'mensual'
              ? t('admin.acollida_requests.modality_monthly', 'Mensual')
              : t('admin.acollida_requests.modality_occasional', 'Dies solts')}
          </span>
          <div className="text-[12px] text-neutral-500 mt-1 max-w-[220px] truncate" title={describeDays(row)}>
            {describeDays(row)}
          </div>
        </div>
      ),
    },
    {
      key: 'family',
      header: t('admin.acollida_requests.col_family', 'Família'),
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-neutral-900 flex items-center gap-1.5">
            {row.parent_name}
            {row.afa_member && (
              <span className="inline-flex px-2 py-0.5 rounded-full bg-admin-accent text-white text-[10px] font-semibold uppercase">
                {t('admin.inscriptions.member_badge', 'Soci AFA')}
              </span>
            )}
          </div>
          <div className="text-[12px] text-neutral-500">{row.parent_email}</div>
          <div className="text-[12px] text-neutral-500">{row.parent_phone}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: t('admin.acollida_requests.col_amount', 'Import'),
      className: 'whitespace-nowrap',
      render: (row) => <span className="font-semibold text-neutral-900">{formatEuro(monthlyAmount(row))}</span>,
    },
    {
      key: 'status',
      header: t('admin.acollida_requests.col_status', 'Estat'),
      render: (row) => (
        <select
          value={row.status}
          onChange={(e) => handleStatus(row, e.target.value as AcollidaStatus)}
          aria-label={t('admin.acollida_requests.col_status', 'Estat')}
          className={`h-8 rounded-md border-0 px-2 text-[12px] font-semibold ${STATUS_BADGE[row.status]}`}
        >
          <option value="pendent">{t('admin.acollida_requests.status.pendent', 'Pendent')}</option>
          <option value="confirmada">{t('admin.acollida_requests.status.confirmada', 'Confirmada')}</option>
          <option value="baixa">{t('admin.acollida_requests.status.baixa', 'Baixa')}</option>
        </select>
      ),
    },
    {
      key: 'notes',
      header: t('admin.acollida_requests.col_notes', 'Observacions'),
      render: (row) => (
        <div className="max-w-[220px] truncate text-neutral-600" title={row.notes ?? ''}>
          {row.notes || '—'}
        </div>
      ),
    },
    {
      key: '_actions',
      header: <span className="sr-only">{t('common.actions', 'Accions')}</span>,
      className: 'text-right whitespace-nowrap',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleDelete(row)}
          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title={t('common.delete', 'Eliminar')}
          aria-label={t('common.delete', 'Eliminar')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {stats && (
          <div className="flex flex-wrap gap-2 text-[13px]">
            <StatPill icon={<Users className="w-3.5 h-3.5" />} label={t('admin.acollida_requests.stat_total', 'Sol·licituds')} value={stats.total} />
            <StatPill label={t('admin.acollida_requests.status.confirmada', 'Confirmada')} value={stats.confirmed} tone="bg-green-50 text-green-700" />
            <StatPill label={t('admin.acollida_requests.status.pendent', 'Pendent')} value={stats.pending} tone="bg-amber-50 text-amber-700" />
            <StatPill label={t('admin.acollida_requests.modality_monthly', 'Mensual')} value={stats.monthly} />
            <StatPill label={t('admin.acollida_requests.modality_occasional', 'Dies solts')} value={stats.occasional} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportCSV} className={secondaryButton}>
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button type="button" onClick={exportPDF} className={secondaryButton}>
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </button>
          <button type="button" onClick={exportRoster} className={secondaryButton}>
            <CalendarRange className="w-3.5 h-3.5" />
            {t('admin.acollida_requests.roster_btn', 'Llistat per dia')}
          </button>
          <button
            type="button"
            onClick={() => setGenOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-admin-accent hover:bg-admin-accent-hover text-white rounded-md transition-colors"
          >
            <Receipt className="w-3.5 h-3.5" />
            {t('admin.acollida_requests.generate_btn', 'Generar rebuts')}
          </button>
        </div>
      </div>

      <RequestsFilters
        filters={filters}
        setFilter={setFilter}
        onReset={() => setFilters(EMPTY_ACOLLIDA_FILTERS)}
        academicYear={academicYear}
        setAcademicYear={setAcademicYear}
        academicYears={academicYears}
        rates={rates}
      />

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-[13px]">{error}</div>
      )}

      <AdminTable<AcollidaInscription>
        columns={columns}
        rows={rows}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage={t('admin.acollida_requests.empty', 'Encara no hi ha sol·licituds.')}
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

      <Modal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title={t('admin.acollida_requests.generate_title', "Generar rebuts d'acollida")}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setGenOpen(false)}
              className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              {t('common.cancel', 'Cancel·lar')}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="px-3.5 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-[13px] font-medium text-white transition-colors disabled:opacity-50"
            >
              {generating ? t('common.saving', 'Desant...') : t('admin.acollida_requests.generate_btn', 'Generar rebuts')}
            </button>
          </>
        }
      >
        <p className="text-[13px] text-neutral-600 mb-4">
          {t(
            'admin.acollida_requests.generate_help',
            'Es crea un rebut per cada sol·licitud CONFIRMADA del mes triat. Els mensuals paguen la quota de la franja; els dies solts, el preu per dia pels dies d\'aquell mes. Els rebuts ja pagats no es toquen.',
          )}
        </p>
        <div className="flex gap-3">
          <label className="flex-1 text-[13px] text-neutral-700">
            {t('admin.acollida_requests.month', 'Mes')}
            <select
              value={genMonth}
              onChange={(e) => setGenMonth(Number(e.target.value))}
              className="mt-1 w-full h-9 rounded-md border border-neutral-300 px-2 text-[13px]"
            >
              {MONTH_KEYS.map((key, i) => (
                <option key={key} value={i + 1}>
                  {t(`months.${key}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-[13px] text-neutral-700">
            {t('admin.acollida_requests.year', 'Any')}
            <input
              type="number"
              value={genYear}
              onChange={(e) => setGenYear(Number(e.target.value))}
              className="mt-1 w-full h-9 rounded-md border border-neutral-300 px-2 text-[13px]"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  tone = 'bg-neutral-100 text-neutral-700',
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium ${tone}`}>
      {icon}
      {label}
      <strong className="font-black">{value}</strong>
    </span>
  );
}

export default RequestsTab;
