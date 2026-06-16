import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Plus, RefreshCw, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { AdminFaqService, type Faq, type FaqFormData } from '../../services/admin/AdminFaqService';
import { FaqFormModal } from '../../components/admin/faq/FaqFormModal';

const emptyTranslations = () => ({
  ca: { category: '', question: '', answer: '' },
  es: { category: '', question: '', answer: '' },
  en: { category: '', question: '', answer: '' }
});

const EMPTY_FORM: FaqFormData = {
  category: '',
  sort_order: 0,
  is_active: true,
  translations: emptyTranslations()
};

export default function FaqManager() {
  const { t } = useTranslation();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [formData, setFormData] = useState<FaqFormData>(EMPTY_FORM);
  const [activeLang, setActiveLang] = useState<'ca' | 'es' | 'en'>('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      setFaqs(await AdminFaqService.getFaqs());
    } catch (error) {
      console.error('Error fetching faqs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingFaq(null);
    setFormData({ ...EMPTY_FORM, translations: emptyTranslations() });
    setActiveLang('es');
    setIsModalOpen(true);
  };

  const handleEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setFormData({
      category: faq.category,
      sort_order: faq.sort_order,
      is_active: faq.is_active,
      translations: {
        ...emptyTranslations(),
        es: { category: faq.category, question: faq.question, answer: faq.answer },
        ...(faq.translations || {})
      }
    });
    setActiveLang('es');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.faq.delete_confirm'))) return;
    try {
      await AdminFaqService.deleteFaq(id);
      setFaqs(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting faq:', error);
      alert(t('common.error_delete'));
    }
  };

  const handleToggleActive = async (faq: Faq) => {
    try {
      await AdminFaqService.toggleActive(faq.id, !faq.is_active);
      setFaqs(prev => prev.map(f => (f.id === faq.id ? { ...f, is_active: !f.is_active } : f)));
    } catch (error) {
      console.error('Error updating faq:', error);
      alert(t('common.error_save'));
    }
  };

  const handleSave = async () => {
    const es = formData.translations.es;
    if (!es.question.trim() || !es.answer.trim()) {
      alert(t('admin.faq.required'));
      return;
    }
    setSaving(true);
    try {
      const maxOrder = faqs.reduce((max, f) => Math.max(max, f.sort_order), 0);
      await AdminFaqService.saveFaq(formData, maxOrder, editingFaq?.id);
      setIsModalOpen(false);
      fetchFaqs();
    } catch (error) {
      console.error('Error saving faq:', error);
      alert(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('admin.faq.title')}</h1>
          <p className="text-neutral-500">{t('admin.faq.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFaqs}
            className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('admin.faq.new')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : faqs.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-neutral-500">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          {t('admin.faq.empty')}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-neutral-200 divide-y divide-neutral-100">
          {faqs.map(faq => (
            <div key={faq.id} className="flex items-start gap-4 p-4">
              <span className="mt-0.5 text-xs font-mono text-neutral-400 w-6 shrink-0">{faq.sort_order}</span>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wide text-blue-600 mb-1">
                  {faq.translations?.es?.category || faq.category}
                </span>
                <p className={`font-medium truncate ${faq.is_active ? 'text-neutral-900' : 'text-neutral-400 line-through'}`}>
                  {faq.question}
                </p>
                <p className="text-sm text-neutral-500 line-clamp-1">{faq.answer}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleActive(faq)}
                  className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
                  title={faq.is_active ? t('admin.faq.hide') : t('admin.faq.show')}
                >
                  {faq.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleEdit(faq)}
                  className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
                  title={t('common.edit')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(faq.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <FaqFormModal
          isEditing={!!editingFaq}
          formData={formData}
          setFormData={setFormData}
          activeLang={activeLang}
          setActiveLang={setActiveLang}
          isTranslating={isTranslating}
          setIsTranslating={setIsTranslating}
          saving={saving}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
