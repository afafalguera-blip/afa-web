import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Pencil, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import { AdminFaqService, type Faq, type FaqFormData } from '../../services/admin/AdminFaqService';
import { FaqFormModal } from '../../components/admin/faq/FaqFormModal';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';

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
  const { toast } = useToast();
  const confirm = useConfirm();

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [formData, setFormData] = useState<FaqFormData>(EMPTY_FORM);
  const [activeLang, setActiveLang] = useState<'ca' | 'es' | 'en'>('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      setFaqs(await AdminFaqService.getFaqs());
    } catch (error) {
      console.error('Error fetching faqs:', error);
      toast.error(t('admin.faq.error_load', 'Error carregant les FAQ'));
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

  const handleDelete = async (faq: Faq) => {
    const ok = await confirm({
      title: t('admin.faq.delete_title', 'Eliminar FAQ'),
      message: t('admin.faq.delete_confirm'),
      itemName: faq.question,
      destructive: true
    });
    if (!ok) return;
    try {
      await AdminFaqService.deleteFaq(faq.id);
      setFaqs(prev => prev.filter(f => f.id !== faq.id));
      toast.success(t('admin.faq.deleted', 'FAQ eliminada'));
    } catch (error) {
      console.error('Error deleting faq:', error);
      toast.error(t('common.error_delete'));
    }
  };

  const handleToggleActive = async (faq: Faq) => {
    try {
      await AdminFaqService.toggleActive(faq.id, !faq.is_active);
      setFaqs(prev => prev.map(f => (f.id === faq.id ? { ...f, is_active: !f.is_active } : f)));
    } catch (error) {
      console.error('Error updating faq:', error);
      toast.error(t('common.error_save'));
    }
  };

  const handleSave = async () => {
    const es = formData.translations.es;
    if (!es.question.trim() || !es.answer.trim()) {
      toast.error(t('admin.faq.required'));
      return;
    }
    setSaving(true);
    try {
      const maxOrder = faqs.reduce((max, f) => Math.max(max, f.sort_order), 0);
      await AdminFaqService.saveFaq(formData, maxOrder, editingFaq?.id);
      setIsModalOpen(false);
      toast.success(editingFaq
        ? t('admin.faq.updated', 'FAQ actualitzada')
        : t('admin.faq.created', 'FAQ creada'));
      fetchFaqs();
    } catch (error) {
      console.error('Error saving faq:', error);
      toast.error(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const visibleFaqs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return faqs;
    return faqs.filter(faq => {
      const translated = Object.values(faq.translations || {}).flatMap(tr => [tr.question, tr.answer, tr.category]);
      return [faq.question, faq.answer, faq.category, ...translated]
        .some(v => (v ?? '').toLowerCase().includes(term));
    });
  }, [faqs, search]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.faq.title')}
        subtitle={t('admin.faq.subtitle')}
        icon={HelpCircle}
        loading={loading}
        onRefresh={fetchFaqs}
        onCreate={handleCreate}
        createLabel={t('admin.faq.new')}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.faq.search_placeholder', 'Cerca per pregunta, resposta o categoria...')}
          aria-label={t('admin.faq.search_placeholder', 'Cerca per pregunta, resposta o categoria...')}
          className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg bg-white text-[13px] outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
        </div>
      ) : visibleFaqs.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-neutral-500">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          {search ? t('common.no_results', 'Sense resultats') : t('admin.faq.empty')}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-neutral-200 divide-y divide-neutral-100">
          {visibleFaqs.map(faq => (
            <div key={faq.id} className="flex items-start gap-4 p-4">
              <span className="mt-0.5 text-xs font-mono text-neutral-400 w-6 shrink-0">{faq.sort_order}</span>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-1">
                  {faq.translations?.es?.category || faq.category}
                </span>
                <p className={`font-medium truncate ${faq.is_active ? 'text-neutral-900' : 'text-neutral-400 line-through'}`}>
                  {faq.question}
                </p>
                <p className="text-sm text-neutral-500 line-clamp-1">{faq.answer}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleActive(faq)}
                  className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
                  title={faq.is_active ? t('admin.faq.hide') : t('admin.faq.show')}
                  aria-label={faq.is_active ? t('admin.faq.hide') : t('admin.faq.show')}
                >
                  {faq.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(faq)}
                  className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
                  title={t('common.edit')}
                  aria-label={t('common.edit')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(faq)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('common.delete')}
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FaqFormModal
        isOpen={isModalOpen}
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
    </div>
  );
}
