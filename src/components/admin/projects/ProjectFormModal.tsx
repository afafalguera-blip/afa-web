import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { ImageUpload } from '../ImageUpload';
import type { ProjectFormData } from '../../../services/admin/AdminProjectsService';

interface ProjectFormModalProps {
  open: boolean;
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
  open, isEditing, formData, setFormData, activeLang, setActiveLang,
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
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      closeOnBackdrop={false}
      title={isEditing ? t('admin.projects.edit_project') : t('admin.projects.new_project')}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-3.5 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Language tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div className="flex bg-neutral-100 p-1 rounded-md">
            {(['ca', 'es', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLang(lang)}
                aria-pressed={activeLang === lang}
                className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
                  activeLang === lang ? 'bg-admin-accent text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onAutoTranslate}
            disabled={isTranslating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-neutral-200 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            <Wand2 className={`w-4 h-4 ${isTranslating ? 'animate-pulse' : ''}`} />
            {isTranslating ? t('admin.news.translating', 'Traduint...') : t('admin.news.auto_translate', 'Auto-traduir')}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="project-title" className="block text-[13px] font-medium text-neutral-700 mb-1">
              {t('admin.projects.field_title')} ({activeLang.toUpperCase()}) *
            </label>
            <input
              id="project-title"
              type="text"
              value={formData.translations[activeLang]?.title || ''}
              onChange={e => updateTranslationField(activeLang, 'title', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none"
              placeholder={t('admin.projects.title_placeholder')}
            />
          </div>

          <div>
            <label htmlFor="project-description" className="block text-[13px] font-medium text-neutral-700 mb-1">
              {t('admin.projects.field_description')} ({activeLang.toUpperCase()})
            </label>
            <textarea
              id="project-description"
              value={formData.translations[activeLang]?.description || ''}
              onChange={e => updateTranslationField(activeLang, 'description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none resize-none"
              placeholder={t('admin.projects.description_placeholder')}
            />
          </div>

          <div>
            <label htmlFor="project-details" className="block text-[13px] font-medium text-neutral-700 mb-1">
              {t('admin.projects.field_details')} ({activeLang.toUpperCase()})
            </label>
            <textarea
              id="project-details"
              value={formData.translations[activeLang]?.details || ''}
              onChange={e => updateTranslationField(activeLang, 'details', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none font-mono text-[13px]"
              placeholder={t('admin.projects.details_placeholder')}
            />
            <p className="text-xs text-neutral-500 mt-1">
              {t('admin.projects.markdown_hint', 'Admet Markdown: **negreta**, - llistes, ### encapçalaments.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project-impact" className="block text-[13px] font-medium text-neutral-700 mb-1">
                {t('admin.projects.field_impact')} ({activeLang.toUpperCase()})
              </label>
              <input
                id="project-impact"
                type="text"
                value={formData.translations[activeLang]?.impact || ''}
                onChange={e => updateTranslationField(activeLang, 'impact', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none"
                placeholder={t('admin.projects.impact_placeholder')}
              />
            </div>
            <div>
              <label htmlFor="project-participants" className="block text-[13px] font-medium text-neutral-700 mb-1">
                {t('admin.projects.field_participants')} ({activeLang.toUpperCase()})
              </label>
              <input
                id="project-participants"
                type="text"
                value={formData.translations[activeLang]?.participants || ''}
                onChange={e => updateTranslationField(activeLang, 'participants', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none"
                placeholder={t('admin.projects.participants_placeholder')}
              />
            </div>
          </div>
        </div>

        <div>
          <span className="block text-[13px] font-medium text-neutral-700 mb-1">
            {t('admin.projects.field_image_url')}
          </span>
          <ImageUpload
            value={formData.image_url}
            onUpload={(url) => setFormData(prev => ({ ...prev, image_url: url || '' }))}
            folder="projects"
          />
        </div>
      </div>
    </Modal>
  );
}
