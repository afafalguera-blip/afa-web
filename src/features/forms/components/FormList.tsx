import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formService } from '../services/formService';
import { resolveTemplateText } from '../utils/resolveTranslations';
import type { FormTemplate } from '../types/formTypes';
import {
  FileText,
  Edit,
  BarChart,
  ExternalLink,
  Plus,
  Loader2,
  FolderOpen,
  LayoutGrid,
  Copy,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';

const ALL_FOLDERS_TAB = '__all__';
const NO_FOLDER_TAB = '__none__';

interface Props {
  onCreateNew: () => void;
  onEdit: (form: FormTemplate) => void;
  onViewSubmissions: (form: FormTemplate) => void;
  onDuplicate: (form: FormTemplate) => void;
}

export default function FormList({ onCreateNew, onEdit, onViewSubmissions, onDuplicate }: Props) {
  const { t, i18n } = useTranslation();
  const activeLang = i18n.resolvedLanguage || i18n.language;
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState(ALL_FOLDERS_TAB);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (form: FormTemplate) => {
    const count = submissionCounts[form.id!] || 0;
    const localizedTitle = resolveTemplateText(form, activeLang).title;
    const msg = count > 0
      ? t('forms.admin.delete_confirm_with_responses', { title: localizedTitle, count })
      : t('forms.admin.delete_confirm', { title: localizedTitle });
    if (!window.confirm(msg)) return;
    const id = form.id!;
    setDeletingId(id);
    try {
      await formService.deleteForm(id);
      setForms((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (form: FormTemplate) => {
    setDuplicatingId(form.id!);
    try {
      await onDuplicate(form);
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleToggleActive = async (form: FormTemplate) => {
    const id = form.id!;
    setTogglingId(id);
    try {
      const updated = await formService.updateForm(id, { is_active: !form.is_active });
      setForms((prev) => prev.map((f) => (f.id === id ? { ...f, is_active: updated.is_active } : f)));
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  };

  useEffect(() => {
    loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadForms = async () => {
    try {
      setIsLoading(true);
      const [data, counts] = await Promise.all([
        formService.getForms(),
        formService.getSubmissionCounts(),
      ]);
      setForms(data);
      setSubmissionCounts(counts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('forms.admin.load_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const folders = useMemo(() => {
    const set = new Set<string>();
    forms.forEach((f) => {
      if (f.folder) set.add(f.folder);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'ca'));
  }, [forms]);

  const filteredForms = useMemo(() => {
    if (activeFolder === ALL_FOLDERS_TAB) return forms;
    if (activeFolder === NO_FOLDER_TAB) return forms.filter((f) => !f.folder);
    return forms.filter((f) => f.folder === activeFolder);
  }, [forms, activeFolder]);

  const hasFolders = folders.length > 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
        <p>{t('forms.admin.load_error')}: {error}</p>
        <button onClick={loadForms} className="mt-2 text-sm underline">
          {t('forms.admin.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('forms.admin.title')}</h1>
          <p className="text-gray-500 text-sm">{t('forms.admin.subtitle')}</p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('forms.admin.new')}
        </button>
      </div>

      {hasFolders && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-200">
          <button
            onClick={() => setActiveFolder(ALL_FOLDERS_TAB)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeFolder === ALL_FOLDERS_TAB
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {t('forms.admin.all')} ({forms.length})
          </button>
          {folders.map((folder) => {
            const count = forms.filter((f) => f.folder === folder).length;
            return (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  activeFolder === folder
                    ? 'border-blue-600 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {folder} ({count})
              </button>
            );
          })}
          {forms.some((f) => !f.folder) && (
            <button
              onClick={() => setActiveFolder(NO_FOLDER_TAB)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                activeFolder === NO_FOLDER_TAB
                  ? 'border-blue-600 text-blue-700 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {t('forms.admin.general')} ({forms.filter((f) => !f.folder).length})
            </button>
          )}
        </div>
      )}

      {forms.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <FileText className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="mt-4 font-semibold text-gray-900">{t('forms.admin.empty_title')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('forms.admin.empty_body')}</p>
          <button
            onClick={onCreateNew}
            className="mt-6 text-blue-600 hover:text-blue-800 font-medium text-sm border-b leading-tight border-blue-600"
          >
            {t('forms.admin.empty_cta')}
          </button>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <FolderOpen className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="mt-3 font-semibold text-gray-700">{t('forms.admin.empty_folder_title')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('forms.admin.empty_folder_body')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filteredForms.map((form) => (
              <div key={form.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{resolveTemplateText(form, activeLang).title}</div>
                    <div className="text-xs text-gray-400">/{form.slug}</div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(form)}
                    disabled={togglingId === form.id}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                      form.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                    }`}
                    title={form.is_active ? t('forms.admin.click_unpublish') : t('forms.admin.click_publish')}
                  >
                    {togglingId === form.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : form.is_active ? (
                      t('forms.admin.published')
                    ) : (
                      t('forms.admin.draft')
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
                  {activeFolder === ALL_FOLDERS_TAB && hasFolders && form.folder && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      <FolderOpen className="w-3 h-3" />
                      {form.folder}
                    </span>
                  )}
                  <span>{t('forms.admin.fields_count', { count: form.fields_schema.length })}</span>
                  <span className="flex items-center gap-1">
                    <BarChart className="w-3 h-3" />
                    <span className={submissionCounts[form.id!] ? 'font-semibold text-blue-600' : ''}>
                      {t('forms.admin.responses_count', { count: submissionCounts[form.id!] || 0 })}
                    </span>
                  </span>
                  <span className="text-gray-400">
                    {form.created_at ? format(new Date(form.created_at), 'dd/MM/yyyy', { locale: ca }) : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewSubmissions(form)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <BarChart className="w-3.5 h-3.5" />
                    {t('forms.admin.responses')}
                  </button>
                  <button
                    onClick={() => onEdit(form)}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    title={t('forms.admin.edit')}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(form)}
                    disabled={duplicatingId === form.id}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50"
                    title={t('forms.admin.duplicate')}
                  >
                    {duplicatingId === form.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={`/f/${form.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title={t('forms.admin.view_link')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(form)}
                    disabled={deletingId === form.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    title={t('forms.admin.delete')}
                  >
                    {deletingId === form.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('forms.admin.title_col')}</th>
                  {activeFolder === ALL_FOLDERS_TAB && hasFolders && (
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('forms.admin.folder_col')}</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('forms.admin.status_col')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('forms.admin.info_col')}</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">{t('forms.admin.actions_col')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{resolveTemplateText(form, activeLang).title}</div>
                      <div className="text-xs text-gray-400">/{form.slug}</div>
                    </td>
                    {activeFolder === ALL_FOLDERS_TAB && hasFolders && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {form.folder ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            <FolderOpen className="w-3 h-3" />
                            {form.folder}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">{t('forms.admin.general')}</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(form)}
                        disabled={togglingId === form.id}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                          form.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                        }`}
                        title={form.is_active ? t('forms.admin.click_unpublish') : t('forms.admin.click_publish')}
                      >
                        {togglingId === form.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : form.is_active ? (
                          t('forms.admin.published')
                        ) : (
                          t('forms.admin.draft')
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      <div>{t('forms.admin.fields_count', { count: form.fields_schema.length })}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <BarChart className="w-3 h-3" />
                        <span className={submissionCounts[form.id!] ? 'font-semibold text-blue-600' : ''}>
                          {t('forms.admin.responses_count', { count: submissionCounts[form.id!] || 0 })}
                        </span>
                      </div>
                      <div className="text-gray-400 mt-0.5">
                        {form.created_at ? format(new Date(form.created_at), 'dd/MM/yyyy', { locale: ca }) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <a
                          href={`/f/${form.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title={t('forms.admin.view_link')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => onViewSubmissions(form)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <BarChart className="w-3.5 h-3.5" />
                          {t('forms.admin.responses')}
                        </button>
                        <button
                          onClick={() => onEdit(form)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          title={t('forms.admin.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(form)}
                          disabled={duplicatingId === form.id}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50"
                          title={t('forms.admin.duplicate')}
                        >
                          {duplicatingId === form.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(form)}
                          disabled={deletingId === form.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title={t('forms.admin.delete')}
                        >
                          {deletingId === form.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
