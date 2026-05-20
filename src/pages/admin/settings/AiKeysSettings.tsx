import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Save, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import {
  AppSettingsService,
  APP_SETTING_DEFINITIONS,
  type AppSettingKey,
  type AppSettingMeta,
} from '../../../services/admin/AdminAppSettingsService';

interface RowState {
  meta: AppSettingMeta | null;
  draft: string;
  loading: boolean;
  saving: boolean;
  removing: boolean;
  showDraft: boolean;
  error: string | null;
  okMessage: string | null;
}

const emptyRow = (): RowState => ({
  meta: null,
  draft: '',
  loading: true,
  saving: false,
  removing: false,
  showDraft: false,
  error: null,
  okMessage: null,
});

export default function AiKeysSettings() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<Record<AppSettingKey, RowState>>(
    () => Object.fromEntries(APP_SETTING_DEFINITIONS.map((d) => [d.key, emptyRow()])) as Record<AppSettingKey, RowState>,
  );

  useEffect(() => {
    APP_SETTING_DEFINITIONS.forEach((d) => loadOne(d.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (key: AppSettingKey, p: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...p } }));

  const loadOne = async (key: AppSettingKey) => {
    patch(key, { loading: true, error: null });
    try {
      const meta = await AppSettingsService.getMeta(key);
      patch(key, { meta, loading: false });
    } catch (err: unknown) {
      patch(key, {
        loading: false,
        error: err instanceof Error ? err.message : t('settings.ai_keys.load_error'),
      });
    }
  };

  const handleSave = async (key: AppSettingKey) => {
    const value = rows[key].draft.trim();
    if (!value) return;
    patch(key, { saving: true, error: null, okMessage: null });
    try {
      await AppSettingsService.set(key, value);
      patch(key, { saving: false, draft: '', okMessage: t('settings.ai_keys.saved_ok') });
      await loadOne(key);
    } catch (err: unknown) {
      patch(key, {
        saving: false,
        error: err instanceof Error ? err.message : t('settings.ai_keys.save_error'),
      });
    }
  };

  const handleDelete = async (key: AppSettingKey) => {
    if (!window.confirm(t('settings.ai_keys.delete_confirm'))) return;
    patch(key, { removing: true, error: null, okMessage: null });
    try {
      await AppSettingsService.remove(key);
      patch(key, { removing: false, okMessage: t('settings.ai_keys.deleted_ok') });
      await loadOne(key);
    } catch (err: unknown) {
      patch(key, {
        removing: false,
        error: err instanceof Error ? err.message : t('settings.ai_keys.delete_error'),
      });
    }
  };

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(i18n.resolvedLanguage || i18n.language) : '';

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 space-y-1">
          <p className="font-medium">{t('settings.ai_keys.intro_title')}</p>
          <p className="text-blue-800 text-xs">{t('settings.ai_keys.intro_body')}</p>
        </div>
      </div>

      {APP_SETTING_DEFINITIONS.map((def) => {
        const row = rows[def.key];
        return (
          <div key={def.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-slate-500" />
              <code className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">{def.key}</code>
            </div>
            <p className="text-xs text-slate-500 mb-4">{def.description}</p>

            {row.loading ? (
              <div className="flex items-center text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> {t('settings.ai_keys.loading')}
              </div>
            ) : (
              <>
                {row.meta?.is_set ? (
                  <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">{t('settings.ai_keys.configured')}</span>
                    <span className="text-xs font-mono text-slate-600 bg-white px-2 py-0.5 rounded">{row.meta.masked}</span>
                    {row.meta.updated_at && (
                      <span className="text-[11px] text-slate-500">
                        {t('settings.ai_keys.updated_on', { date: formatDate(row.meta.updated_at) })}
                        {row.meta.updated_by_email ? ` · ${row.meta.updated_by_email}` : ''}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(def.key)}
                      disabled={row.removing}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-md transition-colors disabled:opacity-50"
                    >
                      {row.removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {t('settings.ai_keys.delete')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-bold text-amber-700">{t('settings.ai_keys.not_configured')}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {row.meta?.is_set ? t('settings.ai_keys.rotate_label') : t('settings.ai_keys.new_value_label')}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={row.showDraft ? 'text' : 'password'}
                        autoComplete="off"
                        value={row.draft}
                        onChange={(e) => patch(def.key, { draft: e.target.value, okMessage: null })}
                        placeholder={t('settings.ai_keys.value_placeholder')}
                        className="w-full pr-10 py-2 px-3 border border-slate-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => patch(def.key, { showDraft: !row.showDraft })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        title={row.showDraft ? t('settings.ai_keys.hide') : t('settings.ai_keys.show')}
                      >
                        {row.showDraft ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSave(def.key)}
                      disabled={row.saving || !row.draft.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {row.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {row.saving ? t('settings.ai_keys.saving') : t('settings.ai_keys.save')}
                    </button>
                  </div>
                </div>

                {row.error && (
                  <div className="mt-3 p-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
                    {row.error}
                  </div>
                )}
                {row.okMessage && !row.error && (
                  <div className="mt-3 p-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">
                    {row.okMessage}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
