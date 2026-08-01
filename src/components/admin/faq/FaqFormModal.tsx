import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import { TranslationService } from '../../../services/TranslationService';
import type { FaqFormData } from '../../../services/admin/AdminFaqService';
import { Modal } from '../../common/Modal';
import { useToast } from '../../common/Toast';

interface FaqFormModalProps {
  isOpen: boolean;
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
  isOpen, isEditing, formData, setFormData, activeLang, setActiveLang,
  isTranslating, setIsTranslating, saving, onSave, onClose
}: FaqFormModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

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
      toast.error(t('admin.faq.fill_source_first'));
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
      toast.success(t('admin.faq.translated', 'Traduccions generades'));
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(t('common.error_translation'));
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEditing ? t('admin.faq.edit') : t('admin.faq.new')}
      size="lg"
      closeOnBackdrop={false}
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
            className="px-4 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-neutral-100 pb-4">
          <div className="flex gap-2">
            {(['ca', 'es', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLang(lang)}
                aria-pressed={activeLang === lang}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeLang === lang
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAutoTranslate}
            disabled={isTranslating}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100 transition-colors disabled:opacity-50"
          >
            <Wand2 className={`w-4 h-4 ${isTranslating ? 'animate-pulse' : ''}`} />
            {isTranslating ? t('admin.faq.translating') : t('admin.faq.auto_translate')}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="faq-category" className="block text-sm font-medium text-neutral-700 mb-1">
              {t('admin.faq.field_category')} ({activeLang.toUpperCase()})
            </label>
            <input
              id="faq-category"
              type="text"
              value={current.category}
              onChange={e => updateField('category', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900/10 outline-none text-sm"
              placeholder={t('admin.faq.category_placeholder')}
            />
            <p className="text-xs text-neutral-500 mt-1">{t('admin.faq.category_hint')}</p>
          </div>

          <div>
            <label htmlFor="faq-question" className="block text-sm font-medium text-neutral-700 mb-1">
              {t('admin.faq.field_question')} ({activeLang.toUpperCase()}) *
            </label>
            <input
              id="faq-question"
              type="text"
              value={current.question}
              onChange={e => updateField('question', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900/10 outline-none text-sm"
            />
          </div>

          <div>
            <label htmlFor="faq-answer" className="block text-sm font-medium text-neutral-700 mb-1">
              {t('admin.faq.field_answer')} ({activeLang.toUpperCase()}) *
            </label>
            <textarea
              id="faq-answer"
              value={current.answer}
              onChange={e => updateField('answer', e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900/10 outline-none resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="faq-order" className="block text-sm font-medium text-neutral-700 mb-1">
                {t('admin.faq.field_order')}
              </label>
              <input
                id="faq-order"
                type="number"
                value={formData.sort_order}
                onChange={e => setFormData(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900/10 outline-none text-sm"
              />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-sm font-medium text-neutral-700">{t('admin.faq.field_active')}</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
