import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import { ImageUpload } from '../ImageUpload';
import type { ProjectFormData } from '../../../services/admin/AdminProjectsService';

interface ProjectFormModalProps {
  isEditing: boolean;
  formData: ProjectFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProjectFormData>>;
  activeLang: 'ca' | 'es' | 'en';
  setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
  isTranslating: boolean;
  saving: boolean;
  onAutoTranslate: () => void;
  onSave: () => void;
  onClose: () => void;
}

export function ProjectFormModal({
  isEditing, formData, setFormData, activeLang, setActiveLang,
  isTranslating, saving, onAutoTranslate, onSave, onClose
}: ProjectFormModalProps) {
  const { t } = useTranslation();

  const updateTranslationField = (lang: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [lang]: {
          ...prev.translations[lang],
          [field]: value
        }
      },
      ...(lang === 'es' ? { [field]: value } : {})
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? t('admin.projects.edit_project') : t('admin.projects.new_project')}
          </h2>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Language Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex gap-2">
              {(['ca', 'es', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeLang === lang
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={onAutoTranslate}
              disabled={isTranslating}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
              title="Traducir autom\u00e1ticamente al resto de idiomas"
            >
              <Wand2 className={`w-4 h-4 ${isTranslating ? 'animate-pulse' : ''}`} />
              {isTranslating ? 'Traduciendo...' : 'Auto-traducir'}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('admin.projects.field_title')} ({activeLang.toUpperCase()}) *
              </label>
              <input
                type="text"
                value={formData.translations[activeLang]?.title || ''}
                onChange={e => updateTranslationField(activeLang, 'title', e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={t('admin.projects.title_placeholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('admin.projects.field_description')} ({activeLang.toUpperCase()})
              </label>
              <textarea
                value={formData.translations[activeLang]?.description || ''}
                onChange={e => updateTranslationField(activeLang, 'description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder={t('admin.projects.description_placeholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('admin.projects.field_details')} ({activeLang.toUpperCase()}) - Markdown Supported
              </label>
              <textarea
                value={formData.translations[activeLang]?.details || ''}
                onChange={e => updateTranslationField(activeLang, 'details', e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                placeholder={t('admin.projects.details_placeholder')}
              />
              <p className="text-xs text-slate-500 mt-1">Use **bold**, - lists, ### headers for formatting.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.projects.field_impact')} ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={formData.translations[activeLang]?.impact || ''}
                  onChange={e => updateTranslationField(activeLang, 'impact', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={t('admin.projects.impact_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.projects.field_participants')} ({activeLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={formData.translations[activeLang]?.participants || ''}
                  onChange={e => updateTranslationField(activeLang, 'participants', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={t('admin.projects.participants_placeholder')}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('admin.projects.field_image_url')}
            </label>
            <ImageUpload
              value={formData.image_url}
              onUpload={(url) => setFormData(prev => ({ ...prev, image_url: url || '' }))}
              folder="projects"
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
