import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Save, ChevronLeft, Wand2, Eye, EyeOff, Newspaper } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TranslationService } from '../../services/TranslationService';
import { sanitizeRichTextHtml } from '../../utils/htmlSanitizer';
import { getReadabilityMetrics } from '../../utils/readability';
import { getRegionalLanguageTag } from '../../utils/locale';
import {
  AdminNewsEditorService,
  createDefaultFormData,
  createEmptyTranslations,
  generateSlug,
  normalizeTranslations,
  type NewsFormData
} from '../../services/admin/AdminNewsEditorService';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { useToast } from '../../components/common/Toast';
import { useDirtyGuard } from '../../hooks/useDirtyGuard';
import { EditorToolbar } from '../../components/admin/news/EditorToolbar';
import { NewsEditorSidebar } from '../../components/admin/news/NewsEditorSidebar';
import { NewsPreview } from '../../components/admin/news/NewsPreview';

type Lang = 'ca' | 'es' | 'en';
type TranslationField = 'title' | 'excerpt' | 'content';

const AVAILABLE_LANGS: Lang[] = ['ca', 'es', 'en'];
const DRAFT_STORAGE_PREFIX = 'afa:news-editor:draft';
const buildDraftKey = (articleId: string | undefined) => `${DRAFT_STORAGE_PREFIX}:${articleId || 'new'}`;

export default function NewsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(id !== 'new');
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [lastAutosaveAt, setLastAutosaveAt] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [formData, setFormData] = useState<NewsFormData>(() => createDefaultFormData());

  const draftKey = useMemo(() => buildDraftKey(id), [id]);
  const activeContent = formData.translations[activeLang]?.content || '';
  const nativeDateLocale = getRegionalLanguageTag(i18n.resolvedLanguage || i18n.language);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ autolink: true, openOnClick: false, defaultProtocol: 'https' }),
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: t('admin.news.content_placeholder') })
    ],
    content: activeContent,
    editorProps: {
      attributes: {
        class: 'min-h-[420px] px-6 py-5 text-lg leading-relaxed text-neutral-700 focus:outline-none prose prose-slate max-w-none'
      }
    },
    onUpdate: ({ editor: editorInstance }) => {
      setFormData((prev) => ({
        ...prev,
        translations: {
          ...prev.translations,
          [activeLang]: { ...prev.translations[activeLang], content: editorInstance.getHTML() }
        }
      }));
    }
  });

  const isDirty = useMemo(() => JSON.stringify(formData) !== initialSnapshot, [formData, initialSnapshot]);
  const metrics = useMemo(() => getReadabilityMetrics(activeContent), [activeContent]);
  const previewHtml = useMemo(() => sanitizeRichTextHtml(activeContent), [activeContent]);

  // Shared guard: registers beforeunload and exposes the in-app confirmation.
  const { confirmDiscard } = useDirtyGuard(isDirty && !loading);

  // Load article data
  useEffect(() => {
    const loadData = async () => {
      if (!id || id === 'new') {
        const draft = localStorage.getItem(draftKey);
        let data = createDefaultFormData();

        if (draft) {
          try {
            const parsed = JSON.parse(draft) as Partial<NewsFormData>;
            const fallbackEs = parsed.translations?.es || createEmptyTranslations().es;
            data = { ...data, ...parsed, translations: normalizeTranslations(parsed.translations, fallbackEs) };
            setSlugManuallyEdited(Boolean(data.slug));
          } catch { /* use default */ }
        }

        setFormData(data);
        setInitialSnapshot(JSON.stringify(data));
        setLoading(false);
        return;
      }

      try {
        const data = await AdminNewsEditorService.loadArticle(id);
        setFormData(data);
        setSlugManuallyEdited(Boolean(data.slug));
        setInitialSnapshot(JSON.stringify(data));
      } catch (error) {
        console.error('Error fetching article:', error);
        toast.error(t('admin.news.load_error', 'No s\'ha pogut carregar la notícia'));
        navigate('/admin/news');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // toast is stable enough for this one-shot loader; re-running on it would refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, draftKey]);

  // Sync editor content on language change
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== activeContent) {
      editor.commands.setContent(activeContent || '', { emitUpdate: false });
    }
  }, [activeContent, editor]);

  // Autosave drafts
  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(formData));
      setLastAutosaveAt(new Date().toISOString());
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draftKey, formData, loading]);

  const updateTranslationField = (lang: Lang, field: TranslationField, value: string) => {
    setFormData((prev) => {
      const next: NewsFormData = {
        ...prev,
        translations: { ...prev.translations, [lang]: { ...prev.translations[lang], [field]: value } }
      };
      if (field === 'title' && lang === 'es' && !slugManuallyEdited) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  const handleAutoTranslate = async () => {
    const sourceContent = formData.translations[activeLang];
    if (!sourceContent.title.trim()) {
      toast.error(t('admin.news.fill_source_first'));
      return;
    }

    setIsTranslating(true);
    try {
      const targetLangs = AVAILABLE_LANGS.filter((lang) => lang !== activeLang);
      const updatedTranslations = { ...formData.translations };
      for (const lang of targetLangs) {
        const translated = await TranslationService.translateNews(sourceContent, lang, activeLang);
        if (!translated) continue;
        updatedTranslations[lang] = { title: translated.title || '', excerpt: translated.excerpt || '', content: translated.content || '' };
      }
      setFormData((prev) => ({ ...prev, translations: updatedTranslations }));
      toast.success(t('admin.news.translated', 'Traduccions generades'));
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(t('common.error_translation'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleBack = async () => {
    if (!(await confirmDiscard())) return;
    navigate('/admin/news');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sourceContent = formData.translations[activeLang];
      const otherLangs = AVAILABLE_LANGS.filter(l => l !== activeLang);
      // Treat a target lang as needing translation if its title is empty OR identical to source title
      // (legacy data was saved with the source content duplicated across all languages).
      const isUntranslated = (lang: Lang) => {
        const translation = formData.translations[lang];
        if (!translation?.title?.trim()) return true;
        return translation.title.trim() === sourceContent.title.trim();
      };
      const langsToTranslate = otherLangs.filter(isUntranslated);

      if (sourceContent.title.trim() && langsToTranslate.length > 0) {
        setIsTranslating(true);
        let updatedTranslations = formData.translations;
        try {
          const fields: Record<string, string> = { title: sourceContent.title };
          if (sourceContent.excerpt?.trim()) fields.excerpt = sourceContent.excerpt;
          if (sourceContent.content?.trim()) fields.content = sourceContent.content;

          const result = await TranslationService.translateBulk(fields, activeLang, langsToTranslate);
          updatedTranslations = { ...formData.translations };
          for (const lang of langsToTranslate) {
            updatedTranslations[lang] = {
              title: result[lang]?.title || '',
              excerpt: result[lang]?.excerpt || '',
              content: result[lang]?.content || '',
            };
          }
          setFormData(prev => ({ ...prev, translations: updatedTranslations }));
        } catch (err) {
          console.error('Auto-translate failed, saving without translations:', err);
          toast.error(t('common.error_translation'));
        } finally {
          setIsTranslating(false);
        }
        await AdminNewsEditorService.saveArticle(id, { ...formData, translations: updatedTranslations });
      } else {
        await AdminNewsEditorService.saveArticle(id, formData);
      }

      localStorage.removeItem(draftKey);
      setInitialSnapshot(JSON.stringify(formData));
      toast.success(t('admin.news.saved', 'Notícia desada'));
      navigate('/admin/news');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'TITLE_REQUIRED') { toast.error(t('admin.news.title_required')); return; }
        if (error.message === 'SLUG_REQUIRED') { toast.error(t('admin.news.slug_required', 'El slug és obligatori')); return; }
        if (error.message === 'SLUG_DUPLICATE') { toast.error(t('admin.news.slug_duplicate', 'Ja existeix una notícia amb aquest slug')); return; }
      }
      console.error('Error saving article:', error);
      toast.error(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] pt-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label={t('common.back', 'Tornar')}
          title={t('common.back', 'Tornar')}
          className="mt-1 p-2 rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <ChevronLeft className="w-[18px] h-[18px]" />
        </button>

        <div className="flex-1 min-w-0">
          <AdminPageHeader
            title={id === 'new' ? t('admin.news.new_article') : t('admin.news.edit_article')}
            subtitle={`/noticies/${formData.slug || '...'}`}
            icon={Newspaper}
            actions={
              <button
                type="button"
                onClick={() => setShowPreview((prev) => !prev)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-neutral-200 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? t('admin.news.hide_preview', 'Amagar vista prèvia') : t('admin.news.show_preview', 'Vista prèvia')}
              </button>
            }
            onCreate={handleSave}
            createLabel={saving ? t('common.saving') : t('common.save')}
            createIcon={Save}
          />
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            {/* Language switcher + translate */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex bg-white p-1 rounded-md border border-neutral-200">
                {AVAILABLE_LANGS.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLang(lang)}
                    aria-pressed={activeLang === lang}
                    className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
                      activeLang === lang ? 'bg-admin-accent text-white' : 'text-neutral-500 hover:text-neutral-900'
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
                className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-neutral-200 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                <Wand2 className={`w-4 h-4 ${isTranslating ? 'animate-pulse' : ''}`} />
                {isTranslating ? t('admin.news.translating', 'Traduint...') : t('admin.news.auto_translate', 'Auto-traduir')}
              </button>
            </div>

            {/* Title, excerpt, body */}
            <div className="p-6 sm:p-8 space-y-8">
              <div>
                <label htmlFor="news-title" className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  {t('admin.news.field_title')} ({activeLang.toUpperCase()})
                </label>
                <input
                  id="news-title"
                  type="text"
                  value={formData.translations[activeLang]?.title || ''}
                  onChange={(e) => updateTranslationField(activeLang, 'title', e.target.value)}
                  className="w-full px-0 text-3xl sm:text-4xl font-bold text-neutral-900 border-none focus:ring-0 placeholder:text-neutral-300 bg-transparent leading-tight outline-none"
                  placeholder={t('admin.news.title_placeholder')}
                />
              </div>

              <div>
                <label htmlFor="news-excerpt" className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  {t('admin.news.field_excerpt')}
                </label>
                <textarea
                  id="news-excerpt"
                  value={formData.translations[activeLang]?.excerpt || ''}
                  onChange={(e) => updateTranslationField(activeLang, 'excerpt', e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none transition-colors resize-none text-[15px] text-neutral-700 leading-relaxed"
                  rows={3}
                  placeholder={t('admin.news.excerpt_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  {t('admin.news.field_content')}
                </span>
                <div className="rounded-md border border-neutral-200 overflow-hidden">
                  <EditorToolbar editor={editor} />
                  <EditorContent editor={editor} />
                </div>
              </div>

              {showPreview && (
                <NewsPreview
                  activeLang={activeLang}
                  title={formData.translations[activeLang].title}
                  excerpt={formData.translations[activeLang].excerpt}
                  previewHtml={previewHtml}
                />
              )}
            </div>
          </div>
        </div>

        <NewsEditorSidebar
          formData={formData}
          setFormData={setFormData}
          metrics={metrics}
          lastAutosaveAt={lastAutosaveAt}
          nativeDateLocale={nativeDateLocale}
        />
      </div>
    </div>
  );
}
