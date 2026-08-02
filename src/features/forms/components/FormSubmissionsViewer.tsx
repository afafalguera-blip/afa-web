import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formService } from '../services/formService';
import { resolveTemplateText, resolveField } from '../utils/resolveTranslations';
import type { FormTemplate, FormSubmission, FormField } from '../types/formTypes';
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Search,
  Trash2,
  Link2,
  ArrowUpDown,
  FileDown,
  Columns3,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AdminPageHeader } from '../../../components/admin/common/AdminPageHeader';
import { AdminTable, AdminPagination } from '../../../components/admin/common/AdminTable';
import type { AdminTableColumn } from '../../../components/admin/common/AdminTable';
import { Modal } from '../../../components/common/Modal';
import { useToast } from '../../../components/common/Toast';
import { useConfirm } from '../../../components/common/ConfirmDialog';

interface Props {
  form: FormTemplate;
  onBack: () => void;
}

const DATE_COL = '_date';
const SEARCH_DEBOUNCE_MS = 300;

export default function FormSubmissionsViewer({ form, onBack }: Props) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();
  const activeLang = i18n.resolvedLanguage || i18n.language;
  const resolvedTitle = resolveTemplateText(form, activeLang).title;

  const [rows, setRows] = useState<FormSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortByField, setSortByField] = useState<string>(DATE_COL);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [excludedCols, setExcludedCols] = useState<Set<string>>(new Set());

  // Caché del dataset completo. Solo se pide cuando hace falta (búsqueda,
  // orden por un campo de `answers` o exportación): el JSONB de respuestas no
  // se puede filtrar ni ordenar desde PostgREST.
  const allSubmissionsRef = useRef<FormSubmission[] | null>(null);

  const visibleFields = useMemo(
    () => form.fields_schema.filter((f) => f.type !== 'section_header'),
    [form.fields_schema],
  );

  const exportableColumns = useMemo(
    () => [
      { id: DATE_COL, label: t('forms.viewer.date_col') },
      ...visibleFields.map((f) => ({ id: f.id, label: resolveField(form, f, activeLang).label })),
    ],
    [visibleFields, form, activeLang, t],
  );

  const selectedColumnIds = useMemo(
    () => exportableColumns.filter((c) => !excludedCols.has(c.id)).map((c) => c.id),
    [exportableColumns, excludedCols],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    allSubmissionsRef.current = null;
  }, [form.id]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortByField, sortDirection, pageSize, form.id]);

  const clientSideMode = debouncedSearch.trim() !== '' || sortByField !== DATE_COL;

  const fetchAll = useCallback(async () => {
    if (!form.id) return [];
    if (allSubmissionsRef.current) return allSubmissionsRef.current;
    const data = await formService.getSubmissionsByFormId(form.id);
    allSubmissionsRef.current = data;
    return data;
  }, [form.id]);

  const sortRows = useCallback(
    (list: FormSubmission[]) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      return [...list].sort((a, b) => {
        if (sortByField === DATE_COL) {
          return dir * (new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
        }
        const valA = a.answers[sortByField];
        const valB = b.answers[sortByField];
        const strA = Array.isArray(valA) ? valA.join(', ') : String(valA ?? '');
        const strB = Array.isArray(valB) ? valB.join(', ') : String(valB ?? '');
        return dir * strA.localeCompare(strB, 'ca', { sensitivity: 'base' });
      });
    },
    [sortByField, sortDirection],
  );

  const load = useCallback(async () => {
    if (!form.id) return;
    try {
      setIsLoading(true);
      setError(null);

      if (!clientSideMode) {
        const { rows: pageRows, total: count } = await formService.getSubmissionsPage(form.id, {
          page,
          pageSize,
          ascending: sortDirection === 'asc',
        });
        setRows(pageRows);
        setTotal(count);
        return;
      }

      const all = await fetchAll();
      const q = debouncedSearch.trim().toLowerCase();
      const filtered = q
        ? all.filter((sub) =>
            visibleFields.some((f) => {
              const val = sub.answers[f.id];
              const str = Array.isArray(val) ? val.join(' ') : String(val ?? '');
              return str.toLowerCase().includes(q);
            }),
          )
        : all;
      const sorted = sortRows(filtered);
      const from = (page - 1) * pageSize;
      setRows(sorted.slice(from, from + pageSize));
      setTotal(sorted.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('forms.viewer.load_error'));
    } finally {
      setIsLoading(false);
    }
  }, [
    form.id,
    clientSideMode,
    page,
    pageSize,
    sortDirection,
    debouncedSearch,
    visibleFields,
    fetchAll,
    sortRows,
    t,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (sub: FormSubmission) => {
    const label = new Date(sub.submitted_at).toLocaleString('ca-ES');
    const ok = await confirm({
      title: t('forms.viewer.delete_title', 'Eliminar resposta'),
      message: t('forms.viewer.delete_confirm'),
      itemName: label,
      confirmLabel: t('forms.admin.delete', 'Eliminar'),
      destructive: true,
    });
    if (!ok) return;

    setDeletingId(sub.id);
    try {
      await formService.deleteSubmission(sub.id);
      allSubmissionsRef.current = null;
      toast.success(t('forms.viewer.delete_success', 'Resposta eliminada.'));
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('forms.viewer.delete_error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (fieldId: string) => {
    if (sortByField === fieldId) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortByField(fieldId);
      setSortDirection('asc');
    }
  };

  const formatCellValue = (f: FormField, val: unknown): string => {
    if (val == null || val === '') return '-';
    if (f.type === 'file') return String(val);
    if (Array.isArray(val)) return val.length === 0 ? '-' : val.join(', ');
    return String(val);
  };

  const handleFileClick = async (path: string) => {
    if (!path) return;
    if (signedUrls[path]) {
      window.open(signedUrls[path], '_blank', 'noreferrer');
      return;
    }
    try {
      const url = await formService.getFileUrl(path);
      setSignedUrls((prev) => ({ ...prev, [path]: url }));
      window.open(url, '_blank', 'noreferrer');
    } catch {
      toast.error(t('forms.public.file_cant_get_url'));
    }
  };

  const cellForColumn = (colId: string, sub: FormSubmission): string => {
    if (colId === DATE_COL) return new Date(sub.submitted_at).toLocaleString();
    const field = visibleFields.find((f) => f.id === colId);
    if (!field) return '';
    return formatCellValue(field, sub.answers[colId]);
  };

  /** Las exportaciones cubren TODAS las respuestas, no solo la página visible. */
  const buildExportData = useCallback(async () => {
    const all = await fetchAll();
    const q = debouncedSearch.trim().toLowerCase();
    const filtered = q
      ? all.filter((sub) =>
          visibleFields.some((f) => {
            const val = sub.answers[f.id];
            const str = Array.isArray(val) ? val.join(' ') : String(val ?? '');
            return str.toLowerCase().includes(q);
          }),
        )
      : all;
    const sorted = sortRows(filtered);
    const headers = [
      '#',
      ...exportableColumns.filter((c) => selectedColumnIds.includes(c.id)).map((c) => c.label),
    ];
    const body = sorted.map((sub, idx) => [
      String(idx + 1),
      ...selectedColumnIds.map((cid) => cellForColumn(cid, sub)),
    ]);
    return { headers, body, count: sorted.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAll, debouncedSearch, visibleFields, sortRows, exportableColumns, selectedColumnIds]);

  const exportToCSV = async () => {
    if (selectedColumnIds.length === 0) return;
    try {
      const { headers, body } = await buildExportData();
      if (body.length === 0) return;

      const csv =
        '﻿' +
        [headers, ...body]
          .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
          .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `respostes_${form.slug}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('forms.viewer.export_error', "No s'ha pogut exportar."));
    }
  };

  const exportToPDF = async () => {
    if (selectedColumnIds.length === 0) return;
    try {
      const { headers, body, count } = await buildExportData();
      if (body.length === 0) return;

      const isLandscape = headers.length > 5;
      const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(resolvedTitle, 10, 16);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(
        `${t('forms.viewer.responses_count', { count })} · ${t('forms.viewer.exported_on', { date: new Date().toLocaleDateString() })}`,
        10,
        22,
      );
      doc.setTextColor(0);

      autoTable(doc, {
        startY: 28,
        head: [headers],
        body,
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [23, 23, 23], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
        tableWidth: pageW - 20,
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160);
        doc.text(`${i}/${pageCount}`, pageW - 10, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
      }

      doc.save(`respostes_${form.slug}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('forms.viewer.export_error', "No s'ha pogut exportar."));
    }
  };

  const sortableHeader = (id: string, label: string) => (
    <button
      type="button"
      onClick={() => handleSort(id)}
      className="flex items-center gap-1 font-semibold text-neutral-600 hover:text-neutral-900"
      aria-label={t('forms.viewer.sort_by', 'Ordenar per {{label}}', { label })}
    >
      <span className="truncate max-w-[200px]">{label}</span>
      <ArrowUpDown className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
    </button>
  );

  const columns: AdminTableColumn<FormSubmission>[] = [
    {
      key: DATE_COL,
      header: sortableHeader(DATE_COL, t('forms.viewer.date_col')),
      className: 'whitespace-nowrap',
      render: (sub) =>
        new Date(sub.submitted_at).toLocaleString('ca-ES', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    ...visibleFields.map<AdminTableColumn<FormSubmission>>((rawF) => {
      const f = resolveField(form, rawF, activeLang);
      return {
        key: rawF.id,
        header: sortableHeader(rawF.id, f.label),
        render: (sub) => {
          const val = sub.answers[rawF.id];
          if (rawF.type === 'file' && val) {
            return (
              <button
                type="button"
                onClick={() => handleFileClick(String(val))}
                className="text-neutral-900 underline truncate max-w-[200px] block text-left"
                title={String(val)}
              >
                {String(val).split('/').pop()}
              </button>
            );
          }
          return (
            <div className="max-w-[300px] truncate" title={formatCellValue(rawF, val)}>
              {formatCellValue(rawF, val)}
            </div>
          );
        },
      };
    }),
    {
      key: '_actions',
      header: <span className="sr-only">{t('forms.viewer.actions_col')}</span>,
      className: 'text-right whitespace-nowrap',
      render: (sub) => (
        <button
          type="button"
          onClick={() => handleDelete(sub)}
          disabled={deletingId === sub.id}
          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
          title={t('forms.admin.delete')}
          aria-label={t('forms.admin.delete')}
        >
          {deletingId === sub.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      ),
    },
  ];

  const secondaryButton =
    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200 rounded-md transition-colors disabled:opacity-50';

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('forms.viewer.back')}
      </button>

      <AdminPageHeader
        title={resolvedTitle}
        subtitle={t('forms.viewer.responses_count', { count: total })}
        icon={FileText}
        loading={isLoading}
        onRefresh={() => {
          allSubmissionsRef.current = null;
          load();
        }}
        actions={
          <>
            <a
              href={`/f/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              className={secondaryButton}
            >
              <Link2 className="w-3.5 h-3.5" />
              {t('forms.viewer.view_link')}
            </a>
            <button type="button" onClick={() => setShowColumnsModal(true)} className={secondaryButton}>
              <Columns3 className="w-3.5 h-3.5" />
              {t('forms.viewer.columns_btn', 'Columnas')}
              <span className="text-neutral-400 font-mono">
                {selectedColumnIds.length}/{exportableColumns.length}
              </span>
            </button>
            <button
              type="button"
              onClick={exportToCSV}
              disabled={total === 0 || selectedColumnIds.length === 0}
              className={secondaryButton}
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              type="button"
              onClick={exportToPDF}
              disabled={total === 0 || selectedColumnIds.length === 0}
              className={secondaryButton}
            >
              <FileDown className="w-3.5 h-3.5" />
              PDF
            </button>
          </>
        }
      />

      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('forms.viewer.search_placeholder')}
          aria-label={t('forms.viewer.search_placeholder')}
          className="w-full pl-9 pr-3 py-2 text-[13px] border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-[13px]">
          {t('forms.viewer.load_error')}: {error}
        </div>
      )}

      <AdminTable<FormSubmission>
        columns={columns}
        rows={rows}
        keyExtractor={(sub) => sub.id}
        loading={isLoading}
        emptyMessage={
          debouncedSearch
            ? t('forms.viewer.no_match', { q: debouncedSearch })
            : t('forms.viewer.empty_title')
        }
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
        open={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        title={t('forms.viewer.columns_to_export', 'Columnas a exportar')}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setExcludedCols(new Set(exportableColumns.map((c) => c.id)))}
              className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              {t('forms.viewer.select_none', 'Ninguna')}
            </button>
            <button
              type="button"
              onClick={() => setExcludedCols(new Set())}
              className="px-3.5 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-[13px] font-medium text-white transition-colors"
            >
              {t('forms.viewer.select_all', 'Todas')}
            </button>
          </>
        }
      >
        <ul className="space-y-1">
          {exportableColumns.map((c) => {
            const checked = !excludedCols.has(c.id);
            return (
              <li key={c.id}>
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setExcludedCols((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(c.id);
                        else next.delete(c.id);
                        return next;
                      });
                    }}
                    className="h-4 w-4 text-neutral-900 focus:ring-neutral-500 border-neutral-300 rounded"
                  />
                  <span className="text-[13px] text-neutral-800 truncate flex-1" title={c.label}>
                    {c.label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Modal>
    </div>
  );
}
