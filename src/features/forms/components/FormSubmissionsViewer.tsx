import { useState, useEffect, useMemo, useRef } from 'react';
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
  AlertCircle,
  Link2,
  ArrowUpDown,
  FileDown,
  Columns3,
  Check,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  form: FormTemplate;
  onBack: () => void;
}

export default function FormSubmissionsViewer({ form, onBack }: Props) {
  const { t, i18n } = useTranslation();
  const activeLang = i18n.resolvedLanguage || i18n.language;
  const resolvedTitle = resolveTemplateText(form, activeLang).title;
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortByField, setSortByField] = useState<string>('_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [excludedCols, setExcludedCols] = useState<Set<string>>(new Set());
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const visibleFields = useMemo(
    () => form.fields_schema.filter((f) => f.type !== 'section_header'),
    [form.fields_schema],
  );

  const exportableColumns = useMemo(
    () => [
      { id: '_date', label: t('forms.viewer.date_col') },
      ...visibleFields.map((f) => ({ id: f.id, label: resolveField(form, f, activeLang).label })),
    ],
    [visibleFields, form, activeLang, t],
  );

  const selectedColumnIds = useMemo(
    () => exportableColumns.filter((c) => !excludedCols.has(c.id)).map((c) => c.id),
    [exportableColumns, excludedCols],
  );

  useEffect(() => {
    if (!showColumnsMenu) return;
    const onClickAway = (e: MouseEvent) => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) {
        setShowColumnsMenu(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [showColumnsMenu]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id]);

  const load = async () => {
    if (!form.id) return;
    try {
      setIsLoading(true);
      const data = await formService.getSubmissionsByFormId(form.id);
      setSubmissions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('forms.viewer.load_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('forms.viewer.delete_confirm'))) return;
    setDeletingId(id);
    try {
      await formService.deleteSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('forms.viewer.delete_error'));
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
      alert(t('forms.public.file_cant_get_url'));
    }
  };

  const filteredSubmissions = useMemo(() => {
    let result = submissions;

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((sub) =>
        visibleFields.some((f) => {
          const val = sub.answers[f.id];
          const str = Array.isArray(val) ? val.join(' ') : String(val ?? '');
          return str.toLowerCase().includes(q);
        }),
      );
    }

    const dir = sortDirection === 'asc' ? 1 : -1;
    const sorted = [...result];
    sorted.sort((a, b) => {
      if (sortByField === '_date') {
        return dir * (new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
      }
      const valA = a.answers[sortByField];
      const valB = b.answers[sortByField];
      const strA = Array.isArray(valA) ? valA.join(', ') : String(valA ?? '');
      const strB = Array.isArray(valB) ? valB.join(', ') : String(valB ?? '');
      return dir * strA.localeCompare(strB, 'ca', { sensitivity: 'base' });
    });
    return sorted;
  }, [submissions, searchTerm, sortByField, sortDirection, visibleFields]);

  const cellForColumn = (colId: string, sub: FormSubmission): string => {
    if (colId === '_date') return new Date(sub.submitted_at).toLocaleString();
    const field = visibleFields.find((f) => f.id === colId);
    if (!field) return '';
    return formatCellValue(field, sub.answers[colId]);
  };

  const exportToCSV = () => {
    if (filteredSubmissions.length === 0 || selectedColumnIds.length === 0) return;
    const headers = [
      '#',
      ...exportableColumns.filter((c) => selectedColumnIds.includes(c.id)).map((c) => c.label),
    ];
    const rows = filteredSubmissions.map((sub, idx) => [
      String(idx + 1),
      ...selectedColumnIds.map((cid) => cellForColumn(cid, sub)),
    ]);

    const csv =
      '﻿' +
      [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `respostes_${form.slug}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (filteredSubmissions.length === 0 || selectedColumnIds.length === 0) return;

    const headers = [
      '#',
      ...exportableColumns.filter((c) => selectedColumnIds.includes(c.id)).map((c) => c.label),
    ];
    const rows = filteredSubmissions.map((sub, idx) => [
      String(idx + 1),
      ...selectedColumnIds.map((cid) => cellForColumn(cid, sub)),
    ]);

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
      `${t('forms.viewer.responses_count', { count: filteredSubmissions.length })} · ${t('forms.viewer.exported_on', { date: new Date().toLocaleDateString() })}`,
      10,
      22,
    );
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 28,
      head: [headers],
      body: rows,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [45, 55, 72], textColor: 255, fontSize: 7, fontStyle: 'bold' },
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
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{t('forms.viewer.load_error')}: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center text-gray-500 hover:text-gray-700"
            title={t('forms.viewer.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{resolvedTitle}</h1>
            <p className="text-sm text-gray-500">
              {t('forms.viewer.responses_count', { count: filteredSubmissions.length })}
              {searchTerm && submissions.length !== filteredSubmissions.length && (
                <span>{t('forms.viewer.of_total', { total: submissions.length })}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          <a
            href={`/f/${form.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            {t('forms.viewer.view_link')}
          </a>

          <div className="relative" ref={columnsMenuRef}>
            <button
              type="button"
              onClick={() => setShowColumnsMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              title={t('forms.viewer.columns_picker_title', 'Elegir columnas a exportar')}
            >
              <Columns3 className="w-3.5 h-3.5" />
              {t('forms.viewer.columns_btn', 'Columnas')}
              <span className="text-gray-400 font-mono">
                {selectedColumnIds.length}/{exportableColumns.length}
              </span>
            </button>

            {showColumnsMenu && (
              <div className="absolute right-0 mt-2 z-30 w-72 bg-white border border-gray-200 rounded-lg shadow-sm p-3 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {t('forms.viewer.columns_to_export', 'Columnas a exportar')}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setExcludedCols(new Set())}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {t('forms.viewer.select_all', 'Todas')}
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => setExcludedCols(new Set(exportableColumns.map((c) => c.id)))}
                      className="text-[10px] font-semibold text-gray-500 hover:text-gray-700"
                    >
                      {t('forms.viewer.select_none', 'Ninguna')}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {exportableColumns.map((c) => {
                    const checked = !excludedCols.has(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                      >
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
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-800 truncate flex-1" title={c.label}>
                          {c.label}
                        </span>
                        {sortByField === c.id && (
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            <Check className="w-3 h-3 inline -mt-0.5" /> orden
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={exportToCSV}
            disabled={filteredSubmissions.length === 0 || selectedColumnIds.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={exportToPDF}
            disabled={filteredSubmissions.length === 0 || selectedColumnIds.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('forms.viewer.search_placeholder')}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <FileText className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="mt-4 font-semibold text-gray-900">{t('forms.viewer.empty_title')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('forms.viewer.empty_body')}</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <Search className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="mt-3 font-semibold text-gray-700">{t('forms.viewer.no_match', { q: searchTerm })}</h3>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th
                    className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('_date')}
                  >
                    <div className="flex items-center gap-1">
                      {t('forms.viewer.date_col')} <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  {visibleFields.map((rawF) => {
                    const f = resolveField(form, rawF, activeLang);
                    return (
                      <th
                        key={rawF.id}
                        className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                        onClick={() => handleSort(rawF.id)}
                      >
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[200px]" title={f.label}>
                            {f.label}
                          </span>
                          <ArrowUpDown className="w-3 h-3 flex-shrink-0" />
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t('forms.viewer.actions_col')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredSubmissions.map((sub, idx) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(sub.submitted_at).toLocaleString('ca-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    {visibleFields.map((f) => {
                      const val = sub.answers[f.id];
                      if (f.type === 'file' && val) {
                        return (
                          <td key={f.id} className="px-3 py-2 text-xs">
                            <button
                              onClick={() => handleFileClick(String(val))}
                              className="text-blue-600 hover:text-blue-800 underline truncate max-w-[200px] block"
                              title={String(val)}
                            >
                              📎 {String(val).split('/').pop()}
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={f.id} className="px-3 py-2 text-xs text-gray-800">
                          <div className="max-w-[300px] truncate" title={formatCellValue(f, val)}>
                            {formatCellValue(f, val)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleDelete(sub.id)}
                        disabled={deletingId === sub.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title={t('forms.admin.delete')}
                      >
                        {deletingId === sub.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
