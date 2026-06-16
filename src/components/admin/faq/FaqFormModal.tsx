import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import { TranslationService } from '../../../services/TranslationService';
import type { FaqFormData } from '../../../services/admin/AdminFaqService';

interface FaqFormModalProps {
  isEditing: boolean;
  formData: FaqFormData;
  setFormData: React.Dispatch<React.SetStateAction<FaqFormData>>;
  activeLang: 'ca' | 'es' | 'en';
  setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
  isTranslating: boolean;
  setIsTranslating: (v: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function FaqFormModal({
  isEditing, formData, setFormData, activeLang, setActiveLang,
  isTranslating, setIsTranslating, saving, onSave, onClose
}: FaqFormModalProps) {
  const { t } = useTranslation();

  const current = formData.translations[activeLang] || { category: '', question: '', answer: '' };

  const updateField = (field: 'category' | 'question' | 'answer', value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [activeLang]: { ...prev.translations[activeLang], [field]: value }
      }
    }));
  };

  const handleAutoTranslate = async () => {
    const source = formData.translations[activeLang];
    if (!source.question.trim()) {
      alert(t('admin.faq.fill_source_first'));
      return;
    }
    setIsTranslating(true);
    try {
      const targetLangs = (['ca', 'es', 'en'] as const).filter(l => l !== activeLang);
      const updated = { ...formData.translations };
      for (const lang of targetLangs) {
        // Map FAQ fields onto TranslationResult fields supported by the service.
        const translated = await TranslationService.translateContent(
          { title: source.question, content: source.answer, excerpt: source.category },
          lang,
          activeLang
        );
        updated[lang] = {
          question: translated.title || '',
          answer: translated.content || '',
          category: translated.excerpt || ''
        };
      }
      setFormData(prev => ({ ...prev, translations: updated }));
    } catch (error) {
      console.error('Translation error:', error);
      alert(t('common.error_translation'));
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-sm w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900">
            {isEditing ? t('admin.faq.edit') : t('admin.faq.new')}
          </h2>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex gap-2">
              {(['ca', 'es', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeLang === lang
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={handleAutoTranslate}
              disabled={isTranslating}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${isTranslating ? 'animate-pulse' : ''}`} />
              {isTranslating ? t('admin.faq.translating') : t('admin.faq.auto_translate')}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('admin.faq.field_category')} ({activeLang.toUpperCase()})
              </label>
              <input
                type="text"
                value={current.category}
                onChange={e => updateField('category', e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={t('admin.faq.category_placeholder')}
              />
              <p className="text-xs text-neutral-500 mt-1">{t('admin.faq.category_hint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('admin.faq.field_question')} ({activeLang.toUpperCase()}) *
              </label>
              <input
                type="text"
                value={current.question}
                onChange={e => updateField('question', e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('admin.faq.field_answer')} ({activeLang.toUpperCase()}) *
              </label>
              <textarea
                value={current.answer}
                onChange={e => updateField('answer', e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('admin.faq.field_order')}
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-neutral-700">{t('admin.faq.field_active')}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors"
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
